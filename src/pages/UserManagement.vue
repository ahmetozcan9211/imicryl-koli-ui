<template>
  <div class="page">
    <!-- Başlık -->
    <header class="header">
      <div>
        <h1>Kullanıcı Yönetimi</h1>
        <p class="sub">
          Buradan yeni kullanıcı ekleyebilir, şifrelerini güncelleyebilir ve hangi API'leri kullanabileceklerini belirleyebilirsin.
        </p>
      </div>

      <button class="btn primary" @click="newUser">
        + Yeni Kullanıcı
      </button>
    </header>

    <div class="layout">
      <!-- SOL: Kullanıcı listesi -->
      <section class="card list">
        <div class="list-head">
          <div class="muted">Kullanıcılar</div>
          <div class="muted tiny">{{ users.length }} adet</div>
        </div>

        <div class="row search-row">
          <input
              v-model.trim="search"
              type="text"
              placeholder="Kullanıcı adı / ad soyad ara"
              @keyup.enter="loadUsers"
          />
          <button class="btn" @click="loadUsers" :disabled="loading">
            Ara
          </button>
        </div>

        <!-- Liste iskeleti -->
        <template v-if="loading">
          <div v-for="i in 6" :key="'sk'+i" class="skeleton row"></div>
        </template>

        <!-- Liste -->
        <template v-else>
          <div
              v-for="u in filteredUsers"
              :key="u.id"
              class="row-item"
              :class="{ active: form.id === u.id }"
              @click="editUser(u)"
          >
            <div class="row-top">
              <div>
                <span class="mono">@{{ u.username }}</span>
                <span v-if="u.full_name" class="name"> — {{ u.full_name }}</span>
              </div>
              <span
                  class="badge"
                  :class="u.is_active ? 'st-active' : 'st-passive'"
              >
                {{ u.is_active ? 'Aktif' : 'Pasif' }}
              </span>
            </div>

            <div class="row-mid">
              <span v-if="u.is_admin" class="pill pill-admin">Admin</span>
              <span
                  v-for="apiKey in u.allowed_apis || []"
                  :key="apiKey"
                  class="pill"
              >
                {{ apiKey }}
              </span>
            </div>
          </div>

          <div v-if="!users.length" class="empty">
            Henüz kullanıcı yok. Sağ üstten “Yeni Kullanıcı” ekleyebilirsin.
          </div>
        </template>
      </section>

      <!-- SAĞ: Form -->
      <section class="card form" v-if="showForm">
        <h2 v-if="!form.id">Yeni Kullanıcı</h2>
        <h2 v-else>Düzenle: @{{ originalUsername }}</h2>

        <div v-if="error" class="alert">
          {{ error }}
        </div>

        <div class="form-grid">
          <div class="field">
            <label>Kullanıcı Adı <span class="req">*</span></label>
            <input
                v-model.trim="form.username"
                placeholder="ör: ahmet"
                :disabled="!!form.id"
            />
          </div>

          <div class="field">
            <label>Ad Soyad</label>
            <input
                v-model.trim="form.full_name"
                placeholder="ör: Ahmet Özcan"
            />
          </div>

          <div class="field">
            <label>Şifre <span v-if="!form.id" class="req">*</span></label>
            <input
                v-model="form.password"
                type="password"
                placeholder="Yeni şifre"
            />
            <small v-if="form.id" class="hint">
              Boş bırakılırsa şifre değiştirilmez.
            </small>
          </div>

          <div class="field">
            <label>Şifre (Tekrar)</label>
            <input
                v-model="form.password2"
                type="password"
                placeholder="Tekrar şifre"
            />
          </div>

          <div class="field">
            <label>Durum</label>
            <label class="chk-inline">
              <input type="checkbox" v-model="form.is_active" />
              <span>Aktif</span>
            </label>
          </div>

          <div class="field">
            <label>Admin</label>
            <label class="chk-inline">
              <input type="checkbox" v-model="form.is_admin" />
              <span>Tüm API'lere erişsin</span>
            </label>
          </div>
        </div>

        <div class="field">
          <label>API Yetkileri</label>
          <div class="api-grid">
            <label
                v-for="opt in apiOptions"
                :key="opt.key"
                class="chk-card"
            >
              <input
                  type="checkbox"
                  :value="opt.key"
                  v-model="form.allowed_apis"
                  :disabled="form.is_admin"
              />
              <div class="chk-body">
                <div class="chk-title">{{ opt.key }}</div>
                <div class="chk-desc">{{ opt.label }}</div>
              </div>
            </label>
          </div>
          <small class="hint">
            Admin işaretliyse bu alanlar sadece bilgi amaçlıdır (tüm API'lere erişebilir).
          </small>
        </div>

        <div class="actions">
          <button class="btn" @click="cancelEdit" :disabled="saving">
            Vazgeç
          </button>
          <button class="btn primary" @click="save" :disabled="saving">
            <span v-if="!saving">Kaydet</span>
            <span v-else class="inline">
              <span class="spinner xs"></span> Kaydediliyor
            </span>
          </button>
        </div>
      </section>

      <section v-else class="card placeholder">
        Bir kullanıcı seç ya da sağ üstten “Yeni Kullanıcı” oluştur.
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

/* Hangi modüller için yetki verilecek? */
const apiOptions = [
  { key: 'api',  label: 'Temel API' },
  { key: 'api2', label: 'Transfer API' },
  { key: 'api3', label: 'Siparişten Koli API' },
  { key: 'api4', label: 'Askı Malzemelerden Koli Oluşturma API' },
  { key: 'api6', label: 'Koli ID ile koli düzenleme API' },
  { key: 'api7', label: 'Çoklu koli kopyalama API' },
  { key: 'apilog', label: 'Log Görüntüleme API' },
  { key: 'apiauth', label: 'Kullanıcı Yönetimi API' },
]

const users = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const search = ref('')

const showForm = ref(false)
const form = ref({
  id: null,
  username: '',
  full_name: '',
  password: '',
  password2: '',
  is_active: true,
  is_admin: false,
  allowed_apis: [],
})
const originalUsername = ref('')

function authHeaders () {
  const t = localStorage.getItem('imi_token')      // login sayfasında kaydettiğin token
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function loadUsers () {
  loading.value = true
  error.value = ''
  try {
    const { data } = await axios.get('https://koliapi.imicryl.server/apiauth/users', {
      headers: authHeaders(),
      params: {
        q: search.value || undefined,
      },
    })
    users.value = Array.isArray(data) ? data : (data.items || [])
  } catch (e) {
    error.value = e?.response?.data?.error || e.message
    users.value = []
  } finally {
    loading.value = false
  }
}

const filteredUsers = computed(() => {
  const q = (search.value || '').toLowerCase().trim()
  if (!q) return users.value
  return users.value.filter(u => {
    const uName = (u.username || '').toLowerCase()
    const fName = (u.full_name || '').toLowerCase()
    return uName.includes(q) || fName.includes(q)
  })
})

function resetForm () {
  form.value = {
    id: null,
    username: '',
    full_name: '',
    password: '',
    password2: '',
    is_active: true,
    is_admin: false,
    allowed_apis: [],
  }
  originalUsername.value = ''
}

function newUser () {
  resetForm()
  showForm.value = true
}

function editUser (u) {
  form.value = {
    id: u.id,
    username: u.username || '',
    full_name: u.full_name || '',
    password: '',
    password2: '',
    is_active: u.is_active !== false,
    is_admin: !!u.is_admin,
    allowed_apis: Array.isArray(u.allowed_apis) ? [...u.allowed_apis] : [],
  }
  originalUsername.value = u.username || ''
  showForm.value = true
}

function cancelEdit () {
  resetForm()
  showForm.value = false
}

function validate () {
  if (!form.value.username) {
    throw new Error('Kullanıcı adı zorunlu')
  }
  if (!form.value.id && !form.value.password) {
    throw new Error('Yeni kullanıcı için şifre zorunlu')
  }
  if (form.value.password || form.value.password2) {
    if (form.value.password !== form.value.password2) {
      throw new Error('Şifreler uyuşmuyor')
    }
    if (form.value.password && form.value.password.length < 4) {
      throw new Error('Şifre en az 4 karakter olmalı')
    }
  }
  if (form.value.is_admin) {
    form.value.allowed_apis = apiOptions.map(o => o.key)
  }
}

async function save () {
  try {
    validate()
  } catch (e) {
    error.value = e.message
    return
  }

  saving.value = true
  error.value = ''

  try {
    const payload = {
      username: form.value.username,
      full_name: form.value.full_name || null,
      is_active: !!form.value.is_active,
      is_admin: !!form.value.is_admin,
      allowed_apis: form.value.allowed_apis || [],
    }

    if (form.value.password) {
      payload.password = form.value.password
    }

    if (!form.value.id) {
      await axios.post('https://koliapi.imicryl.server/apiauth/users', payload, {
        headers: authHeaders(),
      })
    } else {
      await axios.patch(`https://koliapi.imicryl.server/apiauth/users/${form.value.id}`, payload, {
        headers: authHeaders(),
      })
    }

    await loadUsers()
    cancelEdit()
  } catch (e) {
    error.value = e?.response?.data?.error || e.message
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.page{
  max-width:1200px;
  margin:24px auto;
  padding:0 12px;
}
.header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:14px;
}
.sub{
  color:#6b7280;
  font-size:13px;
}
.layout{
  display:grid;
  grid-template-columns: 380px 1fr;
  gap:14px;
}
@media (max-width: 960px){
  .layout{ grid-template-columns: 1fr; }
}

.card{
  background:#fff;
  border:1px solid #e5e7eb;
  border-radius:12px;
  padding:12px;
  box-shadow:0 1px 0 rgba(16,24,40,.02);
}
.btn{
  border:1px solid #d1d5db;
  background:#f9fafb;
  color:#111827;
  padding:8px 12px;
  border-radius:10px;
  cursor:pointer;
  transition:.15s ease;
}
.btn:hover{ transform: translateY(-1px); }
.btn.primary{
  background:#111827;
  color:#fff;
  border-color:#111827;
}
.inline{
  display:inline-flex;
  align-items:center;
  gap:6px;
}
.spinner{
  width:18px;
  height:18px;
  border-radius:50%;
  border:3px solid #e5e7eb;
  border-top-color:#111827;
  animation: spin 1s linear infinite;
}
.spinner.xs{
  width:14px;
  height:14px;
  border-width:2px;
}
@keyframes spin{
  to{ transform: rotate(360deg); }
}
.mono{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
.name{
  color:#374151;
  font-size:14px;
}

/* Liste */
.list-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:8px;
}
.search-row{
  display:flex;
  gap:6px;
  margin-bottom:8px;
}
.search-row input{
  flex:1;
  padding:8px 10px;
  border:1px solid #e5e7eb;
  border-radius:10px;
}
.row-item{
  border:1px solid #eef2f7;
  border-radius:10px;
  padding:9px 10px;
  margin-bottom:8px;
  cursor:pointer;
  background:#fafafa;
  transition:.12s ease;
}
.row-item:hover{
  background:#f7f7fb;
}
.row-item.active{
  border-color:#6366f1;
  box-shadow:0 0 0 3px rgba(99,102,241,.15);
  background:#fff;
}
.row-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:4px;
}
.row-mid{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
}
.badge{
  display:inline-block;
  padding:3px 8px;
  border-radius:999px;
  font-size:12px;
  border:1px solid transparent;
  background:#f3f4f6;
  color:#111;
}
.badge.st-active{
  background:#ecfdf5;
  color:#065f46;
  border-color:#a7f3d0;
}
.badge.st-passive{
  background:#fee2e2;
  color:#991b1b;
  border-color:#fecaca;
}
.pill{
  display:inline-block;
  background:#f3f4f6;
  border:1px solid #e5e7eb;
  border-radius:999px;
  padding:2px 8px;
  font-size:12px;
  color:#374151;
}
.pill-admin{
  background:#fef3c7;
  border-color:#fde68a;
  color:#92400e;
}

.muted{ color:#6b7280; }
.tiny{ font-size:12px; }

/* Form */
.form h2{
  margin-bottom:8px;
}
.form-grid{
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap:10px;
  margin-bottom:10px;
}
@media (max-width: 720px){
  .form-grid{ grid-template-columns: 1fr; }
}
.field{
  display:flex;
  flex-direction:column;
  gap:4px;
  margin-bottom:8px;
}
label{
  font-size:13px;
  color:#374151;
}
.req{
  color:#dc2626;
}
input[type="text"],
input[type="password"]{
  padding:8px 10px;
  border:1px solid #e5e7eb;
  border-radius:10px;
  outline:none;
}
input:focus{
  border-color:#111827;
  box-shadow:0 0 0 3px rgba(17,24,39,.08);
}
.chk-inline{
  display:inline-flex;
  align-items:center;
  gap:6px;
  font-size:13px;
}
.hint{
  font-size:11px;
  color:#6b7280;
}

/* API grid */
.api-grid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap:8px;
}
.chk-card{
  border:1px solid #e5e7eb;
  border-radius:10px;
  padding:6px 8px;
  display:flex;
  gap:6px;
  align-items:flex-start;
  cursor:pointer;
}
.chk-card input{
  margin-top:4px;
}
.chk-body{
  flex:1;
}
.chk-title{
  font-weight:600;
  font-size:13px;
}
.chk-desc{
  font-size:12px;
  color:#6b7280;
}

.actions{
  display:flex;
  justify-content:flex-end;
  gap:8px;
  margin-top:10px;
}
.alert{
  padding:8px 10px;
  border:1px solid #fecaca;
  background:#fef2f2;
  color:#991b1b;
  border-radius:10px;
  margin-bottom:8px;
}
.empty{
  color:#6b7280;
  background:#fafafa;
  padding:12px;
  border:1px dashed #e5e7eb;
  border-radius:10px;
  margin-top:8px;
  text-align:center;
}
.placeholder{
  color:#6b7280;
  text-align:center;
}

/* skeleton */
.skeleton{
  background: linear-gradient(90deg, #f3f4f6, #eef2f7, #f3f4f6);
  background-size:200% 100%;
  animation: shimmer 1.2s infinite;
  border-radius:10px;
  height:44px;
  margin-bottom:8px;
}
@keyframes shimmer{
  0%{background-position:200% 0}
  100%{background-position:-200% 0}
}
</style>