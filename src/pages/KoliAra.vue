<!-- src/pages/KoliHizliGor.vue -->
<template>
  <div class="page">
    <header class="header">
      <h1>Koli Hızlı Görüntüleme</h1>
      <p class="sub">Koli ID gir, veriler aşağıda aksın. (API6)</p>
    </header>

    <!-- Ortalanmış arama barı -->
    <div class="search-wrap">
      <div class="search-bar">
        <input
            v-model.trim="inputId"
            type="text"
            inputmode="numeric"
            placeholder="Koli ID yazın (örn: 1003)"
            @keyup.enter="loadAll"
        />
        <button class="btn primary" @click="loadAll" :disabled="loading">Ara</button>
      </div>
      <div class="hint">Enter’a basarak da arama yapabilirsiniz.</div>
    </div>

    <!-- Hatalar -->
    <div v-if="error" class="alert">Hata: {{ error }}</div>

    <!-- Özet/Detay -->
    <div v-if="ozet" class="card ozet">
      <div class="row1">
        <div class="left">
          <div class="title">
            <span class="mono">#{{ ozet.id }}</span>
            <h2>{{ ozet.kolikodu }}</h2>
            <span class="badge" :class="'st-'+(ozet.durum||'draft')">{{ ozet.durum || 'draft' }}</span>
          </div>
          <div class="kv">
            <span v-if="ozet.juliandate != null" class="pill">Julian: {{ ozet.juliandate }}</span>
            <span v-if="ozet.yerkodu" class="pill">Yer: {{ ozet.yerkodu }}</span>
          </div>
        </div>
        <div class="right">
          <div class="pill weight strong" v-if="hasAnyWeight(ozet)">
            Beklenen: {{ fmtGram(ozet.expected_weight_gram) }}
          </div>
          <div class="pill weight strong" v-if="Number(ozet.measured_weight_gram) > 0">
            Tartılan: {{ fmtGram(ozet.measured_weight_gram) }}
          </div>
          <div class="pill weight strong" :class="deltaOf(ozet) >= 0 ? 'pos' : 'neg'" v-if="hasAnyWeight(ozet)">
            Δ: {{ fmtGram(deltaOf(ozet)) }}
          </div>
          <div class="muted tiny">Oluşma: {{ fmt(ozet.olusmats) }}</div>
        </div>
      </div>

      <!-- ✅ Meta düzenleme alanı -->
      <div class="meta-grid">
        <div class="fg">
          <label>Belge No (sipariş no)</label>
          <input v-model.trim="metaForm.siparisno" placeholder="örn: 00024551" />
        </div>
        <div class="fg">
          <label>Belge Tipi</label>
          <select v-model="metaForm.doctype">
            <option value="">(boş)</option>
            <option>SIPA</option>
            <option>YSIP</option>
            <option>NSİP</option>
            <option>SİP2</option>
          </select>
        </div>
        <div class="fg">
          <label>Koli Tipi</label>
          <input v-model.trim="metaForm.kolitipi" placeholder="örn: NO9, Palet, vb." />
        </div>
        <div class="fg">
          <label>Yer Kodu</label>
          <input v-model.trim="metaForm.yerkodu" placeholder="örn: ARA-01-03" />
        </div>
        <div class="fg chk">
          <label class="lbl-inline">
            <input type="checkbox" v-model="metaForm.canias_islendi" />
            CANIAS işlendi
          </label>
        </div>
      </div>

      <!-- 🔸 Meta Kaydet çubuğu -->
      <div class="savebar" v-if="metaDirty">
        <div class="muted">Meta değişti.</div>
        <div class="save-actions">
          <button class="btn" @click="resetMeta" :disabled="saving">Vazgeç</button>
          <button class="btn primary" @click="saveMeta" :disabled="saving">
            <span v-if="!saving">Meta’yı Kaydet</span>
            <span v-else class="inline"><span class="spinner xs"></span> Kaydediliyor</span>
          </button>
        </div>
      </div>

      <!-- 🔹 Satır Kaydet çubuğu -->
      <div class="savebar" v-if="dirtyCount > 0">
        <div class="muted">Değişen satır: <b>{{ dirtyCount }}</b></div>
        <div class="save-actions">
          <button class="btn" @click="discardAll" :disabled="saving">Vazgeç</button>
          <button class="btn primary" @click="saveAll" :disabled="saving">
            <span v-if="!saving">Kaydet ({{ dirtyCount }})</span>
            <span v-else class="inline"><span class="spinner xs"></span> Kaydediliyor</span>
          </button>
        </div>
      </div>
    </div>

    <!-- İçerik Tablosu -->
    <div class="card" v-if="ozet">
      <div class="table-head">
        <div class="th">Malzeme</div>
        <div class="th">Varyant</div>
        <div class="th">Lot</div>
        <div class="th">Seri</div>
        <div class="th w120">SKT</div>
        <div class="th w100">Birim</div>
        <div class="th w140 right">Net Miktar</div>
      </div>

      <template v-if="loadingIcerik">
        <div v-for="i in 8" :key="'sk'+i" class="skeleton row"></div>
      </template>

      <div v-else class="table-body">
        <div
            v-for="r in icerik"
            :key="rowKey(r)"
            class="tr"
            :class="{ dirty: isDirty(r) }"
            :title="isDirty(r) ? 'Değişti, Kaydet’e basın' : ''"
        >
          <div class="td"><span class="code">{{ r.material }}</span></div>
          <div class="td">{{ r.secenek || '-' }}</div>
          <div class="td">{{ r.lotno || '-' }}</div>
          <div class="td">{{ r.serino || '-' }}</div>
          <div class="td w120">{{ formatSKT(r.skt) }}</div>
          <div class="td w100">{{ r.birim }}</div>
          <div class="td w140 right">
            <input
                type="number"
                min="0"
                class="num-input"
                v-model.number="draft[rowKey(r)]"
                @focus="ensureDraftSeed(r)"
            />
          </div>
        </div>

        <div v-if="!icerik.length" class="empty">Bu kolide içerik görünmüyor.</div>
      </div>
    </div>

    <!-- İlk yükleme placeholder -->
    <div v-if="!ozet && !loading && !error" class="placeholder">
      Koli ID girip arayın.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

/* ---- state ---- */
const inputId = ref('')
const loading = ref(false)
const loadingIcerik = ref(false)
const error = ref('')

const ozet = ref(null)
const icerik = ref([])

/* ---- draft / save state (satırlar) ---- */
const draft = ref({})    // key -> yeni miktar
const original = ref({}) // key -> orijinal miktar
const saving = ref(false)
const token = localStorage.getItem('imi_token')

/* ---- meta form ---- */
const metaForm = ref({
  siparisno: '',
  doctype: '',
  kolitipi: '',
  yerkodu: '',
  canias_islendi: false
})
const metaOrig = ref({}) // kıyas için

/* ---- helpers ---- */
function rowKey(r){
  return String(r.id ?? '')
}
function ensureDraftSeed(r){
  const k = rowKey(r)
  if (!(k in draft.value)) draft.value[k] = Number(r.netmiktar || 0)
}
function isDirty(r){
  const k = rowKey(r)
  const cur = draft.value[k]
  const orig = original.value[k]
  return Number(cur) !== Number(orig)
}
const dirtyCount = computed(()=>{
  return Object.keys(draft.value).filter(k => Number(draft.value[k]) !== Number(original.value[k])).length
})
function discardAll(){
  for (const k of Object.keys(original.value)) {
    draft.value[k] = original.value[k]
  }
}

function fmt(ts){
  if (!ts) return '-'
  const d = new Date(ts)
  return isNaN(d.getTime()) ? String(ts) : d.toLocaleString()
}
function formatSKT(val){
  if(!val) return '-'
  try{ const d = new Date(val); return isNaN(d)? String(val) : d.toISOString().slice(0,10) }catch{ return String(val) }
}
function hasAnyWeight(k){
  return Number(k?.expected_weight_gram || 0) > 0 || Number(k?.measured_weight_gram || 0) > 0
}
function deltaOf(k){
  const exp = Number(k?.expected_weight_gram || 0)
  const mea = Number(k?.measured_weight_gram || 0)
  return mea - exp
}
function fmtGram(g){
  const n = Number(g || 0)
  if (n === 0) return '0 g'
  if (n >= 1000) return `${n} g (${(n/1000).toFixed(3)} kg)`
  return `${n} g`
}

/* ---- meta dirty hesap ---- */
const metaDirty = computed(()=>{
  const a = metaForm.value, b = metaOrig.value
  return (
      String(a.siparisno||'') !== String(b.siparisno||'') ||
      String(a.doctype||'') !== String(b.doctype||'') ||
      String(a.kolitipi||'') !== String(b.kolitipi||'') ||
      String(a.yerkodu||'') !== String(b.yerkodu||'') ||
      Boolean(a.canias_islendi) !== Boolean(b.canias_islendi)
  )
})

function resetMeta(){
  metaForm.value = { ...metaOrig.value }
}

/* ---- fetchers ---- */
async function loadAll(){
  error.value = ''
  ozet.value = null
  icerik.value = []
  draft.value = {}
  original.value = {}
  metaForm.value = { siparisno:'', doctype:'', kolitipi:'', yerkodu:'', canias_islendi:false }
  metaOrig.value = { ...metaForm.value }

  const id = Number(inputId.value)
  if (!Number.isFinite(id) || id <= 0) { error.value = 'Geçerli bir Koli ID girin'; return }

  loading.value = true
  try{
    // Özet

    const r1 = await fetch(`https://koliapi.imicryl.server/api6/koli/${id}/ozet`, { headers: { 'Authorization': `Bearer ${token}`,'Accept':'application/json' }})
    if (!r1.ok){
      const j = await r1.json().catch(()=>({}))
      throw new Error(j.error || `Özet alınamadı (status ${r1.status})`)
    }
    const j1 = await r1.json()
    ozet.value = j1

    // Meta formu doldur
    metaForm.value = {
      siparisno: j1.siparisno ?? '',
      doctype: j1.doctype ?? '',
      kolitipi: j1.kolitipi ?? '',
      yerkodu: j1.yerkodu ?? '',
      canias_islendi: Boolean(j1.canias_islendi)
    }
    metaOrig.value = { ...metaForm.value }

    // İçerik
    await loadIcerik(id)
  }catch(e){
    error.value = e.message
  }finally{
    loading.value = false
  }
}

async function loadIcerik(id){
  loadingIcerik.value = true
  try{
    const r2 = await fetch(`https://koliapi.imicryl.server/api6/koli/${id}/icerik`, { headers: { 'Authorization': `Bearer ${token}`,'Accept':'application/json' }})
    if (!r2.ok){
      const j = await r2.json().catch(()=>({}))
      throw new Error(j.error || `İçerik alınamadı (status ${r2.status})`)
    }
    const j2 = await r2.json()
    icerik.value = Array.isArray(j2) ? j2 : []

    // orijinal & draft seedle
    const o = {}, d = {}
    for (const r of icerik.value){
      const k = rowKey(r)
      const val = Number(r.netmiktar || 0)
      o[k] = val
      d[k] = val
    }
    original.value = o
    draft.value = d
  }catch(e){
    error.value = e.message
    icerik.value = []
    original.value = {}
    draft.value = {}
  }finally{
    loadingIcerik.value = false
  }
}

async function saveAll(){
  if (!ozet.value?.id) return
  const id = ozet.value.id

  const updates = []
  // Satırları gez, id'ye göre hangi satır değişmiş bak
  for (const r of icerik.value) {
    const k = rowKey(r)
    const cur  = Number(draft.value[k])
    const orig = Number(original.value[k])
    if (cur !== orig) {
      updates.push({
        id: r.id,
        yeni_miktar: cur
      })
    }
  }

  if (!updates.length) return

  try{
    saving.value = true
    const res = await fetch(`https://koliapi.imicryl.server/api6/koli/${id}/satir/batch`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept':'application/json'
      },
      body: JSON.stringify({ updates })
    })
    if (!res.ok){
      const j = await res.json().catch(()=>({}))
      throw new Error(j.error || 'Kaydetme hatası')
    }
    // İçeriği tazele
    await loadIcerik(id)
  }catch(e){
    alert('Hata: ' + e.message)
  }finally{
    saving.value = false
  }
}

async function saveMeta(){
  if (!ozet.value?.id) return
  if (!metaDirty.value) return
  const id = ozet.value.id

  // Sadece değişen alanları gönder
  const body = {}
  for (const k of Object.keys(metaForm.value)){
    if (String(metaForm.value[k]) !== String(metaOrig.value[k])) body[k] = metaForm.value[k]
  }

  try{
    saving.value = true
    const res = await fetch(`https://koliapi.imicryl.server/api6/koli/${id}/meta`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`,'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok){
      const j = await res.json().catch(()=>({}))
      throw new Error(j.error || 'Meta kaydetme hatası')
    }
    const j = await res.json().catch(()=>({}))
    // Gelen güncel değerleri yansıt (özellikle normalize edilirse)
    if (j && typeof j === 'object'){
      ozet.value = { ...ozet.value, ...j } // doctype/yerkodu/kolitipi/siparisno/canias_islendi güncel
      metaForm.value = {
        siparisno: j.siparisno ?? metaForm.value.siparisno,
        doctype: j.doctype ?? metaForm.value.doctype,
        kolitipi: j.kolitipi ?? metaForm.value.kolitipi,
        yerkodu: j.yerkodu ?? metaForm.value.yerkodu,
        canias_islendi: j.canias_islendi ?? metaForm.value.canias_islendi
      }
    }
    metaOrig.value = { ...metaForm.value }
  }catch(e){
    alert('Hata: ' + e.message)
  }finally{
    saving.value = false
  }
}
</script>

<style scoped>
.page{ max-width:1100px; margin:24px auto; padding:0 12px }
.header{ margin-bottom:14px }
.header h1{ margin:0 }
.sub{ color:#6b7280; font-size:13px }

/* Ortalanmış arama barı */
.search-wrap{ display:flex; flex-direction:column; align-items:center; gap:6px; margin:12px 0 16px }
.search-bar{
  display:flex; gap:8px; align-items:center; justify-content:center; width:min(520px, 95%);
  background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:10px;
  box-shadow:0 1px 0 rgba(16,24,40,.02);
}
.search-bar input{
  flex:1; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; outline:none;
}
.search-bar input:focus{ border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08) }
.hint{ font-size:12px; color:#6b7280 }

/* Kart & genel UI */
.card{
  background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;
  box-shadow:0 1px 0 rgba(16,24,40,.02); margin-bottom:12px;
}
.btn{
  border:1px solid #d1d5db; background:#f9fafb; color:#111827;
  padding:8px 12px; border-radius:10px; cursor:pointer; transition:.15s ease;
}
.btn:hover{ transform: translateY(-1px) }
.btn.primary{ background:#111827; color:#fff; border-color:#111827 }
.inline{ display:inline-flex; align-items:center; gap:6px }
.spinner{
  width:18px; height:18px; border-radius:50%;
  border:3px solid #e5e7eb; border-top-color:#111827;
  animation: spin 1s linear infinite;
}
.spinner.xs{ width:14px; height:14px; border-width:2px }
@keyframes spin{ to{ transform: rotate(360deg) } }
.mono{ font-family: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", monospace }
.code{
  display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px;
  font-family: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
.pill{
  display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb;
  border-radius:999px; padding:2px 8px; font-size:12px; margin-right:6px; color:#374151;
}
.pill.weight{ background:#eef2ff; border-color:#c7d2fe }
.pill.weight.strong{ background:#e7fee7; border-color:#bbf7d0 }
.pill.weight.pos{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
.pill.weight.neg{ background:#fef2f2; border-color:#fecaca; color:#991b1b }
.badge{
  display:inline-block; padding:3px 8px; border-radius:999px; font-size:12px; border:1px solid transparent; background:#f3f4f6; color:#111;
}
.badge.st-draft{ background:#eef2ff; color:#3730a3; border-color:#c7d2fe }
.badge.st-sealed{ background:#ecfdf5; color:#065f46; border-color:#a7f3d0 }
.badge.st-shipped{ background:#fff7ed; color:#9a3412; border-color:#fed7aa }
.badge.st-cancelled{ background:#fee2e2; color:#7f1d1d; border-color:#fecaca }
.muted{ color:#6b7280 }
.muted.tiny, .tiny{ font-size:12px }

/* Özet alanı */
.ozet .row1{
  display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
}
.ozet .title{ display:flex; align-items:center; gap:10px }
.ozet .kv{ display:flex; gap:6px; flex-wrap:wrap }
.ozet .right{ display:flex; flex-direction:column; align-items:flex-end; gap:6px }

/* Meta form */
.meta-grid{
  display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-top:10px;
}
@media (max-width: 900px){ .meta-grid{ grid-template-columns: 1fr 1fr } }
@media (max-width: 520px){ .meta-grid{ grid-template-columns: 1fr } }
.fg{ display:flex; flex-direction:column; gap:6px }
.fg input, .fg select{
  padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; outline:none;
}
.fg input:focus, .fg select:focus{ border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08) }
.fg.chk{ display:flex; align-items:end; }
.lbl-inline{ display:flex; align-items:center; gap:8px; }

/* Kaydet barları */
.savebar{
  margin-top:8px;
  border:1px solid #e5e7eb;
  background:#f8fafc;
  border-radius:10px;
  padding:8px 10px;
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.save-actions{ display:flex; gap:8px; align-items:center }

/* Tablo */
.table-head, .tr{
  display:grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 120px 100px 140px; gap:10px; align-items:center;
}
.table-head{ font-weight:600; color:#374151; padding:6px 8px; background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; margin-bottom:6px }
.table-body .tr{
  padding:10px 8px; border-bottom:1px solid #f3f4f6;
}
.tr.dirty{ background:#fff7ed }
.td.w120{ width:120px }
.td.w100{ width:100px }
.td.w140{ width:140px }
.right{ text-align:right }
.num-input{
  width:100%;
  text-align:right;
  padding:6px 8px;
  border:1px solid #e5e7eb; border-radius:8px;
}
.num-input:focus{ outline:none; border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08) }

/* İskelet, alert, boş/placeholder */
.skeleton{
  background: linear-gradient(90deg, #f3f4f6, #eef2f7, #f3f4f6);
  background-size:200% 100%; animation: shimmer 1.2s infinite;
  border-radius:10px; height:44px; margin-bottom:8px;
}
@keyframes shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.alert{ padding:10px; border:1px solid #ffe08a; background:#fff7d6; color:#946200; border-radius:10px; margin-bottom:10px }
.empty{
  color:#6b7280; background:#fafafa; padding:12px; border:1px dashed #e5e7eb; border-radius:10px; margin-top:8px; text-align:center
}
.placeholder{
  border:1px dashed #e5e7eb; border-radius:12px; padding:24px; color:#6b7280; text-align:center; background:#fff; margin-top:8px;
}
</style>