'use client';

import { useI18n } from '@/lib/i18n/context';
import { ShieldCheck, Zap, MonitorSmartphone, FileCheck, CheckCircle2 } from 'lucide-react';

export default function SEOContentSection() {
  const { lang } = useI18n();

  if (lang === 'en') {
    return (
      <section className="py-16 bg-muted/20 border-t border-border/40">
        <div className="container-custom max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Fast, Secure & Free Online Video & Audio Downloader
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              Vidnoria is a modern web-based media platform allowing you to download high-definition videos and convert audio from leading social media and video sharing networks without installing any third-party software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <Zap className="w-6 h-6" />
                <h3 className="text-xl font-semibold text-foreground">High Definition Video & Crystal Clear MP3</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Download your favorite clips in original resolution up to 4K UHD and 1080p Full HD. If you only need the audio soundtrack, convert videos to high-bitrate MP3 (320kbps) instantly with our server-side media processing engine.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <MonitorSmartphone className="w-6 h-6" />
                <h3 className="text-xl font-semibold text-foreground">Universal Compatibility Across All Devices</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enjoy seamless responsiveness on any device: Windows PC, Apple Mac, iPhone (iOS Safari), Android smartphones, and tablets. Vidnoria runs directly in your favorite browser with zero installation required.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-xl font-semibold text-foreground">100% Privacy Focused & Safe</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We respect your personal privacy. No registration or personal credentials are required. Vidnoria does not store or keep copies of the media files you process on public servers.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <FileCheck className="w-6 h-6" />
                <h3 className="text-xl font-semibold text-foreground">No Watermark & Uncapped Speeds</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Save TikTok videos without annoying watermarks, Instagram Reels in full fidelity, and YouTube playlists or shorts with high-speed direct downloads.
              </p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-2xl">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              How to Download Videos Online with Vidnoria?
            </h3>
            <ol className="space-y-3 text-sm text-muted-foreground leading-relaxed list-decimal list-inside">
              <li><strong className="text-foreground">Copy the Link:</strong> Open the video on YouTube, Instagram, TikTok, Facebook, or Twitter and copy its URL.</li>
              <li><strong className="text-foreground">Paste into Search Box:</strong> Paste the copied link into the Vidnoria search bar above and click the Analyze button.</li>
              <li><strong className="text-foreground">Choose Quality & Download:</strong> Select your preferred format (MP4 video or MP3 audio) and resolution, then click download to save the file immediately.</li>
            </ol>
          </div>
        </div>
      </section>
    );
  }

  if (lang === 'ar') {
    return (
      <section className="py-16 bg-muted/20 border-t border-border/40" dir="rtl">
        <div className="container-custom max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
              أفضل موقع لتحميل مقاطع الفيديو والموسيقى مجاناً عبر الإنترنت
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              يوفر لك موقع فيدنوريا تجربة فريدة وسريعة لتنزيل مقاطع الفيديو وتحويل المقاطع الصوتية بصيغة MP3 من أشهر منصات التواصل الاجتماعي ومواقع الفيديو بدون برامج وبأعلى دقة ممكنة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <Zap className="w-6 h-6" />
                <h3 className="text-xl font-semibold text-foreground">دقة فائقة تصل إلى 4K وصوت MP3 نقي</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                قم بتحميل الفيديوهات بجودتها الأصلية مع دعم كامل لدقات 1080p و 4K Ultra HD، أو استخراج الصوت بدقة 320kbps للاستماع دون اتصال بالإنترنت.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3 text-primary">
                <MonitorSmartphone className="w-6 h-6" />
                <h3 className="text-xl font-semibold text-foreground">متوافق مع جميع الهواتف الذكية والحواسيب</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                يعمل الموقع بسلاسة تامة على هواتف آيفون وأندرويد بالإضافة إلى أجهزة ويندوز وماك من خلال المتصفح مباشرة دون الحاجة لتثبيت أي تطبيقات إضافية.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default Turkish Content (Detailed, Comprehensive & Rich SEO Text)
  return (
    <section className="py-16 bg-muted/20 border-t border-border/40">
      <div className="container-custom max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Vidnoria ile Hızlı, Güvenli ve Ücretsiz Online Medya İndirme
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            Vidnoria; YouTube, Instagram, TikTok, Facebook ve Twitter gibi dünyanın en popüler medya platformlarındaki videoları, ses dosyalarını ve görselleri herhangi bir ek yazılım ya da tarayıcı eklentisi yüklemeden, doğrudan tarayıcınız üzerinden yüksek kalitede indirmenizi sağlayan yeni nesil bir medya servisidir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="glass-card p-6 sm:p-8 rounded-2xl hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-primary">
              <Zap className="w-6 h-6 shrink-0" />
              <h3 className="text-xl font-semibold text-foreground">4K Ultra HD ve 1080p Full HD Video Desteği</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Orijinal kaynaktaki en yüksek çözünürlüğü kaybetmeden indirin. Vidnoria, 4K, 2K, 1080p Full HD, 720p ve 480p gibi farklı çözünürlük seçeneklerini algılar ve tercih ettiğiniz kalitede MP4 formatında saniyeler içinde bilgisayarınıza veya telefonunuza aktarır.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8 rounded-2xl hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-primary">
              <FileCheck className="w-6 h-6 shrink-0" />
              <h3 className="text-xl font-semibold text-foreground">Tek Tıkla Yüksek Kalite MP3 Ses Dönüştürme</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Videolardaki müziği, röportajı ya da podcast içeriğini yalnızca ses olarak kaydetmek istediğinizde, 320 kbps kristal netliğinde MP3 formatına anında dönüştürebilirsiniz. Mobil veri ve disk alanından tasarruf etmek için idealdir.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8 rounded-2xl hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-primary">
              <MonitorSmartphone className="w-6 h-6 shrink-0" />
              <h3 className="text-xl font-semibold text-foreground">Tüm Cihazlar ve Tarayıcılarla %100 Uyumlu</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Android, iOS (iPhone & iPad), Windows, macOS veya Linux; hangi işletim sistemini kullanırsanız kullanın, Chrome, Safari, Firefox, Edge veya Opera üzerinden hiçbir uygulama kurmadan doğrudan çalışır. Mobil cihazlar için özel olarak optimize edilmiştir.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8 rounded-2xl hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-primary">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <h3 className="text-xl font-semibold text-foreground">Filigransız İndirme & Gizlilik Güvencesi</h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              TikTok videolarını rahatsız edici filigran (watermark) veya logo olmadan temiz bir şekilde indirin. Vidnoria hiçbir kişisel veri toplamaz, üyelik veya kredi kartı talep etmez; tüm işlem SSL şifrelemeli güvenli tünellerle korunur.
            </p>
          </div>
        </div>

        <div className="glass-card p-8 rounded-2xl mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
            Vidnoria ile 3 Adımda Kolayca Video Nasıl İndirilir?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-lg">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">1</span>
                <span>Bağlantıyı Kopyalayın</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                İndirmek istediğiniz videonun YouTube, Instagram, TikTok veya Twitter üzerindeki paylaşım linkini kopyalayın.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-lg">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">2</span>
                <span>Vidnoria&apos;ya Yapıştırın</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Kopyaladığınız bağlantıyı sayfanın başındaki arama kutucuğuna yapıştırıp &quot;İncele&quot; butonuna dokunun.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-lg">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">3</span>
                <span>Formatı Seçin ve İndirin</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Listelenen MP4 video veya MP3 ses kalitelerinden dilediğinizi seçerek cihazınıza anında kaydedin.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl bg-primary/5 border-primary/20">
          <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span>Neden Vidnoria Tercih Edilmelidir?</span>
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Vidnoria; yüksek hızlı indirme sunucuları, reklamlardan arındırılmış temiz kullanıcı arayüzü, gelişmiş format dönüştürme araçları ve Türkçe dahil çoklu dil desteğiyle kullanıcılarına en pürüzsüz medya indirme deneyimini ücretsiz sunar. Sınırsız indirme hakkı sayesinde dilediğiniz kadar medyayı güvenle cihazınıza aktarabilirsiniz.
          </p>
        </div>
      </div>
    </section>
  );
}
