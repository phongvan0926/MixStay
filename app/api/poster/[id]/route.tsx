import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { getVideoThumbnail } from '@/lib/video-utils';
import { redactHouseNumber, redactTitle } from '@/lib/address';
import { formatListingCode } from '@/lib/listing-code';

/**
 * ẢNH BÌA đăng Facebook/Zalo cho 1 tin — PNG 1080×1350 (khổ 4:5, chiếm nhiều diện tích
 * nhất trên feed điện thoại).
 *
 * Vì sao cần: ảnh phòng trần trên feed không nói được giá/diện tích/khu vực, người lướt
 * phải mở bài mới biết → tin trôi. Ảnh bìa in sẵn 3 con số đó ngay trên ảnh.
 *
 * Khác `/api/og/[id]` (1200×630 cho thumbnail link chat, không chữ) — cái này để ĐĂNG BÀI.
 *
 * Dùng ImageResponse (Satori) thay vì vẽ chữ bằng sharp/SVG: librsvg trên serverless
 * thiếu font tiếng Việt nên dấu bị vỡ thành ô vuông.
 */
export const runtime = 'nodejs';

const W = 1080;
const H = 1350;

const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 ngủ 1 khách',
  '2k1n': '2 ngủ 1 khách', studio: 'Studio', duplex: 'Duplex',
};

const trieu = (n: number) => `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} triệu`;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rt = await prisma.roomType.findFirst({
    where: { id: params.id, isApproved: true, property: { status: 'APPROVED', isActive: true } },
    select: {
      name: true, typeName: true, areaSqm: true, priceMonthly: true, listingCode: true,
      images: true, videoLinks: true,
      property: {
        select: {
          district: true, streetName: true, images: true,
          company: { select: { code: true } },
        },
      },
    },
  });
  if (!rt) return new Response('Không tìm thấy tin đăng', { status: 404 });

  const origin = req.nextUrl.origin;
  const photo =
    rt.images?.[0] ||
    rt.property?.images?.[0] ||
    (rt.videoLinks || []).map(getVideoThumbnail).find(Boolean) ||
    `${origin}/default.jpg`;

  // Font tải qua HTTP từ chính site (public/fonts) — Satori cần buffer TTF, và đây là cách
  // chắc chắn chạy trên serverless (không phụ thuộc file tracing của bundle).
  const [bold, semibold] = await Promise.all([
    fetch(`${origin}/fonts/BeVietnamPro-Bold.ttf`).then(r => r.arrayBuffer()),
    fetch(`${origin}/fonts/BeVietnamPro-SemiBold.ttf`).then(r => r.arrayBuffer()),
  ]);

  const area = [rt.property?.district, redactHouseNumber(rt.property?.streetName)].filter(Boolean).join(' • ');
  const code = formatListingCode(rt.listingCode, rt.property?.company?.code);

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: '#0f2e26', fontFamily: 'BeVietnamPro' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} width={W} height={H} style={{ objectFit: 'cover' }} alt="" />

        {/* Dải tối dưới đáy để chữ luôn đọc được dù ảnh sáng hay tối */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 620, display: 'flex',
          background: 'linear-gradient(to top, rgba(6,32,26,0.97) 0%, rgba(6,32,26,0.88) 45%, rgba(6,32,26,0) 100%)',
        }} />

        {/* Nhãn loại phòng + mã tin ở góc trên */}
        <div style={{ position: 'absolute', top: 44, left: 44, right: 44, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            display: 'flex', backgroundColor: 'rgba(255,255,255,0.94)', color: '#0f2e26',
            padding: '14px 28px', borderRadius: 999, fontSize: 34, fontWeight: 700,
          }}>
            {TYPE_LABEL[rt.typeName] || rt.typeName} · {rt.areaSqm}m²
          </div>
          {code && (
            <div style={{
              display: 'flex', backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff',
              padding: '12px 22px', borderRadius: 999, fontSize: 28, fontWeight: 600,
            }}>
              {code}
            </div>
          )}
        </div>

        {/* Khối thông tin chính */}
        <div style={{ position: 'absolute', left: 52, right: 52, bottom: 56, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: '#facc15', fontSize: 34, fontWeight: 600, marginBottom: 14 }}>
            📍 {area || 'Hà Nội'}
          </div>
          <div style={{
            display: 'flex', color: '#ffffff', fontSize: 58, fontWeight: 700, lineHeight: 1.18,
            marginBottom: 24, maxHeight: 220, overflow: 'hidden',
          }}>
            {redactTitle(rt.name)}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', color: 'rgba(255,255,255,0.7)', fontSize: 30, fontWeight: 600 }}>Giá thuê</div>
              <div style={{ display: 'flex', color: '#4ade80', fontSize: 82, fontWeight: 700, lineHeight: 1.05 }}>
                {trieu(rt.priceMonthly)}
              </div>
              <div style={{ display: 'flex', color: 'rgba(255,255,255,0.75)', fontSize: 30, fontWeight: 600 }}>/tháng</div>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
              color: 'rgba(255,255,255,0.85)', fontSize: 30, fontWeight: 600,
            }}>
              <div style={{ display: 'flex' }}>Xem ảnh & video đầy đủ tại</div>
              <div style={{ display: 'flex', color: '#ffffff', fontSize: 40, fontWeight: 700 }}>mixstay.vn</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: 'BeVietnamPro', data: bold, weight: 700, style: 'normal' },
        { name: 'BeVietnamPro', data: semibold, weight: 600, style: 'normal' },
      ],
      headers: {
        // Ảnh chỉ đổi khi tin đổi ảnh/giá → cache CDN 1 giờ là đủ, tiết kiệm lượt render.
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
