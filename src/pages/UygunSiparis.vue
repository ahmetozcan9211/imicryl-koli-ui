<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h2>📦 Sipariş Hazırlanabilirlik (API9)</h2>
        <p class="sub">
          Seçilen tarih aralığında girilmiş siparişlerin, koli sistemindeki stoklarla
          tam olarak hazırlanıp hazırlanamayacağını gösterir.
        </p>
      </div>
      <div class="right">
        <span class="chip" :class="orders.length ? 'chip-on' : 'chip-muted'">
          {{ orders.length ? (orders.length + ' sipariş listelendi') : 'Henüz liste boş' }}
        </span>
      </div>
    </header>

    <!-- 🔍 Arama Alanı -->
    <section class="card highlight">
      <div class="row wrap">
        <div class="field w170">
          <label>Başlangıç Tarihi</label>
          <input type="date" v-model="form.dateFrom"/>
        </div>
        <div class="field w170">
          <label>Bitiş Tarihi</label>
          <input type="date" v-model="form.dateTo"/>
        </div>
        <div class="field w150">
          <label>Belge Türü</label>
          <select v-model="form.doctype">
            <option value="">Seçiniz</option>
            <option value="SİPA">SIPA</option>
            <option value="YSIP">YSIP</option>
            <option value="NSİP">NSİP</option>
            <option value="SİP2">SİP2</option>
          </select>
        </div>
        <div class="field w200">
          <label>Sipariş Durumu (çoklu)</label>
          <select v-model="form.ordstat" multiple>
            <option value="0">Açık (0)</option>
            <option value="1">Kısmi (1)</option>
            <option value="2">Kapalı (2)</option>
          </select>
        </div>
        <div class="field w220 checkbox-field">
          <label>&nbsp;</label>
          <label class="checkline">
            <!-- ✅ includeUnmet ile senkron -->
            <input type="checkbox" v-model="form.includeUnmet"/>
            <span>Karşılamayan siparişleri de göster</span>
          </label>
        </div>
        <div class="actions">
          <button class="btn primary" @click="loadOrders" :disabled="loading || !form.doctype || !form.ordstat.length">
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
        <div>
          <h3>📋 Sipariş Listesi</h3>
          <div class="muted tiny">
            {{ orders.length }} kayıt
            <span v-if="orders.length">
              — Tam karşılanan: {{ fullyCoveredCount }} • Eksik: {{ unmetCount }}
            </span>
          </div>
        </div>
        <div class="actions">
          <button
              class="btn"
              @click="exportReport"
              :disabled="exporting || !orders.length"
          >
            <span v-if="!exporting">📄 Raporla</span>
            <span v-else class="inline">
              <span class="spinner xs"></span> Hazırlanıyor...
            </span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="empty tiny">
        <span class="spinner xs"></span> Sorgulanıyor...
      </div>

      <div v-else-if="!orders.length" class="empty">
        Seçilen kriterlere uygun sipariş bulunamadı.
      </div>

      <div v-else class="table">
        <div class="thead">
          <div class="th w90 sortable" @click="toggleSort('ordstat')">
            Belge
            <span class="sort-icon" v-if="sort.key === 'ordstat'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w120 sortable" @click="toggleSort('doctype')">
            Belge Türü
            <span class="sort-icon" v-if="sort.key === 'doctype'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w120 sortable" @click="toggleSort('docnum')">
            Sipariş No
            <span class="sort-icon" v-if="sort.key === 'docnum'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w80 right sortable" @click="toggleSort('line_count')">
            Satır
            <span class="sort-icon" v-if="sort.key === 'line_count'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w120 sortable" @click="toggleSort('has_box')">
            Koli
            <span class="sort-icon" v-if="sort.key === 'has_box'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w140 right sortable" @click="toggleSort('ordered_total')">
            Sipariş Toplamı
            <span class="sort-icon" v-if="sort.key === 'ordered_total'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w140 right sortable" @click="toggleSort('stock_total')">
            Serbest Stok
            <span class="sort-icon" v-if="sort.key === 'stock_total'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w140 right sortable" @click="toggleSort('missing_total')">
            Eksik
            <span class="sort-icon" v-if="sort.key === 'missing_total'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w140 sortable" @click="toggleSort('fully_covered')">
            Durum
            <span class="sort-icon" v-if="sort.key === 'fully_covered'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w160 sortable" @click="toggleSort('createdat')">
            Tarih
            <span class="sort-icon" v-if="sort.key === 'createdat'">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </div>

          <div class="th w90"></div>
        </div>

        <div class="tbody">
          <div
              v-for="o in sortedOrders"
              :key="o.doctype + '|' + o.docnum"
              class="tr"
              :class="{
              'row-ok': o.fully_covered,
              'row-bad': !o.fully_covered
            }"
          >
            <div>
              <span
                  class="badge"
                  :class="{
                  'st-open':   o.ordstat === 0,
                  'st-part':   o.ordstat === 1,
                  'st-closed': o.ordstat === 2
                }"
              >
                {{ ordstatLabel(o) }}

              </span>
            </div>

            <div class="td w90 mono">{{ o.doctype }}</div>
            <div class="td w120 mono">{{ o.docnum }}</div>
            <div class="td w80 right">{{ o.line_count }}</div>
            <div class="td w120">
              <span
                  v-if="o.has_box"
                  class="badge badge-ok"
              >
                📦 Var
              </span>
              <span
                  v-else
                  class="badge badge-no"
              >
                Yok
              </span>
            </div>
            <div class="td w140 right">{{ o.ordered_total }}</div>
            <div class="td w140 right">{{ o.stock_total }}</div>
            <div class="td w140 right">
              <span :class="o.missing_total > 0 ? 'txt-bad' : ''">
                {{ o.missing_total }}
              </span>
            </div>
            <div class="td w140">
              <span class="badge" :class="o.fully_covered ? 'badge-ok' : 'badge-no'">
                {{ o.fully_covered ? 'Tam karşılanır' : 'Eksik stok var' }}
              </span>
            </div>
            <div class="td w160 tiny muted">
              {{ fmtDateTime(o.createdat) }}
            </div>
            <div class="td w90">
              <button class="btn mini" @click="openCoverage(o)">
                Detay
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 🔍 Detay Modal (coverage) -->
    <div v-if="cov.open" class="modal-backdrop" @click.self="closeCoverage">
      <div class="modal">
        <div class="modal-head">
          <div>
            <b>Detay — {{ cov.order?.doctype }} {{ cov.order?.docnum }}</b>
            <div class="tiny muted">
              Sipariş / stok / eksik dağılımı, toplanan ve kalan ihtiyaç
            </div>
          </div>
          <button class="btn mini ghost" @click="closeCoverage">Kapat</button>
        </div>

        <div v-if="cov.loading" class="empty tiny">
          <span class="spinner xs"></span> Yükleniyor...
        </div>

        <template v-else>
          <div class="tiny muted" style="margin-bottom:8px">
            Toplam sipariş: <b>{{ cov.totals.original_total }}</b> •
            Toplanan: <b>{{ cov.totals.picked_total }}</b> •
            Kalan ihtiyaç: <b>{{ cov.totals.ordered_total }}</b> •
            Serbest stok: <b>{{ cov.totals.stock_total }}</b> •
            Eksik: <b :class="cov.totals.missing_total > 0 ? 'txt-bad' : ''">
            {{ cov.totals.missing_total }}
          </b>
          </div>

          <div class="cov-table">
            <div class="cov-head">
              <div class="th w140">Malzeme</div>
              <div class="th">Varyant</div>
              <div class="th w80 right">Birim</div>
              <div class="th w110 right">Toplam Sipariş</div>
              <div class="th w110 right">Toplanan</div>
              <div class="th w110 right">Kalan İhtiyaç</div>
              <div class="th w120 right">Serbest Stok</div>
              <div class="th w120 right">Eksik</div>
            </div>
            <div class="cov-body">
              <div
                  v-for="(ln, i) in cov.lines"
                  :key="i"
                  class="tr"
              >
                <div class="td w140 mono">{{ ln.material }}</div>
                <div class="td">{{ ln.voptions || '-' }}</div>
                <div class="td w80 right">{{ ln.qunit }}</div>
                <div class="td w110 right">{{ ln.original_ordered_qty }}</div>
                <div class="td w110 right">{{ ln.picked_qty }}</div>
                <div class="td w110 right">{{ ln.ordered_qty }}</div>
                <div class="td w120 right">{{ ln.stock_qty }}</div>
                <div class="td w120 right">
                  <span :class="ln.missing_qty > 0 ? 'txt-bad' : ''">
                    {{ ln.missing_qty }}
                  </span>
                </div>
              </div>
              <div v-if="!cov.lines.length" class="empty tiny">
                Satır bulunamadı.
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, reactive, computed} from 'vue'
import api from '../api'

const form = reactive({
  dateFrom: '',
  dateTo: '',
  doctype: '',
  includeUnmet: false,
  ordstat: []       // sipariş durumu filtresi
})

const loading = ref(false)
const exporting = ref(false)
const msg = reactive({err: '', info: ''})

const orders = ref([])

/* ✅ SIRALAMA STATE */
const sort = ref({
  key: null,     // hangi kolon
  dir: 'asc'     // asc | desc
})

function toggleSort (key) {
  if (sort.value.key === key) {
    sort.value.dir = sort.value.dir === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value.key = key
    sort.value.dir = 'asc'
  }
}

/* ✅ SIRALI LİSTE (orders değişmez) */
const sortedOrders = computed(() => {
  const arr = [...orders.value]
  if (!sort.value.key) return arr

  const dir = sort.value.dir === 'asc' ? 1 : -1
  const key = sort.value.key

  return arr.sort((a, b) => {
    let va = a[key]
    let vb = b[key]

    if (va == null && vb == null) return 0
    if (va == null) return -1 * dir
    if (vb == null) return 1 * dir

    // boolean
    if (typeof va === 'boolean' || typeof vb === 'boolean') {
      va = va ? 1 : 0
      vb = vb ? 1 : 0
      return (va - vb) * dir
    }

    // number (veya sayıya çevrilebilen)
    const na = Number(va)
    const nb = Number(vb)
    const bothNumeric = !Number.isNaN(na) && !Number.isNaN(nb) && (typeof va !== 'string' || va.trim() !== '') && (typeof vb !== 'string' || vb.trim() !== '')
    if (bothNumeric) {
      return (na - nb) * dir
    }

    // date (createdat vs)
    if (key === 'createdat') {
      return (new Date(va) - new Date(vb)) * dir
    }

    // string
    return String(va).localeCompare(String(vb), 'tr', { numeric: true, sensitivity: 'base' }) * dir
  })
})

const fullyCoveredCount = computed(() => orders.value.filter(o => o.fully_covered).length)
const unmetCount = computed(() => orders.value.filter(o => !o.fully_covered).length)

/* Coverage modal state */
const cov = reactive({
  open: false,
  loading: false,
  order: null,
  lines: [],
  totals: {
    original_total: 0,
    picked_total: 0,
    ordered_total: 0,
    stock_total: 0,
    missing_total: 0
  }
})

function fmtDateTime(v) {
  if (!v) return '-'
  try {
    const d = new Date(v)
    if (isNaN(d)) return String(v)
    return d.toLocaleString()
  } catch {
    return String(v)
  }
}

async function loadOrders() {
  msg.err = '';
  msg.info = ''
  orders.value = []

  if (!form.dateFrom && !form.dateTo) {
    msg.err = 'En az bir tarih seçmelisiniz.'
    return
  }
  if (!form.doctype) {
    msg.err = 'Belge türü seçmelisiniz.'
    return
  }
  if (!form.ordstat || !form.ordstat.length) {
    msg.err = 'En az bir sipariş durumu seçmelisiniz.'
    return
  }

  loading.value = true
  try {
    const params = {
      date_from: form.dateFrom || undefined,
      date_to: form.dateTo || undefined,
      doctype: form.doctype || undefined,
      include_unmet: form.includeUnmet ? 1 : 0
    }
    if (form.ordstat && form.ordstat.length) {
      params.ordstat = form.ordstat.join(',')
    }
    const {data} = await api.get('/api9/orders/fulfillable', {params})
    orders.value = Array.isArray(data?.orders) ? data.orders : []
    const cnt = Number(data?.count ?? orders.value.length)
    msg.info = `Toplam ${cnt} sipariş listelendi.`
  } catch (e) {
    msg.err = e?.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function openCoverage(order) {
  if (!order) return
  cov.open = true
  cov.loading = true
  cov.order = order
  cov.lines = []
  cov.totals = {
    original_total: 0,
    picked_total: 0,
    ordered_total: 0,
    stock_total: 0,
    missing_total: 0
  }

  try {
    const {data} = await api.get(
        `/api9/orders/${encodeURIComponent(order.doctype)}/${encodeURIComponent(order.docnum)}/coverage`
    )
    const lines = Array.isArray(data?.lines) ? data.lines : []
    cov.lines = lines

    let original_total = 0
    let picked_total = 0
    let need_total = 0
    let stock_total = 0
    let missing_total = 0

    for (const ln of lines) {
      const orig = Number(ln.original_ordered_qty ?? ln.ordered_qty ?? 0)
      const picked = Number(ln.picked_qty ?? 0)
      const need = Number(ln.ordered_qty ?? 0)
      const stock = Number(ln.stock_qty ?? 0)
      const miss = Number(ln.missing_qty ?? 0)

      original_total += orig
      picked_total += picked
      need_total += need
      stock_total += stock
      missing_total += miss
    }

    cov.totals = {
      original_total,
      picked_total,
      ordered_total: need_total,
      stock_total,
      missing_total
    }
  } catch (e) {
    cov.lines = []
  } finally {
    cov.loading = false
  }
}

function ordstatLabel(o) {
  const v = o.ordstat
  if (v === 0) return 'Açık'
  if (v === 1) return 'Kısmi'
  if (v === 2) return 'Kapalı'
  return 'Bilinmiyor'
}

function closeCoverage() {
  cov.open = false
}

/* 📄 Rapor oluşturma (CSV) */
async function exportReport() {
  if (!orders.value.length) return

  exporting.value = true
  try {
    const rows = []

    for (const o of orders.value) {
      const {data} = await api.get(
          `/api9/orders/${encodeURIComponent(o.doctype)}/${encodeURIComponent(o.docnum)}/coverage`
      )
      const lines = Array.isArray(data?.lines) ? data.lines : []

      for (const ln of lines) {
        rows.push({
          doctype: o.doctype,
          docnum: o.docnum,
          material: ln.material,
          voptions: ln.voptions || '',
          qunit: ln.qunit || 'ADET',
          original_ordered_qty: Number(ln.original_ordered_qty ?? ln.ordered_qty ?? 0),
          picked_qty: Number(ln.picked_qty ?? 0),
          need_qty: Number(ln.ordered_qty ?? 0),
          stock_qty: Number(ln.stock_qty ?? 0),
          missing_qty: Number(ln.missing_qty ?? 0)
        })
      }
    }

    if (!rows.length) {
      alert('Raporlanacak satır bulunamadı.')
      return
    }

    const header = [
      'Belge Türü',
      'Sipariş No',
      'Malzeme',
      'Varyant',
      'Birim',
      'Toplam Sipariş',
      'Toplanan',
      'Kalan İhtiyaç',
      'Serbest Stok',
      'Eksik'
    ]

    const csvLines = []
    csvLines.push(header.join(';'))

    for (const r of rows) {
      csvLines.push([
        r.doctype,
        r.docnum,
        r.material,
        r.voptions,
        r.qunit,
        r.original_ordered_qty,
        r.picked_qty,
        r.need_qty,
        r.stock_qty,
        r.missing_qty
      ].map(v => (v == null ? '' : String(v).replace(/;/g, ','))).join(';'))
    }

    const blob = new Blob([csvLines.join('\n')], {type: 'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const nowStr = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')

    a.href = url
    a.download = `siparis_karsilanabilirlik_${nowStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Rapor oluşturulurken hata: ' + (e?.response?.data?.error || e.message))
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 22px auto;
  padding: 0 12px
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 10px;
  padding: 10px 6px 8px;
  border-bottom: 1px solid #eef2f7;
  background: #ffffffcc;
  backdrop-filter: blur(6px);
}

.sub {
  color: #6b7280;
  font-size: 13px
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  margin: 10px 0;
  box-shadow: 0 1px 0 rgba(16, 24, 40, .02)
}

.card.highlight {
  border-color: #dbeafe;
  background: #f8fafc
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px
}

.row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin: 6px 0
}

.wrap {
  flex-wrap: wrap
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px
}

.w150 {
  width: 150px
}

.w170 {
  width: 170px
}

.w220 {
  width: 220px
}

.checkbox-field {
  min-width: 220px
}

.checkline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #374151
}

.checkline input {
  width: auto
}

input, select {
  padding: 9px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
}

input:focus, select:focus {
  border-color: #111827;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, .08)
}

.btn {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #111827;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: .15s;
}

.btn:hover {
  transform: translateY(-1px)
}

.btn.primary {
  background: #111827;
  color: #fff;
  border-color: #111827
}

.btn.mini {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px
}

.btn.ghost {
  background: #fff
}

.btn:disabled {
  opacity: .6;
  cursor: not-allowed
}

.badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.st-open {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.st-part {
  background: #fef9c3;
  border: 1px solid #fde68a;
  color: #92400e;
}

.st-closed {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.inline {
  display: inline-flex;
  align-items: center;
  gap: 6px
}

.spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  border-top-color: #111827;
  animation: spin 1s linear infinite;
}

.spinner.xs {
  width: 14px;
  height: 14px;
  border-width: 2px
}

@keyframes spin {
  to {
    transform: rotate(360deg)
  }
}

.chip {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px
}

.chip-muted {
  color: #6b7280
}

.chip-on {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46
}

.msg {
  margin-top: 6px;
  font-size: 13px
}

.msg.err {
  color: #b00020
}

.msg.ok {
  color: #065f46
}

.muted {
  color: #6b7280
}

.tiny {
  font-size: 12px
}

.empty {
  color: #6b7280;
  background: #fafafa;
  padding: 10px;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  text-align: center;
}

.empty.tiny {
  font-size: 12px
}

.table {
  margin-top: 6px
}

.thead, .tr {
  display: grid;
  grid-template-columns: 90px 120px 80px 120px 140px 140px 140px 140px 160px 90px;
  gap: 8px;
  align-items: center;
}

.thead {
  font-weight: 600;
  color: #374151;
  padding: 6px 8px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 10px;
}

.tbody .tr {
  padding: 8px 8px;
  border-bottom: 1px solid #f3f4f6;
  background: #fff;
  border-radius: 10px;
}

.td, .th {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap
}

/* ✅ SIRALANABİLİR BAŞLIK */
.sortable{
  cursor:pointer;
  user-select:none;
}
.sortable:hover{
  color:#111827;
}
.sort-icon{
  margin-left:6px;
  font-size:11px;
  opacity:.7;
}

.w90 {
  width: 90px
}

.w120 {
  width: 120px
}

.w140 {
  width: 140px
}

.w160 {
  width: 160px
}

.w80 {
  width: 80px
}

.right {
  text-align: right
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace
}

.row-ok {
  background: #f9fffb
}

.row-bad {
  background: #fff7f7
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
}

.badge-ok {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46
}

.badge-no {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b
}

.txt-bad {
  color: #b91c1c;
  font-weight: 600
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.modal {
  width: min(800px, 96vw);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 12px;
  box-shadow: 0 18px 60px rgba(0, 0, 0, .28);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cov-table {
  margin-top: 4px
}

.cov-head, .cov-body .tr {
  display: grid;
  grid-template-columns: 140px 1fr 80px 110px 110px 110px 120px 120px;
  gap: 8px;
  align-items: center;
}

.cov-head {
  font-weight: 600;
  color: #374151;
  padding: 6px 8px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 10px;
}

.cov-body .tr {
  padding: 6px 8px;
  border-bottom: 1px solid #f3f4f6;
}
.badge-ok{
  background:#ecfdf5;
  border:1px solid #a7f3d0;
  color:#065f46;
}

.badge-no{
  background:#fef2f2;
  border:1px solid #fecaca;
  color:#991b1b;
}
</style>