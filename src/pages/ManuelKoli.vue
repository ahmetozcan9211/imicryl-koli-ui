<template>
  <div class="page" :class="{ hasDock: staged.length > 0 }">
    <!-- Üst başlık -->
    <header class="topbar">
      <div class="left">
        <h2>Manuel Koli Oluştur / Kullan</h2>
        <p class="sub">
          Koli kodunu yaz → varsa getirir, yoksa yeni açar. Barkodu Enter ile okut; staging’e ekle.
          Ağırlık panelinde beklenen/tartılan ağırlıkları gör ve kaydet.
        </p>
      </div>
      <div class="right">
        <div class="chip" :class="koli ? 'chip-on' : 'chip-muted'">
          <template v-if="koli"><span class="badge">#{{ koli.id }}</span> {{ koli.kolikodu }}</template>
          <template v-else>Henüz koli seçili değil</template>
        </div>
      </div>
    </header>

    <!-- Koli bilgileri -->
    <section class="card">
      <div class="row wrap">
        <div class="field">
          <label>Koli Kodu</label>
          <!-- ✅ QR butonu eklendi -->
          <div class="scan-row">
            <input v-model.trim="form.kolikodu" placeholder="Örn: K-MAN-001"/>
            <button class="scan-btn mobile-only"
                    title="Kameradan tara"
                    @click="openScanner({ label:'Koli Kodu', setValue:(v)=>form.kolikodu=v })">📷</button>
          </div>
        </div>
        <div class="field">
          <label>Koli Tipi (ops.)</label>
          <!-- ✅ QR butonu eklendi -->
          <div class="scan-row">
            <input v-model.trim="form.kolitipi" placeholder="Örn: Kutu-40x30 / Palet / vb." />
            <button class="scan-btn mobile-only"
                    title="Kameradan tara"
                    @click="openScanner({ label:'Koli Tipi', setValue:(v)=>form.kolitipi=v })">📷</button>
          </div>
        </div>
        <div class="field">
          <label>Yer / Raf (ops.)</label>
          <!-- ✅ QR butonu eklendi -->
          <div class="scan-row">
            <input v-model.trim="form.yerkodu" placeholder="Örn: RAF-A3" />
            <button class="scan-btn mobile-only"
                    title="Kameradan tara"
                    @click="openScanner({ label:'Yer / Raf', setValue:(v)=>form.yerkodu=v })">📷</button>
          </div>
        </div>
        <div class="field grow">
          <label>Açıklama (ops.)</label>
          <input v-model.trim="form.aciklama" placeholder="Kısa not…" />
        </div>
        <div class="actions" style="display:flex; gap:8px; align-items:center">
          <button class="btn primary" @click="openOrReuse" :disabled="!form.kolikodu || busy"> 📦 Aç - Kullan</button>

          <!-- 🆕 Koli kapat -->
          <button
              class="btn"
              @click="closeKoliUI"
              :disabled="!koli || busy || (koli && (koli.durum||'draft') === 'sealed')"
              title="Koli durumunu 'sealed' yapar"
          >
            🔒 Koliyi Kapat
          </button>
        </div>
      </div>

      <div v-if="koli" class="meta">
        <span class="badge">#{{ koli.id }}</span>
        <b>{{ koli.kolikodu }}</b>
        <span class="pill">Durum: {{ koli.durum }}</span>
        <span v-if="koli.yerkodu" class="pill">Yer: {{ koli.yerkodu }}</span>
        <span v-if="koli.kolitipi" class="pill">Tip: {{ koli.kolitipi }}</span>
        <span v-if="koli.juliandate != null" class="pill">Julian: {{ koli.juliandate }}</span>
        <span v-if="koli.siparisno" class="pill">Belge: {{ koli.doctype || 'SIPA' }} {{ koli.siparisno }}</span>
      </div>

      <p v-if="err" class="msg err">⚠️ {{ err }}</p>
      <p v-if="okMsg" class="msg ok">✓ {{ okMsg }}</p>
    </section>

    <!-- (Opsiyonel) Siparişe bağla -->
    <section class="card">
      <div class="section-head">
        <h3>Siparişe Bağla (opsiyonel)</h3>
        <div class="muted">Koli seçiliyse sipariş numarası ve belge türü atayabilirsin.</div>
      </div>
      <div class="row wrap">
        <div class="field">
          <label>Sipariş No</label>
          <input v-model.trim="sipForm.siparisno" placeholder="Örn: 00024232" />
        </div>
        <div class="field">
          <label>Belge Türü</label>
          <select v-model="sipForm.doctype">
            <option value="SIPA">SIPA</option>
            <option value="YSIP">YSIP</option>
            <option value="NSIP">NSİP</option>
            <option value="SIP2">SİP2</option>
          </select>
        </div>
        <div class="actions" style="display:flex; gap:8px; align-items:center">
          <button class="btn" @click="attachOrder" :disabled="!koli || !sipForm.siparisno || busy">🔗 Bağla / Güncelle</button>
          <button
              class="btn danger"
              v-if="koli && koli.siparisno"
              @click="detachOrder"
              :disabled="busy"
              title="Bu kolinin sipariş bağlantısını kaldır"
          >
            🔌 Bağlantıyı Kaldır
          </button>
        </div>
      </div>
      <div class="hint tiny">
        Aynı koli kodu gönderildiği için mevcut koli güncellenir (dup olmaz).
        <template v-if="koli && koli.siparisno">
          • Şu an bağlı: <b>{{ koli.doctype || 'SIPA' }} {{ koli.siparisno }}</b>
        </template>
      </div>
    </section>

    <!-- Ağırlık paneli -->
    <section class="card" v-if="koli">
      <div class="section-head">
        <h3>Ağırlık</h3>
        <div class="muted tiny">Birim: gram (g) — parantez içinde kg gösterimi</div>
      </div>

      <div class="weight-grid">
        <div class="weight-box">
          <div class="lbl">Beklenen Ağırlık</div>
          <div class="val">
            <b>{{ expectedWeightGram }}</b> <span class="muted">g</span>
            <span class="kg">({{ (expectedWeightGram/1000).toFixed(3) }} kg)</span>
          </div>
          <div class="hint tiny">Mevcut içerik + staging satırlarına göre canlı hesap.</div>
        </div>

        <div class="weight-box">
          <div class="lbl">Tartılan Ağırlık</div>
          <div class="val input">
            <input v-model.number="measuredGram" type="number" min="0" placeholder="örn: 15432" :disabled="isSealed"/>
            <span class="muted">g</span>
            <span class="kg">({{ (Number(measuredGram||0)/1000).toFixed(3) }} kg)</span>
          </div>
          <div class="actions">
            <button class="btn" @click="saveWeights" :disabled="!koli || busy || isSealed">💾 Kaydet</button>
          </div>
        </div>

        <div class="weight-box">
          <div class="lbl">Fark (Δ)</div>
          <div class="val" :class="deltaClass">
            <b>{{ deltaGram }}</b> <span class="muted">g</span>
            <span class="kg">({{ (deltaGram/1000).toFixed(3) }} kg)</span>
          </div>
          <div class="hint tiny">Δ = Tartılan - Beklenen</div>
        </div>
      </div>

      <div v-if="unknownWeightMaterials.length" class="msg err" style="margin-top:8px">
        ⚠️ Ağırlığı bilinemeyen malzemeler: {{ unknownWeightMaterials.join(', ') }} (iasmatbasic.company='02' kaydı yok)
      </div>
    </section>

    <!-- Barkod ile ekleme (staging) -->
    <section class="card" v-if="koli">
      <div class="section-head">
        <h3>Barkod Okut → Staging’e Ekle</h3>
        <div class="muted tiny">Örnek: <code>(01)869...(10)LOT(17)YYMMDD(99)IMI(240)REF</code></div>
      </div>
      <div class="row wrap">
        <div class="field grow">
          <label>GS1 Barkodu</label>
          <!-- ✅ QR butonu eklendi -->
          <div class="scan-row">
            <input
                v-model.trim="scan.barkod"
                placeholder="(01)...(10)...(17)...(99)...(240)..."
                @keyup.enter="scanAndStage"
            />
            <button class="scan-btn mobile-only"
                    title="Kameradan tara"
                    @click="openScanner({
                label:'GS1 Barkodu',
                setValue:(v)=>{ scan.barkod=v },
                autoStage:true
              })">📷</button>
          </div>
        </div>
        <div class="field w120">
          <label>Miktar</label>
          <input v-model.number="scan.qty" type="number" min="1" :disabled="isSealed" />
        </div>
        <div class="field w120">
          <label>Birim</label>
          <input v-model.trim="scan.birim" placeholder="ADET" :disabled="isSealed"/>
        </div>
        <div class="actions">
          <button class="btn" @click="scanAndStage" :disabled="!scan.barkod || isSealed">➕ Ekle (Staging)</button>
        </div>
      </div>
      <div class="msg ok" v-if="scan.lastInfo">✓ {{ scan.lastInfo }}</div>
      <div class="msg err" v-if="scan.err">⚠️ {{ scan.err }}</div>
    </section>

    <!-- Staging tablo -->
    <section class="card" v-if="koli">
      <div class="section-head">
        <h3>Kaydedilmemiş Satırlar (Staging)</h3>
        <div class="muted">Toplam {{ staged.length }} satır</div>
      </div>

      <div class="table-head compact">
        <div class="th w40">#</div>
        <div class="th">Malzeme</div>
        <div class="th">Varyant</div>
        <div class="th">Lot</div>
        <div class="th">Seri</div>
        <div class="th w130">SKT</div>
        <div class="th w100">Birim</div>
        <div class="th w140 right">Miktar</div>
        <div class="th w140 right">Ağırlık (g)</div>
        <div class="th w90"></div>
      </div>

      <div class="table-body">
        <div v-if="!staged.length" class="empty">Henüz satır yok. Barkod okut veya manuel ekle, sonra <b>Kaydet</b>.</div>

        <div v-for="(ln,i) in staged" :key="'s'+i" class="tr compact">
          <div class="td w40">{{ i+1 }}</div>
          <div class="td"><input v-model.trim="ln.material" class="cell-input" @change="ensureWeights([ln.material])" :disabled="isSealed" /></div>
          <div class="td"><input v-model.trim="ln.secenek" class="cell-input" placeholder="#...#" :disabled="isSealed" /></div>
          <div class="td"><input v-model.trim="ln.lotno" class="cell-input" :disabled="isSealed"/></div>
          <div class="td"><input v-model.trim="ln.serino" class="cell-input" :disabled="isSealed"/></div>
          <div class="td w130"><input v-model="ln.skt" type="date" class="cell-input" :disabled="isSealed"/></div>
          <div class="td w100"><input v-model.trim="ln.birim" class="cell-input" :disabled="isSealed"/></div>
          <div class="td w140 right"><input v-model.number="ln.miktar" type="number" min="0" class="cell-input right" :disabled="isSealed"/></div>
          <div class="td w140 right">
            <span class="mono">{{ perUnitGram(ln.material) ?? '-' }}</span>
          </div>
          <div class="td w90">
            <button class="btn danger mini" @click="removeStaged(i)" :disabled="isSealed">Sil</button>
          </div>
        </div>
      </div>

      <div class="footer-actions">
        <button class="btn" @click="clearStaged" :disabled="!staged.length || isSealed" >🧹 Temizle</button>
        <div class="spacer"></div>
        <button class="btn primary" @click="saveAll" :disabled="!staged.length || busy || isSealed">💾 Kaydet → DB</button>
        <span v-if="save.ok" class="toast ok">✓ Kaydedildi</span>
        <span v-if="save.err" class="toast err">Hata: {{ save.err }}</span>
      </div>
    </section>

    <!-- Mevcut içerik -->
    <section v-if="koli" class="card">
      <div class="section-head">
        <h3>Mevcut İçerik</h3>
        <button class="btn mini" @click="loadIcerik">↻ Yenile</button>
      </div>

      <div class="table-head">
        <div class="th">Malzeme</div>
        <div class="th">Varyant</div>
        <div class="th">Lot</div>
        <div class="th">Seri</div>
        <div class="th w130">SKT</div>
        <div class="th w100">Birim</div>
        <div class="th w140 right">Net Miktar</div>
        <div class="th w140 right">Ağırlık (g)</div>
      </div>

      <div class="table-body">
        <template v-if="loadingIcerik">
          <div v-for="i in 6" :key="'sk'+i" class="skeleton row"></div>
        </template>
        <template v-else>
          <div
              v-for="r in icerik"
              :key="r.material + '|' + (r.secenek||'') + '|' + (r.lotno||'') + '|' + (r.serino||'') + '|' + (r.skt||'')"
              class="tr"
          >
            <div class="td"><span class="code">{{ r.material }}</span></div>
            <div class="td">{{ r.secenek || '-' }}</div>
            <div class="td">{{ r.lotno || '-' }}</div>
            <div class="td">{{ r.serino || '-' }}</div>
            <div class="td w130">{{ formatDate(r.skt) }}</div>
            <div class="td w100">{{ r.birim }}</div>
            <div class="td w140 right"><strong>{{ r.netmiktar }}</strong></div>
            <div class="td w140 right">
              <span class="mono">{{ (perUnitGram(r.material) ?? 0) * Number(r.netmiktar||0) }}</span>
            </div>
          </div>
          <div v-if="!icerik.length" class="empty">Bu kolide içerik görünmüyor.</div>
        </template>
      </div>
    </section>

    <!-- Yüzen alt eylem çubuğu -->
    <div v-if="staged.length" class="dock">
      <div class="dock-left">⏳ Staging’de <b>{{ staged.length }}</b> satır var</div>
      <div class="dock-right">
        <button class="btn" @click="clearStaged">Temizle</button>
        <button class="btn primary" @click="saveAll" :disabled="busy">Kaydet → DB</button>
      </div>
    </div>

    <!-- ✅ QR/Barcode tarayıcı modalı (sadece ekleme) -->
    <div v-if="cam.open" class="scanner-modal">
      <div class="scanner-box">
        <div class="scanner-head">
          <b>{{ cam.label }}</b>
          <button class="close-x" @click="closeScanner">✕</button>
        </div>
        <video ref="videoEl" playsinline muted class="scanner-video"></video>
        <div class="scanner-hint">Kamerayı barkoda doğrultun…</div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed,watch } from 'vue'
import api from '../api'

/* --- State --- */
const busy = ref(false)
const err = ref('')
const okMsg = ref('')

const koli = ref(null)
const icerik = ref([])
const loadingIcerik = ref(false)

const form = ref({ kolikodu:'', kolitipi:'', yerkodu:'', aciklama:'' })
const sipForm = ref({ siparisno:'', doctype:'SIPA' })

const scan = ref({ barkod:'', qty:1, birim:'ADET', lastInfo:'', err:'' })
const staged = ref([])

/* --- Weights --- */
const weights = ref({})
const measuredGram = ref(null)
const expectedWeightGram = computed(() => {
  let total = 0

  for (const r of icerik.value) {
    const g = Number(weights.value[String(r.material).trim()])
    const per = Number.isFinite(g) ? g : 0
    total += per * Number(r.netmiktar || 0)
  }
  for (const ln of staged.value) {
    const g = Number(weights.value[String(ln.material).trim()])
    const per = Number.isFinite(g) ? g : 0
    total += per * Number(ln.miktar || 0)
  }

  // total NaN olmasın
  if (!Number.isFinite(total)) total = 0
  return Math.round(total)
})
const lastCode = ref('')

watch(() => form.value.kolikodu, (next, prev) => {
  // boşsa veya aynıysa dokunma
  if (!next || next === prev) return

  // önceki seçili koli ile farklı bir koda geçiliyorsa opsiyonelleri sıfırla
  if (!koli.value || (koli.value && koli.value.kolikodu !== next)) {
    form.value.yerkodu  = ''
    form.value.kolitipi = ''
    form.value.aciklama = ''
    // istersen staging’i de temizle:
    staged.value = []
    okMsg.value = ''
    err.value = ''
  }
  lastCode.value = next
})
const deltaGram = computed(() => Number(measuredGram.value || 0) - Number(expectedWeightGram.value || 0))
const deltaClass = computed(() => ({ pos: deltaGram.value >= 0, neg: deltaGram.value < 0 }))
const unknownWeightMaterials = computed(() => {
  const set = new Set()
  for (const r of icerik.value) if (weights.value[r.material] == null) set.add(r.material)
  for (const s of staged.value) if (weights.value[s.material] == null) set.add(s.material)
  return [...set]
})
function perUnitGram(mat){ const g = weights.value[String(mat)?.trim()] ; return g != null ? Number(g) : null }

/* --- Helpers --- */
function clearMsgs(){ err.value = ''; okMsg.value = '' }
function formatDate(v){ if(!v) return '-'; try{ const d=new Date(v); return isNaN(d)? String(v): d.toISOString().slice(0,10) }catch{ return String(v) } }

/* --- Koli Kapat (seal) — yeni --- */
async function closeKoli(){
  clearMsgs()
  if (!koli.value) { err.value = 'Önce koliyi aç/kullan.'; return }
  if (koli.value.durum === 'sealed' || koli.value.durum === 'cancelled') {
    okMsg.value = 'Koli zaten kapalı.'
    return
  }
  busy.value = true
  try{
    let data
    // 1) /close
    try{
      const r1 = await api.post(`/api/koliler/${koli.value.id}/close`)
      data = r1.data
    }catch(e1){
      // 2) /seal
      try{
        const r2 = await api.post(`/api/koliler/${koli.value.id}/seal`)
        data = r2.data
      }catch(e2){
        // 3) /durum patch
        const r3 = await api.post(`/api/koliler/${koli.value.id}/durum`, { durum:'sealed' })
        data = r3.data
      }
    }
    // meta’yı güncelle
    koli.value = { ...(koli.value||{}), ...(data||{}), durum: data?.durum || 'sealed', kapamats: data?.kapamats ?? new Date().toISOString() }
    okMsg.value = 'Koli kapatıldı.'
  }catch(e){
    err.value = e?.response?.data?.error || e.message
  }finally{
    busy.value = false
  }
}
const isSealed = computed(() => (koli.value?.durum || 'draft') === 'sealed')
/* --- Weight helpers --- */
async function ensureWeights(materials){
  const list = (materials || []).map(m => String(m||'').trim()).filter(Boolean)
  const need = list.filter(m => !(m in weights.value))
  if (!need.length) return
  try{
    const { data } = await api.getMaterialWeights(need) // /api/material/weights
    const incoming = data?.weights || {}
    // -> Her değeri saf sayıya çevir
    const normalized = {}
    for (const [k, v] of Object.entries(incoming)) {
      const key = String(k || '').trim()
      let num = typeof v === 'number' ? v : Number(v?.gram ?? v?.weight ?? v ?? 0)
      if (!Number.isFinite(num)) num = 0
      normalized[key] = num
    }
    weights.value = { ...weights.value, ...normalized }
  }catch{
    /* sessiz geç */
  }
}

/* --- Koli aç / kullan --- */
async function openOrReuse(){
  clearMsgs()
  const kod = (form.value.kolikodu || '').trim()
  if (!kod) { err.value = 'Koli kodu zorunlu'; return }
  busy.value = true
  try {
    // 1) varsa getir
    try{
      const r = await api.getKoliByCode(kod)
      const data = r.data
      // meta güncelle
      // meta güncelle: formda özellikle bir değer yazdıysan güncelle, yoksa dokunma
      if (form.value.yerkodu?.trim()){
        const up = await api.updateKoliYer(data.id, form.value.yerkodu.trim())
        data.yerkodu = up.data?.yerkodu ?? form.value.yerkodu.trim()
      }
      if (form.value.kolitipi?.trim()){
        const up2 = await api.updateKoliTipi(data.id, form.value.kolitipi.trim())
        data.kolitipi = up2.data?.kolitipi ?? form.value.kolitipi.trim()
      }

      koli.value = data
// backend’den gelmezse boş kalsın — önceki kolinin değeri taşınmasın
      form.value.yerkodu  = data.yerkodu  || ''
      form.value.kolitipi = data.kolitipi || ''
      form.value.aciklama = data.aciklama || ''
      // sipariş formunu yansıt
      sipForm.value.siparisno = data.siparisno || ''
      sipForm.value.doctype   = data.doctype || 'SIPA'
      okMsg.value = 'Mevcut koli yüklendi.'
      await loadIcerik()
      return
    }catch(e){
      if (e?.response?.status && e.response.status !== 404) throw e
    }

    // 2) yoksa oluştur (draft)
    const payload = { kolikodu:kod, aciklama: form.value.aciklama || null, kolitipi: form.value.kolitipi || null }
    const { data: created } = await api.openKoli(payload)
    if (form.value.yerkodu){ const up = await api.updateKoliYer(created.id, form.value.yerkodu); created.yerkodu = up.data?.yerkodu ?? form.value.yerkodu }
    koli.value = created
    sipForm.value.siparisno = ''
    sipForm.value.doctype   = 'SIPA'
    okMsg.value = 'Yeni koli oluşturuldu.'
    await loadIcerik()
  } catch (e) {
    err.value = e?.response?.data?.error || e.message
  } finally { busy.value = false }
}

/* --- Siparişe bağla / güncelle --- */
async function attachOrder(){
  clearMsgs()
  if (!koli.value) { err.value = 'Önce koliyi açın/kullanın.'; return }
  if (!sipForm.value.siparisno) { err.value = 'Sipariş no zorunlu'; return }
  busy.value = true
  try{
    const { data } = await api.openKoliByOrder({
      siparisno: sipForm.value.siparisno.trim(),
      kolikodu: koli.value.kolikodu,
      doctype: sipForm.value.doctype || 'SIPA'
    })
    koli.value = data
    sipForm.value.siparisno = data.siparisno || sipForm.value.siparisno
    sipForm.value.doctype   = data.doctype   || sipForm.value.doctype
    okMsg.value = 'Koli siparişe bağlandı / güncellendi.'
  }catch(e){
    err.value = e?.response?.data?.error || e.message
  }finally{ busy.value = false }
}

/* --- Sipariş bağlantısını kaldır --- */
async function detachOrder(){
  clearMsgs()
  if (!koli.value) { err.value = 'Önce koliyi aç/kullan.'; return }
  if (!koli.value.siparisno && !koli.value.doctype){ okMsg.value='Zaten bağlantı yok.'; return }
  busy.value = true
  try{
    const { data } = await api.updateKoliOrderLink(koli.value.id, { clear:true })
    koli.value = { ...(koli.value||{}), ...data, siparisno:null, doctype:null }
    sipForm.value.siparisno = ''
    sipForm.value.doctype   = 'SIPA'
    okMsg.value = 'Sipariş bağlantısı kaldırıldı.'
  }catch(e){
    err.value = e?.response?.data?.error || e.message
  }finally{ busy.value = false }
}

/* --- Barkod çöz & staging --- */
async function scanAndStage(){
  scan.value.err = ''; scan.value.lastInfo = ''
  if (!koli.value) { scan.value.err = 'Önce koliyi aç/kullan.'; return }
  if (!scan.value.barkod) return
  try{
    const { data } = await api.scanResolve({ barkod: scan.value.barkod })
    if (!data?.resolved?.material) {
      scan.value.err = 'Barkod çözülemedi (malzeme bulunamadı).'
      setTimeout(()=> scan.value.err = '', 2000)
      return
    }
    const ln = {
      material: data?.resolved?.material || '',
      secenek:  data?.resolved?.secenek || '',
      lotno:    data?.parsed?.lotno || '',
      serino:   '',
      skt:      data?.parsed?.skt || null,
      miktar:   Number(scan.value.qty) || 1,
      birim:    (scan.value.birim || 'ADET').trim()
    }
    staged.value.push(ln)
    await ensureWeights([ln.material])
    scan.value.lastInfo = `${ln.material} ${ln.secenek || ''} lot:${ln.lotno || '-'} skt:${ln.skt || '-'}`
    scan.value.barkod = ''; scan.value.qty = 1
  }catch(e){
    scan.value.err = e?.response?.data?.error || e.message
    setTimeout(()=> scan.value.err = '', 2500)
  }
}

function removeStaged(i){ staged.value.splice(i,1) }
function clearStaged(){ staged.value = [] }

/* --- Kaydet (satırlar) --- */
const save = ref({ ok:false, err:'' })


async function saveAll(){
  /*
  *
  * */

  if (isSealed.value) { err.value = 'Kapalı kolide değişiklik yapılamaz.'; return }
  clearMsgs(); save.value.ok=false; save.value.err=''
  if (!koli.value || !staged.value.length) return
  busy.value = true
  try{
    const { data: bulkRes } = await api.addKoliBulk(koli.value.id, {
      lines: staged.value.map(ln => ({
        material: (ln.material||'').trim(),
        secenek: (ln.secenek||'').trim() || null,
        lotno: (ln.lotno||'').trim() || null,
        serino: (ln.serino||'').trim() || null,
        skt: ln.skt || null,
        miktar: Number(ln.miktar||0),
        birim: (ln.birim||'ADET').trim()
      })),
      autoCreate: true,
      ekleyen: 'ahmet'
    })
    if (bulkRes?.expected_weight_gram != null) {
      koli.value = { ...(koli.value||{}), expected_weight_gram: Number(bulkRes.expected_weight_gram) }
    }
    save.value.ok = true
    setTimeout(()=> save.value.ok=false, 1500)
    staged.value = []
    await loadIcerik()
  }catch(e){
    save.value.err = e?.response?.data?.message || e?.response?.data?.error || e.message
    setTimeout(()=> save.value.err='', 3000)
  }finally{ busy.value = false }
}

/* --- İçerik + ağırlık verisi --- */
async function loadIcerik(){
  if (!koli.value) return
  loadingIcerik.value = true
  try{
    const { data } = await api.getKoliIcerik(koli.value.id)
    icerik.value = Array.isArray(data) ? data : []
    const mats = [...new Set(icerik.value.map(x => String(x.material).trim()))]
    await ensureWeights(mats)
  }catch{ icerik.value = [] }
  finally{ loadingIcerik.value = false }
}
async function closeKoliUI(){
  clearMsgs()
  if (!koli.value) { err.value = 'Önce koliyi aç/kullan.'; return }
  if ((koli.value.durum || 'draft') === 'sealed') { okMsg.value = 'Koli zaten kapalı.'; return }

  busy.value = true
  try{
    const { data } = await api.closeKoli(koli.value.id)
    koli.value = { ...(koli.value || {}), ...(data || {}) }
    okMsg.value = 'Koli kapatıldı.'
    staged.value = []
    await loadIcerik()
  }catch(e){
    err.value = e?.response?.data?.error || e.message
  }finally{
    busy.value = false
  }
}

/* --- Ağırlık kaydet (tartılan) --- */
async function saveWeights(){
  clearMsgs()
  if (!koli.value) { err.value = 'Önce koli aç/kullan.'; return }
  busy.value = true
  try{
    const { data } = await api.updateKoliWeights(koli.value.id, {
      measured_gram: Number(measuredGram.value || 0),
      expected_gram: Number(expectedWeightGram.value || 0)
    })
    koli.value = { ...(koli.value||{}), ...(data||{}) }
    okMsg.value = 'Ağırlık kaydedildi.'
  }catch(e){
    err.value = e?.response?.data?.error || e.message
  }finally{ busy.value = false }
}

watch(koli, (k) => {
  if (!k) return
  sipForm.value.siparisno = k.siparisno || ''
  sipForm.value.doctype   = k.doctype   || 'SIPA'
  measuredGram.value = (k.measured_weight_gram != null)
      ? Number(k.measured_weight_gram)
      : null
}, { immediate: true })


/* =======================================================
   ✅ Yalnızca QR/Barcode TARAYICI eklemesi (ZXing)
   ======================================================= */
let codeReader = null
const videoEl = ref(null)
const cam = ref({ open:false, label:'', autoStage:false })
let applyValue = (v)=>{}

async function openScanner({ label, setValue, autoStage = false }){
  applyValue = setValue || ((_)=>{})
  cam.value = { open:true, label, autoStage }

  // Dinamik import: paket yüklü olmalı (npm i @zxing/browser)
  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  codeReader = new BrowserMultiFormatReader()

  try{
    const devices = await BrowserMultiFormatReader.listVideoInputDevices()
    const backCam = devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId
    const deviceId = backCam || devices[0]?.deviceId

    await codeReader.decodeFromVideoDevice(
        deviceId,
        videoEl.value,
        (result, err) => {
          if (result){
            const txt = result.getText()
            applyValue(txt)
            if (cam.value.autoStage) {
              // input güncellensin, sonra ekle
              setTimeout(()=> scanAndStage(), 50)
            }
            closeScanner()
          }
          // err sürekli dönebilir; görmezden geliyoruz
        }
    )
  }catch(e){
    console.error('Kamera başlatma hatası:', e)
    closeScanner()
  }
}

function closeScanner(){
  try{ codeReader?.reset() }catch{}
  cam.value.open = false
}
</script>

<style scoped>
/* (stil aynı, kısalttım) */
:root { --dock-h: 64px; --pri:#111827; }
.page{ max-width:1100px; margin:24px auto; padding:0 10px }
.page.hasDock{ padding-bottom: calc(var(--dock-h) + 28px); }
.topbar{ position: sticky; top:0; z-index:5; background:#ffffffcc; backdrop-filter: blur(6px); display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #eef2f7; padding:10px 4px 8px; margin-bottom:10px; }
.topbar h2{ margin:0 0 4px 0 }
.sub{ color:#6b7280; font-size:13px }
.right{ display:flex; gap:8px; align-items:center }
.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; margin:12px 0; box-shadow:0 1px 0 rgba(16,24,40,.02) }
.row{ display:flex; gap:12px; align-items:flex-end; margin:6px 0 }
.wrap{ flex-wrap:wrap }
.field{ display:flex; flex-direction:column; gap:6px; min-width:220px }
.field.grow{ flex:1 }
.field > label{ font-size:13px; color:#374151 }
.meta{ margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap }
input, select{ padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; outline:none }
input:focus, select:focus{ border-color:var(--pri); box-shadow:0 0 0 3px rgba(17,24,39,.08) }
.btn{ border:1px solid #d1d5db; background:#f9fafb; color:#111827; padding:8px 12px; border-radius:10px; cursor:pointer; transition:.15s }
.btn:hover{ transform: translateY(-1px) }
.btn:disabled{ opacity:.6; cursor:not-allowed; transform:none }
.btn.primary{ background:var(--pri); color:#881515; border-color:var(--pri) }
.btn.mini{ padding:6px 10px; border-radius:8px }
.btn.danger{ background:#fee2e2; border-color:#fecaca; color:#7f1d1d }
.chip{ padding:5px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; font-size:12px }
.chip-muted{ color:#6b7280 } .chip-on{ background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
.badge{ display:inline-block; background:#111827; color:#fff; border-radius:6px; padding:2px 6px; font-size:12px }
.pill{ display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:999px; padding:4px 8px; margin-right:6px; font-size:12px; color:#374151 }
.section-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:6px }
.msg{ margin-top:8px; font-size:13px } .msg.ok{ color:#065f46 } .msg.err{ color:#b00020 }
.hint{ margin-top:6px; color:#6b7280 } .tiny{ font-size:12px }
.weight-grid{ display:grid; gap:12px; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)) }
.weight-box{ border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fafafa }
.weight-box .lbl{ font-weight:600; margin-bottom:6px }
.weight-box .val{ font-size:18px }
.weight-box .val.input{ display:flex; align-items:center; gap:8px }
.weight-box .val input{ width:160px; text-align:right }
.weight-box .kg{ margin-left:8px; font-size:13px; color:#6b7280 }
.pos{ color:#065f46 } .neg{ color:#b91c1c }
.table-head, .tr{ display:grid; grid-template-columns: 1fr 1fr 1fr 1fr 130px 100px 140px 140px 90px; gap:12px; align-items:center }
.table-head:not(.compact){ grid-template-columns: 1fr 1fr 1fr 1fr 130px 100px 140px 140px }
.table-head{ font-weight:600; color:#374151; padding:6px 8px }
.table-body .tr{ padding:16px 8px; border-top:1px solid #f1f5f9; transition:.12s }
.table-body .tr:hover{ background:#fcfcfd }
.td .code{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px; display:inline-block }
.cell-input{ width:100%; padding:7px 8px; border:1px solid #e5e7eb; border-radius:8px }
.right{ text-align:right }
.w40{ width:40px } .w90{ width:90px } .w100{ width:100px } .w130{ width:130px } .w140{ width:140px }
.dock{ position: fixed; bottom: 16px; right: 16px; left: auto; height: var(--dock-h); min-width: 340px; background:#111827; color:#fff; display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:12px; box-shadow: 0 8px 32px rgba(0,0,0,.2); z-index: 20 }
.dock .btn{ background:#fff; border-color:#fff; color:#111827 } .dock .btn.primary{ background:#22c55e; border-color:#22c55e; color:#fff }
.skeleton{ background: linear-gradient(90deg, #f3f4f6, #eef2f7, #f3f4f6); background-size:200% 100%; animation: shimmer 1.2s infinite; border-radius:10px; height:44px; margin-bottom:8px }
@keyframes shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

/* =======================================================
   ✅ Yalnızca QR/Barcode TARAYICI için ek stiller
   ======================================================= */
.scan-row{ display:flex; gap:6px; align-items:center }
.scan-btn{
  border:1px solid #e5e7eb; background:#fff; padding:8px 10px; border-radius:10px; cursor:pointer;
}
.mobile-only{ display:none }
@media (max-width: 1024px){
  .mobile-only{ display:inline-block }
}

.scanner-modal{
  position:fixed; inset:0; background:rgba(0,0,0,.5);
  display:flex; align-items:center; justify-content:center; z-index:1000;
}
.scanner-box{
  width:min(520px, 92vw); background:#fff; border-radius:14px; padding:12px; box-shadow:0 20px 60px rgba(0,0,0,.35)
}
.scanner-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.close-x{ border:0; background:#f3f4f6; border-radius:8px; padding:6px 10px; cursor:pointer }
.scanner-video{ width:100%; max-height:60vh; border-radius:10px; background:#000 }
.scanner-hint{ margin-top:6px; font-size:12px; color:#6b7280 }
</style>