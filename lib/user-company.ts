import prisma from './prisma';

export type UserCompany = {
  id: string;
  name: string;
  logo: string | null;
  zaloGroupLink: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
} | null;

// Trả về Company của user nếu tất cả property của họ cùng companyId.
// Trả null nếu user không có property hoặc property thuộc nhiều công ty khác nhau.
export async function getUserCompany(userId: string): Promise<UserCompany> {
  const properties = await prisma.property.findMany({
    where: { landlordId: userId },
    select: {
      companyId: true,
      company: {
        select: {
          id: true, name: true, logo: true, zaloGroupLink: true,
          description: true, phone: true, email: true, address: true, isApproved: true,
        },
      },
    },
  });

  if (properties.length === 0) return null;

  const companyIds = Array.from(
    new Set(properties.map((p) => p.companyId).filter((id): id is string => !!id))
  );
  if (companyIds.length !== 1) return null;

  const linked = properties.find((p) => p.companyId === companyIds[0]);
  const co = linked?.company;
  // Công ty CHỜ DUYỆT chưa hiện ở topbar chủ nhà (chỉ hiện khi đã được admin duyệt).
  if (!co || co.isApproved === false) return null;
  const { isApproved, ...rest } = co;
  return rest;
}
