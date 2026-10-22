import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, BookOpen } from 'lucide-react';
import { Locale, getTranslations, createTranslator } from '@/lib/i18n';
import { getBlogPostBySlug, getAllBlogPosts } from '@/lib/blog';
import AdSlot from '@/components/ads/AdSlot';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

interface PostPageProps {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const post = await getBlogPostBySlug(slug, lang as Locale);
  if (!post) return {};

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.description,
  };
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);
  const isRtl = locale === 'ar';

  const post = await getBlogPostBySlug(slug, locale);
  if (!post) {
    notFound();
  }

  // Convert markdown to clean sanitized html
  const rawHtml = await marked.parse(post.content);
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height'],
      a: ['href', 'target', 'rel'],
    },
  });

  return (
    <article className="container-custom py-12 md:py-20 max-w-4xl" dir={isRtl ? 'rtl' : 'ltr'}>
      <Link
        href={`/${locale}/blog`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
        <span>{t('blog.title')}</span>
      </Link>

      <header className="mb-10 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-full capitalize">
            {post.category}
          </span>
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

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
          {post.title}
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {post.description}
        </p>
      </header>

      <div className="my-8">
        <AdSlot slotId="blog-inner-top-ad" format="auto" />
      </div>

      {/* Render Markdown content */}
      <div 
        className="prose dark:prose-invert prose-lg max-w-none glass-card p-6 md:p-10 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />

      <div className="my-10">
        <AdSlot slotId="blog-inner-bottom-ad" format="auto" />
      </div>
    </article>
  );
}
