import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, BookOpen, ArrowRight } from 'lucide-react';
import { Locale, getTranslations, createTranslator } from '@/lib/i18n';
import { getAllBlogPosts } from '@/lib/blog';
import AdSlot from '@/components/ads/AdSlot';

interface BlogPageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);

  return {
    title: t('seo.blogTitle'),
    description: t('seo.blogDescription'),
  };
}

export default async function BlogIndexPage({ params }: BlogPageProps) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);
  const isRtl = locale === 'ar';

  const posts = await getAllBlogPosts(locale);

  return (
    <div className="container-custom py-12 md:py-20" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">
          {t('blog.title')}
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          {t('blog.subtitle')}
        </p>
      </div>

      <div className="mb-10">
        <AdSlot slotId="blog-top-ad" format="horizontal" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="glass-card overflow-hidden flex flex-col group hover:-translate-y-1 transition-all duration-300"
          >
            <div className="relative aspect-video w-full bg-muted/40 p-6 flex items-center justify-center">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  width={64}
                  height={64}
                  className="w-16 h-16 group-hover:scale-110 transition-transform"
                />
              ) : (
                <BookOpen className="w-12 h-12 text-primary" />
              )}
              <span className="absolute top-3 end-3 px-2.5 py-1 text-xs font-semibold bg-background/80 backdrop-blur-md rounded-md capitalize border border-border">
                {post.category}
              </span>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                {post.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.publishedAt}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readingTime} {t('blog.minRead')}
                </span>
              </div>

              <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                <Link href={`/${locale}/blog/${post.slug}`}>
                  {post.title}
                </Link>
              </h2>

              <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1 leading-relaxed">
                {post.description}
              </p>

              <Link
                href={`/${locale}/blog/${post.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline mt-auto"
              >
                <span>{t('blog.readMore')}</span>
                <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
