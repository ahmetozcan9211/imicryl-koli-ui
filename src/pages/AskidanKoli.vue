<template>
  <div class="page">
    <header class="topbar">
      <h2>🧺 Askıdaki Malzemelerden Koli Oluştur</h2>
      <p class="sub">Artık (askıdaki) malzemeleri seçip yeni koli oluşturabilirsiniz.</p>
    </header>

    <!-- Filtre -->
    <section class="card">
      <div class="row wrap">
        <div class="field">
          <label>Malzeme</label>
          <input v-model.trim="filter.material" placeholder="2LC01..." @keydown.enter.prevent="loadList" />
        </div>
        <div class="field">
          <label>Varyant</label>
          <input v-model.trim="filter.voptions" placeholder="#PR01#..." @keydown.enter.prevent="loadList" />
        </div>
        <div class="actions">
          <button class="btn primary" @click="loadList" :disabled="loading.list">
            <span v-if="!loading.list">🔍 Listele</span>
            <span v-else class="inline"><span class="spinner xs"></span> Yükleniyor...</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Liste -->
    <section class="card">
      <div class="section-head">
        <h3>📋 Askıdaki Malzemeler</h3>
        <div class="muted tiny">Toplam {{ list.length }}</div>
      </div>

      <div v-if="!list.length && !loading.list" class="empty">
        Askıda malzeme bulunamadı.
      </div>

      <div class="table-head compact">
        <div class="th w40"></div>
        <div class="th">Malzeme</div>
        <div class="th">Varyant</div>
        <div class="th w100">Miktar</div>
        <div class="th w80">Birim</div>
        <div class="th w120">Lot</div>
        <div class="th w120">Seri</div>
        <div class="th w120">SKT</div>
      </div>

      <div class="table-body">
        <div v-for="(r,i) in list" :key="'r'+r.id" class="tr">
          <div class="td w40">
            <input type="checkbox" v-model="selectedIds" :value="r.id" />
          </div>
          <div class="td">{{ r.material }}</div>
          <div class="td">{{ r.voptions || '-' }}</div>
          <div class="td w100">
            <input type="number" min="1" class="num" v-model.number="r.take" :max="r.miktar" />
            <span class="muted tiny">/ {{ r.miktar }}</span>
          </div>
          <div class="td w80">{{ r.birim }}</div>
          <div class="td w120">{{ r.lotno || '-' }}</div>
          <div class="td w120">{{ r.serino || '-' }}</div>
          <div class="td w120">{{ formatDate(r.skt) }}</div>
        </div>
      </div>

      <div v-if="selectedIds.length" class="footer-actions">
        <span>Seçili: <b>{{ selectedIds.length }}</b></span>
        <div class="spacer"></div>
        <button class="btn danger" @click="deleteSelected" :disabled="loading.delete">
          🗑️ Sil
        </button>
      </div>
    </section>

    <!-- Yeni koli -->
    <section class="card">
      <div class="section-head">
        <h3>📦 Yeni Koli Oluştur</h3>
        <div class="muted tiny">Seçilen askı malzemeleri yeni bir koliye taşınır.</div>
      </div>

      <div class="row wrap">
        <div class="field w200">
          <label>Yer Kodu</label>
          <input v-model.trim="form.yerkodu" placeholder="RAF-A3" />
        </div>
        <div class="field w200">
          <label>Koli Tipi</label>
          <input v-model.trim="form.kolitipi" placeholder="Kutu/Palet..." />
        </div>
        <div class="actions">
          <button class="btn success" @click="createBox" :disabled="!selectedIds.length || loading.create">
            <span v-if="!loading.create">🚀 Koli Oluştur</span>
            <span v-else class="inline"><span class="spinner xs"></span> Oluşturuluyor...</span>
          </button>
        </div>
      </div>

      <p v-if="msg.ok" class="msg ok">{{ msg.ok }}</p>
      <p v-if="msg.err" class="msg err">{{ msg.err }}</p>
    </section>

    <!-- Son Koliler -->
    <section class="card">
      <div class="section-head"><h3>🕓 Son Oluşturulan Koliler</h3></div>
      <div v-if="recent.loading" class="empty tiny"><span class="spinner xs"></span></div>
      <div v-else class="table-body small">
        <div v-for="b in recent.list" :key="'b'+b.id" class="tr small">
          <div class="td mono">#{{ b.id }}</div>
          <div class="td">{{ b.kolikodu }}</div>
          <div class="td">{{ b.yerkodu || '-' }}</div>
          <div class="td">{{ b.kolitipi || '-' }}</div>
          <div class="td">{{ b.durum }}</div>
          <div class="td">{{ formatDate(b.olusmats) }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../api'

const filter = reactive({ material: '', voptions: '' })
const list = ref([])
const selectedIds = ref([])
const form = reactive({ yerkodu: '', kolitipi: '' })
const msg = reactive({ ok: '', err: '' })
const loading = reactive({ list: false, create: false, delete: false })
const recent = reactive({ loading: false, list: [] })

function formatDate(v) {
  if (!v) return '-'
  try { const d = new Date(v); return isNaN(d)? v : d.toISOString().slice(0,10) }
  catch { return String(v) }
}

async function loadList() {
  loading.list = true; msg.err = ''
  try {
    const params = new URLSearchParams()
    if (filter.material) params.set('material', filter.material)
    if (filter.voptions) params.set('voptions', filter.voptions)
    const { data } = await api.get('/api4/aski/list?' + params.toString())
    list.value = (data?.lines || []).map(r => ({ ...r, take: r.miktar }))
  } catch (e) {
    msg.err = e?.response?.data?.error || e.message
  } finally { loading.list = false }
}

async function createBox() {
  msg.ok = ''; msg.err = ''
  const chosen = list.value.filter(r => selectedIds.value.includes(r.id))
  if (!chosen.length) return
  loading.create = true
  try {
    const lines = chosen.map(r => ({ id: r.id, miktar: r.take }))
    const { data } = await api.post('/api4/aski/create_box', {
      lines, yerkodu: form.yerkodu, kolitipi: form.kolitipi, ekleyen: 'ui'
    })
    msg.ok = `Koli #${data.box_id} (${data.kolikodu}) oluşturuldu (${data.moved} satır).`
    await loadList()
    await loadRecent()
    selectedIds.value = []
  } catch (e) {
    msg.err = e?.response?.data?.error || e.message
  } finally { loading.create = false }
}

async function deleteSelected() {
  if (!selectedIds.value.length) return
  if (!confirm('Seçilen askı kayıtlarını silmek istediğine emin misin?')) return
  loading.delete = true
  try {
    const { data } = await api.post('/api4/aski/delete', { ids: selectedIds.value })
    msg.ok = `${data.deleted} kayıt silindi`
    await loadList()
    selectedIds.value = []
  } catch (e) {
    msg.err = e?.response?.data?.error || e.message
  } finally { loading.delete = false }
}

async function loadRecent() {
  recent.loading = true
  try {
    const { data } = await api.get('/api4/boxes/recent')
    recent.list = data?.boxes || []
  } finally { recent.loading = false }
}

onMounted(() => {
  loadList()
  loadRecent()
})
</script>

<style scoped>
.page{ max-width:1200px; margin:22px auto; padding:0 12px }
.topbar{ margin-bottom:10px }
.sub{ color:#6b7280; font-size:13px }
.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin:10px 0 }
.section-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:6px }
.row{ display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap }
.field{ display:flex; flex-direction:column; gap:6px }
input{ padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; outline:none }
input:focus{ border-color:#111827; box-shadow:0 0 0 2px rgba(17,24,39,.08) }
.btn{ border:1px solid #d1d5db; background:#f9fafb; padding:8px 12px; border-radius:10px; cursor:pointer }
.btn.primary{ background:#111827; color:#fff }
.btn.success{ background:#16a34a; color:#fff; border-color:#16a34a }
.btn.danger{ background:#dc2626; color:#fff; border-color:#dc2626 }
.inline{ display:inline-flex; align-items:center; gap:6px }
.spinner{ width:18px; height:18px; border-radius:50%; border:3px solid #e5e7eb; border-top-color:#111827; animation:spin 1s linear infinite }
.spinner.xs{ width:14px; height:14px; border-width:2px }
@keyframes spin{ to{ transform:rotate(360deg) } }
.table-head,.tr{ display:grid; grid-template-columns:40px 1.2fr 1fr 100px 80px 120px 120px 120px; gap:8px; align-items:center }
.table-head.compact{ font-weight:600; background:#f8fafc; border-radius:8px; padding:6px 8px }
.tr{ padding:6px 8px; border-bottom:1px solid #f3f4f6 }
.num{ width:70px; padding:6px 6px; border:1px solid #e5e7eb; border-radius:6px; text-align:right }
.footer-actions{ display:flex; align-items:center; justify-content:space-between; margin-top:8px }
.empty{ color:#6b7280; text-align:center; padding:10px; background:#fafafa; border-radius:8px }
.msg.ok{ color:#065f46; margin-top:6px }
.msg.err{ color:#b91c1c; margin-top:6px }
.muted{ color:#6b7280 }
.tiny{ font-size:12px }
.mono{ font-family:monospace }
.small .tr{ font-size:13px }
</style>