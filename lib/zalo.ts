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
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?zalo\.me\//i.test(v)) return 'https://' + v.replace(/^www\./i, '');
  // Chỉ gồm ký tự của số điện thoại → coi là SĐT
  if (/^[\d\s+\-.()]+$/.test(v)) {
    let digits = v.replace(/\D/g, '');
    if (v.startsWith('+84')) digits = '0' + digits.slice(2);
    if (digits) return `https://zalo.me/${digits}`;
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
  if (linkBroker?.role === 'BROKER' && linkBroker.phone) {
    const brokerDigits = linkBroker.phone.replace(/\D/g, '');
    if (brokerDigits) return `https://zalo.me/${brokerDigits}`;
  }

  const phone = source?.property?.landlord?.phone;
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits) return `https://zalo.me/${digits}`;
  }

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

  const phone = source?.landlord?.phone;
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits) return `https://zalo.me/${digits}`;
  }

  return process.env.NEXT_PUBLIC_SUPPORT_ZALO || 'https://zalo.me/';
}
