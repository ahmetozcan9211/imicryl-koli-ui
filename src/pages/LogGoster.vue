<template>
  <div class="p-4 space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Sunucu Logları</h2>
      <div class="flex gap-2">
        <button class="q-btn q-btn--standard q-btn--rectangle q-btn--actionable q-mr-sm"
                @click="loadLogs">Yenile</button>
        <button class="q-btn q-btn--outline" @click="resetFilters">Filtreleri Temizle</button>
      </div>
    </div>

    <div class="grid md:grid-cols-6 sm:grid-cols-2 gap-3 items-end">
      <select v-model="filters.level" class="q-field q-field--outlined q-ma-xs">
        <option value="">(Hepsi)</option>
        <option value="info">info</option>
        <option value="warn">warn</option>
        <option value="error">error</option>
      </select>
      <input v-model="filters.method" class="q-field q-field--outlined q-ma-xs" placeholder="HTTP Method">
      <input v-model="filters.route" class="q-field q-field--outlined q-ma-xs" placeholder="Route içerir">
      <input v-model="filters.since" type="datetime-local" class="q-field q-field--outlined q-ma-xs" placeholder="Başlangıç">
      <input v-model="filters.until" type="datetime-local" class="q-field q-field--outlined q-ma-xs" placeholder="Bitiş">
      <select v-model="limit" class="q-field q-field--outlined q-ma-xs">
        <option :value="50">50</option>
        <option :value="100">100</option>
        <option :value="200">200</option>
        <option :value="500">500</option>
      </select>
    </div>

    <div v-if="error" class="q-banner bg-red-2 text-red-10">{{ error }}</div>
    <div v-else-if="!loading && rows.length === 0" class="q-banner bg-grey-2">
      Kayıt bulunamadı.
    </div>

    <!-- QTable varsa: -->
    <q-table
        v-if="hasQTable"
        :rows="rows"
        :columns="columns"
        row-key="id"
        dense flat bordered
        :loading="loading"
        :pagination="{ rowsPerPage: 50 }"
        class="q-mt-md"
    />

    <!-- QTable YOKSA: düz HTML tablo -->
    <div v-else class="q-mt-md">
      <div class="q-banner bg-amber-2 text-amber-10 q-pa-sm q-mb-sm">
        QTable bulunamadı; düz HTML tablo gösteriliyor.
      </div>
      <div style="overflow:auto; max-width:100%;">
        <table class="q-table" style="min-width:1200px; border-collapse:collapse; width:100%;">
          <thead>
          <tr>
            <th v-for="c in columns" :key="c.name" style="text-align:left; border-bottom:1px solid #ddd; padding:6px;">
              {{ c.label }}
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.id }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ fmtTs(r.ts) }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.level }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.module }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.method }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">
              <code>{{ r.route }}</code>
            </td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.status }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.duration_ms }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.client_ip }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.ekleyen }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.koli_id }}</td>
            <td style="padding:6px; border-bottom:1px solid #f0f0f0">{{ r.error_msg }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tanılama için küçük ham JSON -->
    <details class="q-mt-md">
      <summary>Ham JSON (ilk 10)</summary>
      <pre style="max-height:260px; overflow:auto">{{ pretty(raw.slice(0,10)) }}</pre>
    </details>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'


// QTable yüklenmiş mi? (global check)
const hasQTable = computed(() => {
  // Quasar 2 (Vue 3) global işaretleri:
  return !!(window?.Quasar) // çoğu kurulumda yeterli
})

const API_BASE = import.meta.env?.VITE_API_URL || ''
const loading = ref(false)
const error = ref('')
const limit = ref(200)
const filters = ref({ level:'', method:'', route:'', since:'', until:'' })

const raw = ref([])
const rows = ref([])

const columns = [
  { name:'id',         label:'ID',       field:'id',          align:'left', sortable:true },
  { name:'ts',         label:'Tarih',    field:'ts',          align:'left', sortable:true },
  { name:'level',      label:'Seviye',   field:'level',       align:'left', sortable:true },
  { name:'module',     label:'Modül',    field:'module',      align:'left', sortable:true },
  { name:'method',     label:'Method',   field:'method',      align:'left', sortable:true },
  { name:'route',      label:'Route',    field:'route',       align:'left', sortable:false },
  { name:'status',     label:'Durum',    field:'status',      align:'left', sortable:true },
  { name:'duration_ms',label:'Süre (ms)',field:'duration_ms', align:'right',sortable:true },
  { name:'client_ip',  label:'IP',       field:'client_ip',   align:'left', sortable:true },
  { name:'ekleyen',    label:'Ekleyen',  field:'ekleyen',     align:'left', sortable:true },
  { name:'koli_id',    label:'Koli ID',  field:'koli_id',     align:'left', sortable:true },
  { name:'error_msg',  label:'Hata',     field:'error_msg',   align:'left', sortable:false }
]

function qstr(obj){
  const e = encodeURIComponent
  const ent = Object.entries(obj).filter(([,v]) => v !== '' && v != null)
  return ent.length ? '?' + ent.map(([k,v]) => `${e(k)}=${e(v)}`).join('&') : ''
}
function apiUrl(path){ return API_BASE ? new URL(path, API_BASE).href : path }
async function fetchJson(path){
  const r = await fetch(apiUrl(path), { headers: { 'Accept': 'application/json' } })
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}
function pretty(o){ try{ return JSON.stringify(o,null,2)}catch{ return String(o ?? '') } }
function fmtTs(v){ return v ? String(v).replace('T',' ').slice(0,19) : '-' }

function normalize(arr){
  return arr.map((it, idx) => ({
    id: String(it.id ?? idx+1),
    ts: it.ts ?? null,
    level: it.level ?? '',
    module: it.module ?? '',
    method: it.method ?? '',
    route: it.route ?? '',
    status: it.status ?? null,
    duration_ms: it.duration_ms ?? null,
    client_ip: it.client_ip ?? '',
    ekleyen: it.ekleyen ?? '',
    koli_id: it.koli_id ?? '',
    error_msg: it.error_msg ?? ''
  }))
}

async function loadLogs(){
  loading.value = true
  error.value = ''
  try{
    const params = { limit: limit.value, ...filters.value }
    const data = await fetchJson(`/apilog/logs${qstr(params)}`)
    raw.value = Array.isArray(data) ? data : []
    rows.value = normalize(raw.value)
  }catch(e){
    console.error('Log yükleme hatası:', e)
    error.value = `Loglar yüklenemedi: ${e?.message || e}`
    raw.value = []
    rows.value = []
  }finally{
    loading.value = false
  }
}

function resetFilters(){
  filters.value = { level:'', method:'', route:'', since:'', until:'' }
  loadLogs()
}

onMounted(loadLogs)
</script>