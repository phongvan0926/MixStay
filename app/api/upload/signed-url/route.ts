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
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'upload');
  if (rateLimited) return rateLimited;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { filename?: string; contentType?: string; folder?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { filename, contentType, folder } = body;

  if (!filename || !contentType) {
    return NextResponse.json({ error: 'Thiếu filename hoặc contentType' }, { status: 400 });
  }

  if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Chỉ hỗ trợ MP4, WebM, MOV' }, { status: 400 });
  }

  const safeFolder = (folder || 'videos').replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/^\/+|\/+$/g, '');
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${safeFolder}/${Date.now()}_${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: `Không tạo được signed URL: ${error?.message || 'unknown'}` },
      { status: 500 }
    );
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    publicUrl: publicData.publicUrl,
    token: data.token,
    path: data.path,
  });
}
