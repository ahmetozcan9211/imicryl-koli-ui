import { createRouter, createWebHistory } from 'vue-router'
import Health from './pages/Health.vue'
import KoliGoruntule from './pages/KoliGoruntule.vue'
import ManuelKoli from './pages/ManuelKoli.vue'
import KoliTransfer from './pages/KoliTransfer.vue'
import SiparistenKoli from "./pages/SiparistenKoli.vue";
import AskidanKoli from "./pages/AskidanKoli.vue";
import LogGoster from "./pages/LogGoster.vue";
import EventGoster from "./pages/EventGoster.vue";
import KoliAra from "./pages/KoliAra.vue";
import KoliKlonla from "./pages/KoliKlonla.vue";
import Login from "./pages/Login.vue";
import UserManagement from "./pages/UserManagement.vue";
import UygunSiparis from "./pages/UygunSiparis.vue";
import MalzemeSorgu from "./pages/MalzemeSorgu.vue";
import TopluAtama from "./pages/TopluAtama.vue";
import SiparisIcerik from "./pages/SiparisIcerik.vue";
import TopluKapat from "./pages/TopluKapat.vue";
import Takip from "./pages/Takip.vue";



const routes = [
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { title: 'Login' ,public: true},
    },
    {
        path: '/',
        redirect: '/health',
    },
    {
        path: '/health',
        name: 'Health',
        component: Health,
        meta: { title: 'Sistem Durumu',requiresAuth: true },
    },
    {
        path: '/koliler',
        name: 'KoliGoruntule',
        component: KoliGoruntule,
        meta: { title: 'Koli Görüntüleme',requiresAuth: true },
    },
    {
        path: '/manuel',
        name: 'ManuelKoli',
        component: ManuelKoli,
        meta: { title: 'Manuel Koli Oluşturma' ,requiresAuth: true},
    },
    {
        path: '/transfer',
        name: 'KoliTransfer',
        component: KoliTransfer,
        meta: { title: 'Koli Transferi' ,requiresAuth: true},
    },
    {
        path: '/siparisten-koli',
        name: 'SiparistenKoli',
        component: SiparistenKoli,
        meta: { title: 'Siparişten Koli',requiresAuth: true },
    },
    {
        path: '/askidan-koli',
        name: 'AskidanKoli',
        component: AskidanKoli,
        meta: { title: 'Askıdan Koli' ,requiresAuth: true},
    },
    {
        path: '/log-goster',
        name: 'LogGoster',
        component: LogGoster,
        meta: { title: 'Log Goster' ,requiresAuth: true},
    },
    {
        path: '/event-goster',
        name: 'EventGoster',
        component: EventGoster,
        meta: { title: 'Event Goster' ,requiresAuth: true},
    },
    {
        path: '/koli-ara',
        name: 'KoliAra',
        component: KoliAra,
        meta: { title: 'Koli Ara' ,requiresAuth: true},
    },
    {
        path: '/koli-klonla',
        name: 'KoliKlonla',
        component: KoliKlonla,
        meta: { title: 'Koli Klonla' ,requiresAuth: true},

    },
    {
        path: '/manage-user',
        name: 'UserManagement',
        component: UserManagement,
        meta: { title: 'Kullanıcı Yönetimi' ,requiresAuth: true},

    },
    {
        path: '/uygun-siparisler',
        name: 'UygunSiparisler',
        component: UygunSiparis,
        meta: { title: 'Uygun Siparişler' ,requiresAuth: true},

    },
    {
        path: '/malzeme-sorgu',
        name: 'MalzemeSorgu',
        component: MalzemeSorgu,
        meta: { title: 'Mazleme Sorgu',requiresAuth: true},

    },
    {
        path: '/toplu-atama',
        name: 'TopluAtama',
        component: TopluAtama,
        meta: { title: 'Toplu Koli Atama',requiresAuth: true},

    },
    {
        path: '/siparis-icerik',
        name: 'SiparisIcerik',
        component: SiparisIcerik,
        meta: { title: 'Sipariş İçeriği Görüntüleme',requiresAuth: true},

    },
    {
        path: '/toplu-kapat',
        name: 'TopluKapat',
        component: TopluKapat,
        meta: { title: 'Toplu Koli Kapama',requiresAuth: true},

    },
    {
        path: '/takip',
        name: 'Takip',
        component: Takip,
        meta: { title: 'Koli Syısı Takip',requiresAuth: true},

    },

    { path: '/:pathMatch(.*)*', redirect: '/' }



    ]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

/* ===========================================================
   🔐 GLOBAL AUTH GUARD
   =========================================================== */
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('imi_token')

    // Eğer sayfa public ise (login gibi) → direkt izin ver
    if (to.meta.public) {
        if (token && to.path === '/login') {
            // Login'e gitmek isteyen ama zaten login olmuş user
            return next('/')
        }
        return next()
    }

    // Sayfa auth gerektiriyor ama token yok → LOGIN
    if (to.meta.requiresAuth && !token) {
        return next({
            path: '/login',
            query: { redirect: to.fullPath }
        })
    }

    // Her şey normal → devam
    next()
})

export default router