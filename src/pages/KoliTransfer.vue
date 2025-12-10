<!-- src/pages/Transfer.vue -->
<template>
  <div class="page">
    <!-- Üst başlık -->
    <header class="topbar">
      <div>
        <h1>Koli Transfer</h1>
        <p class="sub">Soldan kolileri seç; sağdaki kartlar arasında satırları sürükle-bırak ile staging’e ekle. Önizle → Kaydet.</p>
      </div>
      <div class="actions">
        <button class="btn" @click="doPreview" :disabled="!staged.length || loadingPreview">
          <span v-if="!loadingPreview">Önizleme</span>
          <span v-else class="inline"><span class="spinner xs"></span> Önizleniyor</span>
        </button>
        <button class="btn primary" @click="doCommit" :disabled="!staged.length || loadingCommit">
          <span v-if="!loadingCommit">Kaydet (Transfer)</span>
          <span v-else class="inline"><span class="spinner xs"></span> Çalışıyor</span>
        </button>
      </div>
    </header>

    <div class="layout">
      <!-- SOL: Arama + Liste -->
      <aside class="side">
        <div class="card search">
          <div class="row">
            <!-- ✅ Arama + QR -->
            <div class="scan-row" style="width:100%">
              <input
                  v-model.trim="filters.q"
                  placeholder="Ara: #id, kolikodu…"
                  @input="onSearchInput"
                  @keydown.enter.prevent="goFirstAndLoad"
                  style="flex:1"
              />
              <button
                  class="scan-btn mobile-only"
                  title="Kameradan tara"
                  @click="openScanner({ label:'Koli / Kod', setValue:(v)=>{filters.q=v}, autoSearch:true })"
              >📷</button>
            </div>
          </div>
          <div class="row opts">
            <label class="chk">
              <input type="checkbox" v-model="filters.includeClosed" @change="goFirstAndLoad">
              Kapalı kolileri göster
            </label>
            <div class="spacer"></div>
            <button class="btn mini" @click="goFirstAndLoad" :disabled="loadingList">
              <span v-if="!loadingList">Ara</span>
              <span v-else class="inline"><span class="spinner xs"></span></span>
            </button>
          </div>
        </div>

        <div class="card list">
          <div class="list-head">
            <div class="muted">Kayıtlar</div>
            <div class="muted tiny">{{ list.length }} adet</div>
          </div>

          <!-- iskelet -->
          <template v-if="loadingList">
            <div v-for="i in 7" :key="'sk'+i" class="skeleton row"></div>
          </template>

          <!-- sonuçlar -->
          <template v-else>
            <div class="list-actions" v-if="list.length">
              <button class="btn mini" @click="selectAllVisible">Tümünü Ekle</button>
              <button class="btn mini outline" @click="clearSelection" :disabled="!selectedIds.length">Seçimi Temizle</button>
            </div>

            <label
                v-for="k in list"
                :key="k.id"
                class="row item"
                :title="`#${k.id} • ${k.kolikodu}`"
            >
              <input
                  type="checkbox"
                  :checked="selectedSet.has(k.id)"
                  @change="toggleSelect(k)"
              />
              <span class="mono id">#{{ k.id }}</span>
              <span class="code code-sm">{{ k.kolikodu }}</span>
              <span class="tag" :class="'st-'+(k.durum||'draft')">{{ k.durum || 'draft' }}</span>
              <span v-if="k.yerkodu" class="pill">Yer: {{ k.yerkodu }}</span>
              <span v-if="k.juliandate != null" class="pill">J: {{ k.juliandate }}</span>
            </label>

            <div v-if="!list.length" class="empty">Sonuç yok</div>
          </template>

          <!-- ✅ Sayfalama -->
          <div class="pager" v-if="!loadingList">
            <div class="pager-left">
              <span class="tiny muted">Sayfa başına</span>
              <select v-model.number="pageSize" @change="goFirstAndLoad">
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
            <div class="pager-right">
              <button class="btn" @click="goPrev" :disabled="offset===0 || loadingList">« Önceki</button>
              <span class="tiny muted">Sayfa {{ page }}</span>
              <button class="btn" @click="goNext" :disabled="!hasMore || loadingList">Sonraki »</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- SAĞ: Seçili koli kartları -->
      <main class="main">
        <div class="grid">
          <!-- Kart iskeletleri -->
          <template v-if="loadingSelected">
            <div v-for="i in 3" :key="'ks'+i" class="card skel"></div>
          </template>

          <!-- Kartlar -->
          <div
              v-for="id in selectedIds"
              :key="'k'+id"
              class="card koli"
              @dragover.prevent
              @drop="onDrop($event, id)"
          >
            <div class="k-head">
              <div class="left">
                <span class="mono">#{{ id }}</span>
                <span class="code">{{ getMeta(id)?.kolikodu || '-' }}</span>
                <span class="badge" :class="'st-'+(getMeta(id)?.durum||'draft')">{{ getMeta(id)?.durum || 'draft' }}</span>
              </div>
              <div class="right">
                <button class="btn mini" @click="refreshOne(id)" :disabled="loadingContent.has(id)">
                  <span v-if="!loadingContent.has(id)">↻</span>
                  <span v-else class="inline"><span class="spinner xs"></span></span>
                </button>
                <button class="btn mini outline" @click="removeSelected(id)">✕</button>
              </div>
            </div>

            <div class="k-meta">
              <span v-if="getMeta(id)?.juliandate != null" class="pill">J: {{ getMeta(id).juliandate }}</span>
              <span v-if="getMeta(id)?.yerkodu" class="pill">Yer: {{ getMeta(id).yerkodu }}</span>
              <span v-if="hasAnyWeight(getMeta(id))" class="pill weight">Bekl: {{ fmtGram(getMeta(id).expected_weight_gram) }}</span>
              <span v-if="Number(getMeta(id)?.measured_weight_gram) > 0" class="pill weight">Tartı: {{ fmtGram(getMeta(id).measured_weight_gram) }}</span>
            </div>

            <!-- İçerik (+ taslak delta ile) -->
            <div class="k-body">
              <div v-if="loadingContent.has(id)" class="muted tiny inline">
                <span class="spinner xs"></span> Yükleniyor…
              </div>

              <template v-else>
                <div v-if="displayedRows(id).length === 0" class="empty tiny">İçerik yok</div>

                <div
                    v-for="row in displayedRows(id)"
                    :key="rowKey(row)"
                    class="item"
                    draggable="true"
                    @dragstart="onDragStart($event, id, row)"
                    :title="dragTitle(id, row)"
                >
                  <div class="line">
                    <span class="code">{{ row.material }}</span>
                    <span class="muted">{{ row.secenek || '-' }}</span>
                  </div>
                  <div class="line thin">
                    <span>Lot: {{ row.lotno || '-' }}</span>
                    <span>Seri: {{ row.serino || '-' }}</span>
                    <span>SKT: {{ formatDate(row.skt) }}</span>
                  </div>
                  <div class="line">
                    <b>{{ row.netmiktar }}</b> <span class="muted">{{ row.birim }}</span>
                  </div>

                  <!-- taslak delta rozeti -->
                  <div
                      v-if="deltaBadge(id, row)"
                      class="delta"
                      :class="{ pos: deltaVal(id,row) > 0, neg: deltaVal(id,row) < 0 }"
                  >
                    {{ deltaBadge(id, row) }}
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div v-if="!selectedIds.length && !loadingSelected" class="empty wide">
            Soldan koli seçin.
          </div>
        </div>

        <!-- Staging paneli -->
        <section class="card staging" v-if="staged.length || preview.issues.length">
          <div class="s-head">
            <h3>Taslak Transferler</h3>
            <div class="muted tiny">Miktarları düzenleyip Önizle → Kaydet yapın.</div>
            <div class="spacer"></div>
            <button class="btn" @click="clearStaging" :disabled="!staged.length && !preview.issues.length">Temizle</button>
          </div>

          <div class="table-head">
            <div class="th w80">Kaynak</div>
            <div class="th w80">Hedef</div>
            <div class="th">Material</div>
            <div class="th">Varyant</div>
            <div class="th">Lot</div>
            <div class="th">Seri</div>
            <div class="th w120">SKT</div>
            <div class="th w90">Birim</div>
            <div class="th w120 right">Miktar</div>
            <div class="th w90"></div>
          </div>

          <div class="table-body">
            <div v-for="(it, i) in staged" :key="'sg'+i" class="tr">
              <div class="td w80">#{{ it.fromId }}</div>
              <div class="td w80">#{{ it.toId }}</div>
              <div class="td"><span class="code">{{ it.material }}</span></div>
              <div class="td">{{ it.secenek || '-' }}</div>
              <div class="td">{{ it.lotno || '-' }}</div>
              <div class="td">{{ it.serino || '-' }}</div>
              <div class="td w120">{{ formatDate(it.skt) }}</div>
              <div class="td w90">{{ it.birim }}</div>
              <div class="td w120 right">
                <input type="number" min="0" v-model.number="it.miktar" class="num" />
              </div>
              <div class="td w90">
                <button class="btn danger mini" @click="removeStaged(i)">Sil</button>
              </div>
            </div>

            <div v-if="!staged.length" class="empty">Henüz staging yok.</div>
          </div>

          <!-- Önizleme sorunları -->
          <div v-if="preview.issues.length" class="issues">
            <div class="title">Önizleme Uyarıları / Hatalar</div>
            <ul>
              <li v-for="(is, idx) in preview.issues" :key="'is'+idx">• {{ is.msg }}</li>
            </ul>
          </div>

          <div class="s-actions">
            <div v-if="preview.ok" class="muted tiny">
              Δ Ağırlık (toplam): {{ fmtGram(preview?.preview?.totalWeightDeltaGram || 0) }}
            </div>
            <div class="spacer"></div>
            <p v-if="msg.ok" class="msg ok">✓ {{ msg.ok }}</p>
            <p v-if="msg.err" class="msg err">⚠️ {{ msg.err }}</p>
          </div>
        </section>
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
import { ref, reactive, computed } from 'vue'
import api from '../api'

/* ───────────────────── SOL PANEL: Arama & Liste ───────────────────── */
const filters = reactive({ q:'', includeClosed:false })
const list = ref([])
const loadingList = ref(false)
let debounceT = null

/* ✅ Sayfalama state (20’li varsayılan) */
const pageSize = ref(20)
const offset = ref(0) // API offset
const hasMore = ref(false)
const page = computed(() => Math.floor(offset.value / pageSize.value) + 1)

function onSearchInput(){
  clearTimeout(debounceT)
  debounceT = setTimeout(goFirstAndLoad, 250)
}

function normalizeQ(raw){
  let v = String(raw || '').trim()
  if (!v) return ''
  if (v.startsWith('#')) v = v.slice(1).trim() // #123 → 123
  return v
}

function goFirstAndLoad(){
  offset.value = 0
  loadKoliList()
}

async function loadKoliList(){
  loadingList.value = true
  try{
    // 🔧 koli kodu araması düzeltildi: normalize edip gönderiyoruz
    const qNorm = normalizeQ(filters.q)

    const params = {
      q: qNorm || undefined,
      includeClosed: filters.includeClosed ? 'true' : 'false',
      size: pageSize.value,
      offset: offset.value,
    }

    const { data, headers } = await api.api2.listKoliler(params)
    const arr = Array.isArray(data) ? data : (data.items || [])
    list.value = arr

    // meta cache
    for(const k of arr) metaCache[k.id] = k

    // hasMore: header varsa onu kullan, yoksa uzunluk == pageSize ise daha var kabul et
    const headerHasMore = headers?.['x-has-more']
    hasMore.value = headerHasMore != null ? headerHasMore === '1' : (arr.length === pageSize.value)
  }catch(e){
    list.value = []
    hasMore.value = false
  }finally{
    loadingList.value = false
  }
}

/* ─────────────── SEÇİM: checkbox ile seç → kart oluştur ───────────── */
const selectedIds = ref([])          // sağ tarafta gösterilecek kartlar
const selectedSet = computed(() => new Set(selectedIds.value))
const loadingSelected = ref(false)

function getMeta(id){ return metaCache[id] || list.value.find(x=>x.id===id) || null }
function toggleSelect(k){
  const id = k.id
  if (selectedSet.value.has(id)){
    removeSelected(id)
  }else{
    selectedIds.value = [...selectedIds.value, id]
    ensureContentLoaded(id)
  }
}
function selectAllVisible(){
  const ids = list.value.map(x=>x.id)
  const merged = new Set([...selectedIds.value, ...ids])
  selectedIds.value = [...merged]
  ids.forEach(id => ensureContentLoaded(id))
}
function clearSelection(){
  selectedIds.value = []
  icerik.value = {}
}
function removeSelected(id){
  selectedIds.value = selectedIds.value.filter(x => x !== id)
  delete icerik.value[id]
}

/* ─────────────── İÇERİK YÜKLEME & YENİLEME ─────────────── */
const icerik = ref({})                     // { [koliId]: row[] }
const loadingContent = ref(new Set())
const metaCache = {}                       // id→koli meta

function normalizeDateKey(v){
  if(!v) return ''
  try{ const d=new Date(v); return isNaN(d)? String(v): d.toISOString().slice(0,10) }catch{ return String(v) }
}
function rowKey(r){
  return [
    r.material,
    r.secenek || '',
    r.lotno || '',
    r.serino || '',
    normalizeDateKey(r.skt) || '',
    r.birim || 'ADET'
  ].join('|')
}
function keyFromLine(ln){
  return [
    String(ln.material||'').trim(),
    (ln.secenek||'')?.trim() || '',
    (ln.lotno||'')?.trim() || '',
    (ln.serino||'')?.trim() || '',
    normalizeDateKey(ln.skt) || '',
    (ln.birim||'ADET').trim()
  ].join('|')
}
function parseKey(k){
  const [material, secenek='', lotno='', serino='', skt='', birim='ADET'] = String(k).split('|')
  return { material, secenek, lotno, serino, skt: skt || null, birim }
}
function formatDate(v){ if(!v) return '-'; try{ const d=new Date(v); return isNaN(d)? String(v): d.toISOString().slice(0,10) }catch{ return String(v) } }
function hasAnyWeight(k){ return Number(k?.expected_weight_gram||0)>0 || Number(k?.measured_weight_gram||0)>0 }
function fmtGram(g){ const n=Number(g||0); if(n===0) return '0 g'; return n>=1000 ? `${n} g (${(n/1000).toFixed(3)} kg)` : `${n} g` }

async function ensureContentLoaded(id){
  if (icerik.value[id]) return
  await refreshOne(id)
}
async function refreshOne(id){
  loadingContent.value.add(id)
  try{
    const { data } = await api.api2.getKoliIcerik(id)
    icerik.value = { ...icerik.value, [id]: Array.isArray(data)? data : [] }
  }catch{
    icerik.value = { ...icerik.value, [id]: [] }
  }finally{
    loadingContent.value.delete(id)
  }
}

/* ─────────────── Taslak Delta (kart üstü canlı görünüm) ─────────────── */
const staged = ref([]) // {fromId,toId,material,secenek,lotno,serino,skt,birim,miktar}

const stagedDeltas = computed(() => {
  const map = {}
  for (const it of staged.value){
    const k = keyFromLine(it)
    const src = (map[it.fromId] ||= {})
    src[k] = (src[k] || 0) - Number(it.miktar || 0)
    const dst = (map[it.toId] ||= {})
    dst[k] = (dst[k] || 0) + Number(it.miktar || 0)
  }
  return map
})

function displayedRows(koliId){
  const base = (icerik.value[koliId] || [])
  const deltas = stagedDeltas.value[koliId] || {}

  const map = new Map()
  for (const r of base){
    map.set(rowKey(r), { ...r, netmiktar: Number(r.netmiktar) })
  }

  for (const [k, d] of Object.entries(deltas)){
    if (!d) continue
    if (map.has(k)){
      const row = map.get(k)
      row.netmiktar = Number(row.netmiktar) + Number(d)
      map.set(k, row)
    }else if (d > 0){
      const p = parseKey(k)
      map.set(k, {
        koliid: koliId,
        kolikodu: getMeta(koliId)?.kolikodu || '',
        ...p,
        netmiktar: Number(d)
      })
    }
  }

  const rows = [...map.values()].filter(r => Number(r.netmiktar) > 0)
  rows.sort((a,b) =>
      (a.material + (a.secenek||'') + (a.lotno||'') + (a.serino||''))
          .localeCompare(b.material + (b.secenek||'') + (b.lotno||'') + (b.serino||''))
  )
  return rows
}
function deltaVal(koliId, row){
  const d = (stagedDeltas.value[koliId] || {})[rowKey(row)] || 0
  return Number(d)
}
function deltaBadge(koliId, row){
  const d = deltaVal(koliId, row)
  if (!d) return ''
  return d > 0 ? `+${d} (taslak)` : `${d} (taslak)`
}

/* ─────────────── Drag & Drop ─────────────── */
function onDragStart(e, fromId, row){
  const payload = { fromId: Number(fromId), row }
  e.dataTransfer.setData('application/json', JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'copyMove'
}
function dragTitle(id, row){
  return `Kaynak #${id} • ${row.material} ${row.secenek||''} (miktar:${row.netmiktar} ${row.birim})`
}

function onDrop(e, targetId){
  try{
    const text = e.dataTransfer.getData('application/json')
    const payload = JSON.parse(text || '{}')
    const fromId = Number(payload.fromId)
    const toId = Number(targetId)
    if (!fromId || !toId || fromId === toId) return
    const r = payload.row || {}

    staged.value.push({
      fromId, toId,
      material: r.material,
      secenek: r.secenek || null,
      lotno: r.lotno || null,
      serino: r.serino || null,
      skt: r.skt || null,
      birim: r.birim || 'ADET',
      miktar: 1
    })
  }catch{ /* yut */ }
}

/* ─────────────── Staging → Preview / Commit ─────────────── */
function removeStaged(i){ staged.value.splice(i,1) }
function clearStaging(){ staged.value = []; preview.value = { ok:false, issues:[], preview:null }; msg.value={ok:'',err:''} }

function toMoves(){
  const map = new Map()
  for (const it of staged.value){
    const key = `${it.fromId}|${it.toId}`
    if (!map.has(key)) map.set(key, { fromId: it.fromId, toId: it.toId, lines: [] })
    map.get(key).lines.push({
      material: it.material,
      secenek: it.secenek || null,
      lotno: it.lotno || null,
      serino: it.serino || null,
      skt: it.skt || null,
      miktar: Number(it.miktar || 0),
      birim: it.birim || 'ADET'
    })
  }
  return [...map.values()]
}

const preview = ref({ ok:false, issues:[], preview:null })
const loadingPreview = ref(false)
const loadingCommit  = ref(false)
const msg = ref({ ok:'', err:'' })

async function doPreview(){
  msg.value = { ok:'', err:'' }
  loadingPreview.value = true
  try{
    const moves = toMoves()
    const { data } = await api.api2.transferPreview({ moves })
    preview.value = data || { ok:false, issues:[], preview:null }
    if (data.ok) msg.value.ok = 'Önizleme başarılı. Sorun görünmüyor.'
    else msg.value.err = 'Önizlemede uyarılar/hatalar var. Listeyi kontrol edin.'
  }catch(e){
    preview.value = { ok:false, issues:[], preview:null }
    msg.value.err = e?.response?.data?.error || e.message
  }finally{
    loadingPreview.value = false
  }
}

async function doCommit(){
  msg.value = { ok:'', err:'' }
  if (preview.value.issues?.length) {
    msg.value.err = 'Önizlemede sorunlar var. Lütfen düzeltin veya tekrar önizleyin.'
    return
  }
  loadingCommit.value = true
  try{
    const moves = toMoves()
    const { data } = await api.api2.transferCommit({ moves, ekleyen:'ui' })
    msg.value.ok = 'Transfer tamamlandı.'
    clearStaging()

    // ⚡ Liste + seçili kart içerikleri anında tazelensin
    await loadKoliList()
    const touched = Array.isArray(data?.touched) ? data.touched : []
    const toRefresh = touched.length ? touched : selectedIds.value
    await Promise.all(toRefresh.map(id => refreshOne(id)))
  }catch(e){
    msg.value.err = e?.response?.data?.error || e.message
  }finally{
    loadingCommit.value = false
  }
}

/* ✅ Sayfalama kontrolleri */
function goPrev(){
  if (offset.value >= pageSize.value){
    offset.value -= pageSize.value
    loadKoliList()
  }
}
function goNext(){
  if (hasMore.value){
    offset.value += pageSize.value
    loadKoliList()
  }
}

/* ─────────────── init ─────────────── */
loadKoliList()

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
/* Genel */
.page{ max-width:1400px; margin:20px auto; padding:0 12px }
.sub{ color:#6b7280; font-size:13px }
.inline{ display:inline-flex; align-items:center; gap:6px }
.btn{
  border:1px solid #d1d5db; background:#f9fafb; color:#111827;
  padding:8px 12px; border-radius:10px; cursor:pointer; transition:.15s ease;
}
.btn:hover{ transform: translateY(-1px) }
.btn.primary{ background:#111827; color:#fff; border-color:#111827 }
.btn.mini{ padding:6px 10px; border-radius:8px }
.btn.mini.outline{ background:#fff; border-color:#111827; color:#111827 }
.btn.danger{ background:#fee2e2; border-color:#fecaca; color:#7f1d1d }
.btn:disabled{ opacity:.6; cursor:not-allowed }

/* Üst bar */
.topbar{
  display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:12px;
  position: sticky; top:0; z-index:5; background:#fff; padding:8px 0;
}
.actions{ display:flex; gap:8px }

/* İki kolon düzeni */
.layout{ display:grid; grid-template-columns: 360px 1fr; gap:14px }
@media (max-width: 1024px){ .layout{ grid-template-columns: 1fr } }

/* Kart & iskelet */
.card{
  background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;
  box-shadow: 0 1px 0 rgba(16,24,40,.02);
}
.skeleton{
  background: linear-gradient(90deg, #f3f4f6, #eef2f7, #f3f4f6);
  background-size:200% 100%; animation: shimmer 1.2s infinite;
  border-radius:10px; height:44px; margin-bottom:8px;
}
.card.skel{ height:160px; }
@keyframes shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Sol panel */
.side .search .row{ display:flex; gap:6px; margin-bottom:8px }
.side input{
  flex:1; padding:10px; border:1px solid #e5e7eb; border-radius:10px; outline:none;
}
.side input:focus{ border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08) }
.side .row.opts{ align-items:center }
.chk{ display:flex; align-items:center; gap:6px; color:#374151; font-size:14px }
.list-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
.list-actions{ display:flex; gap:6px; margin-bottom:6px }
.list .row.item{
  display:grid; grid-template-columns: 24px 70px 1fr auto auto; gap:8px; align-items:center;
  padding:8px 0; border-bottom:1px solid #f3f4f6;
}
.list .row.item:hover{ background:#fafafa; cursor:pointer }
.list .row .id{ font-weight:700 }
.code-sm{ font-size:12px }

/* Sağ: grid kartlar */
.main .grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:12px }
.k-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:6px }
.k-head .left{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
.k-meta{ display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px }
.k-body{ display:flex; flex-direction:column; gap:8px; min-height:8px }

.item{
  position: relative;
  border:1px solid #eef2f7; border-radius:10px; padding:8px; background:#fafafa; cursor:grab;
}
.item:active{ cursor:grabbing }
.item:hover{ background:#f7f7fb }
.line{ display:flex; gap:8px; align-items:center; justify-content:space-between }
.line.thin{ font-size:12px; color:#6b7280 }

/* Taslak delta rozeti */
.delta{
  position:absolute; top:8px; right:8px;
  font-size:12px; padding:2px 8px; border-radius:999px;
  border:1px solid #d1d5db; background:#fff;
}
.delta.pos{ color:#065f46; border-color:#a7f3d0; background:#ecfdf5 }
.delta.neg{ color:#b91c1c; border-color:#fecaca; background:#fee2e2 }

/* Staging tablo */
.staging{ margin-top:14px }
.s-head{ display:flex; gap:10px; align-items:center; margin-bottom:8px }
.s-head h3{ margin:0 }
.table-head, .tr{
  display:grid; grid-template-columns: 80px 80px 1.1fr 1fr 1fr 1fr 120px 90px 120px 90px;
  gap:10px; align-items:center;
}
.table-head{ font-weight:600; color:#374151; padding:6px 8px; background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; margin-bottom:6px }
.table-body .tr{ padding:10px 8px; border-bottom:1px solid #f3f4f6; background:#fff }
.num{ width:100%; padding:7px 8px; border:1px solid #e5e7eb; border-radius:8px; text-align:right }

/* Rozetler */
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace }
.code{
  display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
.badge{
  display:inline-block; padding:3px 8px; border-radius:999px; font-size:12px; border:1px solid transparent; background:#f3f4f6; color:#111;
}
.badge.st-draft{ background:#eef2ff; color:#3730a3; border-color:#c7d2fe }
.badge.st-sealed{ background:#ecfdf5; color:#065f46; border-color:#a7f3d0 }
.badge.st-shipped{ background:#fff7ed; color:#9a3412; border-color:#fed7aa }
.pill{
  display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb;
  border-radius:999px; padding:2px 8px; font-size:12px; margin-right:6px; color:#374151;
}
.pill.weight{ background:#eef2ff; border-color:#c7d2fe }

/* Diğer */
.empty{
  color:#6b7280; background:#fafafa; padding:10px; border:1px dashed #e5e7eb; border-radius:10px; text-align:center
}
.empty.wide{ grid-column: 1 / -1 }
.msg{ margin-top:8px; font-size:13px }
.msg.ok{ color:#065f46 } .msg.err{ color:#b00020 }
.spinner{ width:18px; height:18px; border-radius:50%; border:3px solid #e5e7eb; border-top-color:#111827; animation: spin 1s linear infinite }
.spinner.xs{ width:14px; height:14px; border-width:2px }
@keyframes spin{ to{ transform: rotate(360deg) } }

/* ✅ QR/Barcode TARAYICI stilleri */
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