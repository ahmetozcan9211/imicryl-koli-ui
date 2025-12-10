<template>
  <div class="page">
    <!-- Üst Bar -->
    <header class="topbar">
      <div>
        <h2>📦 Toplu Koli Atama (API11)</h2>
        <p class="sub">
          Birden fazla koliyi seçip tek seferde sipariş numarası ve/veya yer kodu atayın.
        </p>
      </div>
      <div class="right">
        <span class="chip" :class="lastResult ? 'chip-on' : 'chip-muted'">
          <template v-if="lastResult">
            Güncellenen: {{ lastResult.updated_count }} koli
          </template>
          <template v-else>
            Henüz işlem yapılmadı
          </template>
        </span>
      </div>
    </header>

    <!-- Koli Seçimi -->
    <section class="card">
      <div class="section-head">
        <h3>🎯 Hedef Koliler</h3>
        <div class="muted tiny">
          En az bir <b>Koli ID</b> veya <b>Koli Kodu</b> girmelisiniz.
        </div>
      </div>

      <div class="row wrap">
        <div class="field flex-1">
          <label>Koli ID'leri (virgül veya satır satır)</label>
          <textarea
              v-model="form.boxIdsRaw"
              rows="4"
              placeholder="Örn: 101, 102, 103 veya&#10;101&#10;102&#10;103"
          ></textarea>
          <div class="tiny muted">
            Çözümlenen ID sayısı: <b>{{ parsedBoxIds.length }}</b>
          </div>
        </div>

        <div class="field flex-1">
          <label>Koli Kodları (virgül veya satır satır)</label>
          <textarea
              v-model="form.kolikodlariRaw"
              rows="4"
              placeholder="Örn: KOLI-0001, KOLI-0002 veya&#10;KOLI-0001&#10;KOLI-0002"
          ></textarea>
          <div class="tiny muted">
            Çözümlenen koli kodu sayısı: <b>{{ parsedKolikodlari.length }}</b>
          </div>
        </div>
      </div>
    </section>

    <!-- Atama Alanları -->
    <section class="card">
      <div class="section-head">
        <h3>📝 Atanacak Bilgiler</h3>
        <div class="muted tiny">
          En az birini doldurmalısınız: <b>(Belge Türü + Sipariş No)</b> veya <b>Yer Kodu</b>.
        </div>
      </div>

      <div class="row wrap">
        <div class="field w150">
          <label>Belge Türü</label>
          <select v-model="form.doctype">
            <option value="">(Boş bırak)</option>
            <option value="SIPA">SIPA</option>
            <option value="SIP2">SIP2</option>
            <option value="NSIP">NSIP</option>
            <option value="YSIP">YSIP</option>
          </select>
          <div class="tiny muted">
            İstersen sadece yer ataması da yapabilirsin.
          </div>
        </div>

        <div class="field w190">
          <label>Sipariş No (docnum)</label>
          <input
              v-model.trim="form.docnum"
              placeholder="Örn: 00024565"
          />
        </div>

        <div class="field w190">
          <label>Yer Kodu (opsiyonel)</label>
          <input
              v-model.trim="form.yerkodu"
              placeholder="Örn: RAF-A3"
          />
        </div>

        <div class="actions">
          <button
              class="btn primary"
              @click="doBulkAssign"
              :disabled="loading"
          >
            <span v-if="!loading">💾 Toplu Güncelle</span>
            <span v-else class="inline">
              <span class="spinner xs"></span> İşleniyor...
            </span>
          </button>
        </div>
      </div>

      <p v-if="msg.err" class="msg err">⚠️ {{ msg.err }}</p>
      <p v-if="msg.ok && !msg.err" class="msg ok">✅ {{ msg.ok }}</p>
    </section>

    <!-- Sonuç Özeti -->
    <section class="card" v-if="lastResult">
      <div class="section-head">
        <h3>📊 Sonuç Özeti</h3>
        <div class="muted tiny">
          İşlem tamamlandı — Güncellenen koli sayısı: <b>{{ lastResult.updated_count }}</b>
        </div>
      </div>

      <div class="row wrap">
        <div class="field flex-1">
          <label>Güncellenen Koli ID'leri</label>
          <div class="taglist" v-if="lastResult.box_ids && lastResult.box_ids.length">
            <span v-for="id in lastResult.box_ids" :key="'id'+id" class="pill mono">
              #{{ id }}
            </span>
          </div>
          <div class="tiny muted" v-else>Henüz bir koli ID'si güncellenmedi veya liste boş.</div>
        </div>

        <div class="field flex-1">
          <label>Bulunamayan / iptal edilmiş koli kodları</label>
          <div v-if="lastResult.not_found_kolikodlari && lastResult.not_found_kolikodlari.length">
            <span
                v-for="code in lastResult.not_found_kolikodlari"
                :key="code"
                class="pill pill-warn mono"
            >
              {{ code }}
            </span>
          </div>
          <div class="tiny muted" v-else>
            Tüm girilen koli kodları geçerli görünüyor.
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
  boxIdsRaw: '',
  kolikodlariRaw: '',
  doctype: '',
  docnum: '',
  yerkodu: ''
})

const loading = ref(false)
const msg = reactive({ err: '', ok: '' })
const lastResult = ref(null)

// Metinden ID listesi üret (virgül, boşluk, yeni satır)
const parsedBoxIds = computed(() => {
  if (!form.boxIdsRaw) return []
  return form.boxIdsRaw
      .split(/[\s,;]+/)
      .map(x => x.trim())
      .filter(x => x.length > 0)
      .map(x => Number(x))
      .filter(n => Number.isInteger(n) && n > 0)
})

const parsedKolikodlari = computed(() => {
  if (!form.kolikodlariRaw) return []
  return form.kolikodlariRaw
      .split(/[\s,;]+/)
      .map(x => x.trim())
      .filter(x => x.length > 0)
})

async function doBulkAssign () {
  msg.err = ''
  msg.ok = ''
  lastResult.value = null

  const boxIds = parsedBoxIds.value
  const kolikodlari = parsedKolikodlari.value

  if (!boxIds.length && !kolikodlari.length) {
    msg.err = 'En az bir Koli ID veya Koli Kodu girmelisiniz.'
    return
  }

  const hasDocAssign = form.doctype && form.docnum
  const hasYerkodu = !!form.yerkodu

  if (!hasDocAssign && !hasYerkodu) {
    msg.err = 'En az bir atama alanı doldurmalısınız: (Belge Türü + Sipariş No) veya (Yer Kodu).'
    return
  }

  loading.value = true
  try {
    const payload = {
      box_ids: boxIds.length ? boxIds : undefined,
      kolikodlari: kolikodlari.length ? kolikodlari : undefined,
      doctype: hasDocAssign ? form.doctype : undefined,
      docnum: hasDocAssign ? form.docnum : undefined,
      yerkodu: hasYerkodu ? form.yerkodu : undefined
    }

    const { data } = await api.post('/api11/boxes/bulk_assign', payload)

    lastResult.value = data || null
    msg.ok = `Toplam ${data?.updated_count ?? 0} koli güncellendi.`
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
.section-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
.row{ display:flex; gap:12px; align-items:flex-start; margin:6px 0 }
.wrap{ flex-wrap:wrap }
.field{ display:flex; flex-direction:column; gap:6px; min-width:200px }
.flex-1{ flex:1 1 260px }
.w150{ width:150px } .w190{ width:190px }

textarea{
  resize: vertical;
  min-height: 80px;
}

input, select, textarea{
  padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; outline:none;
  font-family: inherit; font-size:14px;
}
input:focus, select:focus, textarea:focus{
  border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08)
}

.btn{
  border:1px solid #d1d5db; background:#f9fafb; color:#111827;
  padding:8px 12px; border-radius:10px; cursor:pointer; transition:.15s;
}
.btn:hover{ transform:translateY(-1px) }
.btn.primary{ background:#111827; color:#fff; border-color:#111827 }
.btn.mini{ padding:6px 10px; border-radius:8px; font-size:13px }
.btn.ghost{ background:#fff }
.btn:disabled{ opacity:.6; cursor:not-allowed }

.inline{ display:inline-flex; align-items:center; gap:6px }
.spinner{
  width:18px; height:18px; border-radius:50%;
  border:3px solid #e5e7eb; border-top-color:#111827;
  animation: spin 1s linear infinite;
}
.spinner.xs{ width:14px; height:14px; border-width:2px }
@keyframes spin{ to{ transform:rotate(360deg) } }

.chip{
  padding:5px 10px; border-radius:999px; border:1px solid #e5e7eb;
  background:#fff; font-size:12px;
}
.chip-muted{ color:#6b7280 }
.chip-on{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }

.msg{ margin-top:6px; font-size:13px }
.msg.err{ color:#b00020 }
.msg.ok{ color:#065f46 }

.muted{ color:#6b7280 } .tiny{ font-size:12px }

.right{ text-align:right }
.mono{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

/* Tag / pill list */
.taglist{ display:flex; flex-wrap:wrap; gap:6px; margin-top:4px }
.pill{
  display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb;
  border-radius:999px; padding:2px 8px; font-size:12px; color:#374151;
}
.pill-warn{
  background:#fef2f2; border-color:#fecaca; color:#b91c1c;
}
</style>