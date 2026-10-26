import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { isAdminAuthenticated, getAdminCorsHeaders, adminOptionsResponse } from '@/lib/admin/auth';
import { readMarkdown, writeMarkdown, contentPath, listFiles } from '@/lib/storage';

export async function OPTIONS(req: Request) {
  return adminOptionsResponse(req);
}

export async function GET(req: Request) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const blogDir = contentPath('blog');
  const files = await listFiles(blogDir, '.md');
  const posts: any[] = [];

  for (const file of files) {
    const parsed = await readMarkdown<any>(file);
    if (parsed) {
      posts.push({
        slug: parsed.frontmatter.slug || path.basename(file, '.md'),
        frontmatter: parsed.frontmatter,
        content: parsed.content,
      });
    }
  }

  return NextResponse.json({ success: true, posts }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.slug || !body.frontmatter) {
    return NextResponse.json({ success: false, error: 'Invalid post data' }, { status: 400, headers: corsHeaders });
  }

  const filePath = contentPath('blog', `${body.slug}.md`);
  await writeMarkdown(filePath, body.frontmatter, body.content || '');

  return NextResponse.json({ success: true, message: 'Post saved' }, { headers: corsHeaders });
}

export async function DELETE(req: NextRequest) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ success: false, error: 'Slug parameter is required' }, { status: 400, headers: corsHeaders });
  }

  const filePath = contentPath('blog', `${slug}.md`);
  await fs.unlink(filePath).catch(() => {});

  return NextResponse.json({ success: true, message: 'Post deleted' }, { headers: corsHeaders });
}
