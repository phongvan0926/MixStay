# CLAUDE.md - Hướng dẫn cho Claude Code

## Dự án
MixStay Manager v2 - Nền tảng phân phối & quản lý chung cư mini.
Kết nối 4 vai trò: Admin (Công ty), Môi giới, Chủ nhà, Khách thuê.

## Tech stack
- Next.js 14 + React 18 + Tailwind CSS
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth.js (JWT, multi-role: ADMIN, ADMIN_STAFF, BROKER, LANDLORD, CUSTOMER)
- Deploy: Vercel

## Cấu trúc quan trọng
```
app/page.tsx        → Trang chủ public: hero + bộ lọc + grid phòng trống công khai (PublicSearch)
app/PublicSearch.tsx → Client component tìm kiếm phòng public cho trang chủ
app/p/[token]/      → Short share link (/p/{token}) → redirect sang /share/[token] hoặc /share/system/[token]
app/admin/          → Trang quản trị (companies, properties, rooms, deals, users, settings)
app/broker/         → Trang môi giới (inventory, deals, share-links)
app/landlord/       → Trang chủ nhà (properties — đã gộp quản lý phòng vào trang tòa nhà — + share-links)
app/share/[token]/  → Trang tin đăng loại phòng (public, ẩn địa chỉ + SĐT, có video + tin đăng liên quan)
app/share/system/[token]/ → Trang kho phòng hệ thống (public, có toggle grid/list view)
app/ban-do/         → Bản đồ tìm phòng public (Leaflet + OSM; zoom xa gom theo quận, zoom gần pin từng tòa "giá từ"; KHÔNG hiện số nhà — redact như API public). Ghim vị trí BẤT KỲ (ô tìm + autocomplete gộp trường ĐH local + geocode server, nút 🎯 Định vị, click map) + bán kính nấc 500m lọc/tô nổi bật tòa quanh điểm ghim
app/auth/callback/  → Trang chọn vai trò sau OAuth login lần đầu
app/api/            → API routes (companies, properties, properties/duplicate-check, rooms, rooms/public, rooms/related, rooms/import, rooms/map, deals, deals/stats, users, users/stats, geocode, ai/parse-listing, ai/listing, share-links, share-links/system, inquiries, notifications, settings, upload/signed-url)
app/api/upload/signed-url/ → Tạo Supabase signed upload URL (upload video trực tiếp client → Storage, không qua Vercel serverless)
app/api/ai/parse-listing/ → "Tạo tin nhanh AI": dán tin FB/Zalo → Gemini structured output bóc property+room+match tòa có sẵn (client đổ vào RoomTypeForm, KHÔNG auto-lưu)
app/api/rooms/map/  → Dữ liệu bản đồ public (tòa APPROVED có toạ độ + tin hiệu lực; redactName/redactHouseNumber; cache 5 phút)
app/api/geocode/    → Proxy Nominatim server-side cho ô ghim vị trí bản đồ (tránh CORS/rate-limit client; cache 24h; có applyRateLimit)
app/api/properties/duplicate-check/ → Admin: mỗi tòa PENDING trả danh sách tòa APPROVED nghi trùng (tên gần giống cùng quận HOẶC toạ độ <150m) — cảnh báo trước khi duyệt
app/api/users/stats/ + app/api/deals/stats/ → Số liệu TỔNG toàn nền tảng (groupBy) cho thẻ thống kê — KHÔNG cộng theo trang; deals/stats gate VIEW_FINANCIAL_REPORTS
components/ai/AIQuickCreate.tsx → Nút + modal "⚡ Tạo tin nhanh AI" (paste → parse → chọn/tạo tòa → mở RoomTypeForm điền sẵn) — dùng ở admin/rooms + landlord/properties
lib/gemini.ts       → Helper gọi Gemini server-side dùng chung (getGeminiKeys xoay nhiều key khi 429, callGemini)
lib/geocode.ts      → geocodeAddress() Nominatim/OSM server-only (query kèm quận tránh pin nhầm khu) — POST/PUT properties + import Excel tự geocode khi thiếu toạ độ (fail không chặn lưu)
lib/listing-options.ts → AMENITY_OPTIONS + ROOM_TYPE_OPTIONS dùng chung form + AI enum (client-safe)
lib/listing-code.ts → LISTING_CODE_REGEX, normalizeListingCode, formatListingCode (ghép mã công ty MS-066-XXXXXX — DISPLAY, không đổi listingCode gốc), parseComposedListingCode, normalizeCompanyCode
lib/hanoi-locations.ts → HANOI_DISTRICTS, INNER_CITY/OUTER_DISTRICTS, HANOI_UNIVERSITIES (18 trường lớn cho bản đồ), findDistrictForStreet
scripts/geocode-properties.js → Backfill lat/long tòa cũ từ địa chỉ (1 req/s, --force để chạy lại tất cả); geocode-properties-pass2.js (làm sạch địa chỉ bẩn); geocode-fix-outliers.js (rà + sửa pin đặt sai quận, viewbox bounded)
components/layout/  → DashboardLayout.tsx (sidebar + topbar + notification badge), AuthProvider.tsx
components/ui/      → Skeleton.tsx, ImageUpload.tsx, VideoUpload.tsx, VideoLinkInput.tsx, VideoPlayer.tsx, VideoGallery.tsx, OptimizedImage.tsx, Pagination.tsx, DistrictPills.tsx, PriceRangeSlider.tsx, ZaloFab.tsx
components/forms/   → PropertyForm.tsx, RoomTypeForm.tsx, RoomForm.tsx, QuickRoomTypeForm.tsx
lib/video-utils.ts  → Parse YouTube/TikTok/Facebook URL, lấy videoId, thumbnail (img.youtube.com cho YT), detect platform
hooks/useData.ts    → SWR hooks: useProperties, useRoomTypes, useDeals, useUsers, useShareLinks, useCompanies, useDashboardStats, useInquiries
lib/auth.ts         → NextAuth config
lib/prisma.ts       → Prisma client singleton
lib/utils.ts        → Helpers: formatCurrency, formatDate, getStatusColor...
lib/fetcher.ts      → SWR fetcher function
lib/pagination.ts   → getPaginationParams(), paginatedResponse()
lib/rate-limit.ts   → applyRateLimit() — in-memory rate limiter
lib/validations.ts  → Zod schemas + validateBody()
lib/permissions.ts  → Client-safe RBAC: hasPermission(), ALL_ADMIN_PERMISSIONS (ADMIN bypass, ADMIN_STAFF cần permission)
lib/permissions-server.ts → requirePermission() — API guard kiểm permission trước khi xử lý
lib/listing-code.ts → Client-safe: LISTING_CODE_REGEX, normalizeListingCode (mã tin đăng MS-XXXXXX)
lib/listing-code-server.ts → Server-only (crypto): generateListingCode, generateUniqueListingCode (retry chống trùng) — tách khỏi file client để không kéo crypto vào bundle
lib/user-company.ts → getUserCompany() — resolve company của user (cho topbar + share link)
lib/zalo.ts         → Resolve link Zalo (company zaloGroupLink → landlord phone → env → fallback)
lib/supabase.ts     → Supabase client (storage upload ảnh/video)
prisma/schema.prisma → 12 bảng: users, accounts, sessions, companies, properties, room_types, deals, share_links, room_inquiries, notifications, settings, verification_tokens
prisma/seed.ts      → Demo data (password: 123456)
prisma/backfill-listing-codes.ts → Backfill listingCode cho RoomType cũ (idempotent, chạy sau prisma db push)
middleware.ts       → Route protection theo role (+ chặn /admin/{companies,users,settings} theo permission cho ADMIN_STAFF)
```

## Database schema tóm tắt
- companies: id, name, description, phone, email, address, logo, zaloGroupLink, isActive, isApproved (mặc định true; chủ nhà tự tạo công ty → false = chờ admin duyệt), createdById, code (mã admin đặt VD "066" — chèn vào mã tin hiển thị MS-066-XXXXXX, unique ≤8 ký tự). DUYỆT công ty (`PUT isApproved:true`) tự set các tòa PENDING của công ty → APPROVED (tin đăng vẫn duyệt riêng)
  - Chủ nhà đăng tin chọn công ty (đang hoạt động + đã duyệt) HOẶC tạo công ty mới (chờ duyệt). `GET /api/companies?scope=active` (mọi user đã đăng nhập) trả công ty isActive+isApproved cho ô chọn; `POST /api/companies` cho LANDLORD tạo (isApproved=false) lẫn admin (isApproved=true); admin duyệt bằng `PUT {isApproved:true}` (tự bật isActive) ở /admin/companies. Hook `useActiveCompanies()`
- users: id, name, email, phone, password, role (ADMIN/ADMIN_STAFF/BROKER/LANDLORD/CUSTOMER), avatar, permissions[] (chỉ có hiệu lực khi role=ADMIN_STAFF), isActive, setupComplete
- accounts: id, userId, type, provider, providerAccountId (OAuth accounts)
- properties: id, companyId?, landlordId, name, fullAddress, district, streetName, zaloPhone, landlordNotes, parkingCar, parkingBike, evCharging, petAllowed, foreignerOk, status (PENDING/APPROVED/REJECTED)
- room_types: id, propertyId, name, listingCode? (mã tin "MS-XXXXXX" — @unique, bất biến, sinh tự động khi tạo; nullable cho dữ liệu cũ trước backfill), typeName (don/gac_xep/1k1n/2k1n/studio/duplex), areaSqm, priceMonthly, deposit, description, amenities[], images[], videos[] (URL upload Supabase, tối đa 3), videoLinks[] (YouTube/TikTok/Facebook embed), totalUnits, availableUnits, availableRoomNames, status (RoomStatus: AVAILABLE/UPCOMING/UNAVAILABLE), expectedAvailableDate (bắt buộc khi UPCOMING), isApproved, commissionJson, shortTermAllowed, shortTermMonths, shortTermPrice, landlordNotes, viewCount
- deals: id, roomTypeId, brokerId, dealPrice, commissionTotal, commissionBroker, commissionCompany, status (PENDING/CONFIRMED/PAID/CANCELLED)
- share_links: id, roomTypeId?, brokerId, token (unique), viewCount, isSystem, isActive, expiresAt
- room_inquiries: id, roomTypeId, brokerId, message, reply (CÒN/HẾT), repliedAt
- notifications: id, userId, type, title, message, isRead
- settings: key-value (commission_broker_percent)
- enum Role: ADMIN, ADMIN_STAFF, BROKER, LANDLORD, CUSTOMER
- enum Permission (9 quyền, chỉ áp dụng cho ADMIN_STAFF): APPROVE_LISTINGS, MANAGE_USERS, VIEW_FINANCIAL_REPORTS, EXPORT_DATA, MANAGE_COMPANIES, TRANSFER_PROPERTY_OWNERSHIP, DELETE_PROPERTY, EDIT_COMMISSION, MANAGE_SYSTEM_SHARE_LINKS

## Logic nghiệp vụ RoomType
- RoomType = 1 loại phòng (VD: "Phòng đơn 25m²"), KHÔNG phải 1 phòng cụ thể
- Mỗi RoomType có totalUnits (tổng) và availableUnits (trống), availableRoomNames (tên phòng trống cụ thể)
- Trạng thái phòng dùng `status` (RoomStatus): AVAILABLE 🟢 / UPCOMING 🟡 (sắp trống — cần expectedAvailableDate) / UNAVAILABLE 🔴. KHÔNG còn field `isAvailable` (đã bỏ từ v8.3)
- Khi deal CONFIRMED → availableUnits giảm 1, nếu =0 thì set status=UNAVAILABLE (🔴 Hết phòng)
- shortTermAllowed: cho phép thuê ngắn hạn với giá shortTermPrice
- `listingCode`: mã tin "MS-XXXXXX" (6 ký tự, bỏ 0/O/1/I/L), unique, BẤT BIẾN. Sinh server-side ở `POST /api/rooms` qua `generateUniqueListingCode()` (lib/listing-code-server.ts); client KHÔNG gửi/sửa được. Hiển thị badge + tìm kiếm (normalizeListingCode) ở admin/broker/landlord + trang share link

## Phân quyền dữ liệu
- Môi giới: thấy fullAddress + SĐT/Zalo chủ nhà + hoa hồng + lưu ý
- Khách (qua share link): chỉ thấy district, streetName, amenities — KHÔNG thấy fullAddress, SĐT
- Chủ nhà: tự set commissionJson, zaloPhone, landlordNotes, đổi status phòng (AVAILABLE/UPCOMING/UNAVAILABLE)
- Admin (ADMIN): super-admin — thấy tất cả, duyệt property/roomType, xác nhận deal, bypass mọi permission check
- Admin staff (ADMIN_STAFF): chỉ làm được hành động có trong User.permissions[]. Guard client `lib/permissions.ts` (hasPermission()) + API `lib/permissions-server.ts` (requirePermission()). Thiếu VIEW_FINANCIAL_REPORTS → field-strip: API vẫn trả key nhưng set null cho số liệu tài chính
- API gate (v8.5): companies/* → `MANAGE_COMPANIES`; settings/* (GET+POST) → `EDIT_COMMISSION`; đổi landlord Property → `TRANSFER_PROPERTY_OWNERSHIP` (đều ADMIN bypass). middleware chặn trang `/admin/{companies,users,settings}` theo permission
- Authz nền (v8.5): rooms POST/PUT/DELETE, properties POST, deals POST, inquiries PUT, notifications PUT đều check role + SỞ HỮU (không chỉ "đã đăng nhập"). LANDLORD chỉ thao tác tin/tòa của mình; chỉ ADMIN-family đổi được isApproved

## Quy tắc khi sửa code
- CSS: dùng Tailwind classes, custom classes trong app/globals.css (btn-primary, input-field, card, badge, stat-card, sidebar-link...)
- Font: Be Vietnam Pro (body), Space Grotesk (headings)
- Color: brand-50 đến brand-950 (xanh dương), stone-50 đến stone-900 (neutral)
- API: tất cả dùng getServerSession(authOptions) để check role
- Format tiền: dùng formatCurrency() từ lib/utils.ts
- Toast: dùng react-hot-toast (toast.success, toast.error)
- Mỗi lần thay đổi tính năng → cập nhật file README.md cho đồng bộ

## Cộng tác nhiều AI agent (Claude Code + Antigravity/Codex...)
Repo này có NHIỀU AI agent cùng làm việc trên cùng thư mục, cùng commit lên `main`. Quy tắc bắt buộc:
- **Trước khi bắt đầu việc mới:** `git pull` + xem `git log` các commit mình không tạo — file định sửa có thể vừa bị agent khác đổi. KHÔNG revert/ghi đè thay đổi của agent khác trừ khi chủ dự án yêu cầu.
- **Changelog dùng chung:** đánh số version nối tiếp trong README.md (dòng mới nhất trên cùng), dù là agent nào làm. Xem version mới nhất trong Changelog trước khi thêm.
- **AGENTS.md là bản sao của CLAUDE.md** (chỉ khác dòng tiêu đề): sửa 1 trong 2 file thì PHẢI đồng bộ file kia — 2 file lệch nhau từng làm agent dùng lại field đã xoá (`isAvailable`).
- **Commit ngay sau khi xong việc** (working tree sạch) để agent khác không dính conflict với thay đổi dở dang.
- KHÔNG commit `.env` / `.env.local`; `npx prisma db push` đụng DB PRODUCTION dùng chung — chỉ thêm cột nullable/có default, không xoá/đổi kiểu cột.

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

## Video Hybrid (upload + embed)
- 2 cách bổ sung video cho RoomType: **upload trực tiếp** (field `videos[]`) hoặc **nhúng link** (field `videoLinks[]`)
- `components/ui/VideoUpload.tsx`: upload tối đa 3 video qua signed URL → Supabase Storage bucket `videos` (bypass Vercel serverless 4.5MB limit)
- `app/api/upload/signed-url/route.ts`: gọi `supabase.storage.from('videos').createSignedUploadUrl()` trả URL + token, client PUT file trực tiếp
- `components/ui/VideoLinkInput.tsx`: nhập link YouTube/TikTok/Facebook, validate qua `lib/video-utils.ts` (parse videoId, detect platform)
- `components/ui/VideoPlayer.tsx`: lazy load — chỉ load iframe/player khi user click thumbnail (tiết kiệm bandwidth); responsive 16:9
- `components/ui/VideoGallery.tsx`: gộp hiển thị cả `videos[]` và `videoLinks[]` trên trang tin đăng (thumbnails + click để phát)
- Thumbnail tự động: YouTube lấy từ `img.youtube.com/vi/{id}/hqdefault.jpg` (không cần API key); TikTok/Facebook dùng icon placeholder (không có free API)
- `lib/video-utils.ts`: `getYouTubeId()`, `getTikTokId()`, `getFacebookVideoId()`, `getVideoThumbnail()`, `getVideoPlatform()`, `getEmbedUrl()`
- API `rooms/public` chỉ trả `videoLinks[]` + `hasVideo` boolean (KHÔNG trả `videos[]` để giảm payload); share-links trả đầy đủ `videos[]` + `videoLinks[]`

## Skeleton Loading (components/ui/Skeleton.tsx)
- SkeletonCard, SkeletonTable, SkeletonStats, SkeletonText, SkeletonCardGrid, SkeletonList
- Dùng thay thế text "Đang tải..." trong tất cả dashboard pages

## Lệnh thường dùng
- `npm run dev` → chạy dev server (localhost:3000)
- `npx prisma db push` → đồng bộ schema lên database
- `npx prisma generate` → generate Prisma client
- `npm run db:seed` → seed demo data
- `npx prisma studio` → mở GUI xem database
