<!-- src/pages/siparistenkoli.vue -->
<template>
  <div class="page" :class="{ hasDock: staged.length > 0 }">
    <!-- Üst -->
    <header class="topbar">
      <div>
        <h2>📦 Siparişten Koli Oluştur (API3)</h2>
        <p class="sub">
          1️⃣ Belge türü ve sipariş numarasını gir. <br>
          2️⃣ Kalemleri getirip uygun kolileri seç. <br>
          3️⃣ Miktar girip “Ekle” diyerek staging’e al.
        </p>
      </div>
      <div class="right">
        <span class="chip" :class="lines.length ? 'chip-on' : 'chip-muted'">
          {{ lines.length ? (lines.length + ' kalem bulundu') : 'Liste boş' }}
        </span>
      </div>
    </header>

    <!-- Arama -->
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
          <input v-model.trim="form.docnum" placeholder="örn: 00024232" @keydown.enter.prevent="loadLines" />
        </div>
        <div class="actions">
          <button class="btn primary" @click="loadLines" :disabled="!form.docnum || loading.lines">
            <span v-if="!loading.lines">🔍 Ara</span>
            <span v-else class="inline"><span class="spinner xs"></span> Yükleniyor...</span>
          </button>
        </div>
      </div>
      <p v-if="msg.err" class="msg err">⚠️ {{ msg.err }}</p>
    </section>

    <!-- Hedef Koli -->
    <section class="card">
      <div class="section-head">
        <h3>🎯 Hedef Koli</h3>
        <div class="muted tiny">Siparişe bağlı yeni koli açılacak.</div>
      </div>
      <div class="row wrap">
        <div class="field w200">
          <label>Koli Kodu (ops.)</label>
          <div class="qr-input">
            <input v-model.trim="target.kolikodu" placeholder="Boş bırak → otomatik" />
            <button class="btn mini ghost qr-btn" v-if="isMobile" @click="openQr('kolikodu')" title="QR tara">📷</button>
          </div>
        </div>
        <div class="field w200">
          <label>Yer (ops.)</label>
          <div class="qr-input">
            <input v-model.trim="target.yerkodu" placeholder="örn: RAF-A3" />
            <button class="btn mini ghost qr-btn" v-if="isMobile" @click="openQr('yerkodu')" title="QR tara">📷</button>
          </div>
        </div>
        <div class="field w200">
          <label>Koli Tipi (ops.)</label>
          <div class="qr-input">
            <input v-model.trim="target.kolitipi" placeholder="Kutu / Palet..." />
            <button class="btn mini ghost qr-btn" v-if="isMobile" @click="openQr('kolitipi')" title="QR tara">📷</button>
          </div>
        </div>
        <div class="actions">
          <button class="btn success" @click="openTarget" :disabled="!form.docnum || openingTarget">
            <span v-if="!openingTarget">Hedefi Aç</span>
            <span v-else class="inline"><span class="spinner xs"></span> Açılıyor...</span>
          </button>
        </div>
      </div>
      <div class="hint tiny ok" v-if="targetBox">
        ✅ Açık hedef: <b>#{{ targetBox.id }}</b> — {{ targetBox.kolikodu }}
      </div>
      <p v-if="msg.targetErr" class="msg err">⚠️ {{ msg.targetErr }}</p>
    </section>

    <!-- Siparişe Uygun Hazır Koliler -->
    <section class="card">
      <div class="section-head">
        <h3>🧠 Siparişe Uygun Hazır Koliler</h3>
        <div class="muted tiny">Tam/kısmi set eşleşmesiyle sıralandı</div>
      </div>

      <div v-if="orderBoxSug.loading" class="empty tiny"><span class="spinner xs"></span> Yükleniyor...</div>
      <div v-else-if="!orderBoxSug.list.length" class="empty tiny">Uygun koli önerisi bulunamadı.</div>

      <div class="sg-grid" v-else>
        <div v-for="b in orderBoxSug.list" :key="'bx'+b.box_id" class="sg-card">
          <div class="sg-top">
            <div class="mono">#{{ b.box_id }}</div>
            <div class="code">{{ b.kolikodu }}</div>
            <span class="badge" :class="b.is_full ? 'st-sealed' : 'st-draft'">
              {{ b.is_full ? 'Tam Set' : 'Kısmi' }}
            </span>
          </div>
          <div class="sg-mid">
            <span class="pill">Kapsam: <b>{{ b.covered_keys }}/{{ b.total_keys }}</b></span>
            <span class="pill" v-if="b.yerkodu">Yer: {{ b.yerkodu }}</span>
            <span class="pill" v-if="b.extra_keys>0">+{{ b.extra_keys }} ekstra kalem</span>
          </div>
          <div class="tiny muted">
            Çekilebilir toplam: <b>{{ b.total_pickable }}</b>
            <span v-if="b.total_excess>0"> • Fazla: <b>{{ b.total_excess }}</b></span>
          </div>
          <div class="sg-act">
            <button class="btn" @click="chooseTargetBox(b)">
              🎯 Hedef olarak ata
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Sipariş Kalemleri -->
    <section class="card">
      <div class="section-head">
        <h3>🧾 Sipariş Kalemleri</h3>
        <div class="muted tiny">Toplam: {{ lines.length }}</div>
      </div>

      <div v-if="!lines.length && !loading.lines" class="empty">
        <span>🪶 Henüz kalem bulunamadı. Lütfen sipariş numarasını girip “Ara” tuşuna basın.</span>
      </div>

      <div v-for="ln in lines" :key="ln.line_no" class="line-card">
        <div class="l-head" @click="toggleOpen(ln)">
          <div class="id">#{{ ln.line_no }}</div>
          <div class="mat">
            <span class="code">{{ ln.material }}</span>
            <span class="muted tiny" v-if="ln.material_name">— {{ ln.material_name }}</span>
            <span class="vopt" v-if="ln.voptions">• {{ ln.voptions }}</span>
          </div>
          <div class="qty">
            <b>{{ ln.quantity }}</b> <span class="muted">{{ ln.qunit }}</span>
            <div class="muted tiny">
              Toplanan: {{ summaryMap.get(lnKey(ln))?.picked ?? 0 }} |
              Kalan: {{ summaryMap.get(lnKey(ln))?.remaining ?? ln.quantity }}
            </div>
          </div>
          <div class="spacer"></div>
          <button class="btn mini ghost">
            {{ openSet.has(lnKey(ln)) ? '🔽 Önerileri Gizle' : '🔼 Önerileri Göster' }}
          </button>
        </div>

        <!-- Öneriler -->
        <transition name="fade">
          <div v-if="openSet.has(lnKey(ln))" class="suggest">
            <div class="sg-head">
              <div class="muted">
                “{{ ln.material }}{{ ln.voptions ? (' ' + ln.voptions) : '' }}” için mevcut koliler
              </div>
              <div class="spacer"></div>
              <button class="btn mini" @click="fetchSuggestions(ln)" :disabled="loading.sug.has(lnKey(ln))">
                <span v-if="!loading.sug.has(lnKey(ln))">↻ Yenile</span>
                <span v-else class="inline"><span class="spinner xs"></span></span>
              </button>
            </div>

            <template v-if="loading.sug.has(lnKey(ln))">
              <div class="sg-skel" v-for="i in 3" :key="'sk'+i"></div>
            </template>

            <template v-else>
              <div v-if="(sugs[lnKey(ln)]||[]).length === 0" class="empty tiny">
                🚫 Uygun koli önerisi bulunamadı.
              </div>

              <div class="sg-grid">
                <div
                    v-for="s in (sugs[lnKey(ln)]||[])"
                    :key="'sg'+s.koli_id"
                    class="sg-card"
                >
                  <div class="sg-top">
                    <div class="mono">#{{ s.koli_id }}</div>
                    <div class="code">{{ s.kolikodu }}</div>
                    <span class="badge" :class="'st-'+(s.durum||'draft')">{{ s.durum || 'draft' }}</span>
                  </div>
                  <div class="sg-mid">
                    <span class="pill" v-if="s.yerkodu">Yer: {{ s.yerkodu }}</span>
                    <span class="pill">Mevcut: <b>{{ s.available_qty }}</b></span>
                    <span class="pill" v-if="s.nearest_skt">SKT: {{ formatDate(s.nearest_skt) }}</span>
                  </div>
                  <div class="sg-flags">
                    <span v-if="s.exact_match" class="flag ok">✓ Tam Uyuşuyor</span>
                  </div>
                  <div class="sg-act">
                    <input
                        type="number"
                        min="1"
                        class="num"
                        v-model.number="qtyEdit[qtyKey(ln, s.koli_id)]"
                        :placeholder="String(defaultPick(ln, s))"
                    />
                    <button
                        class="btn primary"
                        @click="addToStaging(ln, s)"
                        :disabled="!canStage(ln, s)"
                    >
                      ➕ Ekle
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </transition>
      </div>
    </section>

    <!-- Staging -->
    <section class="card" v-if="staged.length">
      <div class="section-head">
        <h3>🧩 Taslak Aktarımlar</h3>
        <div class="muted tiny">Toplam {{ staged.length }} satır</div>
      </div>

      <div class="table-head compact">
        <div class="th w70">Kaynak</div>
        <div class="th">Malzeme</div>
        <div class="th">Varyant</div>
        <div class="th w100">Birim</div>
        <div class="th w120 right">Miktar</div>
        <div class="th w80">Ln#</div>
        <div class="th w100"></div>
      </div>

      <div class="table-body">
        <div v-for="(it,i) in staged" :key="'st'+i" class="tr compact">
          <div class="td w70">#{{ it.fromId }}</div>
          <div class="td"><span class="code">{{ it.material }}</span></div>
          <div class="td">{{ it.voptions || '-' }}</div>
          <div class="td w100">{{ it.birim }}</div>
          <div class="td w120 right"><b>{{ it.miktar }}</b></div>
          <div class="td w80">{{ it.line_no }}</div>
          <div class="td w100">
            <button class="btn danger mini" @click="staged.splice(i,1)">🗑️ Sil</button>
          </div>
        </div>
      </div>

      <div class="footer-actions">
        <button class="btn" @click="staged = []">🧹 Temizle</button>
        <div class="spacer"></div>
        <button class="btn success" @click="doCommit" :disabled="!staged.length || !targetBox || committing">
          <span v-if="!committing">💾 Kaydet ve Aktar</span>
          <span v-else class="inline"><span class="spinner xs"></span> Aktarılıyor...</span>
        </button>
      </div>
      <p v-if="msg.commitOk" class="msg ok">✅ {{ msg.commitOk }}</p>
      <p v-if="msg.commitErr" class="msg err">⚠️ {{ msg.commitErr }}</p>
    </section>

    <!-- 🧭 Önerilen Alım Rehberi -->
    <section class="card guide">
      <div class="section-head">
        <h3>🧭 Önerilen Alım Rehberi</h3>
        <div class="muted tiny">
          Aynı malzeme için birden fazla koli varsa, SKT tarihi en yakın olandan başlayarak önerilir.
        </div>
      </div>

      <div class="row wrap">
        <div class="muted tiny">
          Rehber, sipariş kalemleri için getirilen koli önerileri ve kalan miktarlara göre hesaplanır.
        </div>
        <div class="spacer"></div>
        <div class="actions">
          <button
              class="btn"
              @click="buildGuide"
              :disabled="buildingGuide || !lines.length"
          >
            <span v-if="!buildingGuide">🧮 Rehberi Oluştur / Güncelle</span>
            <span v-else class="inline">
              <span class="spinner xs"></span> Hesaplanıyor...
            </span>
          </button>
        </div>
      </div>

      <div v-if="!lines.length" class="empty tiny">
        Önce belge türü ve sipariş no ile kalemleri getirin.
      </div>
      <div v-else-if="!guideRows.length && !buildingGuide" class="empty tiny">
        Henüz rehber oluşturulmadı. “Rehberi Oluştur / Güncelle” tuşuna basın.
      </div>
      <div v-else-if="buildingGuide" class="empty tiny">
        <span class="spinner xs"></span> Hesaplanıyor...
      </div>

      <div v-else>
        <div class="guide-head">
          <div class="th w80">Ln#</div>
          <div class="th">Malzeme</div>
          <div class="th w100 right">İhtiyaç</div>
          <div class="th w160">Raf</div>
          <div class="th w160">Koli</div>
          <div class="th w110 right">Alınacak</div>
          <div class="th w140">Not</div>
        </div>
        <div class="guide-body">
          <div
              v-for="(g, i) in guideRows"
              :key="'g'+i"
              class="tr guide-row"
          >
            <div class="td w80">#{{ g.line_no }}</div>
            <div class="td">
              <span class="code">{{ g.material }}</span>
              <span v-if="g.voptions" class="muted tiny"> • {{ g.voptions }}</span>
              <div v-if="g.material_name" class="muted tiny">{{ g.material_name }}</div>
            </div>
            <div class="td w100 right">
              <b>{{ g.need_total }}</b>
              <span class="muted tiny"> {{ g.qunit || 'ADET' }}</span>
            </div>
            <div class="td w160">
              <span class="pill" v-if="g.yerkodu && g.yerkodu !== '-'">Raf: {{ g.yerkodu }}</span>
              <span v-else class="muted tiny">Raf yok</span>
            </div>
            <div class="td w160">
      <span v-if="g.kolikodu" class="pill">
        {{ g.kolikodu }}
        <span v-if="g.skt" class="muted tiny"> · SKT: {{ formatDate(g.skt) }}</span>
      </span>
              <span v-else class="muted tiny">Koli bulunamadı</span>
            </div>
            <div class="td w110 right">
              <b v-if="g.take > 0">{{ g.take }}</b>
              <span v-else class="muted tiny">0</span>
            </div>
            <div class="td w140">
              <!-- 🔘 Yeni buton -->
              <button
                  class="btn mini"
                  @click="applyGuideRow(g)"
                  :disabled="!canApplyGuideRow(g)"
              >
                ➕ Staging’e ekle
              </button>
              <div v-if="g.note" class="muted tiny" style="margin-top:4px">
                {{ g.note }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Genel Özet -->
    <section class="card summary">
      <div class="section-head"><h3>📊 Genel Özet</h3></div>
      <div>
        <b>Sipariş:</b> {{ totals.ordered_qty }} |
        <b>Toplanan:</b> {{ totals.picked_qty }} |
        <b>Kalan:</b> {{ totals.remaining }}
      </div>
    </section>

    <!-- Dock -->
    <transition name="fade">
      <div v-if="staged.length" class="dock">
        <div class="dock-left">⏳ Staging’de <b>{{ staged.length }}</b> satır</div>
        <div class="dock-right">
          <button class="btn" @click="staged = []">Temizle</button>
          <button class="btn primary" disabled title="3. adımda etkinleşecek">Kaydet</button>
        </div>
      </div>
    </transition>

    <!-- 🔳 QR Modal -->
    <div v-if="qr.open" class="qr-backdrop" @click.self="closeQr">
      <div class="qr-modal">
        <div class="qr-head">
          <b>QR / Barkod Tara</b>
          <button class="btn mini ghost" @click="closeQr">Kapat</button>
        </div>
        <div class="qr-body">
          <video ref="qrVideo" autoplay playsinline muted class="qr-video"></video>
          <div v-if="qr.err" class="msg err" style="margin-top:8px">⚠️ {{ qr.err }}</div>
          <p class="tiny muted" style="margin-top:6px">İpucu: Arka kamerayı kullanır (destekliyse).</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Değişiklikler */
.card.highlight { border-color:#dbeafe; background:#f8fafc }
.hint.ok { color:#065f46; font-weight:500 }
.msg.ok{ color:#065f46 }
.btn.success{ background:#16a34a; border-color:#16a34a; color:#fff }
.fade-enter-active, .fade-leave-active{ transition: all .25s ease }
.fade-enter-from, .fade-leave-to{ opacity:0; transform:translateY(-6px) }
.summary{ background:#fafafa; }

/* QR input satırı: mevcut görünüme dokunmadan ufak ek */
.qr-input{ position:relative; display:flex; gap:6px; align-items:center }
.qr-btn{ line-height:1; }

/* QR modal (hafif) */
.qr-backdrop{
  position:fixed; inset:0; background:rgba(0,0,0,.4);
  display:flex; align-items:center; justify-content:center; z-index:30;
}
.qr-modal{
  width:min(520px, 92vw); background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px;
  box-shadow:0 8px 32px rgba(0,0,0,.22);
}
.qr-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.qr-body{ display:flex; flex-direction:column; align-items:center }
.qr-video{
  width:100%; max-height:60vh; background:#000; border-radius:10px; object-fit:cover;
}
.tiny{ font-size:12px } .muted{ color:#6b7280 }
</style>

<script setup>
import { ref, reactive, onBeforeUnmount, nextTick, onMounted } from 'vue'
import api from '../api'

/* ───────── State ───────── */
const form = reactive({ doctype: 'SIPA', docnum: '' })
const lines = ref([])
const loading = reactive({ lines: false, sug: new Set() })
const msg = reactive({ err: '' })

const isMobile = ref(false)

function computeIsMobile(){
  const uaMobile = typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  isMobile.value = Boolean(uaMobile || (coarse && narrow))
}

onMounted(() => {
  computeIsMobile()
  window.addEventListener('resize', computeIsMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', computeIsMobile)
})

// Hangi kalem açık
const openSet = ref(new Set())
const lnKey = (ln) => `${ln.material}|${ln.voptions||''}|${ln.line_no}`

// Öneriler cache: { [lnKey]: Suggestion[] }
const sugs = reactive({})

// staging
const staged = ref([]) // {fromId, material, voptions, miktar, birim, line_no}

// miktar inputları (satır+kolikart bazlı)
const qtyEdit = reactive({})
const qtyKey = (ln, koliId) => `${lnKey(ln)}|${koliId}`

/* Özet state */
const summaryMap = ref(new Map()) // key: material|voptions|line_no → {picked, remaining, ordered}
const totals = ref({ ordered_qty: 0, picked_qty: 0, remaining: 0 })
const orderBoxSug = ref({ loading:false, list:[] })

async function loadOrderBoxSuggestions(){
  orderBoxSug.value.loading = true
  try{
    const dt = normalizeDoctype(form.doctype)
    const dn = String(form.docnum||'').trim()
    const { data } = await api.get(`/api3/orders/${dt}/${encodeURIComponent(dn)}/box_suggestions?limit=9999`)
    orderBoxSug.value.list = data?.suggestions || []
  } finally {
    orderBoxSug.value.loading = false
  }
}

/* ───────── Helpers ───────── */
function normalizeDoctype(dt){
  let s = String(dt||'').trim().toUpperCase()
  if (s === 'SİPA') s = 'SIPA'
  return s
}
function formatDate(v){
  if(!v) return '-'
  try { const d=new Date(v); return isNaN(d)? String(v): d.toISOString().slice(0,10) }
  catch { return String(v) }
}
const target = reactive({ kolikodu:'', yerkodu:'', kolitipi:'' })
const targetBox = ref(null)
const openingTarget = ref(false)
const committing = ref(false)

msg.targetErr = ''
msg.commitOk = ''
msg.commitErr = ''

/* ───────── Fazlalık akışı için yardımcılar ───────── */
async function previewExcessForBox(boxId, dt, dn){
  try{
    const { data } = await api.get(`/api3/boxes/${boxId}/excess`, {
      params: { doctype: dt, docnum: dn }
    })
    if (data && typeof data.total_excess === 'number') return data
  }catch(_){}
  return { total_excess: 0, lines: [] }
}

async function discardExcessLines(boxId, lines, meta={}){
  const payload = {
    lines: (lines||[]).map(l => ({
      material: l.material,
      voptions: l.voptions || null,
      miktar: Number(l.miktar||0),
      birim: l.birim || 'ADET'
    })),
    reason: 'excess-remove',
    doctype: meta.doctype,
    docnum:  meta.docnum,
    ekleyen: 'ui'
  }
  const { data } = await api.post(`/api3/boxes/${boxId}/discard`, payload)
  return data
}

async function chooseTargetBox(b){
  if (!b || !b.box_id) return
  // hedef olarak ata
  target.kolikodu = b.kolikodu || ''
  await openTarget()

  const dt = normalizeDoctype(form.doctype)
  const dn = String(form.docnum||'').trim()
  const prev = await previewExcessForBox(b.box_id, dt, dn)

  if (Number(prev.total_excess||0) <= 0){
    return
  }

  const linesTxt = (prev.lines||[])
      .filter(x => Number(x.miktar) > 0)
      .map(x => `• ${x.material}${x.voptions ? ' ' + x.voptions : ''}: ${x.miktar}`)
      .join('\n')
  const confirmMsg =
      `Aşağıdaki malzemeler siparişe göre FAZLALIK ve askıya gönderilecek:

${linesTxt || '• (detay yok)'}
\nDevam edilsin mi?`
  if (!confirm(confirmMsg)) return

  try{
    await discardExcessLines(
        b.box_id,
        (prev.lines||[]).filter(x => Number(x.miktar) > 0),
        { doctype: dt, docnum: dn }
    )
    await loadOrderBoxSuggestions()
    await loadSummary()
  }catch(e){
    alert('Fazlalık askıya alınırken hata: ' + (e?.response?.data?.error || e.message))
  }
}

async function openTarget(){
  msg.targetErr = ''
  if (!form.docnum){ msg.targetErr='Sipariş no gerekli'; return }
  openingTarget.value = true
  try{
    const dt = normalizeDoctype(form.doctype)
    const dn = String(form.docnum||'').trim()
    const payload = {
      kolikodu: target.kolikodu || null,
      yerkodu:  target.yerkodu  || null,
      kolitipi: target.kolitipi || null
    }
    const { data } = await api.post(`/api3/orders/${dt}/${encodeURIComponent(dn)}/open_box`, payload)
    targetBox.value = data
  }catch(e){
    msg.targetErr = e?.response?.data?.error || e.message
  }finally{
    openingTarget.value = false
  }
}

async function doCommit(){
  msg.commitOk = ''; msg.commitErr = ''
  if (!targetBox?.value?.id){ msg.commitErr = 'Önce hedef koliyi açın.'; return }
  if (!staged.value.length){ msg.commitErr = 'Staging boş.'; return }
  committing.value = true
  try{
    const dt = normalizeDoctype(form.doctype)
    const dn = String(form.docnum||'').trim()
    const body = {
      target: { id: targetBox.value.id },
      staged: staged.value.map(s => ({
        fromId: Number(s.fromId),
        material: s.material,
        voptions: s.voptions || null,
        miktar: Number(s.miktar||0),
        birim: s.birim || 'ADET'
      })),
      ekleyen: 'ui'
    }
    const { data } = await api.post(`/api3/orders/${dt}/${encodeURIComponent(dn)}/commit`, body)
    msg.commitOk = `Hedef #${data.targetId} (${data.targetCode}) — ${data.createdLines} satır aktarıldı.`
    staged.value = []
    await loadSummary()
  }catch(e){
    msg.commitErr = e?.response?.data?.error || e.message
  }finally{
    committing.value = false
  }
}

/* ───────── API calls ───────── */
async function loadLines(){
  msg.err = ''; lines.value = []
  const dt = normalizeDoctype(form.doctype)
  const dn = String(form.docnum||'').trim()
  if (!dt || !dn){ msg.err = 'doctype ve sipariş no gerekli'; return }
  loading.lines = true
  try{
    const { data } = await api.get(`/api3/orders/${dt}/${encodeURIComponent(dn)}/lines`)
    lines.value = Array.isArray(data?.lines) ? data.lines : []
    // açık set ve öneri önbelleğini temizle
    openSet.value = new Set()
    for (const k in sugs) delete sugs[k]
    // rehberi de sıfırla
    guideRows.value = []
    // özet + siparişe uygun hazır koliler
    await loadSummary()
    await loadOrderBoxSuggestions()
  }catch(e){
    msg.err = e?.response?.data?.error || e.message
  }finally{
    loading.lines = false
  }
}

function toggleOpen(ln){
  const k = lnKey(ln)
  if (openSet.value.has(k)){
    openSet.value.delete(k)
  } else {
    openSet.value.add(k)
    if (!sugs[k]) fetchSuggestions(ln)
  }
}

async function fetchSuggestions(ln){
  const k = lnKey(ln)
  loading.sug.add(k)
  try{
    const dt = normalizeDoctype(form.doctype)
    const dn = String(form.docnum||'').trim()
    const params = new URLSearchParams()
    params.set('material', ln.material)
    if (ln.voptions) params.set('voptions', ln.voptions)
    if (ln.quantity != null) params.set('need_qty', ln.quantity)

    const { data } = await api.get(`/api3/orders/${dt}/${encodeURIComponent(dn)}/suggestions?`+params.toString())
    sugs[k] = Array.isArray(data?.suggestions) ? data.suggestions : []
  }catch{
    sugs[k] = []
  }finally{
    loading.sug.delete(k)
  }
}

function defaultPick(ln, s){
  const need = Number(ln.quantity || 0)
  const have = Number(s.available_qty || 0)
  return Math.max(1, Math.min(need, have))
}

/* Fazla toplamayı UI seviyesinde engelle */
function canStage(ln, s){
  const key = qtyKey(ln, s.koli_id)
  const v = Number(qtyEdit[key] ?? defaultPick(ln, s))
  const remaining = summaryMap.value.get(lnKey(ln))?.remaining
  const cap = remaining != null ? Number(remaining) : Number(ln.quantity || 0)
  return v > 0 &&
      v <= Number(s.available_qty || 0) &&
      v <= cap
}

function addToStaging(ln, s){
  const key = qtyKey(ln, s.koli_id)
  const miktar = Number(qtyEdit[key] ?? defaultPick(ln, s))
  if (!(miktar > 0)) return

  const remaining = summaryMap.value.get(lnKey(ln))?.remaining
  const cap = remaining != null ? Number(remaining) : Number(ln.quantity || 0)
  if (miktar > Number(s.available_qty||0) || miktar > cap) return

  staged.value.push({
    fromId: s.koli_id,
    material: ln.material,
    voptions: ln.voptions || null,
    miktar,
    birim: ln.qunit || 'ADET',
    line_no: ln.line_no
  })
  delete qtyEdit[key]
}

/* Özet çağrısı */
async function loadSummary() {
  const dt = normalizeDoctype(form.doctype)
  const dn = String(form.docnum || '').trim()
  try {
    const { data } = await api.get(`/api3/orders/${dt}/${encodeURIComponent(dn)}/summary`)
    const m = new Map()
    for (const r of (data?.lines || [])) {
      const key = `${r.material}|${r.voptions || ''}|${r.line_no}`
      m.set(key, {
        picked: Number(r.picked_qty || 0),
        remaining: Number(r.remaining ?? Math.max(0, Number(r.ordered_qty || 0) - Number(r.picked_qty || 0))),
        ordered: Number(r.ordered_qty || 0)
      })
    }
    summaryMap.value = m
    totals.value = data?.totals || { ordered_qty: 0, picked_qty: 0, remaining: 0 }
  } catch (e) {
    console.error('Summary error:', e)
  }
}

/* ───────── Önerilen Alım Rehberi ───────── */
const guideRows = ref([])
const buildingGuide = ref(false)

function parseDateMs(v){
  if (!v) return Infinity
  const d = new Date(v)
  const t = d.getTime()
  return isNaN(t) ? Infinity : t
}

async function ensureSuggestionsForAllLines(){
  const dt = normalizeDoctype(form.doctype)
  const dn = String(form.docnum || '').trim()
  if (!dt || !dn) return
  for (const ln of lines.value){
    const key = lnKey(ln)
    if (!sugs[key]){
      await fetchSuggestions(ln)
    }
  }
}

async function buildGuide(){
  guideRows.value = []
  if (!lines.value.length) return
  buildingGuide.value = true
  try{
    await ensureSuggestionsForAllLines()
    const rows = []
    for (const ln of lines.value){
      const key = lnKey(ln)
      const sugList = (sugs[key] || []).slice().sort(
          (a,b) => parseDateMs(a.nearest_skt) - parseDateMs(b.nearest_skt)
      )

      const summary = summaryMap.value.get(key)
      const needTotal = summary ? Number(summary.remaining || 0) : Number(ln.quantity || 0)
      const qunit = ln.qunit || 'ADET'
      let remaining = needTotal
      if (!(remaining > 0)) continue

      for (const s of sugList){
        if (remaining <= 0) break
        const have = Number(s.available_qty || 0)
        if (!(have > 0)) continue
        const take = Math.min(have, remaining)

        rows.push({
          line_no: ln.line_no,
          material: ln.material,
          voptions: ln.voptions || '',
          material_name: ln.material_name || null,
          need_total: needTotal,
          qunit,
          from_box_id: s.koli_id,          // 🔹 hangi koliden alınacağı
          kolikodu: s.kolikodu,
          yerkodu: s.yerkodu || '-',
          take,
          skt: s.nearest_skt || null,
          note: ''
        })
        remaining -= take
      }

      if (remaining > 0){
        rows.push({
          line_no: ln.line_no,
          material: ln.material,
          voptions: ln.voptions || '',
          material_name: ln.material_name || null,
          need_total: needTotal,
          qunit,
          from_box_id: null,
          kolikodu: '',
          yerkodu: '-',
          take: 0,
          skt: null,
          note: `Stok yetersiz: eksik ${remaining} ${qunit}`
        })
      }
    }
    guideRows.value = rows
  } finally {
    buildingGuide.value = false
  }
}

/* ───────── QR Scanner (hafif) ───────── */
const qr = reactive({ open:false, field:'', err:'', stream:null })
const qrVideo = ref(null)
let qrRaf = 0
let detector = null
function canApplyGuideRow(g){
  if (!g) return false
  if (!g.from_box_id) return false
  if (!(g.take > 0)) return false

  // 🔹 Bu rehber satırı daha önce staging'e eklendiyse buton pasif
  const key = guideKey(g)
  if (appliedGuideKeys.value.has(key)) return false

  // 🔹 Kalan miktar 0 ise yine pasif
  const k = `${g.material}|${g.voptions || ''}|${g.line_no}`
  const summary = summaryMap.value.get(k)
  if (!summary) return true
  return Number(summary.remaining || 0) > 0
}

function applyGuideRow(g){
  if (!g || !g.from_box_id || !(g.take > 0)) return

  // İlgili satırı bul (birim için)
  const ln = lines.value.find(
      l =>
          l.line_no === g.line_no &&
          l.material === g.material &&
          (l.voptions || '') === (g.voptions || '')
  )

  const birim = ln?.qunit || g.qunit || 'ADET'
  const key   = ln ? lnKey(ln) : `${g.material}|${g.voptions || ''}|${g.line_no}`
  const summary = summaryMap.value.get(key)

  let miktar = Number(g.take || 0)
  if (summary && summary.remaining != null){
    const rem = Number(summary.remaining || 0)
    if (rem <= 0) return
    if (miktar > rem) miktar = rem
  }
  if (!(miktar > 0)) return

  staged.value.push({
    fromId:  g.from_box_id,
    material:g.material,
    voptions:g.voptions || null,
    miktar,
    birim,
    line_no:g.line_no
  })
  appliedGuideKeys.value.add(guideKey(g))
}
// Rehberden staging'e aktarılmış satırları takip etmek için
const appliedGuideKeys = ref(new Set())

function guideKey(g){
  return `${g.line_no}|${g.material}|${g.voptions || ''}|${g.from_box_id || 0}`
}
function supportsDetector(){
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

async function openQr(fieldKey){
  if (!isMobile.value){
    qr.err = 'Bu özellik sadece mobil cihazlarda kullanılabilir.'
    qr.open = true
    return
  }
  qr.field = fieldKey
  qr.err = ''
  qr.open = true
  await nextTick()
  try{
    if (supportsDetector()){
      detector = new window.BarcodeDetector({
        formats: ['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e','codabar','itf']
      })
    }else{
      qr.err = 'Tarayıcıda BarcodeDetector desteği yok. (Chrome/Edge önerilir)'
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, audio: false
    })
    qr.stream = stream
    qrVideo.value.srcObject = stream
    await qrVideo.value.play()
    loopDetect()
  }catch(e){
    qr.err = e?.message || 'Kamera başlatılamadı.'
  }
}

function closeQr(){
  cancelAnimationFrame(qrRaf)
  if (qr.stream){
    qr.stream.getTracks().forEach(t => t.stop())
    qr.stream = null
  }
  qr.open = false
  qr.err = ''
  detector = null
}

async function loopDetect(){
  if (!qr.open) return
  try{
    if (detector && qrVideo.value?.readyState >= 2){
      const codes = await detector.detect(qrVideo.value)
      if (codes && codes.length){
        const val = (codes[0].rawValue || '').trim()
        if (val){
          if (qr.field === 'kolikodu') target.kolikodu = val
          else if (qr.field === 'yerkodu') target.yerkodu = val
          else if (qr.field === 'kolitipi') target.kolitipi = val
          closeQr()
          return
        }
      }
    }
  }catch(e){
    // sessiz
  }
  qrRaf = requestAnimationFrame(loopDetect)
}

onBeforeUnmount(closeQr)
import { watch } from 'vue'

watch(staged, (newVal) => {
  // Staging'deki aktif key'leri çıkar
  const activeKeys = new Set()

  for (const s of newVal) {
    const key = `${s.line_no}|${s.material}|${s.voptions || ''}|${s.fromId}`
    activeKeys.add(key)
  }

  // Rehberde işaretli olanlardan staging'de olmayanları temizle
  for (const usedKey of appliedGuideKeys.value) {
    if (!activeKeys.has(usedKey)) {
      appliedGuideKeys.value.delete(usedKey)
    }
  }
}, { deep: true })
</script>

<style scoped>
/* Genel */
:root { --pri:#111827 }
.page{ max-width:1200px; margin:22px auto; padding:0 12px }
.page.hasDock{ padding-bottom: 96px }
.topbar{ position: sticky; top:0; z-index:5; background:#ffffffcc; backdrop-filter: blur(6px);
  display:flex; justify-content:space-between; align-items:flex-end; gap:12px; padding:10px 6px 8px; border-bottom:1px solid #eef2f7; margin-bottom:10px }
.sub{ color:#6b7280; font-size:13px }
.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin:10px 0; box-shadow:0 1px 0 rgba(16,24,40,.02) }
.section-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
.row{ display:flex; gap:12px; align-items:flex-end; margin:6px 0 }
.wrap{ flex-wrap:wrap }
.field{ display:flex; flex-direction:column; gap:6px; min-width:160px }
.w150{ width:150px } .w200{ width:200px }
input, select{ padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; outline:none }
input:focus, select:focus{ border-color:var(--pri); box-shadow:0 0 0 3px rgba(17,24,39,.08) }
.btn{ border:1px solid #d1d5db; background:#f9fafb; color:#111827; padding:8px 12px; border-radius:10px; cursor:pointer; transition:.15s }
.btn:hover{ transform: translateY(-1px) }
.btn.primary{ background:#111827; color:#fff; border-color:#111827 }
.btn.mini{ padding:6px 10px; border-radius:8px }
.btn.ghost{ background:#fff }
.btn:disabled{ opacity:.6; cursor:not-allowed }
.inline{ display:inline-flex; align-items:center; gap:6px }
.spinner{ width:18px; height:18px; border-radius:50%; border:3px solid #e5e7eb; border-top-color:#111827; animation: spin 1s linear infinite }
.spinner.xs{ width:14px; height:14px; border-width:2px }
@keyframes spin{ to{ transform: rotate(360deg) } }

.chip{ padding:5px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; font-size:12px }
.chip-muted{ color:#6b7280 } .chip-on{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }

.msg{ margin-top:6px; font-size:13px } .msg.err{ color:#b00020 }

.code{ display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.badge{ display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; background:#f3f4f6; border:1px solid #e5e7eb }
.badge.st-draft{ background:#eef2ff; border-color:#c7d2fe; color:#3730a3 }
.badge.st-sealed{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
.pill{ display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:999px; padding:2px 8px; font-size:12px; color:#374151 }

.empty{ color:#6b7280; background:#fafafa; padding:10px; border:1px dashed #e5e7eb; border-radius:10px; text-align:center }
.empty.tiny{ font-size:12px }

/* Kalem kartları */
.line-card{ border:1px solid #eef2f7; border-radius:12px; margin:8px 0; overflow:hidden }
.l-head{ display:flex; align-items:center; gap:10px; padding:10px; background:#fbfbfc; cursor:pointer }
.l-head .id{ width:54px; font-weight:700 }
.l-head .mat{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
.l-head .qty{ margin-left:8px }
.spacer{ flex:1 }

/* Öneriler alanı */
.suggest{ border-top:1px solid #eef2f7; padding:10px }
.sg-head{ display:flex; align-items:center; gap:8px; margin-bottom:8px }
.sg-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:10px }
.sg-card{ border:1px solid #eef2f7; border-radius:12px; padding:10px; background:#fff; display:flex; flex-direction:column; gap:8px }
.sg-top{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
.sg-mid{ display:flex; gap:6px; flex-wrap:wrap }
.sg-flags .flag.ok{ color:#065f46; font-weight:600; font-size:12px }
.sg-act{ display:flex; gap:8px; align-items:center }
.num{ width:120px; padding:7px 8px; border:1px solid #e5e7eb; border-radius:8px; text-align:right }
.sg-skel{ height:100px; border-radius:12px; background: linear-gradient(90deg, #f3f4f6, #eef2f7, #f3f4f6); background-size:200% 100%; animation: shimmer 1.2s infinite }
@keyframes shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* Tablo / Staging */
.table-head, .tr{ display:grid; grid-template-columns: 70px 1.3fr 1fr 100px 120px 80px 100px; gap:10px; align-items:center }
.table-head.compact{ font-weight:600; color:#374151; padding:6px 8px; background:#f8fafc; border:1px solid #eef2f7; border-radius:10px }
.table-body .tr{ padding:10px 8px; border-bottom:1px solid #f3f4f6; background:#fff }
.right{ text-align:right }

/* Önerilen Alım Rehberi */
.card.guide{ background:#f9fafb; }
.guide-head,
.guide-body .guide-row{
  display:grid;
  grid-template-columns: 80px 1.6fr 100px 160px 160px 110px 140px;
  gap:10px;
  align-items:center;
}
.guide-head{
  font-weight:600; color:#374151; padding:6px 8px;
  background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; margin-bottom:6px;
}
.guide-body .guide-row{
  padding:8px 8px; border-bottom:1px solid #f3f4f6; background:#fff;
}

/* Dock */
.dock{ position: fixed; bottom: 16px; right: 16px; left: auto; height: 64px; min-width: 360px; background:#111827; color:#fff;
  display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.2); z-index: 20 }
.dock .btn{ background:#fff; border-color:#fff; color:#111827 } .dock .btn.primary{ background:#22c55e; border-color:#22c55e; color:#fff }
</style>