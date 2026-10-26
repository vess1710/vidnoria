import Link from 'next/link';
import { Home, Search, Video, Music, Image as ImageIcon, Scissors, ArrowRight, HelpCircle } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Sayfa Bulunamadı | Vidnoria',
  description: 'Aradığınız sayfa silinmiş veya taşınmış olabilir. Vidnoria ana sayfasına dönerek video indirmeye ve dönüştürmeye devam edebilirsiniz.',
  robots: {
    index: false,
    follow: true,
  },
};

const popularTools = [
  {
    title: 'YouTube Video İndir',
    desc: '4K & 1080p MP4 veya MP3 formatında indir',
    href: '/tr/youtube-video-indir',
    icon: Video,
    color: 'text-red-500 bg-red-500/10',
  },
  {
    title: 'Instagram Reels & Video İndir',
    desc: 'Reels, video ve hikayeleri tek tıkla kaydet',
    href: '/tr/instagram-video-indir',
    icon: Video,
    color: 'text-pink-500 bg-pink-500/10',
  },
  {
    title: 'TikTok Filigransız Video İndir',
    desc: 'Logosuz ve filigransız orijinal kalitede indir',
    href: '/tr/tiktok-video-indir',
    icon: Video,
    color: 'text-sky-500 bg-sky-500/10',
  },
  {
    title: 'Video & Ses Dönüştürücü',
    desc: 'Videoları MP3 veya farklı video formatlarına çevir',
    href: '/tr/video-converter',
    icon: Music,
    color: 'text-purple-500 bg-purple-500/10',
  },
  {
    title: 'Resim Format Dönüştürücü',
    desc: 'WebP, PNG, JPG formatları arasında hızlı dönüştür',
    href: '/tr/image-converter',
    icon: ImageIcon,
    color: 'text-emerald-500 bg-emerald-500/10',
  },
  {
    title: 'MP3 ve Ses Kesici',
    desc: 'Müzik ve ses dosyalarını kırpın ve zil sesi yapın',
    href: '/tr/audio-cutter',
    icon: Scissors,
    color: 'text-amber-500 bg-amber-500/10',
  },
];

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-background text-foreground relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 start-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 end-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full text-center relative z-10">
        {/* 404 Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
          <span>Hata Kodu 404</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
          <span className="gradient-text">Aradığınız Sayfa Bulunamadı</span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Ulaşmaya çalıştığınız sayfa silinmiş, adı değiştirilmiş veya geçici olarak kullanım dışı kalmış olabilir. Dilerseniz ana sayfaya dönebilir veya aşağıdaki popüler araçlarımızı kullanabilirsiniz:
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <Link
            href="/tr"
            className="gradient-bg text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg"
          >
            <Home className="w-5 h-5" />
            <span>Ana Sayfaya Dön</span>
          </Link>
          <Link
            href="/tr/faq"
            className="glass-card px-6 py-3 rounded-xl hover:bg-accent/40 transition-colors flex items-center gap-2 text-foreground font-medium"
          >
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <span>Sıkça Sorulan Sorular</span>
          </Link>
        </div>

        {/* Popular Tools Grid */}
        <div className="text-start mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4 text-center sm:text-start">
            Popüler Medya ve İndirme Araçları
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {popularTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="glass-card p-4 rounded-xl hover:border-primary/40 hover:scale-[1.02] transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg ${tool.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {tool.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tool.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium mt-3">
                    <span>Aracı Aç</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
