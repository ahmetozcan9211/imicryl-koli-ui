<template>
  <div class="page">
    <h1>📦 Çoklu Koli Oluştur (API7)</h1>
    <p class="sub">Kaynak koliyi seç, kaç adet kopyalanacağını ve yeni koli kodlarını gir, sonra kolileri oluştur.</p>

    <!-- ARAMA BLOĞU -->
    <div class="card search-block">
      <label>Kaynak Koli (ID veya Koli Kodu)</label>
      <div class="row">
        <input
            v-model.trim="q"
            placeholder="örn: 123 veya K-2025-0001"
            @keyup.enter="loadSource"
        />
        <button class="btn primary" @click="loadSource" :disabled="loadingSource">
          <span v-if="!loadingSource">Ara</span>
          <span v-else class="inline">
            <span class="spinner xs"></span> Yükleniyor
          </span>
        </button>
      </div>
    </div>

    <!-- KAYNAK KOLİ ÖZET -->
    <div v-if="source" class="card">
      <h2>{{ source.kolikodu }}</h2>
      <div class="meta">
        <span class="pill">ID: {{ source.id }}</span>
        <span class="pill">Belge: {{ source.doctype }} {{ source.siparisno }}</span>
        <span class="pill">Yer: {{ source.yerkodu || '-' }}</span>
        <span class="pill">Tip: {{ source.kolitipi || '-' }}</span>
        <span class="pill">Durum: {{ source.durum }}</span>
      </div>
    </div>

    <!-- KAYNAK İÇERİK TABLOSU -->
    <div v-if="sourceLines.length" class="card">
      <h3>Koli İçeriği ({{ sourceLines.length }} satır)</h3>

      <div class="table-head">
        <div class="th">Malzeme</div>
        <div class="th">Varyant</div>
        <div class="th">Lot</div>
        <div class="th">Seri</div>
        <div class="th">SKT</div>
        <div class="th right">Miktar</div>
      </div>

      <div class="table-body">
        <div
            class="tr"
            v-for="r in sourceLines"
            :key="r.material + '|' + (r.lotno||'') + '|' + (r.serino||'')"
        >
          <div>{{ r.material }}</div>
          <div>{{ r.secenek || '-' }}</div>
          <div>{{ r.lotno || '-' }}</div>
          <div>{{ r.serino || '-' }}</div>
          <div>{{ r.skt || '-' }}</div>
          <div class="right"><strong>{{ r.netmiktar }}</strong></div>
        </div>
      </div>
    </div>

    <!-- KOPYALAMA AYARLARI -->
    <div v-if="source" class="card">
      <h3>Yeni Koliler</h3>

      <div class="row mb8">
        <div class="col">
          <label>Kaç koli oluşturulsun?</label>
          <input
              type="number"
              min="1"
              v-model.number="adet"
              class="w120"
          />
        </div>
      </div>

      <!-- Manuel koli kodu alanları -->
      <div v-if="adet > 0" class="codes-block">
        <h4>Koli Kodları</h4>
        <p class="muted tiny">
          Aşağıya oluşturulacak her koli için bir koli kodu yazın. Toplam {{ adet }} adet.
        </p>

        <div
            v-for="(code, idx) in targetCodes"
            :key="idx"
            class="row code-row"
        >
          <label class="code-label">Koli Kodu #{{ idx + 1 }}</label>
          <input
              v-model.trim="targetCodes[idx]"
              :placeholder="`örn: K-2025-0${idx+1}`"
          />
        </div>
      </div>

      <div class="mt10">
        <button class="btn primary" @click="cloneNow" :disabled="loadingClone">
          <span v-if="!loadingClone">Kolileri Oluştur</span>
          <span v-else class="inline">
            <span class="spinner xs"></span> İşleniyor…
          </span>
        </button>
      </div>
    </div>

    <!-- SONUÇ BLOĞU -->
    <div v-if="result" class="card">
      <h3>Sonuç</h3>

      <div v-if="result.created?.length">
        <h4>✔ Oluşturulan Koliler:</h4>
        <ul>
          <li v-for="c in result.created" :key="c.kolikodu">
            <span class="ok">{{ c.kolikodu }}</span>
          </li>
        </ul>
      </div>

      <div v-if="result.skipped?.length">
        <h4>⚠ Atlanan Koliler:</h4>
        <ul>
          <li v-for="s in result.skipped" :key="s.code">
            <span class="warn">{{ s.code }} → {{ s.reason }}</span>
          </li>
        </ul>
      </div>

      <div v-if="result.errors?.length">
        <h4>❌ Hatalar:</h4>
        <ul>
          <li v-for="e in result.errors" :key="e.code">
            <span class="err">{{ e.code }} → {{ e.error }}</span>
          </li>
        </ul>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '../api'  // axios instance

const q = ref('')
const source = ref(null)
const sourceLines = ref([])
const loadingSource = ref(false)

const adet = ref(1)
const targetCodes = ref(['']) // adet kadar doldurulacak
const loadingClone = ref(false)
const result = ref(null)

// adet değiştiğinde targetCodes dizisini senkron tut
watch(adet, (val) => {
  const n = Number(val) || 0
  if (n <= 0) {
    targetCodes.value = []
    return
  }
  const prev = targetCodes.value.slice()
  const next = []
  for (let i = 0; i < n; i++) {
    next[i] = prev[i] || ''
  }
  targetCodes.value = next
})

async function loadSource () {
  source.value = null
  sourceLines.value = []
  loadingSource.value = true
  result.value = null

  try {
    const query = q.value.trim()
    if (!query) return

    // API7 özet endpoint'i: id veya kod ile çalışacak şekilde yazmıştık
    const { data } = await api.get(`/api7/koli/${encodeURIComponent(query)}/ozet`)
    source.value = data.koli
    sourceLines.value = data.icerik || []
  } catch (e) {
    alert('Kaynak koli bulunamadı')
  } finally {
    loadingSource.value = false
  }
}

async function cloneNow () {
  try {
    if (!source.value) {
      alert('Kaynak koli yüklenmedi')
      return
    }
    if (!adet.value || adet.value < 1) {
      alert('Adet en az 1 olmalıdır')
      return
    }
    if (!Array.isArray(targetCodes.value) || targetCodes.value.length !== adet.value) {
      alert('Koli kodu adetleri uyuşmuyor')
      return
    }

    const cleaned = targetCodes.value.map(c => String(c || '').trim())
    if (cleaned.some(c => !c)) {
      alert('Tüm koli kodlarını doldurmalısınız')
      return
    }

    // İstersen benzersizlik kontrolü:
    const uniq = new Set(cleaned)
    if (uniq.size !== cleaned.length) {
      alert('Koli kodları arasında tekrar edenler var (benzersiz olmalı)')
      return
    }

    loadingClone.value = true
    result.value = null

    const { data } = await api.post('/api7/koliler/clone_from', {
      sourceId: source.value.id,
      targetCodes: cleaned,
      ekleyen: 'client'
    })

    result.value = data
  } catch (e) {
    alert('Bir hata oluştu: ' + (e.response?.data?.error || e.message))
  } finally {
    loadingClone.value = false
  }
}
</script>

<style scoped>
.page{ max-width:900px; margin:20px auto; padding:10px }
h1{ margin-bottom:5px }
.sub{ color:#6b7280; margin-bottom:20px }

.card{
  background:#fff; padding:14px; border:1px solid #e5e7eb;
  margin-bottom:16px; border-radius:12px;
}
.search-block .row{ display:flex; gap:8px; margin-top:6px }
input{
  padding:8px; border:1px solid #e5e7eb; border-radius:8px; width:100%;
}
.btn{
  padding:8px 14px; border:1px solid #d1d5db; border-radius:8px;
  cursor:pointer; background:#f8fafc;
}
.btn.primary{ background:#111827; color:#fff; border-color:#111827 }
.inline{ display:inline-flex; gap:6px; align-items:center }

.spinner{
  width:14px; height:14px; border:2px solid #d1d5db; border-top-color:#111827;
  border-radius:50%; animation:spin 1s linear infinite;
}
.spinner.xs{ width:12px; height:12px; border-width:2px }
@keyframes spin{ to{ transform: rotate(360deg) } }

.table-head,.tr{
  display:grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 80px;
  padding:6px 0; border-bottom:1px solid #f3f4f6;
}
.th{ font-weight:600; color:#374151 }
.table-body .tr{ font-size:14px }
.right{text-align:right}

.meta{ margin-top:8px }
.pill{
  background:#f3f4f6; padding:4px 8px; border-radius:999px;
  font-size:12px; margin-right:6px; margin-bottom:4px; display:inline-block;
}

.codes-block{ margin-top:10px }
.code-row{ display:flex; flex-direction:column; gap:4px; margin-bottom:8px }
.code-label{ font-size:13px; color:#374151 }

.w120{ max-width:120px }
.mb8{ margin-bottom:8px }
.mt10{ margin-top:10px }

.ok{ color:#16a34a; font-weight:600 }
.warn{ color:#b45309 }
.err{ color:#b91c1c; font-weight:600 }

ul{ padding-left:18px; margin-top:6px }
</style>