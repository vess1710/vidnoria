import { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';
import { getAllBlogPosts } from '@/lib/blog';

export const dynamic = 'force-static';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://vidnoria.com').replace(/\/+$/, '');

export const INDEXABLE_STATIC_PAGES = [
  '',
  '/video-converter',
  '/image-converter',
  '/audio-cutter',
  '/blog',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
  '/copyright',
  '/disclaimer',
  '/cookies',
  '/youtube-video-downloader',
  '/youtube-video-indir',
  '/youtube-mp3-indir',
  '/youtube-shorts-indir',
  '/instagram-video-downloader',
  '/instagram-video-indir',
  '/instagram-reels-indir',
  '/tiktok-video-downloader',
  '/tiktok-video-indir',
  '/facebook-video-downloader',
  '/facebook-video-indir',
  '/twitter-video-downloader',
  '/twitter-video-indir',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];

  for (const page of INDEXABLE_STATIC_PAGES) {
    const languages: Record<string, string> = {
      tr: `${BASE_URL}/tr${page}`,
      en: `${BASE_URL}/en${page}`,
      ar: `${BASE_URL}/ar${page}`,
    };

    for (const locale of locales) {
      routes.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority:
          page === ''
            ? 1.0
            : page.includes('downloader') || page.includes('-indir')
              ? 0.9
              : 0.7,
        alternates: {
          languages,
        },
      });
    }
  }

  try {
    const posts = await getAllBlogPosts('tr');
    for (const post of posts) {
      const languages: Record<string, string> = {
        tr: `${BASE_URL}/tr/blog/${post.slug}`,
        en: `${BASE_URL}/en/blog/${post.slug}`,
        ar: `${BASE_URL}/ar/blog/${post.slug}`,
      };

      for (const locale of locales) {
        routes.push({
          url: `${BASE_URL}/${locale}/blog/${post.slug}`,
          lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.8,
          alternates: {
            languages,
          },
        });
      }
    }
  } catch {
    // If blog reading fails during build, proceed with static routes
  }

  return routes;
}
