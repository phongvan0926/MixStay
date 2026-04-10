# CLAUDE.md - Hướng dẫn cho Claude Code

## Dự án
MixStay Manager v2 - Nền tảng phân phối & quản lý chung cư mini.
Kết nối 4 vai trò: Admin (Công ty), Môi giới, Chủ nhà, Khách thuê.

## Tech stack
- Next.js 14 + React 18 + Tailwind CSS
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth.js (JWT, multi-role: ADMIN, BROKER, LANDLORD, CUSTOMER)
- Deploy: Vercel

## Cấu trúc quan trọng
```
app/admin/          → Trang quản trị (companies, properties, rooms, deals, users, settings)
app/broker/         → Trang môi giới (inventory, deals, share-links)
app/landlord/       → Trang chủ nhà (properties, rooms)
app/share/[token]/  → Trang tin đăng loại phòng (public, ẩn địa chỉ + SĐT)
app/share/system/[token]/ → Trang kho phòng hệ thống (public, tất cả phòng trống của landlord)
app/auth/callback/  → Trang chọn vai trò sau OAuth login lần đầu
app/api/            → API routes (companies, properties, rooms, rooms/import, deals, share-links, share-links/system, inquiries, notifications, users, settings)
components/layout/  → DashboardLayout.tsx (sidebar + topbar + notification badge), AuthProvider.tsx
components/ui/      → Skeleton.tsx, ImageUpload.tsx, OptimizedImage.tsx, Pagination.tsx
hooks/useData.ts    → SWR hooks: useProperties, useRoomTypes, useDeals, useUsers, useShareLinks, useCompanies, useDashboardStats, useInquiries
lib/auth.ts         → NextAuth config
lib/prisma.ts       → Prisma client singleton
lib/utils.ts        → Helpers: formatCurrency, formatDate, getStatusColor...
lib/fetcher.ts      → SWR fetcher function
lib/pagination.ts   → getPaginationParams(), paginatedResponse()
lib/rate-limit.ts   → applyRateLimit() — in-memory rate limiter
lib/validations.ts  → Zod schemas + validateBody()
prisma/schema.prisma → 12 bảng: users, accounts, sessions, companies, properties, room_types, deals, share_links, room_inquiries, notifications, settings, verification_tokens
prisma/seed.ts      → Demo data (password: 123456)
middleware.ts       → Route protection theo role
```

## Database schema tóm tắt
- companies: id, name, description, phone, email, address, logo, zaloGroupLink, isActive
- users: id, name, email, phone, password, role (ADMIN/BROKER/LANDLORD/CUSTOMER), isActive, setupComplete
- accounts: id, userId, type, provider, providerAccountId (OAuth accounts)
- properties: id, companyId?, landlordId, name, fullAddress, district, streetName, zaloPhone, landlordNotes, parkingCar, evCharging, petAllowed, foreignerOk, status (PENDING/APPROVED/REJECTED)
- room_types: id, propertyId, name, typeName (don/gac_xep/1k1n/2k1n/studio/duplex), areaSqm, priceMonthly, deposit, description, amenities[], images[], totalUnits, availableUnits, availableRoomNames, isAvailable, isApproved, commissionJson, shortTermAllowed, shortTermMonths, shortTermPrice, landlordNotes, viewCount
- deals: id, roomTypeId, brokerId, dealPrice, commissionTotal, commissionBroker, commissionCompany, status (PENDING/CONFIRMED/PAID/CANCELLED)
- share_links: id, roomTypeId?, brokerId, token (unique), viewCount, isSystem, isActive, expiresAt
- room_inquiries: id, roomTypeId, brokerId, message, reply (CÒN/HẾT), repliedAt
- notifications: id, userId, type, title, message, isRead
- settings: key-value (commission_broker_percent)

## Logic nghiệp vụ RoomType
- RoomType = 1 loại phòng (VD: "Phòng đơn 25m²"), KHÔNG phải 1 phòng cụ thể
- Mỗi RoomType có totalUnits (tổng) và availableUnits (trống), availableRoomNames (tên phòng trống cụ thể)
- Khi deal CONFIRMED → availableUnits giảm 1, nếu =0 thì isAvailable=false
- shortTermAllowed: cho phép thuê ngắn hạn với giá shortTermPrice

## Phân quyền dữ liệu
- Môi giới: thấy fullAddress + SĐT/Zalo chủ nhà + hoa hồng + lưu ý
- Khách (qua share link): chỉ thấy district, streetName, amenities — KHÔNG thấy fullAddress, SĐT
- Chủ nhà: tự set commissionJson, zaloPhone, landlordNotes, bật/tắt isAvailable
- Admin: thấy tất cả, duyệt property/roomType, xác nhận deal

## Quy tắc khi sửa code
- CSS: dùng Tailwind classes, custom classes trong app/globals.css (btn-primary, input-field, card, badge, stat-card, sidebar-link...)
- Font: Be Vietnam Pro (body), Space Grotesk (headings)
- Color: brand-50 đến brand-950 (xanh dương), stone-50 đến stone-900 (neutral)
- API: tất cả dùng getServerSession(authOptions) để check role
- Format tiền: dùng formatCurrency() từ lib/utils.ts
- Toast: dùng react-hot-toast (toast.success, toast.error)
- Mỗi lần thay đổi tính năng → cập nhật file README.md cho đồng bộ

## Excel Import/Export (Admin > Quản lý phòng)
- Thư viện: xlsx (SheetJS)
- Tải form mẫu: client-side, tạo file .xlsx 2 sheet (dữ liệu mẫu + hướng dẫn)
- Import: upload .xlsx → parse client-side → preview bảng + validate → POST /api/rooms/import (bulk create)
- Export: client-side, xuất filteredRooms ra .xlsx (có thể filter trước rồi export)
- Import tự match tòa nhà theo tên + quận, nếu chưa có → tạo mới (PENDING)

## SWR Hooks (hooks/useData.ts)
- useProperties(), useRoomTypes(), useDeals(), useUsers(), useShareLinks(), useCompanies(), useDashboardStats(), useInquiries()
- Tất cả return: { data, error, isLoading, mutate, pagination? }
- Options: revalidateOnFocus=false, dedupingInterval=10s, keepPreviousData=true
- Dùng fetcher từ lib/fetcher.ts

## Pagination (lib/pagination.ts)
- getPaginationParams(url): lấy page, limit, skip từ URL searchParams
- paginatedResponse(data, total, page, limit): trả về { data, pagination: { page, limit, total, totalPages } }
- Component Pagination ở components/ui/Pagination.tsx

## Validation (lib/validations.ts)
- Zod schemas: registerSchema, propertyCreateSchema, roomTypeCreateSchema, dealCreateSchema, shareLinkCreateSchema, settingsSchema
- validateBody(schema, body): return { success, data?, error? }
- Dùng trong API routes trước khi xử lý

## Rate Limiting (lib/rate-limit.ts)
- applyRateLimit(req, type): type = 'api' (60 req/min) hoặc 'auth' (10 req/min)
- Return NextResponse 429 nếu vượt limit, undefined nếu OK
- Dùng ở đầu mỗi API route handler

## SEO & PWA
- app/layout.tsx: metadata mặc định với title template '%s | MixStay'
- app/share/[token]/page.tsx: generateMetadata() dynamic OG tags (ảnh, giá, khu vực)
- app/share/system/[token]/page.tsx: generateMetadata() cho kho phòng
- app/sitemap.ts, app/robots.ts
- public/manifest.json, public/icon-*.svg

## Skeleton Loading (components/ui/Skeleton.tsx)
- SkeletonCard, SkeletonTable, SkeletonStats, SkeletonText, SkeletonCardGrid, SkeletonList
- Dùng thay thế text "Đang tải..." trong tất cả dashboard pages

## Lệnh thường dùng
- `npm run dev` → chạy dev server (localhost:3000)
- `npx prisma db push` → đồng bộ schema lên database
- `npx prisma generate` → generate Prisma client
- `npm run db:seed` → seed demo data
- `npx prisma studio` → mở GUI xem database
