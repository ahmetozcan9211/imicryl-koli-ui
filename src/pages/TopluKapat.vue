<template>
  <div class="page">
    <h2>📦 Toplu Sipariş Kapatma (API13)</h2>

    <section class="card">
      <div class="field">
        <label>Belge Türü</label>
        <select v-model="doctype">
          <option value="">Seçiniz</option>
          <option value="SIPA">SIPA</option>
          <option value="YSIP">YSIP</option>
          <option value="NSIP">NSIP</option>
          <option value="SIP2">SIP2</option>
        </select>
      </div>

      <label>Sipariş Numaraları (her satır sadece numara)</label>
      <textarea
          v-model="input"
          class="txt"
          placeholder="Örnek:
00024416
00024565
00012033"
      ></textarea>

      <button class="btn primary" @click="submit" :disabled="loading || !canSubmit">
        <span v-if="!loading">🚀 Kolileri Kapat</span>
        <span v-else><span class="spinner xs"></span> İşlem yapılıyor…</span>
      </button>

      <div v-if="msg.err" class="msg err">{{ msg.err }}</div>
      <div v-if="msg.ok" class="msg ok">{{ msg.ok }}</div>
    </section>

    <section class="card" v-if="result.length">
      <h3>Kapatılan Koliler</h3>
      <ul>
        <li v-for="r in result" :key="r.id">
          <b>#{{ r.id }}</b> — {{ r.kolikodu }}
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import api from "../api";

const doctype = ref("");   // seçilen belge türü
const input = ref("");     // sipariş numaraları (satır satır)
const loading = ref(false);
const msg = reactive({ err: "", ok: "" });
const result = ref([]);

// Form submit edilebilir mi?
const canSubmit = computed(() => {
  return !!doctype.value && !!input.value.trim();
});

// Textarea'daki satırları parse et: her satır bir docnum olacak
function parseInput() {
  const lines = input.value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const orders = [];
  for (const line of lines) {
    // Sadece numara; başına boşluk vs gelirse temizliyoruz
    const docnum = line;
    if (!docnum) continue;

    orders.push({
      doctype: doctype.value,
      docnum: docnum,
    });
  }
  return orders;
}

async function submit() {
  msg.err = "";
  msg.ok = "";
  result.value = [];

  if (!doctype.value) {
    msg.err = "Belge türü seçmelisiniz.";
    return;
  }

  const orders = parseInput();
  if (!orders.length) {
    msg.err = "Geçerli sipariş numarası satırı bulunamadı.";
    return;
  }

  loading.value = true;
  try {
    const { data } = await api.post("/api13/orders/close", {
      orders,
      ekleyen: "ui",
    });

    if (data.ok) {
      msg.ok = `Toplam ${data.totalClosed} koli kapatıldı.`;
      result.value = data.closedList || [];
    } else {
      msg.err = data.error || "Bilinmeyen hata.";
    }
  } catch (e) {
    msg.err = e?.response?.data?.error || e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page {
  max-width: 700px;
  margin: 20px auto;
}
.card {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;
}
.field {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}
.txt {
  width: 100%;
  min-height: 160px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-family: monospace;
  resize: vertical;
  margin-top: 6px;
}
.btn {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  cursor: pointer;
  border: none;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.msg.err {
  color: #b00020;
  margin-top: 8px;
}
.msg.ok {
  color: #065f46;
  margin-top: 8px;
}
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: #111827;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>