import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


export default defineConfig({
    plugins: [vue()],
    server: {
        port: 5173,
        proxy: {
            '^/api($|/)':  { target: 'https://koliapi.imicryl.server', changeOrigin: true },
            '^/api2($|/)': { target: 'https://koliapi.imicryl.server', changeOrigin: true },
            '^/api3($|/)': { target: 'https://koliapi.imicryl.server', changeOrigin: true },
            '^/api4($|/)': { target: 'https://koliapi.imicryl.server', changeOrigin: true },
            '^/api6($|/)': { target: 'https://koliapi.imicryl.server', changeOrigin: true },
            '^/api7($|/)': { target: 'https://koliapi.imicryl.server', changeOrigin: true },
            '^/apiauth($|/)': { target: 'https://koliapi.imicryl.server', changeOrigin: true },
            '^/apilog($|/)':  { target: 'https://koliapi.imicryl.server', changeOrigin: true },
            '^/api9($|/)': { target: 'https://koliapi.imicryl.server', changeOrigin: true },

        },
        strictPort: true
    }
})