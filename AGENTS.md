# AGENTS.md - Hướng dẫn cho AI agents (Codex, Antigravity, Claude...)

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
app/page.tsx        → Trang chủ public: hero + bộ lọc (PublicSearch) + khối "Phòng nổi bật" (FeaturedRooms)
app/FeaturedRooms.tsx → Khối tin trang chủ, 3 TAB 🆕 Mới đăng / 💰 Giá tốt (?sort=deal) / 🔥 Xem nhiều (?sort=views_desc), cache theo tab. Thẻ hiện TIỆN ÍCH ĐẶC BIỆT của tòa giống thẻ ở /phong. Tab Giá tốt có badge "💰 Rẻ hơn N%" + dòng giải thích; trạng thái rỗng nói riêng (rỗng ≠ kho rỗng)
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
app/api/rooms/public → hỗ trợ ?sort=price_asc|price_desc|newest|area_desc|views_desc|**deal** + ?uni=<short HANOI_UNIVERSITIES> — tính khoảng cách server-side (KHÔNG trả lat/lng), sort gần nhất, trả distanceKm + viewCount + dealPercent
                       `?sort=deal` = "GIÁ TỐT" (rankDeals + medianByDistrict): rẻ hơn TRUNG VỊ QUẬN ≥10%, quận <5 tin thì bỏ, mỗi quận + mỗi TÒA 1 tin, chỉ tin có ảnh, luân phiên mỗi giờ; giới hạn nội thành CHỈ khi khách chưa tự chọn quận. Xem quy tắc "trung vị" bên dưới
app/api/me/company   → GET công ty của chủ nhà (kèm canEdit) + PUT cho chủ nhà TỰ sửa logo/liên hệ công ty DO MÌNH TẠO (createdById); tên/mã/duyệt vẫn của admin
app/api/users/me     → GET/PUT hồ sơ cá nhân: name, phone, avatar (ảnh hiện ở topbar + đầu mọi link share)
app/broker/profile + app/landlord/profile → trang hồ sơ (ảnh đại diện + SĐT); trang landlord kèm ô đổi LOGO CÔNG TY
app/api/saved-searches → "Săn phòng": khách (không cần tài khoản) để lại tiêu chí + SĐT; admin quản lý ở /admin/leads. KHỚP TIN 3 ĐƯỜNG qua lib/saved-search-match.ts: khách vừa đăng ký → quét NGƯỢC kho có sẵn ngay; tin mới duyệt → quét xuôi (PUT /api/rooms); cron quét lại hằng ngày (chỉ báo phần tin MỚI sau lần báo gần nhất). ?matchesFor=<id> trả danh sách tin khớp cho 1 khách
app/api/cron/lifecycle → Vercel Cron 8h VN hằng ngày (vercel.json): UPCOMING đến hạn → tự AVAILABLE + báo chủ nhà; tin 30 ngày không cập nhật → nhắc chủ nhà xác nhận (chỉ nhắc 1 lần khi chạm mốc); quét lại "săn phòng" → báo admin khách nào có tin mới khớp
app/api/broker/stats + app/broker/stats → thống kê cá nhân CTV: hoa hồng, hạng tháng (ẩn danh người khác), chuỗi 6 tháng, views share link
app/api/viewing-requests/ → "Đặt lịch xem phòng": POST CÔNG KHAI (khách để lại SĐT trên 1 tin cụ thể; ghi công CTV suy từ SHARE TOKEN phía server, KHÔNG tin brokerId client gửi) + GET/PUT cho admin (mọi lead) & CTV (chỉ lead của mình). Báo thông báo cho CTV giữ link + toàn bộ admin
app/broker/leads/   → CTV xem khách xin xem phòng đến từ link CỦA MÌNH, đổi trạng thái NEW→CONTACTED→DONE. Có chip "📅 Hẹn hôm nay/mai" (lọc + đếm ở server)
app/admin/audit/    → 🧾 NHẬT KÝ THAO TÁC (chỉ ADMIN, staff bị chặn ở menu + middleware): ai duyệt/từ chối/xoá tin–tòa, đổi giá, chuyển chủ sở hữu, đổi vai trò–quyền. Chỉ ĐỌC, không có đường ghi/sửa/xoá qua API
app/api/customers/  → HỒ SƠ KHÁCH: gộp viewing_requests + saved_searches theo SĐT (SQL union — Prisma groupBy không union 2 bảng được). ?phone= trả toàn bộ lịch sử một khách. Chỉ admin-family
app/admin/leads/    → Admin xem khách để lại SĐT, 4 tab: "Xin xem phòng" (ViewingRequest, có cột Nguồn = CTV nào) + "🗓️ Lịch khách xem phòng" (?tab=lich) + "Săn phòng" (SavedSearch) + "👤 Hồ sơ khách" (?tab=khach — gộp theo SĐT, nhãn "khách sát sao" khi hỏi ≥3 tin). Đọc ?tab= bằng useSearchParams + Suspense.
                      BỘ LỌC (v9.57): chip trạng thái kèm số đếm, mặc định mở trang là "🔥 Chưa xử lý" (NEW+CONTACTED), thêm "⏰ Quá 24h chưa gọi"; tìm SĐT/tên/tin/mã tin; lọc nguồn (qua CTV ↔ tự tìm) + thời gian. Tab Săn phòng: Đang săn/Đã tắt/Tất cả + "Chưa khớp tin nào" + lọc quận.
                      BỘ LỌC (v9.59): thêm chip "📅 Hẹn hôm nay/mai" (khách đã chọn giờ hẹn); tab Săn phòng có cột "Kho có hàng?" → bấm mở danh sách tin khớp.
                      MỌI bộ lọc chạy SERVER-SIDE (xem quy tắc dưới) — đừng lọc mảng của trang hiện tại
components/admin/IssueBanner.tsx → Dải vàng "đang lọc theo việc cần xử lý nào" + nút Bỏ lọc, hiện ở /admin/rooms và /admin/properties khi vào từ thẻ trên Tổng quan
components/leads/    → ViewingRequestTable.tsx (bảng dùng chung admin+CTV: cột Lịch hẹn riêng, tô đỏ lead NEW quá 24h, tô vàng hàng có hẹn hôm nay/mai) + FilterChip.tsx (chip lọc kèm số đếm lấy từ API) + SavedSearchMatches.tsx (danh sách tin khớp của 1 khách săn phòng + nút "Copy gửi Zalo" dựng sẵn tin nhắn kèm link /tin/<id> TUYỆT ĐỐI) + ViewingSchedule.tsx (LỊCH xếp theo giờ đi xem, gom theo ngày; copy TỪNG LƯỢT MỘT kèm ĐỊA CHỈ ĐẦY ĐỦ — mỗi căn thường một người dẫn riêng, ĐỪNG gộp copy cả ngày; đánh dấu "đã giao")
components/public/ViewingRequestForm.tsx → Ô "Đặt lịch xem phòng" gắn trong ShareViewClient (dùng chung cho /share/[token], /p/[token], /tin/[id], kho công ty). Lịch hẹn CHỌN được (Hôm nay/Ngày mai/Ngày kia + lịch, rồi Sáng/Chiều/Tối) thay vì gõ chữ tự do
app/api/upload/signed-url/ → Tạo Supabase signed upload URL (upload video trực tiếp client → Storage, không qua Vercel serverless)
app/api/ai/parse-listing/ → "Tạo tin nhanh AI": dán tin FB/Zalo → Gemini structured output bóc property+room+match tòa có sẵn (client đổ vào RoomTypeForm, KHÔNG auto-lưu)
app/api/rooms/map/  → Dữ liệu bản đồ public (tòa APPROVED có toạ độ + tin hiệu lực; redactName/redactHouseNumber; cache 5 phút)
app/api/poster/[id]/ → ẢNH BÌA đăng Facebook/Zalo 1080×1350 (next/og + font Be Vietnam Pro ở public/fonts) — in sẵn giá/diện tích/khu vực/mã tin lên ảnh. KHÁC /api/og/[id] (1200×630, không chữ, cho thumbnail link chat).
                      ⚠️ Ảnh phòng PHẢI đi qua photoAsJpeg() trước khi nhúng — xem quy tắc "Satori chỉ đọc PNG/JPEG/SVG" bên dưới
lib/social-post.ts  → buildSocialPost(): caption mạng xã hội (tiêu đề bắt mắt + điểm nhấn + link + hashtag theo quận). Khác lib/listing-text.ts (bản copy đầy đủ, không hashtag)
components/ui/PostExportModal.tsx → Modal "Đăng Facebook/Zalo": xem trước + tải ảnh bìa, caption sửa được rồi copy. Dùng ở /broker/inventory (tự tạo link share của CTV để lead ghi công đúng người) và /admin/rooms (dùng link công khai /tin/[id])
app/api/geocode/    → Proxy Nominatim server-side cho ô ghim vị trí bản đồ (tránh CORS/rate-limit client; cache 24h; có applyRateLimit)
app/api/properties/duplicate-check/ → Admin: mỗi tòa PENDING trả danh sách tòa APPROVED nghi trùng (tên gần giống cùng quận HOẶC toạ độ <150m) — cảnh báo trước khi duyệt
app/api/users/stats/ + app/api/deals/stats/ → Số liệu TỔNG toàn nền tảng (groupBy) cho thẻ thống kê — KHÔNG cộng theo trang; deals/stats gate VIEW_FINANCIAL_REPORTS
components/ai/AIQuickCreate.tsx → Nút + modal "⚡ Tạo tin nhanh AI" (paste → parse → chọn/tạo tòa → mở RoomTypeForm điền sẵn) — dùng ở admin/rooms + landlord/properties
lib/gemini.ts       → Helper gọi Gemini server-side dùng chung (getGeminiKeys xoay nhiều key khi 429, callGemini)
lib/geocode.ts      → geocodeAddress() Nominatim/OSM server-only (query kèm quận tránh pin nhầm khu) — POST/PUT properties + import Excel tự geocode khi thiếu toạ độ (fail không chặn lưu)
lib/ai-listing-styles.ts → AI_LISTING_STYLES: các phong cách viết tin (ngắn gọn / chuyên nghiệp / …) cho nút "AI hỗ trợ chuẩn hoá tin đăng" — client render nút bằng key+label, server dựng prompt bằng instruction (dùng ở components/forms/AiListingAssistant.tsx + app/api/ai/listing)
lib/saved-search-match.ts → SERVER-ONLY. Bộ khớp "Săn phòng" ↔ kho dùng chung cho cả 3 đường trên. roomWhereForSearch() tách `district` theo dấu phẩy rồi so BẰNG (đừng dùng `includes` chuỗi — "Từ Liêm" ăn nhầm cả Bắc/Nam Từ Liêm); hasCriteria() chặn khách bỏ trống hết tiêu chí khỏi khớp tự động (khớp 632 tin = rác, không phải việc)
lib/audit.ts        → SERVER-ONLY. writeAudit() ghi nhật ký thao tác (KHÔNG await ở nơi gọi, nuốt mọi lỗi — mất một dòng nhật ký còn hơn hỏng việc chính) + diffFields() chỉ giữ field THẬT SỰ đổi
lib/appointment.ts  → Client-safe. Diễn giải LỊCH HẸN xem phòng (preferredDate + preferredSlot) → "Hẹn sáng nay" / "Hẹn 14:30 mai" / "Hẹn 09:00 19/08", kèm clockOf(), daysUntil() và cờ urgent (hôm nay/mai) / past. Dùng ở ViewingRequestTable + ViewingSchedule + thông báo
lib/room-status.ts  → reconcileAvailability(): nắn `status` ↔ `availableUnits` cho KHÔNG mâu thuẫn (gõ số trống về 0 → tự 🔴 Hết phòng; bấm 🟢 khi số đang 0 → cho 1 phòng; bấm 🔴 → dọn số về 0; 🟡 UPCOMING không đụng). Tham số `changed` = "ĐỔI sang giá trị mới", KHÔNG phải "có gửi field lên" — vì kho còn 142 tin 🔴 cũ vẫn có availableUnits > 0, nếu nắn theo "có gửi" thì mọi lần lưu tin sẽ đăng lại cả 142 tin đã cho thuê xong. Dùng ở POST+PUT /api/rooms + RoomTypeForm
lib/listing-options.ts → AMENITY_OPTIONS + ROOM_TYPE_OPTIONS dùng chung form + AI enum (client-safe)
lib/listing-code.ts → LISTING_CODE_REGEX, normalizeListingCode, formatListingCode (ghép mã công ty MS-066-XXXXXX — DISPLAY, không đổi listingCode gốc), parseComposedListingCode, normalizeCompanyCode
lib/seo-locations.ts → Client-safe: slugify, SEO_DISTRICTS/SEO_UNIS (slug URL đặt tay theo cụm từ khách gõ), districtPath/uniPath, PRICE_BANDS, TYPE_LABEL, SITE_URL, UNI_RADIUS_KM=3
lib/seo-listings.ts → SERVER-ONLY (prisma): getDistrictPageData/getUniPageData/getDistrictCounts/getUniCounts + PUBLIC_ROOM_WHERE. Xen kẽ tin theo TÒA và đẩy tin trùng tiêu đề xuống dưới để trang không trông như tin rác; mọi dữ liệu ra ngoài đều redact số nhà
components/public/  → ListingCard.tsx + SeoLinks.tsx + Thẻ tin render sẵn phía server cho trang đích + khối liên kết quận/trường gắn ở chân trang chủ, /phong và mọi trang đích (đường cho Google đi tới trang đích)
app/layout.tsx      → 🚨 metadata.verification.google + public/google1b741701c683e2a6.html = XÁC MINH Google Search Console (tài khoản phongvan0926@gmail.com). KHÔNG XOÁ — xoá là mất xác minh + mất dữ liệu Search Console
app/sitemap.ts      → Sitemap ĐỘNG (cache 1h): trang tĩnh + 12 quận + 18 trường + TỪNG tin /tin/[id] kèm lastModified. Trước đây chỉ có 3 URL nên tin đăng không có đường vào từ Google
lib/phone.ts        → ☎️ Kiểm & BÓC số điện thoại VN (client-safe): checkPhone() phân loại ok/messy/invalid + lý do sai bằng tiếng Việt, extractVNPhone() bóc số khỏi chuỗi "Tên + SĐT", telHref()/zaloHref() dựng link AN TOÀN (null khi không có số dùng được → ẩn nút thay vì đưa link hỏng), formatPhone(). Luật: 10 số, bắt đầu 0, số thứ 2 ∈ {2,3,5,7,8,9}
lib/contact-server.ts → SERVER-ONLY: getSupportContact() đọc hotline từ bảng `settings` (khoá `support_phone`, `support_zalo`) → ADMIN đổi số ở /admin/settings là TOÀN WEB đổi theo, không cần sửa code. lib/contact.ts chỉ còn là giá trị dự phòng. ⚠️ Trang nào gọi hàm này PHẢI có `export const revalidate` (không thì Next dựng tĩnh lúc build, số đứng im)
components/public/SupportFabs.tsx → Cặp nút nổi liên hệ (💬 Zalo dưới + 📞 Gọi trên) cho MỌI trang công khai, số lấy từ Cài đặt. Trước đây các trang công khai chỉ có nút gọi, thiếu hẳn nút Zalo
components/ui/PhoneWarningBanner.tsx → Banner cảnh báo SĐT sai định dạng, hiện trong DashboardLayout cho CHÍNH chủ tài khoản. Chỉ cảnh báo khi checkPhone = 'invalid' (số ghi kèm tên vẫn gọi được nên không làm phiền). Bấm "Số này đúng" → lưu User.phoneConfirmedAt, thôi nhắc; đổi số khác thì server tự xoá xác nhận
lib/hanoi-locations.ts → HANOI_DISTRICTS, INNER_CITY/OUTER_DISTRICTS, HANOI_UNIVERSITIES (18 trường lớn cho bản đồ), findDistrictForStreet
scripts/geocode-properties.js → Backfill lat/long tòa cũ từ địa chỉ (1 req/s, --force để chạy lại tất cả); geocode-properties-pass2.js (làm sạch địa chỉ bẩn); geocode-fix-outliers.js (rà + sửa pin đặt sai quận, viewbox bounded); geocode-audit-pins.js (audit pin theo TUYẾN PHỐ của chính tòa — pin lệch >3km khỏi phố mình thì ghim lại, bắt được ca lệch nhỏ mà fix-outliers lọt)
scripts/backfill-appointments.js → Đổ giờ hẹn cho lead cũ gõ tay vào ô ghi chú ("8h tối mai", "16/8"). Bảng bóc LẬP SẴN đọc kiểm được từng dòng — cố ý KHÔNG gọi AI lúc chạy: việc có đáp án đúng, làm một lần, chạy lại phải ra đúng một kết quả. Mặc định chạy thử, `--apply` mới ghi; trước khi ghi còn đối chiếu ghi chú trong DB có khớp bảng không
scripts/backup-storage.js → BACKUP kho ảnh/video Supabase Storage về Ổ SSD SAMSUNG 120GB gắn trong máy — `/srv/data/MixStay/storage` (backup của Supabase KHÔNG gồm file Storage!). DỪNG hẳn nếu ổ chưa mount (tránh ghi nhầm làm đầy ổ hệ thống). Tăng dần (bỏ qua file đã đủ dung lượng), chỉ đọc, ghi manifest.json. `--check` đối chiếu không tải, `--dest <thư mục>` đổi đích. scripts/install-backup-cron.sh cài lịch 3h sáng HẰNG NGÀY (`--remove` để gỡ) — hằng ngày chứ không hằng tuần vì crontab user KHÔNG được anacron chạy bù, máy tắt đúng giờ hẹn là mất lượt đó. LƯU Ý: `/srv/data/backup` là repo restic của hệ thống — KHÔNG đụng vào
design-system/       → Bộ giao diện (design system) đồng bộ lên claude.ai/design — dự án "MixStay — Bộ giao diện". 13 thẻ HTML tự chứa, mở đầu bằng `<!-- @dsCard group="…" -->`. Dựng lại bằng `python3 design-system/build.py`
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
lib/contact.ts      → ☎️ HOTLINE CÔNG TY — NGUỒN DUY NHẤT (SUPPORT_PHONE / SUPPORT_PHONE_DISPLAY / SUPPORT_ZALO). Đổi số hotline thì SỬA ĐÚNG FILE NÀY. Khác hoàn toàn Company.phone (SĐT riêng từng công ty đối tác) và User.phone (SĐT cá nhân CTV/chủ nhà — lib/zalo.ts định tuyến về đúng người giữ link để không cướp lead)
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
- viewing_requests: id, roomTypeId, brokerId? (ghi công CTV — suy từ share token PHÍA SERVER), companyId?, name?, phone, note?, **preferredDate? + preferredSlot?** (lịch hẹn CÓ CẤU TRÚC), **guideSentAt?** (đã copy lịch gửi người dẫn khách lúc nào; null = chưa ai phụ trách), source (share/system/company/tin), status (NEW/CONTACTED/DONE/CANCELLED)
  - 🕐 QUY ƯỚC GIỜ HẸN: giờ LUÔN nằm trong `preferredDate` → sắp lịch chỉ cần `orderBy preferredDate`. `preferredSlot != null` = khách chỉ chọn BUỔI, preferredDate giữ GIỜ ĐẠI DIỆN (sáng 08:00 / chiều 14:00 / tối 19:00 / **`day` 09:00** = biết ngày chưa chốt giờ) và giờ đó **KHÔNG được in ra** (in "08:00" khi khách mới nói "sáng" là bịa giờ hẹn). `preferredSlot == null` = khách chọn GIỜ CỤ THỂ, in thẳng giờ trong preferredDate.
  - ⚠️ Khách chọn ngày mà bỏ trống cả buổi lẫn giờ thì PHẢI rơi về `slot='day'`, TUYỆT ĐỐI không để rơi về `00:00 + slot null` — màn hình sẽ in "Hẹn 00:00 16/08" và người dẫn khách bị hẹn lúc nửa đêm (lỗi thật 15/08/2026, một khách đã dính).
- notifications: id, userId, type, title, message, isRead
- users: … + `phoneConfirmedAt` (người dùng bấm "Số này đúng" trên cảnh báo SĐT sai định dạng → thôi nhắc; tự xoá về null khi đổi số)
- companies: … + `phoneConfirmedAt` (admin xác nhận hộ — công ty không có tài khoản để tự bấm)
- settings: key-value (commission_broker_percent, **support_phone**, **support_zalo**)
- audit_logs: id, userId?/userName?/userRole? (SNAPSHOT — user đổi tên/bị xoá thì nhật ký vẫn đọc được), action (approve/reject/create/update/delete/transfer/permission), entity, entityId, entityLabel? (snapshot tên/mã), changes Json? ({field:{from,to}}), createdAt. KHÔNG khoá ngoại tới bản ghi bị tác động — bản ghi xoá rồi thì nhật ký vẫn phải đọc được
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
- **Rate limit chỉ thật sự có tác dụng khi đã cấu hình KV** (`KV_REST_API_URL`/`KV_REST_API_TOKEN` hoặc `UPSTASH_*`). Chưa có thì `lib/rate-limit.ts` đếm theo TỪNG INSTANCE — đo trên production 07/08/2026: 75 request vượt ngưỡng vẫn lọt hết. Đừng coi `applyRateLimit` là hàng rào chống lạm dụng cho tới khi bật KV.
- **API nội bộ PHẢI chặn ở đầu handler:** `const session = await getServerSession(...)` mà không có `if (!session) return 401` là **KHÔNG có bảo vệ** — dùng session để lọc `where` thôi thì khách vãng lai rơi vào `where={}` và nhận sạch dữ liệu (đúng lỗi `/api/properties` ngày 07/08/2026). `middleware.ts` KHÔNG chắn `/api/*`.
- **Không dùng `include:` cho model có field nhạy cảm** — `include: { property: true }` trả MỌI cột (fullAddress, toạ độ, zaloPhone, landlordNotes). Luôn `select` tường minh.
- **Không bao giờ tin payload client trong `jwt` callback** — `trigger === 'update'` mang dữ liệu do client gửi. Role/quyền chỉ được đọc từ DB.
- **Ảnh nhúng vào `next/og` (ImageResponse) PHẢI là PNG/JPEG/SVG — Satori KHÔNG đọc WebP/HEIC và LẶNG LẼ BỎ QUA, không báo lỗi.** Kho ảnh của dự án 70% là WebP nên ảnh bìa Facebook ra nền trơn không có ảnh phòng suốt một thời gian mà không ai biết (chữ vẫn in nên nhìn thoáng tưởng ổn). Luôn tải ảnh về rồi ép JPEG bằng `sharp` (mẫu: `photoAsJpeg()` trong `app/api/poster/[id]/route.tsx`), lỗi thì rơi về ảnh mặc định. Đổi nguồn ảnh cho poster/og là phải kiểm lại bằng cách MỞ ẢNH RA XEM, không chỉ nhìn HTTP 200.
- **Tính năng "đăng lên mạng xã hội" chỉ được mở cho tin ĐÃ DUYỆT.** Tin chưa duyệt thì `/tin/[id]` trả "Tin đăng không tồn tại" và `/api/poster` từ chối dựng ảnh → đăng lên là mất trắng bài + khách bấm vào trang chết. `PostExportModal` nhận `isApproved` và chặn, kèm nút duyệt tại chỗ.
- **Nhúng JSON-LD phải qua `safeJsonLd()`** (`lib/json-ld.ts`), không dùng thẳng `JSON.stringify` — không escape `</script>` là mở đường XSS.
- **`fullAddress` được phép ra MÀN HÌNH NỘI BỘ, và chỉ ở đó.** Người dẫn khách cần địa chỉ thật mới tới nơi được — bản redact ("Ngõ 103 …") không đi được. Nên `GET /api/viewing-requests` có trả `fullAddress` + `zaloPhone`, hợp lệ vì handler đã chặn 403 ở đầu, chỉ ADMIN/ADMIN_STAFF/BROKER vào được. Đừng bê nguyên select đó sang endpoint công khai.
- **Tên tin & mô tả ra công khai phải qua `redactTitle()` / `redactPublicText()`** — chủ nhà gõ số nhà và SĐT vào đó, luật ẩn số nhà bị lách qua đường này. **"Công khai" gồm cả nội dung ở màn hình ADMIN mà admin sẽ COPY đi gửi khách** (nút "Copy gửi Zalo" ở `SavedSearchMatches`): dữ liệu đích đến là khách thì phải redact ở server, đừng vì thấy màn hình có gác đăng nhập mà bỏ qua. Tin thật đang có tiêu đề *"Phòng Studio tại Số 5/25 Yên Phúc"*.
- **Chuỗi ngõ nhiều cấp:** `Số 4 Ngõ 103/2/5` (đã có số nhà tường minh) → giữ nguyên chuỗi ngõ; `Ngõ 103/2/5` (không có số nhà nào) → đoạn cuối chính là số nhà, phải cắt. Logic ở `redactHouseNumber()`, đã có bộ ca kiểm thử trong changelog v9.39.
- **Trạng thái phòng ↔ số phòng trống:** mọi đường ghi `status`/`availableUnits` PHẢI đi qua `reconcileAvailability()` (`lib/room-status.ts`). Không bao giờ để `AVAILABLE` + `availableUnits = 0` lọt vào DB — thẻ tin sẽ in "Còn 0 phòng" cho khách và JSON-LD khai `InStock` sai. Nắn theo **field người dùng vừa ĐỔI**, không phải field "có gửi lên" (kho còn 142 tin 🔴 cũ có `availableUnits > 0`, nắn sai là đăng lại hết).
- **Số điện thoại:** KHÔNG bao giờ dựng `tel:`/`zalo.me/` từ SĐT chưa kiểm — kể cả dạng template `` `tel:${phone}` `` lẫn `.replace(/\D/g,'')` (bỏ được chữ nhưng vẫn cho số 11 chữ số đi qua). Dùng `telHref()`/`zaloHref()`/`extractVNPhone()` của `lib/phone.ts`, trả `null` thì **ẩn nút**. Thêm ô SĐT mới → validate bằng `checkPhone()`. Đã vá 2 lượt (v9.47 + v9.48) vì lần đầu quét sót dạng template.
- **Hotline công ty:** lấy bằng `getSupportContact()` (`lib/contact-server.ts`), KHÔNG chép cứng số vào component/trang. Trang gọi hàm này phải khai `export const revalidate`.
- **Tải file về máy khách (nút "Tải ảnh"):** iOS Safari KHÔNG tải được nhiều `<a download>` liên tiếp — hộp thoại "Tải về?" đè nhau, chỉ file CUỐI được lưu (lỗi thật 14/08/2026). Trên iOS phải dùng Web Share API với `files` (share sheet mở 1 lần → "Lưu N ảnh" vào Photos); desktop mới dùng anchor tuần tự. Và KHÔNG `revokeObjectURL` ngay sau `click()` — Safari còn chờ người dùng bấm đồng ý, revoke sớm là blob chết; revoke trễ ≥60s. Mẫu đúng ở `ListingActionBar.tsx` + `PostExportModal.tsx` (v9.58).
- **Đổi `app/globals.css` hoặc `tailwind.config.ts` → phải cập nhật `design-system/`** (chạy `python3 design-system/build.py` rồi đồng bộ lên claude.ai/design bằng DesignSync). Bộ chuẩn lấy giá trị từ mã nguồn thật; để lệch là nó nói dối người dùng sau.
- **KHÔNG bọc `<DashboardLayout>` trong trang** — `app/{admin,broker,landlord}/layout.tsx` đã bọc rồi. Bọc hai lần là 2 sidebar, `lg:ml-60` cộng dồn (lệch phải ~240px) và 2 bộ SWR poll thông báo. Đã dính ở 3 trang (v9.56).
- **Mọi VIỆC CẦN LÀM hiện trên `/admin/dashboard` phải bấm được và tới ĐÚNG danh sách đã lọc sẵn.** Thẻ/dòng chỉ hiện con số rồi dẫn về trang chung là bắt admin tự dò lại giữa 856 tin — con số trang trí, không phải việc. Bộ lọc đích: `/admin/rooms?issue=no-image|stale|overdue-upcoming`, `/admin/properties?issue=no-geo`, `?companyId=__none__`, `/admin/companies?approved=false`. Trang đích PHẢI hiện `components/admin/IssueBanner.tsx` (đang lọc gì + nút Bỏ lọc). **Điều kiện lọc phải dựng ĐÚNG BẰNG truy vấn đếm trong `/api/admin/overview`** — lệch là thẻ báo 69 mà danh sách ra 63, admin hết tin vào số liệu.
- **Thêm điều kiện lọc vào `where` có sẵn thì kiểm `OR`/`AND` đã bị ai chiếm chưa.** `search` thường chiếm `where.OR`; nhét thêm điều kiện vào đó biến "A VÀ B" thành "A HOẶC B" — lọc "tòa thiếu toạ độ" kèm tìm chữ từng ra **362 tòa** thay vì 2. Điều kiện độc lập thì đẩy vào `where.AND`. Và đặt khối lọc SAU các khối có thể ghi đè cùng field (`issue` phải sau `status`).
- **Thao tác KHÓ HOÀN TÁC phải ghi `writeAudit()`** (`lib/audit.ts`): duyệt/từ chối/xoá tin–tòa, đổi giá, chuyển chủ sở hữu, đổi vai trò–quyền. Chụp `entityLabel` TRƯỚC khi xoá (xoá xong thì không còn gì để đọc ra). Chỉ ghi field thật sự đổi qua `diffFields()` — và nhớ nạp ĐỦ field đó vào bản ghi CŨ, thiếu field nào thì `undefined` bị coi là "đã đổi". KHÔNG `await` và KHÔNG để lỗi nhật ký làm hỏng việc chính.
- **Danh sách CÓ PHÂN TRANG thì bộ lọc và số đếm phải chạy SERVER-SIDE.** Lọc/đếm mảng 20 dòng đang hiển thị là sai nghiệp vụ, không phải sai thẩm mỹ: khách "🔴 Mới" nằm ở trang 3 sẽ không bao giờ hiện ra, admin tưởng đã gọi hết. Đã dính ở `/broker/leads` (đếm "N khách chưa gọi" theo trang hiện tại). Số đếm cho chip lấy bằng `groupBy` trên toàn tập, áp dụng các bộ lọc KHÁC nhưng KHÔNG áp dụng chính bộ lọc mà chip đó điều khiển.
- **Ngày/giờ nghiệp vụ phải tính theo GIỜ VN, không theo giờ máy chủ.** Vercel chạy UTC: `new Date().setHours(0,0,0,0)` trên server cho ra nửa đêm UTC = 7h sáng VN, nên "hẹn hôm nay" lệch nguyên một ngày. Dựng mốc bằng `Date.UTC(...) - 7*3600000` (mẫu ở `GET /api/viewing-requests`), và ở client dựng chuỗi `YYYY-MM-DD` bằng `getFullYear/getMonth/getDate` chứ KHÔNG `toISOString()` (nó quy về UTC).
- **Trường ngày/giờ do KHÁCH gửi lên phải validate trước khi lưu** — dữ liệu này về sau dùng để LỌC/ĐẾM ở server, rác lọt vào là hỏng bộ đếm. Chỉ nhận đúng định dạng, chặn ngày quá khứ/quá xa, enum buổi phải nằm trong danh sách cố định (mẫu ở `POST /api/viewing-requests`).
- **Bảng quản trị phải dùng `.table-header` / `.table-cell`** (`app/globals.css`), không tự chế `px-4 py-3` — và đặt `min-w-[…]` cho từng cột, nếu không tên người bị bẻ đôi khi cột hẹp.
- **Trang quản trị là client component → KHÔNG dùng được `export const metadata`.** Tiêu đề tab do `DashboardLayout` đặt bằng `document.title` theo mục menu; thêm mục menu mới là tự có tiêu đề, không phải làm gì thêm.
- **Số liệu SO SÁNH ("rẻ hơn X%", "cao hơn mặt bằng", "trên trung bình") phải tính trên TOÀN TẬP, không phải trên tập đã lọc.** Tính trung vị ngay trên kết quả đã áp bộ lọc của khách là để con số tự nói dối: kéo mức giá tối đa về 3,5tr → trung vị Hoàng Mai tụt 4,7tr xuống 3tr → tin 2,4tr đang rẻ hơn 49% bị khai thành "rẻ hơn 20%" (đo 17/08/2026). Mẫu đúng: `marketPropertyWhere` + `medianByDistrict()` trong `app/api/rooms/public/route.ts` — truy vấn mặt bằng riêng, chỉ giữ lọc theo VÙNG, bỏ lọc giá/loại/tiện ích.
- **"Giá tốt" ≠ "rẻ nhất".** Xếp theo giá tuyệt đối thì đầu bảng luôn là ngoại thành (Hoài Đức 1,5–2,5tr) và hay dồn về một tòa — khách tìm phòng nội thành lướt qua thấy toàn chỗ mình không ở. Mọi khối "khoe hàng" phải chống dồn: mỗi quận + mỗi TÒA nhiều nhất 1 tin, và chỉ lấy tin CÓ ẢNH.
- **Chữ vàng trên nền gradient phải kiểm tương phản ở CẢ HAI ĐẦU gradient.** `gold-400` trên `violet-600` chỉ đạt 3,3:1 (WCAG AA cần 4,5:1 cho chữ 14px) — đủ ở đầu này mà hỏng ở đầu kia là chuyện thường. Cặp đang dùng cho nút bản đồ trên nav: `text-gold-300` + `from-violet-800 to-brand-700` → 5,3:1 hai đầu. Nút đặt trên nav xanh đậm thì thêm `ring-1 ring-white/20` cho cạnh khỏi lẫn vào nền.
- **Thanh nav chật thì cắt thứ ÍT GIÁ TRỊ NHẤT, không phải thứ NGẮN NHẤT** — và hỏi chủ dự án cái nào là cái nào. Đã sửa 4 lượt (v9.53→v9.55, v9.66) vì tự quyết. Thứ tự ưu tiên CHỐT ngày 18/08/2026, theo đúng lựa chọn của chủ dự án:
  **logo nguyên bản (không cắt/không xếp dọc) > nút bản đồ ĐỦ CHỮ "Tìm theo bản đồ" > "Đăng nhập" > "Đăng ký miễn phí" > ảnh đại diện + tên + "Đăng xuất"**.
  Hệ quả đang áp dụng: điện thoại (<640px) ẩn "Đăng ký miễn phí" (chân trang đã có 4 link) và ẩn ảnh đại diện + tên + Đăng xuất (đăng xuất có ở topbar trang quản lý); tên người dùng chỉ hiện từ 1024px.
- **Đổi thanh nav thì phải đo LẠI CẢ 4 TRẠNG THÁI ĐĂNG NHẬP × nhiều bề rộng.** Nav công khai có 3 nhánh render khác nhau (chưa đăng nhập / đang tải / đã đăng nhập) và nhánh đã đăng nhập rộng gấp ~2,7 lần nhánh kia (451px so với 166px) — nhìn ở trạng thái chưa đăng nhập thấy đẹp là chưa nói lên gì. Mẫu đo: mock `**/api/auth/session` bằng Playwright `page.route()` cho từng vai trò rồi so mép phải nhóm trái với mép trái nhóm phải, ở 320/360/390/430/540/640/768/900/1024/1280.
- **`justify-between` KHÔNG bảo vệ khỏi tràn — nó giấu tràn.** Hai nhóm flex quá khổ sẽ ĐÈ LÊN NHAU mà `scrollWidth === clientWidth` (không có thanh cuộn ngang) và `getBoundingClientRect()` của nhóm vẫn trả về kích thước "vừa vặn", vì con bên trong có `shrink-0` nên tràn ra ngoài hộp cha. Đo bằng bounding box của NHÓM là thấy "hở 0px" trong khi thực tế nút bị che 34px. Luôn đo bằng toạ độ của phần tử CON hai bên.
- **`min-h-*` chỉ có tác dụng đúng trên `inline-flex`/`flex` + `items-center`.** Gắn `min-h-11` vào phần tử `display:block` thì hộp cao lên nhưng CHỮ vẫn nằm sát đỉnh — đúng lỗi đã gây ra ở `PublicNav` (v9.50 → v9.53). Sửa chiều cao hàng loạt bằng thay chuỗi thì phải kiểm lại `display` của từng chỗ.
- **Ảnh trong flex phải có `shrink-0`** (và `object-contain` nếu dùng `w-auto`) — nếu không, hàng tràn là ảnh bị BÓP NGANG cho vừa, logo méo mà không có cảnh báo nào.
- **Vùng bấm tối thiểu 44×44px, chữ tối thiểu 12px** trên trang KHÁCH xem. Lớp dùng chung (`btn-*`, `input-field`) đã có `min-h-11`; chip/pill tự viết thì thêm `min-h-11 sm:min-h-0 inline-flex items-center` (44px trên điện thoại, gọn trên máy tính). Bảng quản trị được phép dày hơn (11px) nhưng NÚT thì không.
- **ĐỪNG đề xuất lại "giá theo đầu người / ở ghép" cho ô tìm kiếm.** Đã làm đủ (ô chọn số người, khoảng giá hiểu theo đầu người, badge "≈2,5tr/người" trên thẻ tin) và đo được hiệu quả thật (ngân sách 3tr: 50 tin → 572 tin), nhưng chủ dự án BÁC ngày 15/08/2026: khách tự chia nhẩm được, không đáng để ô tìm kiếm dài thêm và thẻ tin rối thêm. Đã gỡ sạch cả UI lẫn tham số `people` ở API.
- **`ListingActionBar` (Tải ảnh / Copy nội dung / Chia sẻ) CỐ Ý mở cho MỌI người, kể cả khách chưa đăng nhập** — đây là tính năng, không phải sơ hở: mục tiêu là để người ta mang tin đi đăng lại trên nhiều nền tảng khác, càng nhiều nơi đăng thì càng tới được nhiều khách thuê. Số nhà đã che ở tầng dữ liệu nên nội dung mang đi vẫn an toàn. **ĐỪNG đề xuất ẩn 2 nút này** — đã bị chủ dự án bác bỏ ngày 07/08/2026.
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
