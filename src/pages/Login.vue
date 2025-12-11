<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">Koli Sistemi Girişi</h1>
      <p class="subtitle">
        Lütfen kullanıcı adınız ve şifreniz ile giriş yapın.
      </p>

      <form @submit.prevent="onSubmit" class="form">
        <div class="form-row">
          <label for="username">Kullanıcı Adı</label>
          <input
              id="username"
              v-model.trim="username"
              type="text"
              autocomplete="username"
              placeholder="örn: ahmet"
          />
        </div>

        <div class="form-row">
          <label for="password">Şifre</label>
          <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="Şifreniz"
          />
        </div>

        <div v-if="error" class="error-box">
          {{ error }}
        </div>

        <button
            class="btn primary full"
            type="submit"
            :disabled="loading || !username || !password"
        >
          <span v-if="!loading">Giriş Yap</span>
          <span v-else class="inline">
            <span class="spinner xs"></span> Giriş yapılıyor...
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { setAuthToken } from '../api.js'   // varsa kullan, yoksa dursun

const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  if (!username.value || !password.value) return
  loading.value = true
  error.value = ''

  try {
    const resp = await fetch('https://koliapi.imicryl.server/apiauth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    })

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}))
      throw new Error(data.error || 'Giriş başarısız')
    }

    const data = await resp.json()

    // ✅ JWT token
    if (data.token) {
      localStorage.setItem('imi_token', data.token)
      // İstersen setAuthToken da kullanabilirsin:
      // setAuthToken(data.token)
    }

    // ✅ Kullanıcı objesi
    if (data.user) {
      localStorage.setItem('imi_user', JSON.stringify(data.user))

      // 🔥 Log’larda kullanacağımız düzgün kullanıcı adı
      const uname =
          data.user.username ||
          data.user.name ||
          data.user.kullanici_adi ||
          username.value

      localStorage.setItem('imi_username', uname)
    } else {
      // user objesi gelmiyorsa, en azından girilen username’i kaydedelim
      localStorage.setItem('imi_user', JSON.stringify({ username: username.value }))
      localStorage.setItem('imi_username', username.value)
    }

    // Girişten sonra yönlendirme
    const redirectTarget = router.currentRoute.value.query.redirect || '/'
    router.push(redirectTarget)
  } catch (e) {
    error.value = e.message || 'Giriş sırasında bir hata oluştu'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #e5e7eb, #f9fafb 45%, #ffffff);
  padding: 16px;
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  border-radius: 16px;
  padding: 20px 22px 18px;
  box-shadow:
      0 18px 45px rgba(15, 23, 42, 0.12),
      0 0 0 1px rgba(148, 163, 184, 0.3);
  border: 1px solid #e5e7eb;
}

.title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.subtitle {
  margin: 0 0 16px;
  font-size: 13px;
  color: #6b7280;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-size: 13px;
  color: #374151;
}

input {
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  outline: none;
  font-size: 14px;
}

input:focus {
  border-color: #111827;
  box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
}

.error-box {
  margin-top: 4px;
  font-size: 13px;
  color: #991b1b;
  background: #fef2f2;
  border-radius: 10px;
  padding: 6px 8px;
  border: 1px solid #fecaca;
}

/* Butonlar */
.btn {
  border-radius: 10px;
  border: 1px solid #d1d5db;
  padding: 9px 12px;
  font-size: 14px;
  cursor: pointer;
  background: #f9fafb;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.btn.full {
  width: 100%;
  margin-top: 4px;
}

.btn.primary {
  background: #111827;
  color: #ffffff;
  border-color: #111827;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

/* Spinner */
.inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
  border-width: 2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>