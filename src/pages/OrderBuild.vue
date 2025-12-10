<template>
  <div class="page">
    <header class="top">
      <div>
        <h2>Siparişten Koli Oluştur</h2>
        <p class="muted">Sipariş kalemlerini gör, önerilen kolilerden "Kullan" diyerek yeni SİPA kolisine aktar.</p>
      </div>
      <div class="right">
        <router-link to="/transfer" class="link">← Transfer</router-link>
      </div>
    </header>

    <div class="layout">
      <!-- SOL: Sipariş & Kalemler + Öneriler -->
      <aside class="left">
        <div class="card">
          <div class="row">
            <label>Belge Türü</label>
            <select v-model="form.doctype" @change="resetAll">
              <option value="SİPA">SİPA</option>
              <option value="YSIP">YSIP</option>
            </select>
          </div>
          <div class="row">
            <label>Sipariş No</label>
            <input v-model.trim="form.docnum" @keyup.enter="loadAll" placeholder="örn: 00024232"/>
          </div>
          <div class="row">
            <button class="btn" @click="loadAll" :disabled="busy">
              <span v-if="!busy">Yükle</span>
              <span v-else class="inline"><span class="spinner xs"></span> Yükleniyor</span>
            </button>
          </div>
          <div v-if="err" class="alert">⚠️ {{ err }}</div>
        </div>

        <div class="card" v-if="lines.length">
          <div class="head">
            <div><b>Kalemler</b> ({{ lines.length }})</div>
            <small class="muted">Öneriler SKT’ı yakın olana göre sıralı</small>
          </div>

          <div class="items">
            <div class="line" v-for="(ln,idx) in linesWithSugs" :key="'ln'+idx">
              <div class="line-top">
                <span class="code">{{ ln.material }}</span>
                <span class="pill">Varyant: {{ ln.voptions || '-' }}</span>
                <span class="pill">İstenene: <b>{{ ln.needQty }}</b> {{ ln.qunit }}</span>
              </div>
              <div class="sugs" v-if="ln.suggestions && ln.suggestions.length">
                <div
                    class="sug"
                    v-for="(s,i) in ln.suggestions"
                    :key="'s'+idx+'-'+i"
                    :title="s.perfectMatch ? 'Tam uyuşuyor' : ''"
                >
                  <div class="s-left">
                    <span class="mono">#{{ s.koliid }}</span>
                    <span class="code">{{ s.kolikodu }}</span>
                    <span class="muted">Lot: {{ s.lotno || '-' }}</span>
                    <span class="muted">Seri: {{ s.serino || '-' }}</span>
                    <span class="muted">SKT: {{ fmtDate(s.skt) }}</span>
                  </div>
                  <div class="s-mid">
                    <b>{{ s.qty }}</b> <span class="muted">{{ s.birim }}</span>
                    <span v-if="s.perfectMatch" class="tag ok">Tam Uyuşuyor</span>
                  </div>
                  <div class="s-right">
                    <div class="qty">
                      <input type="number" min="1" :max="s.qty" v-model.number="s._take" />
                    </div>
                    <button class="btn mini" @click="useSuggestion(ln, s)">Kullan</button>
                  </div>
                </div>
              </div>
              <div v-else class="empty sm">Bu kalem için öneri bulunamadı.</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- SAĞ: Hedef koli & staging -->
      <main class="rightcol">
        <div class="card">
          <div class="head">
            <div><b>Açılacak Koli (SİPA)</b></div>
            <small class="muted">Belge: {{ form.doctype }} {{ form.docnum || '(?)' }}</small>
          </div>
          <div class="row wrap">
            <div class="field">
              <label>Koli Kodu (ops.)</label>
              <input v-model.trim="target.kolikodu" placeholder="Boş bırakılırsa otomatik"/>
            </div>
            <div class="field">
              <label>Yer/Raf (ops.)</label>
              <input v-model.trim="target.yerkodu" />
            </div>
            <div class="field">
              <label>Koli Tipi (ops.)</label>
              <input v-model.trim="target.kolitipi" />
            </div>
            <div class="field grow">
              <label>Açıklama (ops.)</label>
              <input v-model.trim="target.aciklama" />
            </div>
          </div>
        </div>

        <div class="card">
          <div class="head">
            <div><b>Staging</b> ({{ picks.length }} satır)</div>
            <button class="btn mini" @click="clearPicks" :disabled="!picks.length">Temizle</button>
          </div>

          <div class="table-head">
            <div class="th w90">Kaynak</div>
            <div class="th">Material</div>
            <div class="th">Varyant</div>
            <div class="th">Lot</div>
            <div class="th">Seri</div>
            <div class="th w120">SKT</div>
            <div class="th w100">Birim</div>
            <div class="th w120 right">Miktar</div>
            <div class="th w80"></div>
          </div>

          <div class="table-body">
            <div v-if="!picks.length" class="empty">Önerilerden “Kullan” ile satır ekleyin.</div>
            <div class="tr" v-for="(p,i) in picks" :key="'p'+i">
              <div class="td w90">#{{ p.fromKoliId }}</div>
              <div class="td"><span class="code">{{ p.material }}</span></div>
              <div class="td">{{ p.voptions || '-' }}</div>
              <div class="td">{{ p.lotno || '-' }}</div>
              <div class="td">{{ p.serino || '-' }}</div>
              <div class="td w120">{{ fmtDate(p.skt) }}</div>
              <div class="td w100">{{ p.birim }}</div>
              <div class="td w120 right">
                <input class="num" type="number" min="1" v-model.number="p.miktar"/>
              </div>
              <div class="td w80">
                <button class="btn mini danger" @click="removePick(i)">Sil</button>
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="btn primary" @click="openAndCommit" :disabled="!form.docnum || !picks.length || busy">
              <span v-if="!busy">Koli Aç (SİPA) & Kaydet</span>
              <span v-else class="inline"><span class="spinner xs"></span> Çalışıyor</span>
            </button>
            <span v-if="msg.ok" class="msg ok">✓ {{ msg.ok }}</span>
            <span v-if="msg.err" class="msg err">⚠️ {{ msg.err }}</span>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../api'

const form = ref({ doctype:'SİPA', docnum:'' })
const target = ref({ kolikodu:'', yerkodu:'', kolitipi:'', aciklama:'', olusturan:'ui' })

const busy = ref(false)
const err  = ref('')
const msg  = ref({ ok:'', err:'' })

const lines = ref([])        // iassalitem kalemleri
const suggestions = ref([])  // suggest API

const picks = ref([])        // staging

const linesWithSugs = computed(()=>{
  const sugByKey = new Map()
  for (const s of suggestions.value){
    const k = `${s.material}|${s.voptions}|${s.qunit}|${s.needQty}`
    sugByKey.set(`${s.material}|${s.voptions}`, s)
  }
  return lines.value.map(ln => {
    const key = `${ln.material}|${normV(ln.voptions)}`
    const sug = sugByKey.get(key)
    return {
      material: ln.material,
      voptions: normV(ln.voptions),
      needQty: Number(ln.quantity||0),
      qunit: ln.qunit,
      suggestions: sug?.suggestions?.map(x => ({ ...x, _take: Math.min(x.qty, ln.quantity)||1 })) || []
    }
  })
})

function normV(v){
  return (v||'').split('#').map(s=>s.trim().toLowerCase()).filter(Boolean).sort().join('#')
}
function fmtDate(v){ if(!v) return '-'; try{ const d=new Date(v); return isNaN(d)? String(v): d.toISOString().slice(0,10) }catch{ return String(v) } }

function resetAll(){ lines.value=[]; suggestions.value=[]; picks.value=[]; msg.value={ok:'',err:''}; err.value='' }

async function loadAll(){
  resetAll()
  if (!form.value.doctype || !form.value.docnum){ err.value='doctype ve docnum zorunlu'; return }
  busy.value=true
  try{
    const [ln, sg] = await Promise.all([
      api.api3.orderLines({ doctype: form.value.doctype, docnum: form.value.docnum }),
      api.api3.orderSuggest({ doctype: form.value.doctype, docnum: form.value.docnum })
    ])
    lines.value = ln.data || []
    suggestions.value = sg.data || []
  }catch(e){
    err.value = e?.response?.data?.error || e.message
  }finally{ busy.value=false }
}

function useSuggestion(line, sug){
  const take = Number(sug._take || 0)
  if (!(take>0)) return
  picks.value.push({
    fromKoliId: Number(sug.koliid),
    material: line.material,
    voptions: line.voptions || '',
    lotno: sug.lotno || '',
    serino: sug.serino || '',
    skt: sug.skt || null,
    birim: sug.birim || 'ADET',
    miktar: Math.min(take, Number(sug.qty||0))
  })
}

function clearPicks(){ picks.value=[] }
function removePick(i){ picks.value.splice(i,1) }

async function openAndCommit(){
  msg.value={ok:'',err:''}
  if (!form.value.doctype || !form.value.docnum){ msg.value.err='doctype ve docnum zorunlu'; return }
  if (!picks.value.length) return
  busy.value=true
  try{
    // 1) Hedef koliyi aç / getir (SİPA)
    await api.api3.openKoliForOrder({
      doctype: form.value.doctype,
      docnum: form.value.docnum,
      ...target.value
    })
    // 2) Commit
    const { data } = await api.api3.orderCommit({
      doctype: form.value.doctype,
      docnum: form.value.docnum,
      target: { ...target.value },
      picks: picks.value.map(p=>({ ...p }))
    })
    msg.value.ok = `Transfer tamamlandı. Hedef #${data?.targetId}`
    picks.value = []
    // önerileri/kalemleri yeniden getir (stok güncellendi)
    await loadAll()
  }catch(e){
    msg.value.err = e?.response?.data?.error || e.message
  }finally{ busy.value=false }
}
</script>

<style scoped>
.page{ max-width:1200px; margin:24px auto; padding:0 12px }
.top{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px }
.muted{ color:#6b7280 } .inline{ display:inline-flex; align-items:center; gap:6px }
.layout{ display:grid; grid-template-columns: 520px 1fr; gap:14px }
@media(max-width:1000px){ .layout{ grid-template-columns:1fr } }

.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; box-shadow: 0 1px 0 rgba(16,24,40,.02); }
.row{ display:flex; gap:8px; align-items:flex-end; margin-bottom:8px }
.row label{ font-size:13px; color:#374151; display:block }
.row input, .row select{ padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; outline:none }
.row input:focus, .row select:focus{ border-color:#111827; box-shadow:0 0 0 3px rgba(17,24,39,.08) }
.btn{
  border:1px solid #d1d5db; background:#111827; color:#fff; padding:8px 12px; border-radius:10px; cursor:pointer;
}
.btn.mini{ padding:6px 10px; border-radius:8px }
.btn.danger{ background:#fee2e2; border-color:#fecaca; color:#7f1d1d }
.link{ text-decoration:none; border:1px solid #d1d5db; padding:6px 10px; border-radius:8px; background:#f9fafb; color:#111827 }
.head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.items{ display:flex; flex-direction:column; gap:10px; }
.line{ border:1px solid #eef2f7; border-radius:10px; padding:10px; background:#fafafa }
.line-top{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px }
.sugs{ display:flex; flex-direction:column; gap:8px }
.sug{ display:grid; grid-template-columns: 1fr auto auto; gap:10px; align-items:center; background:#fff; border:1px solid #eef2f7; border-radius:10px; padding:8px }
.s-left{ display:flex; gap:8px; align-items:center; flex-wrap:wrap }
.s-mid{ display:flex; gap:8px; align-items:center }
.s-right{ display:flex; gap:8px; align-items:center }
.code{
  display:inline-block; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
.pill{
  display:inline-block; background:#eef2ff; border:1px solid #c7d2fe;
  border-radius:999px; padding:2px 8px; font-size:12px; margin-right:6px; color:#374151;
}
.tag.ok{ background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:2px 8px; border-radius:999px; font-size:12px }
.table-head, .tr{
  display:grid; grid-template-columns: 90px 1.1fr 1fr 1fr 1fr 120px 100px 120px 80px; gap:10px; align-items:center;
}
.table-head{ font-weight:600; color:#374151; padding:6px 8px; background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; margin-top:6px }
.table-body .tr{ padding:10px 8px; border-bottom:1px solid #f3f4f6; background:#fff }
.num{ width:100%; padding:7px 8px; border:1px solid #e5e7eb; border-radius:8px; text-align:right }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace }
.alert{ margin-top:8px; padding:8px; background:#fff3cd; border:1px solid #ffeeba; color:#856404; border-radius:8px }
.spinner{ width:18px; height:18px; border-radius:50%; border:3px solid #e5e7eb; border-top-color:#111827; animation: spin 1s linear infinite }
.spinner.xs{ width:14px; height:14px; border-width:2px }
@keyframes spin{ to{ transform: rotate(360deg) } }
</style>