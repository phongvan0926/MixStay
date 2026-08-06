# CLAUDE.md - Hướng dẫn cho Claude Code

## 🚀 LỆNH TẮT: người dùng gõ `MIX`
Khi người dùng gõ đúng `MIX` (hoặc `MIX <việc cần làm>`), TRƯỚC KHI trả lời phải làm ngay:
1. Chạy `bash scripts/ai-start.sh` (git status + git log + pull ff-only) và đọc kết quả.
2. Đọc kỹ TOÀN BỘ file này (CLAUDE.md ≡ AGENTS.md), mục Changelog MỚI NHẤT trong `README.md`, và `prisma/schema.prisma`.
3. Tuân thủ mọi QUY TẮC + AN TOÀN trong file cho tới hết phiên (xem mục "Cộng tác nhiều AI agent" và "Quy tắc khi sửa code").
4. Nếu có `<việc>` kèm theo → làm luôn. Nếu không → tóm tắt 2–3 dòng xác nhận đã nắm rồi chờ việc.
→ Mục đích: 1 từ duy nhất để mọi AI (Claude/Codex/Antigravity) tự onboard, người dùng không phải nhắc lại ngữ cảnh.

## Dự án
MixStay Manager v2 - Nền tảng phân phối & quản lý chung cư mini.
Kết nối 4 vai trò: Admin (Công ty), Cộng tác viên (CTV), Chủ nhà, Khách thuê.

## Tech stack
- Next.js 14 + React 18 + Tailwind CSS
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth.js (JWT, multi-role: ADMIN, ADMIN_STAFF, BROKER, LANDLORD, CUSTOMER)
- Deploy: Vercel

## Cấu trúc quan trọng
```
app/page.tsx        → Trang chủ public: hero + bộ lọc + grid phòng trống công khai (PublicSearch)
app/PublicSearch.tsx → Client component tìm kiếm phòng public cho trang chủ
app/phong/          → Trang xem TOÀN BỘ phòng mới nhất (public, PublicSearch autoLoad) + khối liên kết quận/trường ở chân trang
app/tin/[id]/       → Trang chi tiết tin CÔNG KHAI theo id (không cần login/token). Dùng chung ShareViewClient. Có JSON-LD `Product`+`Offer` (giá VND theo THÁNG qua UnitPriceSpecification, availability theo trạng thái phòng) + canonical → Google hiện giá/ảnh trong kết quả tìm kiếm
app/p/[token]/      → Short share link (/p/{token}) → redirect sang /share/[token] hoặc /share/system/[token]
app/admin/          → Trang quản trị (companies, properties, rooms, deals, users, settings)
app/admin/dashboard/ → TRUNG TÂM ĐIỀU HÀNH của admin (tách khỏi trang Tòa nhà): thẻ Việc cần làm (khách xin xem phòng / tin–tòa–công ty chờ duyệt / hỏi phòng / tin thiếu ảnh), sức khoẻ kho, nhịp đăng tin 8 tuần, top công ty. Dữ liệu từ 1 endpoint /api/admin/overview. Trả lời hỏi phòng của CTV ngay tại đây (CÒN/HẾT/Bỏ qua)
app/broker/         → Trang cộng tác viên (inventory, leads, saved, deals, stats, share-links, profile)
app/landlord/       → Trang chủ nhà (properties — đã gộp quản lý phòng vào trang tòa nhà — + share-links)
app/share/[token]/  → Trang tin đăng loại phòng (public, ẩn địa chỉ + SĐT, có video + tin đăng liên quan)
app/share/system/[token]/ → Trang kho phòng hệ thống (public, có toggle grid/list view)
app/ban-do/         → Bản đồ tìm phòng public (Leaflet + OSM; zoom xa gom theo quận, zoom gần pin từng tòa "giá từ"; KHÔNG hiện số nhà — redact như API public). Ghim vị trí BẤT KỲ (ô tìm + autocomplete gộp trường ĐH local + geocode server, nút 🎯 Định vị, click map) + bán kính nấc 500m lọc/tô nổi bật tòa quanh điểm ghim
app/auth/callback/  → Trang chọn vai trò sau OAuth login lần đầu
app/da-luu/         → SO SÁNH tin đã lưu của KHÁCH VÃNG LAI (❤ localStorage, KHÔNG cần đăng nhập — lib/saved-guest.ts): thẻ tin + bảng so sánh giá/giá m²/cọc/tiện ích khi ≥2 tin; fetch /api/rooms/public/[id]?noview=1 (không tăng viewCount). Nút tim: components/public/SaveHeart.tsx (thẻ tin + trang chi tiết); thanh nổi: CompareBar.tsx
app/thue-phong-tro/ → TRANG ĐÍCH SEO theo QUẬN (hub `/thue-phong-tro` + `/thue-phong-tro/[district]`, VD /thue-phong-tro/cau-giay). Server-render + ISR 30 phút, số liệu thật (số tin/tòa/khoảng giá/cọc), lọc nhanh giá+loại phòng, 24 tin, FAQ + JSON-LD (BreadcrumbList/ItemList/FAQPage)
app/phong-tro-gan/  → TRANG ĐÍCH SEO theo TRƯỜNG ĐH (hub `/phong-tro-gan` + `/phong-tro-gan/[uni]`, VD /phong-tro-gan/bach-khoa). Tin trong bán kính 3km quanh trường, xếp gần nhất trước, mỗi thẻ ghi "cách ~X km" (toạ độ KHÔNG ra HTML)
app/api/            → API routes (companies, properties, properties/duplicate-check, rooms, rooms/public, rooms/related, rooms/import, rooms/map, deals, deals/stats, users, users/stats, geocode, ai/parse-listing, ai/listing, ai/search, share-links, share-links/system, inquiries, notifications, saved-searches, broker/stats, cron/lifecycle, settings, upload, upload/signed-url, viewing-requests, poster/[id], og/[id], admin/overview, saved-listings, me/company)
app/api/ai/search/  → Tìm phòng NGÔN NGỮ TỰ NHIÊN: câu khách gõ → Gemini bóc thành bộ lọc (district/type/giá/uni/flags) — client đổ vào form, KHÔNG tự tìm
app/api/rooms/public → hỗ trợ ?sort=price_asc|price_desc|newest|area_desc + ?uni=<short HANOI_UNIVERSITIES> — tính khoảng cách server-side (KHÔNG trả lat/lng), sort gần nhất, trả distanceKm
app/api/me/company   → GET công ty của chủ nhà (kèm canEdit) + PUT cho chủ nhà TỰ sửa logo/liên hệ công ty DO MÌNH TẠO (createdById); tên/mã/duyệt vẫn của admin
app/api/users/me     → GET/PUT hồ sơ cá nhân: name, phone, avatar (ảnh hiện ở topbar + đầu mọi link share)
app/broker/profile + app/landlord/profile → trang hồ sơ (ảnh đại diện + SĐT); trang landlord kèm ô đổi LOGO CÔNG TY
app/api/saved-searches → "Săn phòng": khách (không cần tài khoản) để lại tiêu chí + SĐT; tin mới DUYỆT khớp → notification cho ADMIN (xem PUT /api/rooms); admin quản lý ở /admin/leads
app/api/cron/lifecycle → Vercel Cron 8h VN hằng ngày (vercel.json): UPCOMING đến hạn → tự AVAILABLE + báo chủ nhà; tin 30 ngày không cập nhật → nhắc chủ nhà xác nhận (chỉ nhắc 1 lần khi chạm mốc)
app/api/broker/stats + app/broker/stats → thống kê cá nhân CTV: hoa hồng, hạng tháng (ẩn danh người khác), chuỗi 6 tháng, views share link
app/api/viewing-requests/ → "Đặt lịch xem phòng": POST CÔNG KHAI (khách để lại SĐT trên 1 tin cụ thể; ghi công CTV suy từ SHARE TOKEN phía server, KHÔNG tin brokerId client gửi) + GET/PUT cho admin (mọi lead) & CTV (chỉ lead của mình). Báo thông báo cho CTV giữ link + toàn bộ admin
app/broker/leads/   → CTV xem khách xin xem phòng đến từ link CỦA MÌNH, đổi trạng thái NEW→CONTACTED→DONE
app/admin/leads/    → Admin xem khách để lại SĐT, 2 tab: "Xin xem phòng" (ViewingRequest, có cột Nguồn = CTV nào) + "Săn phòng" (SavedSearch). Đọc ?tab= bằng useSearchParams + Suspense
components/public/ViewingRequestForm.tsx → Ô "Đặt lịch xem phòng" gắn trong ShareViewClient (dùng chung cho /share/[token], /p/[token], /tin/[id], kho công ty)
app/api/upload/signed-url/ → Tạo Supabase signed upload URL (upload video trực tiếp client → Storage, không qua Vercel serverless)
app/api/ai/parse-listing/ → "Tạo tin nhanh AI": dán tin FB/Zalo → Gemini structured output bóc property+room+match tòa có sẵn (client đổ vào RoomTypeForm, KHÔNG auto-lưu)
app/api/rooms/map/  → Dữ liệu bản đồ public (tòa APPROVED có toạ độ + tin hiệu lực; redactName/redactHouseNumber; cache 5 phút)
app/api/poster/[id]/ → ẢNH BÌA đăng Facebook/Zalo 1080×1350 (next/og + font Be Vietnam Pro ở public/fonts) — in sẵn giá/diện tích/khu vực/mã tin lên ảnh. KHÁC /api/og/[id] (1200×630, không chữ, cho thumbnail link chat)
lib/social-post.ts  → buildSocialPost(): caption mạng xã hội (tiêu đề bắt mắt + điểm nhấn + link + hashtag theo quận). Khác lib/listing-text.ts (bản copy đầy đủ, không hashtag)
components/ui/PostExportModal.tsx → Modal "Đăng Facebook/Zalo": xem trước + tải ảnh bìa, caption sửa được rồi copy. Dùng ở /broker/inventory (tự tạo link share của CTV để lead ghi công đúng người) và /admin/rooms (dùng link công khai /tin/[id])
app/api/geocode/    → Proxy Nominatim server-side cho ô ghim vị trí bản đồ (tránh CORS/rate-limit client; cache 24h; có applyRateLimit)
app/api/properties/duplicate-check/ → Admin: mỗi tòa PENDING trả danh sách tòa APPROVED nghi trùng (tên gần giống cùng quận HOẶC toạ độ <150m) — cảnh báo trước khi duyệt
app/api/users/stats/ + app/api/deals/stats/ → Số liệu TỔNG toàn nền tảng (groupBy) cho thẻ thống kê — KHÔNG cộng theo trang; deals/stats gate VIEW_FINANCIAL_REPORTS
components/ai/AIQuickCreate.tsx → Nút + modal "⚡ Tạo tin nhanh AI" (paste → parse → chọn/tạo tòa → mở RoomTypeForm điền sẵn) — dùng ở admin/rooms + landlord/properties
lib/gemini.ts       → Helper gọi Gemini server-side dùng chung (getGeminiKeys xoay nhiều key khi 429, callGemini)
lib/geocode.ts      → geocodeAddress() Nominatim/OSM server-only (query kèm quận tránh pin nhầm khu) — POST/PUT properties + import Excel tự geocode khi thiếu toạ độ (fail không chặn lưu)
lib/ai-listing-styles.ts → AI_LISTING_STYLES: các phong cách viết tin (ngắn gọn / chuyên nghiệp / …) cho nút "AI hỗ trợ chuẩn hoá tin đăng" — client render nút bằng key+label, server dựng prompt bằng instruction (dùng ở components/forms/AiListingAssistant.tsx + app/api/ai/listing)
lib/room-status.ts  → reconcileAvailability(): nắn `status` ↔ `availableUnits` cho KHÔNG mâu thuẫn (gõ số trống về 0 → tự 🔴 Hết phòng; bấm 🟢 khi số đang 0 → cho 1 phòng; bấm 🔴 → dọn số về 0; 🟡 UPCOMING không đụng). Tham số `changed` = "ĐỔI sang giá trị mới", KHÔNG phải "có gửi field lên" — vì kho còn 142 tin 🔴 cũ vẫn có availableUnits > 0, nếu nắn theo "có gửi" thì mọi lần lưu tin sẽ đăng lại cả 142 tin đã cho thuê xong. Dùng ở POST+PUT /api/rooms + RoomTypeForm
lib/listing-options.ts → AMENITY_OPTIONS + ROOM_TYPE_OPTIONS dùng chung form + AI enum (client-safe)
lib/listing-code.ts → LISTING_CODE_REGEX, normalizeListingCode, formatListingCode (ghép mã công ty MS-066-XXXXXX — DISPLAY, không đổi listingCode gốc), parseComposedListingCode, normalizeCompanyCode
lib/seo-locations.ts → Client-safe: slugify, SEO_DISTRICTS/SEO_UNIS (slug URL đặt tay theo cụm từ khách gõ), districtPath/uniPath, PRICE_BANDS, TYPE_LABEL, SITE_URL, UNI_RADIUS_KM=3
lib/seo-listings.ts → SERVER-ONLY (prisma): getDistrictPageData/getUniPageData/getDistrictCounts/getUniCounts + PUBLIC_ROOM_WHERE. Xen kẽ tin theo TÒA và đẩy tin trùng tiêu đề xuống dưới để trang không trông như tin rác; mọi dữ liệu ra ngoài đều redact số nhà
components/public/  → ListingCard.tsx + SeoLinks.tsx + Thẻ tin render sẵn phía server cho trang đích + khối liên kết quận/trường gắn ở chân trang chủ, /phong và mọi trang đích (đường cho Google đi tới trang đích)
app/layout.tsx      → 🚨 metadata.verification.google + public/google1b741701c683e2a6.html = XÁC MINH Google Search Console (tài khoản phongvan0926@gmail.com). KHÔNG XOÁ — xoá là mất xác minh + mất dữ liệu Search Console
app/sitemap.ts      → Sitemap ĐỘNG (cache 1h): trang tĩnh + 12 quận + 18 trường + TỪNG tin /tin/[id] kèm lastModified. Trước đây chỉ có 3 URL nên tin đăng không có đường vào từ Google
lib/hanoi-locations.ts → HANOI_DISTRICTS, INNER_CITY/OUTER_DISTRICTS, HANOI_UNIVERSITIES (18 trường lớn cho bản đồ), findDistrictForStreet
scripts/geocode-properties.js → Backfill lat/long tòa cũ từ địa chỉ (1 req/s, --force để chạy lại tất cả); geocode-properties-pass2.js (làm sạch địa chỉ bẩn); geocode-fix-outliers.js (rà + sửa pin đặt sai quận, viewbox bounded); geocode-audit-pins.js (audit pin theo TUYẾN PHỐ của chính tòa — pin lệch >3km khỏi phố mình thì ghim lại, bắt được ca lệch nhỏ mà fix-outliers lọt)
scripts/backup-storage.js → BACKUP kho ảnh/video Supabase Storage về Ổ SSD SAMSUNG 120GB gắn trong máy — `/srv/data/MixStay/storage` (backup của Supabase KHÔNG gồm file Storage!). DỪNG hẳn nếu ổ chưa mount (tránh ghi nhầm làm đầy ổ hệ thống). Tăng dần (bỏ qua file đã đủ dung lượng), chỉ đọc, ghi manifest.json. `--check` đối chiếu không tải, `--dest <thư mục>` đổi đích. scripts/install-backup-cron.sh cài lịch 3h sáng HẰNG NGÀY (`--remove` để gỡ) — hằng ngày chứ không hằng tuần vì crontab user KHÔNG được anacron chạy bù, máy tắt đúng giờ hẹn là mất lượt đó. LƯU Ý: `/srv/data/backup` là repo restic của hệ thống — KHÔNG đụng vào
components/layout/  → DashboardLayout.tsx (sidebar + topbar + notification badge), AuthProvider.tsx
components/ui/      → Skeleton, ImageUpload, VideoUpload, VideoLinkInput, VideoPlayer, VideoGallery, OptimizedImage, Pagination, DistrictPills, PriceRangeSlider, ZaloFab, CallFab, Logo, Avatar, AvatarUpload, Combobox, SearchableSelect, InstallPWA, PhoneRequiredNotice, ListingActionBar (⚠️ công cụ CTV: tải ảnh/copy nội dung), ListingImageGallery, ListingImageMosaic, PostExportModal
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
lib/address.ts      → 🔒 ẨN SỐ NHÀ khỏi mọi trang công khai: redactHouseNumber(), publicAddress(), redactName(), extractHouseNumber(). Có collapseDoubled() gộp địa chỉ bị dán N lần, cắt LẶP số nhà ở đầu, và QUY TẮC CHUỖI NGÕ: địa chỉ đã ghi số nhà tường minh ("Số 4 Ngõ 103/2/5") → giữ nguyên chuỗi; chưa có số nhà nào ("Ngõ 103/2/5") → đoạn CUỐI là số nhà, cắt bỏ
lib/saved-guest.ts  → localStorage lưu tin cho KHÁCH VÃNG LAI (getSavedIds/toggleSaved/removeSaved/onSavedChange, tối đa 30 tin) — nguồn dữ liệu cho SaveHeart, CompareBar, /da-luu
lib/listing-text.ts → buildListingText(): bản copy ĐẦY ĐỦ 1 tin để dán sang Zalo cá nhân (khác lib/social-post.ts có hashtag cho mạng xã hội)
lib/og.ts           → ogImage()/ogDefaultImage()/largeCard — dựng URL tuyệt đối cho og:image theo host request (dùng headers(); KHÔNG dùng ở trang cần ISR)
lib/user-company.ts → getUserCompany() — resolve company của user (cho topbar + share link)
lib/zalo.ts         → Resolve link Zalo (company zaloGroupLink → landlord phone → env → fallback)
lib/supabase.ts     → Supabase client (storage upload ảnh/video)
prisma/schema.prisma → 15 bảng: users, accounts, sessions, companies, properties, room_types, deals, share_links, room_inquiries, notifications, settings, verification_tokens, saved_listings (khách/CTV lưu/bookmark tin — SavedListing), saved_searches (khách "săn phòng": tiêu chí + SĐT, isActive, lastMatchedAt — SavedSearch), viewing_requests (khách "đặt lịch xem phòng" trên 1 tin cụ thể: phone, name?, note?, brokerId? ghi công CTV, source, status NEW/CONTACTED/DONE/CANCELLED — ViewingRequest)
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
- room_inquiries: id, roomTypeId, brokerId, message, reply (CÒN/HẾT), repliedAt, dismissedAt (admin bấm "Bỏ qua" ở Tổng quan — ẩn khỏi việc cần làm mà KHÔNG báo CTV)
- viewing_requests: id, roomTypeId, brokerId? (ghi công CTV — suy từ share token PHÍA SERVER), companyId?, name?, phone, note?, source (share/system/company/tin), status (NEW/CONTACTED/DONE/CANCELLED)
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
- Cộng tác viên (CTV): thấy fullAddress + SĐT/Zalo chủ nhà + hoa hồng + lưu ý
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
- **🔒 ẨN SỐ NHÀ — luật bất di bất dịch:** mọi thứ hiển thị cho KHÁCH (trang `/tin/[id]`, `/share/*`, `/phong`, trang đích SEO, bản đồ, API `rooms/public`, `rooms/map`, ảnh bìa `poster`) đều PHẢI đi qua `redactHouseNumber()` / `publicAddress()` / `redactName()` trong `lib/address.ts`. TUYỆT ĐỐI không trả `fullAddress`, `latitude`, `longitude`, `zaloPhone`, `availableRoomNames` ra client công khai. Thêm trường mới có địa chỉ → nhớ redact.
- **Chuỗi ngõ nhiều cấp:** `Số 4 Ngõ 103/2/5` (đã có số nhà tường minh) → giữ nguyên chuỗi ngõ; `Ngõ 103/2/5` (không có số nhà nào) → đoạn cuối chính là số nhà, phải cắt. Logic ở `redactHouseNumber()`, đã có bộ ca kiểm thử trong changelog v9.39.
- **Trạng thái phòng ↔ số phòng trống:** mọi đường ghi `status`/`availableUnits` PHẢI đi qua `reconcileAvailability()` (`lib/room-status.ts`). Không bao giờ để `AVAILABLE` + `availableUnits = 0` lọt vào DB — thẻ tin sẽ in "Còn 0 phòng" cho khách và JSON-LD khai `InStock` sai. Nắn theo **field người dùng vừa ĐỔI**, không phải field "có gửi lên" (kho còn 142 tin 🔴 cũ có `availableUnits > 0`, nắn sai là đăng lại hết).
- **Tiêu đề trang:** `app/layout.tsx` đã có `title.template: '%s | MixStay'` → KHÔNG tự nối thêm `| MixStay` trong `generateMetadata` (từng ra "… | MixStay | MixStay").
- **🚨 KHÔNG xoá** `metadata.verification.google` trong `app/layout.tsx` và `public/google1b741701c683e2a6.html` — mất xác minh Google Search Console.
- Mỗi lần thay đổi tính năng → cập nhật `README.md` (Changelog + mục Tính năng nếu có) VÀ `CLAUDE.md`/`AGENTS.md` cho đồng bộ

## Cộng tác nhiều AI agent (Claude Code + Antigravity/Codex...)
Repo này có NHIỀU AI agent cùng làm việc trên cùng thư mục, cùng commit lên `main`. Quy tắc bắt buộc:
- **🔴 ĐẦU MỖI VIỆC, CHẠY LỆNH NÀY TRƯỚC TIÊN:** `bash scripts/ai-start.sh` — nó in `git status` (file AI trước chưa commit) + `git log` (ai vừa đụng gì) + tự `git pull --ff-only` an toàn. Đọc kết quả rồi mới làm. (Claude Code tự chạy qua hook SessionStart; Codex/Antigravity hãy chủ động chạy.)
- **Trước khi bắt đầu việc mới:** (đã gộp vào script trên) xem `git log` các commit mình không tạo — file định sửa có thể vừa bị agent khác đổi. KHÔNG revert/ghi đè thay đổi của agent khác trừ khi chủ dự án yêu cầu.
- **Changelog dùng chung:** đánh số version nối tiếp trong README.md (dòng mới nhất trên cùng), dù là agent nào làm. Xem version mới nhất trong Changelog trước khi thêm.
- **AGENTS.md là bản sao của CLAUDE.md** (chỉ khác dòng tiêu đề): sửa 1 trong 2 file thì PHẢI đồng bộ file kia — 2 file lệch nhau từng làm agent dùng lại field đã xoá (`isAvailable`).
- **Commit ngay sau khi xong việc** (working tree sạch) để agent khác không dính conflict với thay đổi dở dang. **Trước khi commit chạy `npx tsc --noEmit` + `npm run build`** cho sạch.
- KHÔNG commit `.env` / `.env.local`; `npx prisma db push` đụng DB PRODUCTION dùng chung — chỉ thêm cột nullable/có default, không xoá/đổi kiểu cột.
- **KHÔNG chạy script sửa/xoá dữ liệu PRODUCTION bừa** — tuyệt đối tránh `deleteMany({})` không điều kiện (đã từng xoá nhầm toàn bộ notifications). HỎI chủ dự án trước khi đụng dữ liệu production; việc khó hoàn tác (push, xoá dữ liệu, đổi schema) → xác nhận trước.

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
