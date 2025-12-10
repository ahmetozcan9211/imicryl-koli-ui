<!-- src/pages/sipariskolileri.vue -->
<template>
  <div class="page">
    <!-- Üst Bar -->
    <header class="topbar">
      <div>
        <h2>📦 Siparişe Ait Koliler (API12)</h2>
        <p class="sub">
          Belge türü ve sipariş numarasına göre bu siparişe bağlı kolileri ve içeriklerini listeler.
        </p>
      </div>
      <div class="right">
        <span class="chip" :class="boxes.length ? 'chip-on' : 'chip-muted'">
          {{ boxes.length ? (boxes.length + ' koli listelendi') : 'Henüz liste boş' }}
        </span>
      </div>
    </header>

    <!-- 🔍 Arama Alanı -->
    <section class="card highlight">
      <div class="row wrap">
        <div class="field w150">
          <label>Belge Türü</label>
          <select v-model="form.doctype">
            <option value="SIPA">SIPA</option>
            <option value="YSIP">YSIP</option>
            <option value="NSIP">NSİP</option>
            <option value="SIP2">SİP2</option>
          </select>
        </div>
        <div class="field w200">
          <label>Sipariş No</label>
          <input
              v-model.trim="form.docnum"
              placeholder="örn: 00024565"
              @keydown.enter.prevent="loadBoxes"
          />
        </div>
        <div class="actions">
          <button
              class="btn primary"
              @click="loadBoxes"
              :disabled="loading || !form.docnum"
          >
            <span v-if="!loading">🔍 Ara</span>
            <span v-else class="inline">
              <span class="spinner xs"></span> Yükleniyor...
            </span>
          </button>
        </div>
      </div>
      <p v-if="msg.err" class="msg err">⚠️ {{ msg.err }}</p>
      <p v-if="msg.info && !msg.err" class="msg ok">ℹ️ {{ msg.info }}</p>
    </section>

    <!-- Özet -->
    <section class="card" v-if="meta.docnum">
      <div class="section-head">
        <h3>📊 Sipariş Özeti</h3>
      </div>
      <div class="tiny muted">
        <b>Belge:</b> {{ meta.doctype || '-' }} •
        <b>Sipariş No:</b> {{ meta.docnum || '-' }} •
        <b>Koli sayısı:</b> {{ meta.box_count }} •
        <b>Toplam koli içi miktar:</b> {{ totalBoxQty }}
      </div>
    </section>

    <!-- 📋 Koli Listesi -->
    <section class="card">
      <div class="section-head">
        <h3>📋 Koliler</h3>
        <div class="muted tiny">
          {{ boxes.length }} koli listelendi
        </div>
      </div>

      <div v-if="loading" class="empty tiny">
        <span class="spinner xs"></span> Sorgulanıyor...
      </div>

      <div v-else-if="!boxes.length">
        <div class="empty">
          Bu siparişe ait koli bulunamadı.
        </div>
      </div>

      <div v-else class="box-list">
        <div
            v-for="b in boxes"
            :key="b.id"
            class="box-card"
        >
          <!-- Koli Başlık -->
          <div class="box-head">
            <div class="left">
              <div class="code-row">
                <span class="code">#{{ b.id }}</span>
                <span class="code main-code">{{ b.kolikodu }}</span>
              </div>
              <div class="meta tiny muted">
                <span>Belge: {{ b.doctype || '-' }}</span>
                <span v-if="b.siparisno">• Sipariş: {{ b.siparisno }}</span>
                <span v-if="b.yerkodu">• Yer: {{ b.yerkodu }}</span>
                <span v-if="b.kolitipi">• Tip: {{ b.kolitipi }}</span>
              </div>
              <div class="meta tiny muted">
                <span>Oluşturma: {{ fmtDateTime(b.olusmats) }}</span>
              </div>
            </div>
            <div class="right">
              <div class="status-line">
                <span class="badge" :class="statusClass(b.durum)">
                  {{ durumLabel(b.durum) }}
                </span>
                <span
                    class="badge badge-canias"
                    :class="b.canias_islendi ? 'badge-ok' : 'badge-no'"
                >
                  CANIAS {{ b.canias_islendi ? 'İşlendi' : 'Beklemede' }}
                </span>
              </div>
              <div class="tiny muted qty-line">
                Satır: <b>{{ b.line_count }}</b> • Toplam miktar: <b>{{ b.total_qty }}</b>
              </div>
              <div class="tiny muted">
                Beklenen kg: <b>{{ b.expected_weight_gram }}</b> • Ölçülen kg: <b>{{ b.measured_weight_gram }}</b>
              </div>
            </div>
          </div>

          <!-- İçerik Tablosu -->
          <div class="items-table">
            <div class="items-head">
              <div class="th w150">Malzeme</div>
              <div class="th">Varyant</div>
              <div class="th w120">Lot</div>
              <div class="th w80 right">Birim</div>
              <div class="th w100 right">Miktar</div>
            </div>
            <div class="items-body">
              <div
                  v-for="(it, i) in (Array.isArray(b.items) ? b.items : [])"
                  :key="b.id + '-' + i"
                  class="tr"
              >
                <div class="td w150 mono">{{ it.material }}</div>
                <div class="td">{{ it.voptions || '-' }}</div>
                <div class="td w120">{{ it.lotno || '-' }}</div>
                <div class="td w80 right">{{ it.birim }}</div>
                <div class="td w100 right">{{ it.miktar }}</div>
              </div>
              <div
                  v-if="!b.items || !b.items.length"
                  class="empty tiny"
                  style="margin-top:6px"
              >
                Bu kolide satır bulunamadı.
              </div>
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
  doctype: 'SIPA',
  docnum: ''
})

const loading = ref(false)
const msg = reactive({ err: '', info: '' })

const boxes = ref([])
const meta = reactive({
  doctype: '',
  docnum: '',
  box_count: 0
})

const totalBoxQty = computed(() =>
    boxes.value.reduce((sum, b) => sum + Number(b.total_qty || 0), 0)
)

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

function durumLabel(durum) {
  const v = (durum || '').toLowerCase()
  if (v === 'draft') return 'Taslak'
  if (v === 'sealed') return 'Kapalı'
  if (v === 'cancelled') return 'İptal'
  return durum || 'Bilinmiyor'
}

function statusClass(durum) {
  const v = (durum || '').toLowerCase()
  if (v === 'draft') return 'st-draft'
  if (v === 'sealed') return 'st-sealed'
  if (v === 'cancelled') return 'st-cancelled'
  return ''
}

async function loadBoxes() {
  msg.err = ''
  msg.info = ''
  boxes.value = []
  meta.doctype = ''
  meta.docnum = ''
  meta.box_count = 0

  const dt = String(form.doctype || '').trim()
  const dn = String(form.docnum || '').trim()

  if (!dt || !dn) {
    msg.err = 'Belge türü ve sipariş numarası zorunludur.'
    return
  }

  loading.value = true
  try {
    const { data } = await api.get(
        `/api12/orders/${encodeURIComponent(dt)}/${encodeURIComponent(dn)}/boxes`
    )

    boxes.value = Array.isArray(data?.boxes) ? data.boxes : []
    meta.doctype = data?.doctype || dt
    meta.docnum = data?.docnum || dn
    meta.box_count = Number(data?.box_count || boxes.value.length || 0)

    msg.info = `Bu siparişe ait ${meta.box_count} koli listelendi.`
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
.field{ display:flex; flex-direction:column; gap:6px; min-width:150px }
.w150{ width:150px } .w200{ width:200px }

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

/* Box list */
.box-list{ display:flex; flex-direction:column; gap:10px; margin-top:6px }
.box-card{
  border:1px solid #eef2f7; border-radius:12px; padding:10px; background:#fff;
  display:flex; flex-direction:column; gap:8px;
}
.box-head{
  display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;
}
.code-row{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:4px }
.code{
  display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb;
  border-radius:6px; padding:2px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size:12px;
}
.main-code{ font-weight:600; }
.meta{ display:flex; flex-wrap:wrap; gap:8px; margin-top:2px }

.status-line{ display:flex; flex-wrap:wrap; gap:6px; justify-content:flex-end; margin-bottom:4px }
.qty-line{ text-align:right }

.badge{
  display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px;
  border:1px solid #e5e7eb; background:#f3f4f6;
}
.st-draft{ background:#eef2ff; border-color:#c7d2fe; color:#3730a3 }
.st-sealed{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
.st-cancelled{ background:#fef2f2; border-color:#fecaca; color:#991b1b }

.badge-canias{ margin-left:4px; }
.badge-ok{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
.badge-no{ background:#fef9c3; border-color:#fde68a; color:#92400e }

.items-table{ margin-top:4px }
.items-head,
.items-body .tr{
  display:grid;
  grid-template-columns: 150px 1fr 120px 80px 100px;
  gap:8px; align-items:center;
}
.items-head{
  font-weight:600; color:#374151; padding:6px 8px; background:#f8fafc;
  border:1px solid #eef2f7; border-radius:10px;
}
.items-body .tr{
  padding:6px 8px; border-bottom:1px solid #f3f4f6;
}
.td, .th{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.w150{ width:150px } .w120{ width:120px } .w80{ width:80px } .w100{ width:100px }
.right{ text-align:right }
.mono{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
</style>