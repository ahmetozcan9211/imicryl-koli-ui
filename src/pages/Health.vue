<template>
  <section class="card">
    <div style="display:flex; align-items:center; gap:8px; justify-content:space-between">
      <h2>API Sağlık Kontrolü</h2>
      <button class="btn" @click="load" :disabled="loading">
        <span v-if="!loading">Yenile</span>
        <span v-else>Bekleyin…</span>
      </button>
      <button class="btn" @click="logout" :disabled="loading">
        <span v-if="!loading">Çıkış Yap</span>
        <span v-else>Bekleyin…</span>
      </button>
    </div>

    <div v-if="err" style="color:#b00020; margin-top:6px">Hata: {{ err }}</div>

    <div v-if="resp" style="margin-top:8px">
      <div>Durum: <b>{{ resp.ok ? 'OK' : 'HATA' }}</b></div>
      <divOrn>Env: <span class="mono">{{ resp.env }}</span></divOrn>
      <div>DB Saat: <span class="mono">{{ fmt(resp.db_now) }}</span></div>
    </div>

    <details style="margin-top:8px">
      <summary>Ham Çıktı</summary>
      <pre>{{ resp }}</pre>
    </details>

  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api'
import router from "../router.js";

const loading = ref(false)
const err = ref('')
const resp = ref(null)

function fmt(v){
  try{
    const d = new Date(v)
    return isNaN(d) ? String(v) : d.toLocaleString()
  }catch{ return String(v) }
}

async function load(){
  loading.value = true; err.value = ''; resp.value = null
  try{
    const { data } = await api.health()
    resp.value = data
  }catch(e){
    err.value = e?.response?.data?.error || e.message
  }finally{
    loading.value = false
  }
}
function logout() {
  localStorage.removeItem('imi_token')
  localStorage.removeItem('imi_user')
  router.push('/login')
}

onMounted(load)
</script>