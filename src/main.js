import { createApp } from 'vue'
import router from './router'
import App from './App.vue'

// basit global stiller (isteğe bağlı)

// debug için bir log (boş sayfa olursa konsolda bunu görmelisin)
console.log('[main] boot')

createApp(App)
    .use(router)

    .mount('#app')