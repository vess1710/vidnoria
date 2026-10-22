import { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';
import { getAllBlogPosts } from '@/lib/blog';

export const dynamic = 'force-static';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vidnoria.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [];
  const staticPages = [
    '',
    '/blog',
    '/faq',
    '/contact',
    '/privacy',
    '/terms',
    '/copyright',
    '/disclaimer',
    '/cookies',
    '/youtube-video-downloader',
    '/instagram-video-downloader',
    '/tiktok-video-downloader',
    '/facebook-video-downloader',
    '/twitter-video-downloader',
  ];

  // Add all static pages for each locale
  for (const page of staticPages) {
    for (const locale of locales) {
      routes.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : page.includes('downloader') ? 0.9 : 0.7,
      });
    }
  }

  // Add all blog posts for each locale
  try {
    const posts = await getAllBlogPosts('en');
    for (const post of posts) {
      for (const locale of locales) {
        routes.push({
          url: `${BASE_URL}/${locale}/blog/${post.slug}`,
          lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.8,
        });
      }
    }
  } catch {
    // If blog reading fails during build, proceed with static routes
  }

  return routes;
}
