# Vidnoria — Modern Video & Music Downloader Web Platform

Vidnoria; YouTube, Instagram, TikTok, Facebook ve Twitter gibi popüler platformlardan izinli medya içeriklerini analiz eden, format dönüşümü sağlayan ve kullanıcıların MP4 / MP3 olarak indirmesine imkân tanıyan, **tamamen ücretsiz, modern, çok dilli ve veritabanısız** bir full-stack web platformudur.

---

## 🌟 Öne Çıkan Özellikler

- **Veritabanısız (No-DB Architecture):** Tüm site ayarları JSON, blog içerikleri ise Markdown/Frontmatter formatında güvenli, kilitli ve atomik dosya işlemleriyle saklanır.
- **Çoklu Dil (i18n):** Türkçe (Varsayılan), İngilizce ve Arapça (Eksiksiz RTL desteği).
- **Açık / Koyu / Sistem Teması:** CSS Değişkenleri ve Tailwind ile yumuşak geçişli modern tema desteği.
- **Gerçek URL Analizi & Medya İşleme:** FFmpeg ve yt-dlp tabanlı, komut enjeksiyonu ve SSRF korumalı altyapı.
- **Güvenli Yönetim Paneli (`/admin`):** HTTP-only cookie, brute-force koruması, AdSense slot yönetimi, blog düzenleme ve sunucu sağlık takibi.
- **Google AdSense Entegrasyonu:** Politika uyumlu reklam yerleşimleri (başlık, içerik arası, indirme sayfası ve blog).
- **Güçlü Teknik SEO:** hreflang, dinamik sitemap.xml, robots.txt, Open Graph, Twitter Cards ve her platforma özel SEO sayfaları (`/tr/youtube-video-indir`, `/en/youtube-video-downloader` vb.).
- **Docker & VPS Hazır:** FFmpeg ve yt-dlp entegre edilmiş multi-stage Dockerfile ve docker-compose.yml.

---

## 🚀 Hızlı Başlangıç (Yerel Geliştirme)

### Gereksinimler:
- Node.js 20+
- FFmpeg (Sistem PATH'inde kurulu olmalıdır)
- yt-dlp (Sistem PATH'inde kurulu olmalıdır)

### Kurulum:
```bash
# Bağımlılıkları yükleyin
npm install

# Ortam değişkenlerini kopyalayın
cp .env.example .env.local

# Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresine gidin.

---

## 🔒 Yönetim Paneli (`/admin`)

- Yönetim paneli şifresi `.env` dosyasındaki `ADMIN_PASSWORD` değişkeninden okunur.
- Varsayılan geliştirme şifresi: `VidnoriaSecure2026!`
- Panel üzerinden:
  - Sunucu bellek ve CPU kullanımını anlık izleyebilirsiniz.
  - AdSense yayıncı kimliği ve reklam alanlarını açıp kapatabilirsiniz.
  - Platformları (YouTube, TikTok vb.) tek tıkla aktif/pasif yapabilirsiniz.
  - Yeni blog yazıları oluşturup Markdown formatında düzenleyebilirsiniz.

---

## 🐳 Docker ile Canlıya Alma (VPS)

Vidnoria, bağımsız bir Linux VPS sunucuda Docker ile tek komutla çalıştırılabilir:

```bash
# Projeyi sunucunuza çekin
git clone https://github.com/kullanici/vidnoria.git
cd vidnoria

# .env dosyasını oluşturun ve güçlü şifrenizi tanımlayın
nano .env

# Docker container'larını ayağa kaldırın
docker compose up -d --build
```

Persistent Volume (`vidnoria_content_data`) sayesinde yönetim panelinden yaptığınız tüm ayarlar ve yazdığınız blog yazıları container güncellense veya yeniden başlatılsa dahi kalıcı olarak korunur.

---

## 📈 SEO & Search Console Yapılandırması

1. Google Search Console & Bing Webmaster Tools hesaplarınızdan sitenizi doğrulayın.
2. `https://vidnoria.com/sitemap.xml` adresini site haritası olarak gönderin.
3. hreflang etiketleri `/tr/`, `/en/` ve `/ar/` sayfalarını otomatik olarak arama motorlarıyla eşleştirecektir.

---

## 📜 Lisans & Yasal Bildirim

Vidnoria telif hakkı korumalı veya ticari içeriklerin izinsiz çoğaltılmasını desteklemez. DRM veya erişim korumaları atlanmaz. Yalnızca kamu malı, Creative Commons veya hak sahibinin açık izin verdiği içerikler işlenir.
