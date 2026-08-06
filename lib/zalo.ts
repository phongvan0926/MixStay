import { extractVNPhone } from '@/lib/phone';

/**
 * Resolve Zalo support link with fallback chain:
 *  1. Company group Zalo (if landlord works for a company) — highest priority
 *  2. If the share link was created by a BROKER → that broker's phone deeplink
 *     (protects the broker's lead/commission; otherwise the customer would reach
 *     the landlord directly and bypass the broker)
 *  3. Landlord personal phone → zalo.me/{phone} deeplink (landlord self-posted links)
 *  4. NEXT_PUBLIC_SUPPORT_ZALO env (system hotline)
 *  5. Default https://zalo.me/
 *
 * Used by both Section 7 "Liên hệ" + floating Zalo FAB so they always
 * point to the same destination. `linkBroker` is the share link CREATOR
 * (ShareLink.broker); only when its role is BROKER does step 2 apply.
 */
/**
 * Chuẩn hoá ô "Link Zalo" của công ty: chấp nhận LINK đầy đủ HOẶC số điện thoại.
 * - Rỗng → null (không bắt buộc).
 * - Đã là URL (http/https) hoặc dạng zalo.me/... → giữ nguyên (thêm https nếu thiếu).
 * - Là số điện thoại → đổi thành deeplink zalo cá nhân https://zalo.me/{digits}
 *   (vd "0914344988" → "https://zalo.me/0914344988"; "+84914..." → bỏ +84 thành 0...).
 * - Còn lại → trả nguyên văn (vd mã nhóm tự nhập).
 */
export function normalizeZaloInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  // Chỉ chấp nhận http/https. Chuỗi lạ (javascript:, data:, vbscript:) trước đây rơi xuống
  // `return v` cuối và được ghi thẳng vào href. Bản kiểm định kết luận CHƯA khai thác được
  // (React chặn), nhưng chặn ở đây thì không phải phụ thuộc vào hành vi của React/trình duyệt.
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^https?:\/\//i.test(v)) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?zalo\.me\//i.test(v)) return 'https://' + v.replace(/^www\./i, '');
  // Chỉ gồm ký tự của số điện thoại → coi là SĐT.
  // Số KHÔNG hợp lệ thì trả null thay vì đẻ ra link chết: thà không có nút Zalo
  // còn hơn khách bấm vào rơi vào hư không (BNBHOLDING "09366258556" — 11 số).
  if (/^[\d\s+\-.()]+$/.test(v)) {
    const phone = extractVNPhone(v);
    return phone ? `https://zalo.me/${phone}` : null;
  }
  return v;
}

type ContactSource = {
  property?: {
    company?: { zaloGroupLink?: string | null } | null;
    landlord?: { phone?: string | null } | null;
  } | null;
};

type LinkBroker = { phone?: string | null; role?: string | null } | null | undefined;

export function getZaloLink(source: ContactSource | null | undefined, linkBroker?: LinkBroker): string {
  const company = source?.property?.company;
  if (company?.zaloGroupLink) return company.zaloGroupLink;

  // Broker-created share link → deeplink to the BROKER (keep the lead with them).
  // extractVNPhone: bóc số khỏi chuỗi kiểu "Lâm 0394632595" VÀ loại số không hợp lệ —
  // .replace(/\D/g,'') cũ bóc được tên nhưng vẫn cho "09366258556" ra link chết.
  if (linkBroker?.role === 'BROKER') {
    const brokerPhone = extractVNPhone(linkBroker.phone);
    if (brokerPhone) return `https://zalo.me/${brokerPhone}`;
  }

  const landlordPhone = extractVNPhone(source?.property?.landlord?.phone);
  if (landlordPhone) return `https://zalo.me/${landlordPhone}`;

  return process.env.NEXT_PUBLIC_SUPPORT_ZALO || 'https://zalo.me/';
}

/**
 * For system share view: landlord-level resolution (no specific roomType).
 *   1. Company group of any property in the landlord's portfolio
 *   2. Landlord personal phone deeplink
 *   3. Env fallback
 */
type SystemContactSource = {
  landlord?: { phone?: string | null } | null;
  properties?: Array<{ company?: { zaloGroupLink?: string | null } | null }> | null;
};

export function getSystemZaloLink(source: SystemContactSource | null | undefined): string {
  const groupLink = source?.properties?.find(p => p.company?.zaloGroupLink)?.company?.zaloGroupLink;
  if (groupLink) return groupLink;

  const phone = extractVNPhone(source?.landlord?.phone);
  if (phone) return `https://zalo.me/${phone}`;

  return process.env.NEXT_PUBLIC_SUPPORT_ZALO || 'https://zalo.me/';
}
