import path from 'path';
import { readMarkdown, listFiles, contentPath } from '@/lib/storage';
import { BlogPost } from '@/types';
import { Locale } from '@/lib/i18n';

export interface LocalizedBlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  coverImage?: string;
  publishedAt?: string;
  readingTime: number;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export async function getAllBlogPosts(locale: Locale): Promise<LocalizedBlogPost[]> {
  const blogDir = contentPath('blog');
  const files = await listFiles(blogDir, '.md');
  const posts: LocalizedBlogPost[] = [];

  for (const file of files) {
    const parsed = await readMarkdown<any>(file);
    if (!parsed || parsed.frontmatter.status !== 'published') continue;

    const fm = parsed.frontmatter;
    const slug = fm.slug || path.basename(file, '.md');

    // Extract localized content section
    // Content is formatted with <!-- content:tr --> ... <!-- content:en --> markers
    const fullBody = parsed.content;
    const marker = `<!-- content:${locale} -->`;
    const nextMarkerRegex = /<!-- content:[a-z]{2} -->/g;

    let body = fullBody;
    if (fullBody.includes(marker)) {
      const parts = fullBody.split(marker);
      if (parts.length > 1) {
        const afterMarker = parts[1];
        const nextMatch = afterMarker.search(nextMarkerRegex);
        body = nextMatch !== -1 ? afterMarker.substring(0, nextMatch).trim() : afterMarker.trim();
      }
    }

    posts.push({
      slug,
      title: fm.title?.[locale] || fm.title?.['en'] || slug,
      description: fm.description?.[locale] || fm.description?.['en'] || '',
      content: body,
      category: fm.category || 'general',
      coverImage: fm.coverImage,
      publishedAt: fm.publishedAt,
      readingTime: fm.readingTime?.[locale] || 4,
      tags: fm.tags || [],
      seoTitle: fm.seoTitle?.[locale],
      seoDescription: fm.seoDescription?.[locale],
    });
  }

  // Sort by published date descending
  return posts.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}

export async function getBlogPostBySlug(slug: string, locale: Locale): Promise<LocalizedBlogPost | null> {
  const posts = await getAllBlogPosts(locale);
  return posts.find((p) => p.slug === slug) || null;
}
