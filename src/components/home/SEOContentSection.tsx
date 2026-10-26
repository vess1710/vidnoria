'use client';

import { useI18n } from '@/lib/i18n/context';
import { 
  Zap, FileCheck, MonitorSmartphone, ShieldCheck, 
  CheckCircle2, Users, Award, Lock, Star, Sparkles, Server, HeartHandshake
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
        </div>

      </div>
    </section>
  );
}
