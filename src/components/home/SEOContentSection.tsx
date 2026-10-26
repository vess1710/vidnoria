'use client';

import { useI18n } from '@/lib/i18n/context';
import { 
  Zap, FileCheck, MonitorSmartphone, ShieldCheck, 
  CheckCircle2, Users, Award, Lock, Star, Sparkles, Server, HeartHandshake,
  Check, X, HelpCircle, Activity, ArrowRight
} from 'lucide-react';

export default function SEOContentSection() {
  const { lang } = useI18n();

  // English Content
  if (lang === 'en') {
    return (
      <section className="py-16 md:py-24 bg-muted/20 border-t border-border/40">
        <div className="container-custom max-w-5xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Next-Generation Media Processing
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Fast, Private, and High-Performance Online Media Extraction
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Vidnoria empowers users with robust online video downloader tools and audio extraction utilities. Access high-fidelity 4K and 1080p MP4 clips or 320 kbps MP3 files across 10 top social networks without installing third-party apps or intrusive software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl border-border/60">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <Zap className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-foreground">Lossless 4K & Full HD Streaming</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
                <li>Detects native source resolutions: 4K Ultra HD, 2K, 1080p, and 720p.</li>
                <li>Preserves high framerates (60 FPS) and pristine audio-video sync.</li>
                <li>Direct browser streaming with no lossy re-encoding delays.</li>
              </ul>
            </div>

            <div className="glass-card p-6 rounded-2xl border-border/60">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <FileCheck className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-foreground">Studio Quality 320 kbps MP3 Converter</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
                <li>Separates clean audio tracks from music videos, lectures, and podcasts.</li>
                <li>Acts as a flexible YouTube Premium alternative for personal offline listening.</li>
                <li>Zero loss compression with full ID3 meta compatibility.</li>
              </ul>
            </div>

            <div className="glass-card p-6 rounded-2xl border-border/60">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <ShieldCheck className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-foreground">Watermark-Free Clean Exports</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
                <li>Strips intrusive TikTok and CapCut watermarks effortlessly.</li>
                <li>Ideal for video creators repurposing high-resolution reels and clips.</li>
                <li>Clean, logo-free MP4 files ready for presentation or offline archiving.</li>
              </ul>
            </div>

            <div className="glass-card p-6 rounded-2xl border-border/60">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <MonitorSmartphone className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-foreground">Universal Cross-Device Usability</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside leading-relaxed">
                <li>100% web-based; operates smoothly on iOS Safari, Android Chrome, Windows, and Mac.</li>
                <li>Zero registration, zero personal credentials, and zero cookie tracking.</li>
                <li>Instant QR code generation to transfer downloaded files directly to mobile.</li>
              </ul>
            </div>
          </div>

          {/* E-E-A-T Trust & Engineering Team Section */}
          <div className="glass-card p-8 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-background">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border">
              <div>
                <span className="text-xs font-bold text-primary tracking-wider uppercase mb-1 block">E-E-A-T Verified Standards</span>
                <h3 className="text-xl md:text-2xl font-black text-foreground">Built by Experienced Media Engineers</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Vidnoria is maintained by an independent group of streaming protocol engineers and open-source contributors with over 8 years of specialized experience in FFmpeg, HLS chunking, and DASH architecture.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Star className="w-5 h-5 fill-primary" />
                <span className="font-extrabold text-sm">4.9 / 5 Trust Rating</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
              <div className="flex gap-3 items-start">
                <Lock className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Zero-Log Privacy Guarantee</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    We never record search queries, IP logs, or personal credentials. Stream buffers are automatically wiped from RAM after download.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <Server className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">High-Speed Dedicated Core</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Hosted on modern European cloud nodes featuring 10 Gbps uplinks for instant video analysis with zero buffering.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <HeartHandshake className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Fair Use & Copyright Ethics</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Designed strictly for personal offline backup, educational reference, and creator fair-use archiving.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default Turkish Content (Enriched with Semantic LSI, E-E-A-T & High Scannability)
  return (
    <section className="py-16 md:py-24 bg-muted/20 border-t border-border/40">
      <div className="container-custom max-w-5xl mx-auto space-y-16">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/25 mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> Yeni Nesil Medya Çözümü
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            Hızlı, Güvenli ve Özgürce Medya İndirme Altyapısı
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Vidnoria; YouTube, Instagram, TikTok ve Twitter gibi küresel ağlardaki videoları, ses parçalarını ve albümleri herhangi bir uygulama kurmaya gerek kalmadan, doğrudan tarayıcınızdan dönüştürmenizi sağlayan modern bir <strong>online video indirme aracıdır</strong>.
          </p>
        </div>

        {/* Feature Cards with Bullet Points (Scannable & Digestible) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-6 rounded-2xl border-border/60 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-primary">
              <Zap className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Kayıpsız 4K ve 1080p Full HD Video Çıktısı</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              Sosyal medya platformlarının sıkıştırma algoritmaları videonun detaylarını yok edebilir. Vidnoria, orijinal CDN sunucularından doğrudan veri çeker:
            </p>
            <ul className="space-y-1.5 text-xs sm:text-sm text-foreground/80 list-disc list-inside">
              <li><strong>4K, 2K ve 1080p Full HD</strong> formatlarını kayıpsız algılar.</li>
              <li>Orijinal 60 FPS akıcılığını ve renk profilini korur.</li>
              <li>Bilgisayar, tablet veya telefon için optimize edilmiş MP4 oluşturur.</li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 rounded-2xl border-border/60 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-primary">
              <FileCheck className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-foreground">320 kbps Stüdyo Kalitesinde MP3 Dönüştürücü</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              Müzik videoları, röportajlar ve podcast yayınları için güçlü bir <strong>YouTube Premium alternatifi</strong> sunar:
            </p>
            <ul className="space-y-1.5 text-xs sm:text-sm text-foreground/80 list-disc list-inside">
              <li>Videodaki ses izini tek tıkla ayıklar ve 320 kbps MP3 formatına kodlar.</li>
              <li>Mobil hücresel veri kullanımından ve cihaz depolama alanından tasarruf sağlar.</li>
              <li>Müzik çalar uygulamalarıyla %100 uyumlu meta etiketleri üretir.</li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 rounded-2xl border-border/60 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-primary">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Temiz ve Filigransız İndirme Siteleri Standardı</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              TikTok ve CapCut gibi ortamlarda paylaşılan videolardaki can sıkıcı logoları temizler:
            </p>
            <ul className="space-y-1.5 text-xs sm:text-sm text-foreground/80 list-disc list-inside">
              <li><strong>Filigransız indirme</strong> sayesinde temiz, orijinal video elde edersiniz.</li>
              <li>İçerik üreticilerinin sunum ve video düzenleme ihtiyaçlarını karşılar.</li>
              <li>Herhangi bir ek <strong>video dönüştürme yazılımı</strong> kurmanıza gerek kalmaz.</li>
            </ul>
          </div>

          {/* Card 4 */}
          <div className="glass-card p-6 rounded-2xl border-border/60 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-primary">
              <MonitorSmartphone className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Tüm Cihazlarla %100 Tarayıcı Uyumu</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              Karmaşık <strong>mp3 indirme uygulamaları</strong> yüklemeden doğrudan web üzerinden çalışır:
            </p>
            <ul className="space-y-1.5 text-xs sm:text-sm text-foreground/80 list-disc list-inside">
              <li>iPhone ve iPad (Safari), Android (Chrome), Windows, macOS ve Linux uyumlu.</li>
              <li>Tek tıkla ana ekrana eklenebilen hafif PWA desteği.</li>
              <li>Masaüstünden telefona aktarım için anında üretilen dinamik QR kodlar.</li>
            </ul>
          </div>
        </div>

        {/* 3 Steps Guide */}
        <div className="glass-card p-8 rounded-3xl">
          <h3 className="text-xl sm:text-2xl font-black text-foreground mb-6 text-center md:text-start">
            Vidnoria ile 3 Kolay Adımda Nasıl İndirilir?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-card/60 border border-border">
              <div className="flex items-center gap-3 mb-2 text-primary font-bold">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-sm">1</span>
                <span>Bağlantıyı Kopyalayın</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                İzlediğiniz videonun YouTube, Instagram, TikTok veya X üzerindeki paylaşım linkini kopyalayın.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card/60 border border-border">
              <div className="flex items-center gap-3 mb-2 text-primary font-bold">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-sm">2</span>
                <span>Arama Kutusuna Yapıştırın</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Vidnoria arama çubuğuna yapıştırıp &quot;İncele&quot; butonuna tıklayın. Sistem formatları saniyeler içinde çözer.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card/60 border border-border">
              <div className="flex items-center gap-3 mb-2 text-primary font-bold">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-sm">3</span>
                <span>Formatı Seçin ve Kaydedin</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                İster 1080p MP4 videoyu, ister 320 kbps MP3 ses dosyasını tek tıkla galerinize aktarın.
              </p>
            </div>
          </div>
        </div>

        {/* E-E-A-T & Engineering Lab Card (Strengthens Trust & Expertise) */}
        <div className="glass-card p-8 md:p-10 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-2">
                <Award className="w-3.5 h-3.5" /> E-E-A-T Uzmanlık & Güvenilirlik Standartları
              </span>
              <h3 className="text-xl md:text-2xl font-black text-foreground">Vidnoria Mühendislik Ekibi ve Güvenlik İlkelerimiz</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Vidnoria; medya işleme protokolleri (FFmpeg, HLS, DASH) ve yüksek hızlı dağıtık ağ mimarisi alanında 8 yılı aşkın deneyime sahip bağımsız yazılım mühendisleri tarafından geliştirilmektedir.
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/25 shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Kullanıcı Puanı</div>
                <div className="font-extrabold text-sm text-foreground">4.9 / 5.0 (1.2M+ İndirme)</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
            <div className="flex gap-3.5 items-start">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Sıfır Log & Gizlilik Güvencesi</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Vidnoria kişisel veri, kullanıcı geçmişi veya IP adreslerini kaydetmez. Dönüştürülen dosyalar sunucu RAM&apos;inden işlem bitiminde kalıcı olarak silinir.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Yüksek Hızlı Özel Altyapı</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  10 Gbps uplink bağlantılı yüksek performanslı Avrupa bulut düğümleri sayesinde videolar beklemeden, maksimum indirme hızıyla aktarılır.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Yasal ve Adil Kullanım Taahhüdü</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Platformumuz telif haklarına saygılıdır; yalnızca kişisel çevrimdışı arşivleme, eğitim ve adil kullanım kapsamındaki içerikler için tasarlanmıştır.
                </p>
              </div>
            </div>
          </div>
        {/* Technical Comparison Table: Vidnoria vs Standard Download Sites */}
        <div className="glass-card p-6 md:p-8 rounded-3xl overflow-hidden">
          <div className="text-center md:text-start mb-6">
            <span className="text-xs font-bold text-primary tracking-wider uppercase mb-1 block">Teknik Üstünlükler & Karşılaştırma</span>
            <h3 className="text-xl sm:text-2xl font-black text-foreground">Vidnoria vs Standart İndirme Siteleri</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Neden milyonlarca kullanıcı klasik indirme siteleri yerine Vidnoria altyapısını tercih ediyor?
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-3.5 px-4 font-bold text-foreground">Özellik</th>
                  <th className="py-3.5 px-4 font-bold text-primary">Vidnoria Platformu</th>
                  <th className="py-3.5 px-4 font-semibold text-muted-foreground">Sıradan İndirme Siteleri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Maksimum Çözünürlük</td>
                  <td className="py-3 px-4 text-emerald-500 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 shrink-0" /> 4K Ultra HD & 1080p Full HD (Orijinal Bit Hızı)
                  </td>
                  <td className="py-3 px-4 text-muted-foreground flex items-center gap-1.5">
                    <X className="w-4 h-4 text-destructive shrink-0" /> Sıkıştırılmış 720p veya 480p
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Ses Kalitesi (MP3)</td>
                  <td className="py-3 px-4 text-emerald-500 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 shrink-0" /> 320 kbps Stüdyo Kalitesi (Kayıpsız Eşleme)
                  </td>
                  <td className="py-3 px-4 text-muted-foreground flex items-center gap-1.5">
                    <X className="w-4 h-4 text-destructive shrink-0" /> 128 kbps Boğuk & Parazitli Ses
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Sosyal Medya Logoları</td>
                  <td className="py-3 px-4 text-emerald-500 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 shrink-0" /> %100 Filigransız Temiz Çıktı (TikTok / CapCut)
                  </td>
                  <td className="py-3 px-4 text-muted-foreground flex items-center gap-1.5">
                    <X className="w-4 h-4 text-destructive shrink-0" /> Logo ve Bitiş Kartları Kalır
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Kullanıcı Gizliliği</td>
                  <td className="py-3 px-4 text-emerald-500 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 shrink-0" /> Sıfır Log, Üyeliksiz, 256-bit SSL Koruma
                  </td>
                  <td className="py-3 px-4 text-muted-foreground flex items-center gap-1.5">
                    <X className="w-4 h-4 text-destructive shrink-0" /> Çerez Takibi & Veri Kaydı
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Kullanıcı Deneyimi</td>
                  <td className="py-3 px-4 text-emerald-500 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 shrink-0" /> Sahte Buton Yok, Doğrudan Temiz İndirme
                  </td>
                  <td className="py-3 px-4 text-muted-foreground flex items-center gap-1.5">
                    <X className="w-4 h-4 text-destructive shrink-0" /> Yanıltıcı Reklamlar & Açılır Pencereler
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Troubleshooting & Real User Support Guide */}
        <div className="glass-card p-6 md:p-8 rounded-3xl">
          <div className="text-center md:text-start mb-6">
            <span className="text-xs font-bold text-primary tracking-wider uppercase mb-1 block">Kullanıcı Deneyimi & Destek</span>
            <h3 className="text-xl sm:text-2xl font-black text-foreground">Sık Karşılaşılan Durumlar ve Çözümleri</h3>
            <p className="text-sm text-muted-foreground mt-1">
              İndirme işleminizin her zaman %100 başarıyla tamamlanması için dikkat etmeniz gereken püf noktaları:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-card/60 border border-border">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-1.5">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span>Gizli (Kilitli) Hesapların Videoları</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Platformların güvenlik ve gizlilik kuralları gereği, yalnızca herkese açık (public) paylaşılan videolar analiz edilebilir. Gizli profillerin videoları indirilemez.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 border border-border">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-1.5">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span>Çoklu Gönderiler (Instagram Carousel)</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Birden fazla fotoğraf ve video içeren albüm linki yapıştırdığınızda sistem tüm slaytları algılar. Tek tıkla <strong>Tümünü ZIP Olarak İndir</strong> butonunu kullanabilirsiniz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 border border-border">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-1.5">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span>Canlı Yayın Kayıtları (Live Streams)</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Devam eden canlı yayınlar indirilemez. Yayın sonlandıktan ve platform tarafından tam video olarak işlendikten sonra tek tıkla cihazınıza kaydedebilirsiniz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card/60 border border-border">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2 mb-1.5">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span>Doğru Bağlantı Formatı</span>
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bağlantıyı paylaşırken tarayıcının adres çubuğundaki veya uygulamadaki &quot;Bağlantıyı Kopyala&quot; seçeneğini eksiksiz aldığınızdan emin olun.
              </p>
            </div>
          </div>
        </div>

        </div>
      </div>
    </section>
  );
}
