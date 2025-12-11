// src/api.js
import axios from 'axios'

/* ================= Base ================= */
const baseURL = import.meta.env?.VITE_API_BASE || 'http://localhost:8080'
let authToken = null


const api = axios.create({
    baseURL,
    timeout: 20000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: false,
})
export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('imi_token', token)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
        localStorage.removeItem('imi_token')
        delete api.defaults.headers.common['Authorization']
    }
}

// Sayfa yenilendiğinde de token’ı geri yükleyelim
const saved = localStorage.getItem('imi_token')
if (saved) {
    api.defaults.headers.common['Authorization'] = `Bearer ${saved}`
}


/* ---------- API v2: transfer ve yalnızca bu sayfa ---------- */

/* ---------- Helper: tam URL (log için) ---------- */
function fullUrl(config) {
    try {
        const u = new URL(config.url, config.baseURL)
        if (config.params) {
            Object.entries(config.params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v)
            })
        }
        return u.toString()
    } catch {
        return `${config.baseURL || ''}${config.url || ''}`
    }
}

/* ---------- Interceptors ---------- */
api.interceptors.request.use((config) => {
    console.debug('[API req]', {
        method: (config.method || 'get').toUpperCase(),
        url: fullUrl(config),
        params: config.params || {},
        data: config.data || null,
    })
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const cfg = error?.config || {}
        const res = error?.response
        const info = {
            url: fullUrl(cfg),
            method: (cfg.method || 'get').toUpperCase(),
            status: res?.status,
            statusText: res?.statusText,
            responseData: res?.data,
            message: error?.message,
            code: error?.code,
        }
        console.error('[API err]', info)
        return Promise.reject(error)
    }
)

/* ---------- küçük yardımcılar ---------- */
function boolParam(v) {
    // undefined/null -> undefined, true -> 1, false -> 0
    if (v === undefined || v === null) return undefined
    return v ? 1 : 0
}
const api2 = {
    // Koli listesi (SİPARİŞE BAĞLI OLMAYANLAR; includeClosed=true ise kapalılar da dahil)
    listKoliler(params = {}) {
        // { q?, includeClosed?:'true'|'false', size?, offset? }
        return api.get('/api2/koliler', { params })
    },

    // Bir kolinin içerik satırları
    getKoliIcerik(id) {
        return api.get(`/api2/koliler/${id}/icerik`)
    },

    // Transfer önizleme
    transferPreview(payload) {
        // { moves: [{ fromId, toId, lines:[{material,secenek?,lotno?,serino?,skt?,miktar,birim?}] }] }
        return api.post('/api2/transfer/preview', payload)
    },

    // Transfer kaydet
    transferCommit(payload) {
        // { moves:[...], ekleyen?: 'ui' }
        return api.post('/api2/transfer/commit', payload)
    },

}
const api3 ={
    getOrderLines({ doctype, docnum }) {
        return api.get(`/api3/orders/${encodeURIComponent(doctype)}/${encodeURIComponent(docnum)}/lines`)
    },
    getSuggestions(doctype, docnum, params = {}) {
        return api.get(`/api3/orders/${encodeURIComponent(doctype)}/${encodeURIComponent(docnum)}/suggestions`, { params })
    }

}
api.interceptors.request.use((config) => {
    // Token her zaman header’a yazılsın (yeniden giriş yapılmış olabilir)
    const token = localStorage.getItem('imi_token')
    if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
    }

    // 🔥 Kullanıcı adı varsa X-User header’ına ekle
    const username = localStorage.getItem('imi_username')
    if (username) {
        config.headers = config.headers || {}
        config.headers['X-User'] = username
    }

    return config
})
/* ================= Public API Wrapper ================= */
export default {
    /* ---------- Genel / mevcut ekranlar (v1) ---------- */

    health() {
        return api.get('/api/health')

    },
    logs() {
        return api.get('/api/logs')

    },
    closeKoli(id){
        return api.post(`/api/koliler/${id}/close`)
    },

    // Koli liste (v1) – KoliGoruntule sayfası kullanıyor
    listKoliler(params = {}) {
        // Beklenen: { q?, siparisno?, juliandate?, durum?, size?, offset? }
        return api.get('/api/koliler', { params })
    },

    // Tekil koli meta (v1)
    getKoli(id) {
        return api.get(`/api/koliler/${id}`)
    },

    // Koli içerik (v1)
    getKoliIcerik(id) {
        return api.get(`/api/koliler/${id}/icerik`)
    },

    // Manuel koli aç / yeniden kullan (v1)
    openKoli(payload) {
        // { kolikodu, depokodu?, aciklama?, kolitipi?, olusturan? }
        return api.post('/api/koliler/open', payload)
    },

    // Siparişe bağlı koli aç / güncelle (v1)
    openKoliByOrder(payload) {
        // { siparisno, kolikodu?, depokodu?, aciklama?, olusturan?, doctype?, kolitipi? }
        return api.post('/api/koliler/open_by_order', payload)
    },

    // Koli koduna göre getir (v1)
    getKoliByCode(kolikodu) {
        return api.get(`/api/koliler/by_code/${encodeURIComponent(kolikodu)}`)
    },

    // Meta patch’ler (v1)
    updateKoliYer(id, yerkodu) {
        return api.patch(`/api/koliler/${id}/yer`, { yerkodu })
    },
    updateKoliTipi(id, kolitipi) {
        return api.patch(`/api/koliler/${id}/kolitipi`, { kolitipi })
    },

    // Barkod çöz (v1)
    scanResolve(payload) {
        // { barkod }
        return api.post('/api/scan/resolve', payload)
    },

    // Malzeme ağırlıkları (v1)
    getMaterialWeights(materials) {
        return api.post('/api/material/weights', { materials })
    },

    // Koli ağırlıkları (v1)
    updateKoliWeights(id, payload) {
        // { measured_gram, expected_gram?, expected_recalc? }
        return api.patch(`/api/koliler/${id}/weights`, payload)
    },

    // Koli satır bulk ekleme (v1)
    addKoliBulk(id, payload) {
        // { lines:[...], autoCreate?, ekleyen? }
        return api.post(`/api/koliler/${id}/satir/bulk`, payload)
    },

    // Sipariş bağlantısı ekle/kaldır (v1)
    updateKoliOrderLink(id, payload) {
        // { clear:true } veya { clear:false, siparisno, doctype }
        return api.patch(`/api/koliler/${id}/order_link`, payload)
    },



    /* ---------- Genel amaçlı GET/POST ---------- */
    get(url, config) {
        return api.get(url, config)
    },
    post(url, data, config) {
        return api.post(url, data, config)
    },
    api2,
    api3,
}