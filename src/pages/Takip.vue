<template>
  <div class="page">
    <!-- Üst başlık -->
    <header class="topbar">
      <div>
        <h2>📦 Günlük Hazırlanan Siparişler (API14)</h2>
        <p class="sub">
          Seçilen tarihte kapatılmış koliler üzerinden, sipariş bazlı hazırlanan koli ve içerik özetlerini gösterir.
        </p>
      </div>
    </header>

    <!-- Arama alanı -->
    <section class="card highlight">
      <div class="row wrap">
        <div class="field w200">
          <label>Tarih</label>
          <input type="date" v-model="form.date" />
        </div>
        <div class="actions">
          <button class="btn" @click="setToday" :disabled="loading">
            Bugün
          </button>
          <button class="btn primary" @click="loadReport" :disabled="loading || !form.date">
            <span v-if="!loading">🔍 Sorgula</span>
            <span v-else class="inline">
              <span class="spinner xs"></span> Yükleniyor...
            </span>
          </button>
        </div>
      </div>

      <p v-if="error" class="msg err">⚠️ {{ error }}</p>
      <p v-if="info && !error" class="msg ok">ℹ️ {{ info }}</p>
    </section>

    <!-- Özet -->
    <section v-if="report" class="card">
      <div class="section-head">
        <div>
          <h3>📊 Gün Özeti — {{ report.date }}</h3>
          <div class="tiny muted">
            Sipariş sayısı: <b>{{ report.totals.order_count }}</b> •
            Koli sayısı: <b>{{ report.totals.box_count }}</b> •
            Toplam Parça sayısı: <b>{{ totalPieceCount }}</b> •
            Toplam Kalem sayısı: <b>{{ totalLineCount }}</b> •
          </div>

        </div>
        <div class="doctype-chips">
          <span
              v-for="d in report.by_doctype"
              :key="d.doctype || 'empty'"
              class="chip"
          >
            {{ d.doctype || '(boş)' }}:
            {{ d.order_count }} sipariş / {{ d.box_count }} koli
          </span>
        </div>
      </div>
    </section>

    <!-- Sonuç tablosu -->
    <section class="card">
      <div class="section-head">
        <h3>📋 Sipariş &amp; Koli Detayları</h3>
        <div class="tiny muted">
          {{ orders.length }} sipariş
        </div>
      </div>

      <div v-if="loading" class="empty tiny">
        <span class="spinner xs"></span> Sorgulanıyor...
      </div>

      <div v-else-if="!orders.length">
        <div class="empty">
          Seçilen tarihte kapatılmış sipariş bulunamadı.
        </div>
      </div>

      <div v-else class="table">
        <!-- Sipariş satırları + altındaki koli listesi -->
        <div
            v-for="o in orders"
            :key="orderKey(o)"
            class="order-block"
        >
          <!-- Sipariş ana satırı -->
          <div
              class="tr order-row"
              :class="{ expanded: isExpanded(o) }"
              @click="toggleOrder(o)"
          >
            <div class="td w40 chevron">
              <span v-if="(o.boxes || []).length">
                {{ isExpanded(o) ? '▼' : '▶' }}
              </span>
            </div>
            <div class="td w100 mono">{{ o.doctype || '-' }}</div>
            <div class="td w140 mono">{{ o.siparisno || '-' }}</div>
            <div class="td w100 right">
              <b>{{ o.box_count }}</b> koli
            </div>
            <!-- 🔹 Yeni: sipariş bazında toplam kalem / parça -->
            <div class="td w160 tiny muted">
              {{ fmtInt(orderLineCount(o)) }} kalem / {{ fmtInt(orderPieceCount(o)) }} parça
            </div>
            <div class="td w160 tiny muted">
              İlk açılış: {{ fmtDateTime(o.first_opened_at) }}
            </div>
            <div class="td w160 tiny muted">
              Son kapanış: {{ fmtDateTime(o.last_closed_at) }}
            </div>
          </div>

          <!-- Alt koli tablosu -->
          <div
              v-if="isExpanded(o) && (o.boxes && o.boxes.length)"
              class="box-table-wrapper"
          >
            <div class="box-head">
              <div class="th w140">Koli Kodu</div>
              <div class="th w100">Durum</div>
              <div class="th w120">Yer</div>
              <div class="th w120 right">Kalem Sayısı</div>
              <div class="th w140 right">Parça Sayısı</div>
              <div class="th w160 right">Beklenen (g)</div>
              <div class="th w160 right">Tartılan (g)</div>
              <div class="th w180">Kapanış</div>
            </div>
            <div class="box-body">
              <div
                  v-for="b in o.boxes"
                  :key="b.box_id || b.kolikodu"
                  class="tr box-row"
              >
                <div class="td w140 mono kolikodu-full">{{ b.kolikodu || '-' }}</div>
                <div class="td w100">
                  <span class="badge" :class="'st-' + (b.durum || 'draft')">
                    {{ b.durum || 'draft' }}
                  </span>
                </div>
                <div class="td w120">{{ b.yerkodu || '-' }}</div>
                <div class="td w120 right">
                  {{ fmtInt(b.line_count) }}
                </div>
                <div class="td w140 right">
                  {{ fmtInt(b.piece_count) }}
                </div>
                <div class="td w160 right tiny muted">
                  {{ fmtGram(b.expected_weight_gram) }}
                </div>
                <div class="td w160 right tiny muted">
                  {{ fmtGram(b.measured_weight_gram) }}
                </div>
                <div class="td w180 tiny muted">
                  {{ fmtDateTime(b.closed_at) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Kolisi yoksa ufak not -->
          <div
              v-if="isExpanded(o) && (!o.boxes || !o.boxes.length)"
              class="empty tiny sub-box"
          >
            Bu siparişe ait koli kaydı bulunamadı.
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../api'

const todayStr = new Date().toISOString().slice(0, 10)

const form = ref({
  date: todayStr
})

const loading = ref(false)
const error = ref('')
const info = ref('')
const report = ref(null)

/** Hangi siparişler expand edilmiş? key -> true */
const expanded = ref({})

const orders = computed(() => {
  if (!report.value || !Array.isArray(report.value.orders)) return []
  return report.value.orders
})

function setToday () {
  form.value.date = todayStr
}

const totalLineCount = computed(() => {
  if (!report.value) return 0
  let sum = 0
  for (const o of report.value.orders || []) {
    for (const b of o.boxes || []) {
      sum += Number(b.line_count || 0)
    }
  }
  return sum
})

const totalPieceCount = computed(() => {
  if (!report.value) return 0
  let sum = 0
  for (const o of report.value.orders || []) {
    for (const b of o.boxes || []) {
      sum += Number(b.piece_count || 0)
    }
  }
  return sum
})

/* 🔹 Sipariş bazında kalem sayısı */
function orderLineCount (o) {
  let sum = 0
  for (const b of o.boxes || []) {
    sum += Number(b.line_count || 0)
  }
  return sum
}

/* 🔹 Sipariş bazında parça sayısı */
function orderPieceCount (o) {
  let sum = 0
  for (const b of o.boxes || []) {
    sum += Number(b.piece_count || 0)
  }
  return sum
}

function fmtDateTime (v) {
  if (!v) return '-'
  try {
    const d = new Date(v)
    if (isNaN(d)) return String(v)
    return d.toLocaleString()
  } catch {
    return String(v)
  }
}
function fmtInt (v) {
  const n = Number(v || 0)
  return n.toLocaleString('tr-TR')
}
function fmtGram (g) {
  const n = Number(g || 0)
  if (!n) return '-'
  return `${n.toLocaleString('tr-TR')} g`
}

function orderKey (o) {
  return `${o.doctype || ''}|${o.siparisno || ''}`
}
function isExpanded (o) {
  const k = orderKey(o)
  return !!expanded.value[k]
}
function toggleOrder (o) {
  const k = orderKey(o)
  expanded.value[k] = !expanded.value[k]
}

async function loadReport () {
  error.value = ''
  info.value = ''
  report.value = null
  expanded.value = {}

  if (!form.value.date) {
    error.value = 'Lütfen tarih seçin.'
    return
  }

  loading.value = true
  try {
    const { data } = await api.get('/api14/prepared_orders', {
      params: { date: form.value.date }
    })

    if (!data || data.error) {
      throw new Error(data?.error || 'Bilinmeyen hata')
    }

    report.value = data
    const orderCount = Number(data?.totals?.order_count || 0)
    const boxCount = Number(data?.totals?.box_count || 0)
    info.value = `Toplam ${orderCount} sipariş, ${boxCount} koli kapatılmış.`
  } catch (e) {
    error.value = e.message || 'Rapor alınırken hata oluştu.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page{ max-width:1100px; margin:22px auto; padding:0 12px }
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
.section-head{
  display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px;
}
.row{ display:flex; gap:12px; align-items:flex-end; margin:6px 0 }
.wrap{ flex-wrap:wrap }
.field{ display:flex; flex-direction:column; gap:6px; min-width:150px }
.w200{ width:200px }
.actions{ display:flex; gap:8px; align-items:flex-end }

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
.btn:disabled{ opacity:.6; cursor:not-allowed }
.inline{ display:inline-flex; align-items:center; gap:6px }

.spinner{
  width:18px; height:18px; border-radius:50%;
  border:3px solid #e5e7eb; border-top-color:#111827;
  animation: spin 1s linear infinite;
}
.spinner.xs{ width:14px; height:14px; border-width:2px }
@keyframes spin{ to{ transform:rotate(360deg) } }

.msg{ margin-top:6px; font-size:13px }
.msg.err{ color:#b00020 }
.msg.ok{ color:#065f46 }

.muted{ color:#6b7280 } .tiny{ font-size:12px }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace }

/* Doctype chipleri */
.doctype-chips{
  display:flex; flex-wrap:wrap; gap:6px; justify-content:flex-end;
}
.chip{
  padding:4px 8px; border-radius:999px; border:1px solid #e5e7eb;
  background:#f9fafb; font-size:12px; color:#374151;
}

/* Üst sipariş tablosu */
.table{ margin-top:6px }
.order-block{ border-bottom:1px solid #f3f4f6; padding-bottom:4px; margin-bottom:4px }
.thead, .order-row{
  display:grid;
  /* 🔹 7 sütun: chevron, doctype, siparişno, koli sayısı, kalem/parça, ilk, son */
  grid-template-columns: 40px 100px 140px 100px 160px 160px 160px;
  gap:8px; align-items:center;
}
.order-row{
  padding:8px 8px; background:#f9fafb; border-radius:8px;
  cursor:pointer; transition:.12s;
}
.order-row:hover{ background:#eff6ff }
.order-row.expanded{ background:#e0f2fe }
.td, .th{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.w40{ width:40px } .w100{ width:100px } .w140{ width:140px } .w160{ width:160px } .w180{ width:180px }
.right{ text-align:right }
.chevron{ font-size:12px; color:#6b7280 }

/* Alt koli tablosu */
.box-table-wrapper{
  margin:6px 4px 8px 40px;
  border-left:2px solid #e5e7eb;
  padding-left:8px;
}
.box-head, .box-row{
  display:grid;
  grid-template-columns: 140px 100px 120px 120px 140px 160px 160px 180px;
  gap:8px; align-items:center;
}
.box-head{
  font-weight:600; color:#374151; padding:4px 6px;
  background:#f8fafc; border:1px solid #eef2f7; border-radius:8px; margin-bottom:4px;
}
.box-body .box-row{
  padding:6px 6px; border-bottom:1px solid #f3f4f6; background:#fff; border-radius:6px;
}
.badge{
  display:inline-block; padding:3px 8px; border-radius:999px; font-size:12px;
  border:1px solid transparent; background:#f3f4f6; color:#111;
}
.badge.st-draft{ background:#eef2ff; color:#3730a3; border-color:#c7d2fe }
.badge.st-sealed{ background:#ecfdf5; color:#065f46; border-color:#a7f3d0 }
.badge.st-shipped{ background:#fff7ed; color:#9a3412; border-color:#fed7aa }
.badge.st-cancelled{ background:#fee2e2; color:#7f1d1d; border-color:#fecaca }

.empty{
  color:#6b7280; background:#fafafa; padding:10px; border:1px dashed #e5e7eb;
  border-radius:10px; text-align:center;
}
.box-row .td.kolikodu-full {
  overflow: visible !important;
  text-overflow: unset !important;
  white-space: normal !important;
  font-size: x-small !important;
}
.empty.tiny{ font-size:12px }
.sub-box{ margin:4px 4px 8px 40px }
</style>