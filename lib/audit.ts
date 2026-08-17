import prisma from '@/lib/prisma';

/**
 * SERVER-ONLY. Ghi NHẬT KÝ THAO TÁC cho các hành động khó hoàn tác.
 *
 * Vì sao cần: ngày 17/08/2026 kho tụt từ 856 → 675 tin và 498 → 358 tòa. Ai xoá, xoá lúc nào,
 * xoá nhầm hay cố ý — không truy lại được gì. Khi có nhân viên thứ hai thì đây là chỗ phân
 * định đúng sai, không phải chỗ trang trí.
 *
 * NGUYÊN TẮC: ghi nhật ký KHÔNG BAO GIỜ được làm hỏng việc chính. Mọi lỗi ở đây đều nuốt —
 * thà mất một dòng nhật ký còn hơn admin bấm duyệt mà báo lỗi 500.
 */

export type AuditAction =
  | 'approve' | 'reject' | 'create' | 'update' | 'delete' | 'transfer' | 'permission';
export type AuditEntity = 'roomType' | 'property' | 'company' | 'user' | 'deal';

type SessionUser = { id?: string; name?: string | null; role?: string } | undefined | null;

/**
 * So hai bản ghi, chỉ giữ những field THẬT SỰ ĐỔI và đáng quan tâm.
 * Ghi nguyên cả bản ghi thì nhật ký phình và không ai đọc nổi.
 */
export function diffFields<T extends Record<string, any>>(
  before: T | null | undefined,
  after: Record<string, any>,
  fields: (keyof T & string)[],
): Record<string, { from: any; to: any }> | undefined {
  if (!before) return undefined;
  const out: Record<string, { from: any; to: any }> = {};
  for (const f of fields) {
    if (!(f in after)) continue;
    const from = before[f];
    const to = after[f];
    // So bằng chuỗi để Date/số/mảng không báo khác nhau chỉ vì khác kiểu tham chiếu
    if (JSON.stringify(from ?? null) !== JSON.stringify(to ?? null)) out[f] = { from, to };
  }
  return Object.keys(out).length ? out : undefined;
}

export function writeAudit(input: {
  user: SessionUser;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  /** Tên/mã đọc được — CHỤP LẠI lúc thao tác vì bản ghi có thể bị xoá ngay sau đó */
  entityLabel?: string | null;
  changes?: Record<string, any>;
}) {
  // Không await ở nơi gọi: người dùng không phải chờ ghi nhật ký mới thấy kết quả.
  return prisma.auditLog
    .create({
      data: {
        userId: input.user?.id || null,
        userName: input.user?.name || null,
        userRole: input.user?.role || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        entityLabel: input.entityLabel ?? null,
        changes: input.changes ? (input.changes as any) : undefined,
      },
    })
    .catch(e => {
      console.error('audit log error:', input.entity, input.action, e);
    });
}
