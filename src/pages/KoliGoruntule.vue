<template>
  <div class="page">
    <!-- Başlık -->
    <header class="header">
      <div>
        <h1>Koli Görüntüleme</h1>
        <p class="sub">Soldan koli seç; sağda bilgileri ve içerik satırlarını gör. (Sadece okuma)</p>
      </div>
    </header>

    <div class="layout">
      <!-- SOL: Arama + Liste -->
      <aside class="side">
        <div class="card search">
          <div class="row">
            <label>Koli / Kod</label>
            <!-- ✅ QR butonu -->
            <div class="scan-row">
              <input v-model.trim="q" placeholder="örn: #123 veya K-2025-001" @keyup.enter="goFirstAndLoad" />
              <button
                  class="scan-btn mobile-only"
                  title="Kameradan tara"
                  @click="openScanner({ label:'Koli / Kod', setValue:(v)=>q.value=v, autoSearch:true })"
              >📷</button>
            </div>
          </div>
          <div class="row">
            <label>Sipariş No</label>
            <input v-model.trim="qSipa" placeholder="örn: 00024232" @keyup.enter="goFirstAndLoad" />
          </div>
          <div class="row">
            <label>Julian</label>
            <input v-model.trim="qJulian" placeholder="örn: 5294" @keyup.enter="goFirstAndLoad" />
          </div>

          <div class="actions">
            <button class="btn" @click="clearFilters" :disabled="!q && !qSipa && !qJulian">Temizle</button>
            <button class="btn primary" @click="goFirstAndLoad" :disabled="loadingList">
              <span v-if="!loadingList">Ara</span>
              <span v-else class="inline"><span class="spinner xs"></span> Yükleniyor</span>
            </button>
          </div>
        </div>

        <div class="card list">
          <div class="list-head">
            <div class="muted">Kayıtlar</div>
            <div class="muted tiny">{{ items.length }} adet</div>
          </div>

          <!-- Liste iskeleti -->
          <template v-if="loadingList">
            <div v-for="i in 7" :key="'s'+i" class="skeleton row"></div>
          </template>

          <!-- Liste -->
          <template v-else>
            <div
                v-for="k in items"
                :key="k.id"
                class="row-item"
                :class="{ active: selectedId === k.id }"
                @click="select(k)"
                :title="`#${k.id} • ${k.kolikodu}`"
            >
              <div class="row-top">
                <span class="mono">#{{ k.id }}</span>
                <span class="badge" :class="'st-'+(k.durum||'draft')">{{ k.durum || 'draft' }}</span>
              </div>
              <div class="row-mid">
                <div class="code">{{ k.kolikodu }}</div>
              </div>
              <div class="row-bot">
                <span v-if="k.siparisno" class="pill">
                  {{ (k.doctype || 'SIPA') }}: {{ k.siparisno }}
                </span>
                <span v-if="k.juliandate != null" class="pill">J: {{ k.juliandate }}</span>

                <!-- 🔽 Ağırlık rozetleri -->
                <span class="pill weight" v-if="hasAnyWeight(k)">
                  Bekl: {{ fmtGram(k.expected_weight_gram) }}
                </span>
                <span class="pill weight" v-if="Number(k.measured_weight_gram) > 0">
                  Tartı: {{ fmtGram(k.measured_weight_gram) }}
                </span>
                <span
                    class="pill weight"
                    :class="deltaOf(k) >= 0 ? 'pos' : 'neg'"
                    v-if="hasAnyWeight(k)"
                >
                  Δ: {{ fmtGram(deltaOf(k)) }}
                </span>

                <span v-if="k.yerkodu" class="pill">Yer: {{ k.yerkodu }}</span>
                <span v-if="k.canias_islendi" class="pill">Canias: {{ k.canias_islendi }}</span>
              </div>
            </div>

            <div v-if="!items.length" class="empty">
              Kayıt bulunamadı. Filtreleri değiştirip tekrar deneyin.
            </div>
          </template>

          <!-- ✅ Sayfalama (20’li sabit) -->
          <div class="pager" v-if="!loadingList">
            <div class="pager-left">
              <span class="tiny muted">Sayfa başına</span>
              <select v-model.number="pageSize" @change="goFirstAndLoad">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
            <div class="pager-right">
              <button class="btn" @click="goPrev" :disabled="page===1 || loadingList">« Önceki</button>
              <span class="tiny muted">Sayfa {{ page }}</span>
              <button class="btn" @click="goNext" :disabled="!hasMore || loadingList">Sonraki »</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- SAĞ: Detay + İçerik -->
      <main class="main">
        <div v-if="error" class="alert">Hata: {{ error }}</div>

        <!-- Detay paneli -->
        <div class="card detail" v-if="selected">
          <div class="detail-head">
            <div class="title">
              <span class="mono">#{{ selected.id }}</span>
              <h2>{{ selected.kolikodu }}</h2>
              <span class="badge" :class="'st-'+(selected.durum||'draft')">{{ selected.durum || 'draft' }}</span>
            </div>

            <div class="kv">
              <span v-if="selected.siparisno" class="pill">Belge: {{ selected.doctype || 'SIPA' }} {{ selected.siparisno }}</span>
              <span v-if="selected.juliandate != null" class="pill">Julian: {{ selected.juliandate }}</span>
              <span v-if="selected.yerkodu" class="pill">Yer: {{ selected.yerkodu }}</span>


              <!-- 🔽 Detayda ağırlıklar -->
              <span v-if="hasAnyWeight(selected)" class="pill weight strong">
                Beklenen: {{ fmtGram(selected.expected_weight_gram) }}
              </span>
              <span v-if="Number(selected.measured_weight_gram) > 0" class="pill weight strong">
                Tartılan: {{ fmtGram(selected.measured_weight_gram) }}
              </span>
              <span
                  v-if="hasAnyWeight(selected)"
                  class="pill weight strong"
                  :class="deltaOf(selected) >= 0 ? 'pos' : 'neg'"
              >
                Δ: {{ fmtGram(deltaOf(selected)) }}
              </span>
            </div>

            <div class="muted tiny">Oluşma: {{ fmt(selected.olusmats) }}</div>
          </div>
        </div>

        <!-- İçerik tablosu -->
        <div class="card" v-if="selected">
          <div class="table-head">
            <div class="th">Malzeme</div>
            <div class="th">Varyant</div>
            <div class="th">Lot</div>
            <div class="th">Seri</div>
            <div class="th w120">SKT</div>
            <div class="th w100">Birim</div>
            <div class="th w140 right">Net Miktar</div>
          </div>

          <!-- İçerik iskeleti -->
          <template v-if="loadingIcerik">
            <div v-for="i in 8" :key="'sk'+i" class="skeleton row"></div>
          </template>

          <div class="table-body" v-else>
            <div
                v-for="r in icerik"
                :key="r.material + '|' + (r.secenek||'') + '|' + (r.lotno||'') + '|' + (r.serino||'') + '|' + (r.skt||'')"
                class="tr"
            >
              <div class="td"><span class="code">{{ r.material }}</span></div>
              <div class="td">{{ r.secenek || '-' }}</div>
              <div class="td">{{ r.lotno || '-' }}</div>
              <div class="td">{{ r.serino || '-' }}</div>
              <div class="td w120">{{ formatSKT(r.skt) }}</div>
              <div class="td w100">{{ r.birim }}</div>
              <div class="td w140 right"><strong>{{ r.netmiktar }}</strong></div>
            </div>

            <div v-if="!icerik.length" class="empty">
              Bu kolide içerik görünmüyor.
            </div>
          </div>
        </div>

        <div v-else class="placeholder">
          Soldan bir koli seçin.
        </div>
      </main>
    </div>

    <!-- ✅ QR/Barcode tarayıcı modalı -->
    <div v-if="cam.open" class="scanner-modal">
      <div class="scanner-box">
        <div class="scanner-head">
          <b>{{ cam.label }}</b>
          <button class="close-x" @click="closeScanner">✕</button>
        </div>
        <video ref="videoEl" playsinline muted class="scanner-video"></video>
        <div class="scanner-hint">Kamerayı barkoda doğrultun…</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../api'

/* ── filtreler ── */
const q = ref('')         // kolikodu / id
const qSipa = ref('')     // sipariş no
const qJulian = ref('')   // juliandate (sayı)

/* ── liste ve seçim ── */
const items = ref([])
const loadingList = ref(false)
const selectedId = ref(null)
const selected = ref(null)
const error = ref('')

/* ✅ Sayfalama state (20’li) */
const pageSize = ref(10)
const offset = ref(0)          // API offset
const hasMore = ref(false)
const page = computed(() => Math.floor(offset.value / pageSize.value) + 1)

/* ── içerik ── */
const icerik = ref([])
const loadingIcerik = ref(false)

/* ── yardımcılar ── */
function fmt(ts){
  if (!ts) return '-'
  const d = new Date(ts)
  return isNaN(d.getTime()) ? String(ts) : d.toLocaleString()
}
function formatSKT(val){
  if(!val) return '-'
  try{ const d = new Date(val); return isNaN(d)? String(val) : d.toISOString().slice(0,10) }catch{ return String(val) }
}

/* 🔽 ağırlık yardımcıları */
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

/* küçük yardımcı */
function goFirstAndLoad(){
  offset.value = 0
  loadList()
}

/* ── veri çekenler ── */
async function loadList(){
  loadingList.value = true
  error.value = ''
  selectedId.value = null
  selected.value = null
  icerik.value = []

  try {
    // normalize: '#123' → '123'
    let qNorm = (q.value || '').trim()
    if (qNorm.startsWith('#')) qNorm = qNorm.slice(1).trim()

    let sipaNorm = (qSipa.value || '').trim()
    let julNorm = (qJulian.value || '').trim()
    if (julNorm && !/^\d+$/.test(julNorm)) julNorm = ''

    const params = {
      q: qNorm || undefined,
      siparisno: sipaNorm || undefined,
      juliandate: julNorm || undefined,
      size: pageSize.value,
      offset: offset.value,
    }

    // headers okumak için axios instance'ında { data, headers } döndürdüğünü varsayıyorum
    const { data, headers } = await api.listKoliler(params)

    // API düz dizi dönebilir; varsa {items} da destekle
    const list = Array.isArray(data) ? data : (data.items || [])
    items.value = list

    // hasMore: header varsa onu kullan; yoksa uzunluğa bak
    const headerHasMore = headers?.['x-has-more']
    hasMore.value = headerHasMore != null
        ? headerHasMore === '1'
        : (Array.isArray(list) && list.length === pageSize.value)

  } catch (e) {
    error.value = e?.response?.data?.error || e.message
    items.value = []
    hasMore.value = false
  } finally {
    loadingList.value = false
  }
}

function select(k){
  selectedId.value = k.id
  selected.value = k
  loadIcerik(k.id)
}

async function loadIcerik(id){
  loadingIcerik.value = true
  try {
    // Tekil güncel meta (ağırlıklar dahil)
    try {
      const { data } = await api.getKoli(id)
      selected.value = { ...(selected.value || {}), ...(data || {}) }
    } catch {}

    const { data } = await api.getKoliIcerik(id)
    icerik.value = Array.isArray(data) ? data : []
  } catch (e) {
    icerik.value = []
  } finally {
    loadingIcerik.value = false
  }
}

function clearFilters(){
  q.value = ''
  qSipa.value = ''
  qJulian.value = ''
  goFirstAndLoad()
}

/* ✅ Sayfalama kontrolleri */
function goPrev(){
  if (offset.value >= pageSize.value){
    offset.value -= pageSize.value
    loadList()
  }
}
function goNext(){
  if (hasMore.value){
    offset.value += pageSize.value
    loadList()
  }
}

/* ── ilk yüklemede liste ── */
loadList()

/* =======================================================
   ✅ QR/Barcode TARAYICI eklemesi (ZXing)
   ======================================================= */
let codeReader = null
const videoEl = ref(null)
const cam = ref({ open:false, label:'', autoSearch:false })
let applyValue = (v)=>{}

async function openScanner({ label, setValue, autoSearch = false }){
  applyValue = setValue || ((_)=>{})
  cam.value = { open:true, label, autoSearch }

  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  codeReader = new BrowserMultiFormatReader()

  try{
    const devices = await BrowserMultiFormatReader.listVideoInputDevices()
    const backCam = devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId
    const deviceId = backCam || devices[0]?.deviceId

    await codeReader.decodeFromVideoDevice(
        deviceId,
        videoEl.value,
        (result) => {
          if (result){
            const txt = result.getText()
            applyValue(txt)
            if (cam.value.autoSearch){
              setTimeout(()=> { goFirstAndLoad() }, 50)
            }
            closeScanner()
          }
        }
    )
  }catch(e){
    console.error('Kamera başlatma hatası:', e)
    closeScanner()
  }
}

function closeScanner(){
  try{ codeReader?.reset() }catch{}
  cam.value.open = false
}
</script>

<style scoped>
.page{ max-width:1200px; margin:24px auto; padding:0 12px }
.header{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px }
.sub{ color:#6b7280; font-size:13px }

/* İki kolon düzeni */
.layout{ display:grid; grid-template-columns: 360px 1fr; gap:14px }
@media (max-width: 960px){ .layout{ grid-template-columns: 1fr } }

/* Kart & genel UI */
.card{
  background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;
  box-shadow:0 1px 0 rgba(16,24,40,.02);
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
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace }
.code{
  display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
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

/* Sol panel – arama */
.side .search .row{ display:flex; flex-direction:column; gap:6px; margin-bottom:8px }
.side label{ font-size:13px; color:#374151 }
.side input{
  padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; outline:none;
}
.side input:focus{ border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08) }
.side .actions{ display:flex; gap:8px; justify-content:flex-end; align-items:center; margin-top:4px }

/* Sol panel – liste */
.list-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
.row-item{
  border:1px solid #eef2f7; border-radius:10px; padding:10px; margin-bottom:8px; cursor:pointer; background:#fafafa;
  transition:.12s ease;
}
.row-item:hover{ background:#f7f7fb }
.row-item.active{ border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.15); background:#fff }
.row-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:4px }
.row-mid .code{ font-weight:600 }
.row-bot{ display:flex; gap:6px; flex-wrap:wrap; margin-top:6px }

/* Sağ panel – detay */
.detail .detail-head{ display:flex; flex-direction:column; gap:6px }
.detail .title{ display:flex; align-items:center; gap:10px }
.kv{ display:flex; gap:6px; flex-wrap:wrap }

/* Tablo görünümü */
.table-head, .tr{
  display:grid; grid-template-columns: 1.2fr 1fr 1fr 1fr 120px 100px 140px; gap:10px; align-items:center;
}
.table-head{ font-weight:600; color:#374151; padding:6px 8px; background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; margin-bottom:6px }
.table-body .tr{
  padding:10px 8px; border-bottom:1px solid #f3f4f6;
}
.td.w120{ width:120px }
.td.w100{ width:100px }
.td.w140{ width:140px }
.right{ text-align:right }

/* İskelet */
.skeleton{
  background: linear-gradient(90deg, #f3f4f6, #eef2f7, #f3f4f6);
  background-size:200% 100%; animation: shimmer 1.2s infinite;
  border-radius:10px; height:44px; margin-bottom:8px;
}
@keyframes shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Diğer */
.alert{ padding:10px; border:1px solid #ffe08a; background:#fff7d6; color:#946200; border-radius:10px; margin-bottom:10px }
.empty{
  color:#6b7280; background:#fafafa; padding:12px; border:1px dashed #e5e7eb; border-radius:10px; margin-top:8px; text-align:center
}
.placeholder{
  border:1px dashed #e5e7eb; border-radius:12px; padding:24px; color:#6b7280; text-align:center; background:#fff
}

/* =======================================================
   ✅ QR/Barcode TARAYICI için ufak ek stiller
   ======================================================= */
.scan-row{ display:flex; gap:6px; align-items:center }
.scan-btn{
  border:1px solid #e5e7eb; background:#fff; padding:8px 10px; border-radius:10px; cursor:pointer;
}
.mobile-only{ display:none }
@media (max-width: 1024px){ .mobile-only{ display:inline-block } }

.scanner-modal{
  position:fixed; inset:0; background:rgba(0,0,0,.5);
  display:flex; align-items:center; justify-content:center; z-index:1000;
}
.scanner-box{
  width:min(520px, 92vw); background:#fff; border-radius:14px; padding:12px; box-shadow:0 20px 60px rgba(0,0,0,.35)
}
.scanner-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.close-x{ border:0; background:#f3f4f6; border-radius:8px; padding:6px 10px; cursor:pointer }
.scanner-video{ width:100%; max-height:60vh; border-radius:10px; background:#000 }
.scanner-hint{ margin-top:6px; font-size:12px; color:#6b7280 }

/* ✅ Sayfalama */
.pager{
  display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:10px;
}
.pager-left{ display:flex; align-items:center; gap:6px }
.pager-left select{
  padding:6px 8px; border:1px solid #e5e7eb; border-radius:8px;
}
.pager-right{ display:flex; align-items:center; gap:8px }
</style>