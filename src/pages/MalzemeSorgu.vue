<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h2>📦 Malzeme Bazlı Koli Sorgu (API10)</h2>
        <p class="sub">
          Girilen malzemeyi içeren kolileri, koli durumu / sipariş durumu / CANIAS işlendi
          filtreleri ile birlikte listeler.
        </p>
      </div>
      <div class="right">
        <span class="chip" :class="boxes.length ? 'chip-on' : 'chip-muted'">
          {{ boxes.length ? (boxes.length + ' koli listelendi') : 'Henüz liste boş' }}
        </span>
      </div>
    </header>

    <!-- 🔍 Filtre Alanı -->
    <section class="card highlight">
      <div class="row wrap">
        <div class="field w200">
          <label>Malzeme</label>
          <input
              v-model.trim="form.material"
              placeholder="örn: NRS01"
              @keydown.enter.prevent="loadBoxes"
          />
        </div>

        <div class="field w220">
          <label>Varyant (voptions)</label>
          <input
              v-model.trim="form.voptions"
              placeholder="örn: #PR01##UC01# (opsiyonel)"
              @keydown.enter.prevent="loadBoxes"
          />
        </div>

        <div class="field w220 checkbox-field">
          <label>&nbsp;</label>
          <label class="checkline">
            <input type="checkbox" v-model="form.includeReserved" />
            <span>Rezerve (siparişe bağlı) kolileri de dahil et</span>
          </label>
        </div>

        <div class="field w200">
          <label>CANIAS işlendi durumu</label>
          <select v-model="form.canias">
            <option value="">(Hepsi)</option>
            <option value="0">İşlenmemiş (0)</option>
            <option value="1">İşlenmiş (1)</option>
          </select>
        </div>

        <div class="actions">
          <button
              class="btn primary"
              @click="loadBoxes"
              :disabled="loading || !form.material"
          >
            <span v-if="!loading">🔍 Sorgula</span>
            <span v-else class="inline">
              <span class="spinner xs"></span> Yükleniyor...
            </span>
          </button>
        </div>
      </div>

      <p v-if="msg.err" class="msg err">⚠️ {{ msg.err }}</p>
      <p v-if="msg.info && !msg.err" class="msg ok">ℹ️ {{ msg.info }}</p>
    </section>

    <!-- 📋 Sonuçlar -->
    <section class="card">
      <div class="section-head">
        <h3>📋 Koli Listesi</h3>
        <div class="muted tiny">
          {{ boxes.length }} kayıt
          <span v-if="boxes.length">
            — CANIAS işlendi: {{ processedCount }} • İşlenmemiş: {{ unprocessedCount }}
          </span>
        </div>
      </div>

      <div v-if="loading" class="empty tiny">
        <span class="spinner xs"></span> Sorgulanıyor...
      </div>

      <div v-else-if="!boxes.length" class="empty">
        Seçilen kriterlere uygun koli bulunamadı.
      </div>

      <div v-else class="table">
        <div class="thead">
          <div class="th w80">ID</div>
          <div class="th w140">Koli Kodu</div>
          <div class="th w100">Durum</div>
          <div class="th w100">Depo</div>
          <div class="th w120">Sipariş No</div>
          <div class="th w120">Yer Kodu</div>
          <div class="th w120">Koli Tipi</div>
          <div class="th w120 right">Toplam Miktar</div>
          <div class="th w140">En Yakın SKT</div>
          <div class="th w120">CANIAS İşlendi</div>
        </div>

        <div class="tbody">
          <div
              v-for="b in boxes"
              :key="b.id"
              class="tr"
              :class="{
              'row-processed': b.canias_islendi,
              'row-unprocessed': !b.canias_islendi
            }"
          >
            <div class="td w80 mono">#{{ b.id }}</div>
            <div class="td w140 mono">{{ b.kolikodu }}</div>
            <div class="td w100">
              <span class="badge">{{ b.durum || '-' }}</span>
            </div>
            <div class="td w100 mono">{{ b.depokodu || '-' }}</div>
            <div class="td w120 mono">{{ b.siparisno || '-' }}</div>
            <div class="td w120 mono">{{ b.yerkodu || '-' }}</div>
            <div class="td w120 mono">{{ b.kolitipi || '-' }}</div>
            <div class="td w120 right">{{ b.total_qty }}</div>
            <div class="td w140 tiny muted">
              {{ formatDate(b.nearest_skt) }}
            </div>
            <div class="td w120">
              <span
                  class="badge"
                  :class="b.canias_islendi ? 'badge-ok' : 'badge-no'"
              >
                {{ b.canias_islendi ? 'Evet' : 'Hayır' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import api from '../api'

const form = reactive({
  material: '',
  voptions: '',
  includeReserved: false,
  canias: ''        // '' | '0' | '1'
})

const loading = ref(false)
const msg = reactive({ err: '', info: '' })
const boxes = ref([])

const processedCount = computed(
    () => boxes.value.filter(b => b.canias_islendi).length
)
const unprocessedCount = computed(
    () => boxes.value.filter(b => !b.canias_islendi).length
)

function formatDate(v) {
  if (!v) return '-'
  try {
    const d = new Date(v)
    if (isNaN(d)) return String(v)
    return d.toISOString().slice(0, 10)
  } catch {
    return String(v)
  }
}

async function loadBoxes() {
  msg.err = ''
  msg.info = ''
  boxes.value = []

  if (!form.material) {
    msg.err = 'Malzeme alanı zorunludur.'
    return
  }

  loading.value = true
  try {
    const params = {
      material: form.material,
      voptions: form.voptions || undefined,
      include_reserved: form.includeReserved ? 1 : 0,
      canias_islendi: form.canias || undefined
    }

    const { data } = await api.get('/api10/boxes/by-material', { params })
    boxes.value = Array.isArray(data?.boxes) ? data.boxes : []
    const cnt = Number(data?.count ?? boxes.value.length)
    msg.info = `Toplam ${cnt} koli listelendi.`
  } catch (e) {
    msg.err = e?.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page{ max-width:1200px; margin:22px auto; padding:0 12px }
.topbar{
  display:flex; justify-content:space-between; align-items:flex-end; gap:12px;
  margin-bottom:10px; padding:10px 6px 8px;
  border-bottom:1px solid #eef2f7; background:#ffffffcc; backdrop-filter: blur(6px);
}
.sub{ color:#6b7280; font-size:13px }
.card{
  background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;
  margin:10px 0; box-shadow:0 1px 0 rgba(16,24,40,.02)
}
.card.highlight{ border-color:#dbeafe; background:#f8fafc }
.section-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
.row{ display:flex; gap:12px; align-items:flex-end; margin:6px 0 }
.wrap{ flex-wrap:wrap }
.field{ display:flex; flex-direction:column; gap:6px; min-width:160px }
.w200{ width:200px } .w220{ width:220px }
.checkbox-field{ min-width:220px }
.checkline{ display:flex; align-items:center; gap:6px; font-size:13px; color:#374151 }
.checkline input{ width:auto }

input, select{
  padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; outline:none;
}
input:focus, select:focus{ border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08) }

.btn{
  border:1px solid #d1d5db; background:#f9fafb; color:#111827;
  padding:8px 12px; border-radius:10px; cursor:pointer; transition:.15s;
}
.btn:hover{ transform:translateY(-1px) }
.btn.primary{ background:#111827; color:#fff; border-color:#111827 }
.btn.mini{ padding:6px 10px; border-radius:8px; font-size:13px }
.btn.ghost{ background:#fff }
.btn:disabled{ opacity:.6; cursor:not-allowed }

.inline{ display:inline-flex; align-items:center; gap:6px }
.spinner{
  width:18px; height:18px; border-radius:50%;
  border:3px solid #e5e7eb; border-top-color:#111827;
  animation: spin 1s linear infinite;
}
.spinner.xs{ width:14px; height:14px; border-width:2px }
@keyframes spin{ to{ transform:rotate(360deg) } }

.chip{ padding:5px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; font-size:12px }
.chip-muted{ color:#6b7280 }
.chip-on{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }

.msg{ margin-top:6px; font-size:13px }
.msg.err{ color:#b00020 }
.msg.ok{ color:#065f46 }

.muted{ color:#6b7280 } .tiny{ font-size:12px }
.empty{
  color:#6b7280; background:#fafafa; padding:10px; border:1px dashed #e5e7eb;
  border-radius:10px; text-align:center;
}
.empty.tiny{ font-size:12px }

.table{ margin-top:6px }
.thead, .tr{
  display:grid;
  grid-template-columns: 80px 140px 100px 100px 120px 120px 120px 120px 140px 120px;
  gap:8px; align-items:center;
}
.thead{
  font-weight:600; color:#374151; padding:6px 8px; background:#f8fafc;
  border:1px solid #eef2f7; border-radius:10px;
}
.tbody .tr{
  padding:8px 8px; border-bottom:1px solid #f3f4f6; background:#fff; border-radius:10px;
}
.td, .th{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.w80{ width:80px } .w100{ width:100px } .w120{ width:120px } .w140{ width:140px }
.right{ text-align:right }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace }

.row-processed{ background:#f9fffb }
.row-unprocessed{ background:#fff7f7 }

.badge{
  display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px;
  border:1px solid #e5e7eb; background:#f3f4f6;
}
.badge-ok{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
.badge-no{ background:#fef2f2; border-color:#fecaca; color:#991b1b }
</style>