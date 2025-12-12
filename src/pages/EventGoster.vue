<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h2>🧾 Sistem Event Kayıtları</h2>
        <p class="sub">API Event loglarının ham kayıtlarını görüntüle</p>
      </div>
      <div class="right">
        <button class="btn" @click="loadEvents" :disabled="loading">
          <span v-if="!loading">↻ Yenile</span>
          <span v-else class="inline"><span class="spinner xs"></span> Yükleniyor</span>
        </button>
      </div>
    </header>

    <section class="card">
      <table class="t">
        <thead>
        <tr>
          <th>ID</th>
          <th>Zaman</th>
          <th>Event</th>
          <th>Ekleyen</th>
          <th>Koli ID</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="ev in events" :key="ev.id">
          <td class="mono">{{ ev.id }}</td>
          <td>{{ formatDate(ev.ts) }}</td>
          <td>{{ ev.event }}</td>
          <td>{{ ev.actor || '-' }}</td>
          <td>{{ ev.koli_id || '-' }}</td>
        </tr>
        </tbody>
      </table>

      <div v-if="!events.length && !loading" class="empty">
        Henüz event kaydı yok.
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const events = ref([])
const loading = ref(false)

function formatDate(v){
  try{
    const d = new Date(v)
    return d.toLocaleString()
  }catch{ return v }
}

async function loadEvents(){
  loading.value = true
  try{
    const r = await fetch('https://koliapi.imicryl.server/apilog/events?limit=200')
    const data = await r.json()
    events.value = Array.isArray(data) ? data : []
  }catch(e){
    console.error(e)
  }finally{
    loading.value = false
  }
}

onMounted(() => {
  loadEvents()
})
</script>

<style scoped>
.page{ max-width:1100px;margin:22px auto;padding:0 14px }
.topbar{ display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;border-bottom:1px solid #ddd;padding-bottom:8px }
.sub{ color:#6b7280;font-size:13px;margin-top:4px }
.card{ background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0 }
.btn{ border:1px solid #ccc;padding:8px 12px;border-radius:10px;background:#fff;cursor:pointer }
.btn:disabled{ opacity:.6;cursor:not-allowed }
.inline{ display:inline-flex;align-items:center;gap:6px }
.spinner{ width:18px;height:18px;border-radius:50%;border:3px solid #e5e7eb;border-top-color:#111827;animation:spin 1s linear infinite }
.spinner.xs{ width:14px;height:14px;border-width:2px }
@keyframes spin{ to{ transform:rotate(360deg) } }

.t{ width:100%;border-collapse:collapse }
.t th{ text-align:left;padding:6px 8px;font-size:13px;border-bottom:1px solid #eee }
.t td{ padding:6px 8px;font-size:13px;border-bottom:1px solid #f1f1f1 }
.mono{ font-family:monospace }
.empty{ padding:12px; text-align:center; color:#888 }
.right{display:flex;align-items:center;gap:8px}
</style>