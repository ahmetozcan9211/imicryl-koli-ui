<template>
  <div class="wrap">
    <header class="bar">
      <h1>Koli Yönet</h1>
      <nav class="nav">
        <router-link to="/">🏥 Health</router-link>
        <router-link to="/koliler">📦 Koli Görüntüle</router-link>
        <router-link to="/manuel">📦 Manuel Koli İşlemleri</router-link>
        <router-link to="/transfer">📦 Koliler Arası Transfer</router-link>
        <router-link to="/siparisten-koli">📦 Siparişten Koli</router-link>
        <router-link to="/askidan-koli">📦 Askıdan Koli</router-link>
        <router-link to="/koli-ara">📦 Koli Düzenle</router-link>
        <router-link to="/koli-klonla">📦 Koli Klonla</router-link>
        <router-link to="/log-goster">Log Goster</router-link>
        <router-link to="/event-goster">Event Goster</router-link>
        <router-link to="/uygun-siparisler">Uygun Siparişler</router-link>
        <router-link to="/malzeme-sorgu">Malzeme Sorgulama</router-link>
        <router-link to="/toplu-atama">Toplu Koli Atama</router-link>
        <router-link to="/toplu-kapat">Toplu Kapatma</router-link>
        <router-link to="/siparis-icerik">Sipariş İçerik</router-link>
        <router-link to="/takip">Günlük Özet</router-link>


      </nav>
    </header>

    <router-view />

    <footer class="foot">© {{ new Date().getFullYear() }}</footer>
  </div>
</template>

<style>
.wrap{ max-width:1200px; margin:24px auto; padding:0 12px }
.bar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16px }
.nav{ display:flex; gap:10px }
.nav a{ text-decoration:none; color:#374151; background:#f3f4f6; padding:6px 10px; border-radius:8px }
.nav a.router-link-exact-active{ background:#111827; color:white }
.foot{ margin-top:24px; color:#777; font-size:12px; text-align:center }
</style>
<script setup lang="ts">
</script>