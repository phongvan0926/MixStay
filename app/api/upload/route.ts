import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'images';
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'upload');
  if (rateLimited) return rateLimited;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) || 'uploads';
  const kind = (formData.get('kind') as string) || 'image'; // 'image' | 'video'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const isVideo = kind === 'video' || file.type.startsWith('video/');

  if (isVideo) {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Chỉ hỗ trợ MP4, WebM, MOV' }, { status: 400 });
    }
    if (file.size > VIDEO_MAX_SIZE) {
      return NextResponse.json({ error: 'Video tối đa 50MB' }, { status: 400 });
    }
  } else {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }
    if (file.size > IMAGE_MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
    }
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${timestamp}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl });
}
