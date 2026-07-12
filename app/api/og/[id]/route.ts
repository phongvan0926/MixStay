import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '@/lib/prisma';
import { getVideoThumbnail } from '@/lib/video-utils';

/**
 * Ảnh OG (og:image) cho tin đăng — LUÔN trả JPEG 1200×630.
 *
 * Vì sao cần route này thay vì trỏ og:image thẳng vào ảnh Supabase:
 * Zalo KHÔNG đọc được WebP/HEIC (Facebook thì được). Phần lớn ảnh phòng đang là .webp
 * → link chia sẻ lên Zalo mất thumbnail. Route này fetch ảnh gốc, convert JPEG, cắt
 * đúng tỉ lệ OG chuẩn nên mọi tin đều có ảnh trong chat Zalo/Facebook/Messenger.
 *
 * Thứ tự ảnh: ảnh phòng → ảnh tòa nhà → thumbnail YouTube (tin chỉ có video) → /default.jpg.
 */
export const runtime = 'nodejs';

const OG_W = 1200;
const OG_H = 630;

async function toOgJpeg(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    return await sharp(raw)
      .resize(OG_W, OG_H, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82, progressive: true })
      .toBuffer();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let source: string | null = null;

  try {
    const rt = await prisma.roomType.findUnique({
      where: { id: params.id },
      select: {
        images: true,
        videoLinks: true,
        property: { select: { images: true } },
      },
    });
    source =
      rt?.images?.[0] ||
      rt?.property?.images?.[0] ||
      (rt?.videoLinks || []).map(getVideoThumbnail).find(Boolean) ||
      null;
  } catch {
    // DB lỗi → vẫn trả ảnh mặc định, không để crawler nhận 500 (Zalo sẽ cache "không có ảnh").
  }

  const origin = req.nextUrl.origin;
  for (const url of [source, `${origin}/default.jpg`]) {
    if (!url) continue;
    const buf = await toOgJpeg(url);
    if (!buf) continue;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(buf.length),
        // Crawler (Zalo/FB) cache khá lâu; CDN giữ 7 ngày, đổi ảnh phòng thì link mới sẽ lấy bản mới.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  }

  return new NextResponse('Not found', { status: 404 });
}
