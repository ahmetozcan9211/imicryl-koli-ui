

📦 Imicryl Koli Yönetim Sistemi — Frontend

Vue 3 & Vite tabanlı koli hazırlama, sipariş yönetimi ve günlük üretim raporlama arayüzü.
Arka uçta çalışan Node.js tabanlı API servisleri (API6, API10, API11, API12, API13, API14) ile entegre çalışır.

⸻

🚀 Özellikler

🔍 Koli Hızlı Görüntüleme (API6)
•	Koli ID ile:
•	Koli özeti
•	Meta düzenleme (sipariş no, doctype, yer, koli tipi, CANIAS işaretleme)
•	Koli içeriği görüntüleme & miktar güncelleme
•	Log & event inceleme
•	Ağırlık kontrolü

📋 Sipariş → Koli Listeleme (API12)
•	Belge tipi + belge numarasına göre kolileri listeleme
•	Kalem & parça sayılarını görüntüleme

🔄 Toplu Koli İşlemleri (API11 ve API13)
•	Birden fazla koliye tek seferde:
•	Sipariş numarası atama
•	Yer kodu atama
•	CANIAS flag
•	Toplu kapatma

📊 Günlük Hazırlanan Siparişler (API14)
•	Tarihe göre günlük üretim raporu
•	Sipariş → Koliler → Kalemler → Parçalar detaylı görünüm
•	Gün toplamları:
•	Sipariş sayısı
•	Koli sayısı
•	Toplam kalem sayısı
•	Toplam parça sayısı

⸻

🛠 Kullanılan Teknolojiler
•	Vue 3 (Composition API)
•	Vite
•	Fetch API / Axios
•	Scoped CSS / Tailwind benzeri utility sınıfları
•	Modern component architecture


API Uç Noktaları
API
Açıklama
/api6/koli/:id
Koli özeti
/api6/koli/:id/icerik
İçerik listesi
/api10/material_boxes
Malzemeye göre koli listesi
/api11/batch_assign
Çoklu koli ataması
/api12/order_boxes
Sipariş → Koliler
/api13/close_orders
Sipariş bazlı toplu kapatma
/api14/prepared_orders
Günlük üretim raporu

📌 Yol Haritası
•	PDF rapor export
•	Excel export
•	Dark mode
•	QR kamera tarama optimizasyonu
•	PWA (offline destek)

⸻

🤝 Katkıya Açık
•	Pull Request açabilirsiniz
•	Issue açarak geliştirme önerileri iletebilirsiniz

Kod standartları:
•	Prettier format
•	Kebab-case dosya isimleri
•	API erişimleri yalnızca src/api/ içinde yapılmalı

⸻

📜 Lisans

Bu yazılım Imicryl A.Ş. kurumsal kullanımına özeldir.
İzin alınmadan üçüncü şahıslarla paylaşılamaz.

⸻

📬 İletişim

Geliştirme talepleri ve destek için:

📧 ahmet@imicryl.com.tr
