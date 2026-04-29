/**
 * Resolve Zalo support link with fallback chain:
 *  1. Company group Zalo (if landlord works for a company)
 *  2. Landlord personal phone → zalo.me/{phone} deeplink
 *  3. NEXT_PUBLIC_SUPPORT_ZALO env (system hotline)
 *  4. Default https://zalo.me/
 *
 * Used by both Section 7 "Liên hệ" + floating Zalo FAB so they always
 * point to the same destination.
 */
type ContactSource = {
  property?: {
    company?: { zaloGroupLink?: string | null } | null;
    landlord?: { phone?: string | null } | null;
  } | null;
};

export function getZaloLink(source: ContactSource | null | undefined): string {
  const company = source?.property?.company;
  if (company?.zaloGroupLink) return company.zaloGroupLink;

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
