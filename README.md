# 🏢 MixStay Manager

Nền tảng quản lý chung cư mini — kết nối Chủ nhà, Môi giới, Công ty và Khách thuê.

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Auth:** NextAuth.js (JWT, multi-role)
- **Deploy:** Vercel

## Tính năng

### 👨‍💼 Admin (Công ty)
- Dashboard tổng quan (thống kê, doanh thu)
- CRUD tòa nhà & phòng
- Duyệt sản phẩm chủ nhà đăng
- Quản lý giao dịch & tính hoa hồng tự động
- Cấu hình tỷ lệ chia hoa hồng
- Quản lý tài khoản người dùng
- **Excel Import/Export:**
  - Tải form mẫu Excel (2 sheet: dữ liệu mẫu + hướng dẫn tiếng Việt)
  - Import từ Excel: upload → preview bảng → validate từng dòng → import hàng loạt
  - Xuất Excel: export toàn bộ hoặc chỉ kết quả đang filter

### 🤝 Môi giới
- Kho hàng với card phong phú: ảnh carousel (3 ảnh), badge loại phòng, giá nổi bật
- Hoa hồng hiển thị ngay ngoài card: "HH: 6th=40% (1.4tr) | 12th=50% (1.75tr)"
- Hiện số phòng trống: "Còn 3/5 phòng" + tên phòng cụ thể
- Badge ngắn hạn + giá ngắn hạn nếu có
- Link Zalo nhóm hệ thống (từ Company.zaloGroupLink)
- Icon tiện ích đặc biệt: 🚗 🌍 ⚡ 🐾
- Bộ lọc nâng cao: tìm kiếm thông minh (tên, địa chỉ, SĐT, mô tả), công ty, loại phòng, khoảng giá, toggle tags (ô tô, foreigner, sạc xe, pet, ngắn hạn), trạng thái (còn phòng/tất cả)
- Xem SĐT chủ nhà & địa chỉ chi tiết + liên hệ Zalo
- Tạo link chia sẻ cho khách (ẩn thông tin nhạy cảm)
- Báo deal & theo dõi hoa hồng
- Quản lý link đã chia sẻ

### 🏠 Chủ nhà
- Wizard tạo tòa nhà 2 bước: bước 1 thông tin tòa nhà → bước 2 thêm loại phòng ngay
- Quản lý phòng theo loại (RoomType card): inline edit số phòng trống, tên phòng trống
- Bật/tắt nhanh toàn bộ loại phòng
- Tạo link tổng hệ thống: 1 link chứa tất cả phòng trống của tất cả tòa nhà
- Theo dõi lượt xem link chia sẻ

### 👤 Khách thuê
- **Trang chủ công khai:** tìm kiếm phòng trống toàn hệ thống ngay trên homepage với bộ lọc khu vực / khoảng giá / kiểu phòng (không cần tài khoản)
- **Trang tin đăng loại phòng:** gallery 3 ảnh grid + lightbox, video giới thiệu phòng (nếu có), thông tin đầy đủ (giá, diện tích, tiện ích, ngắn hạn, số phòng trống), nút Google Maps, nút liên hệ MG, gợi ý tin đăng liên quan
- **Trang kho phòng hệ thống:** xem tất cả phòng trống của 1 hệ thống, toggle Grid ↔ List view, card carousel 3 ảnh, bộ lọc (khu vực, giá, kiểu phòng), nút "Xem chi tiết"
- **Short share link `/p/{token}`:** URL rút gọn dễ gửi qua Zalo/SMS, tự redirect về trang tin đăng
- Thấy khu vực & tuyến phố (KHÔNG thấy địa chỉ cụ thể & SĐT chủ nhà)
- Liên hệ qua môi giới

---

## 🚀 Hướng dẫn Deploy từ A-Z

### Bước 1: Tạo Supabase Database (miễn phí)

1. Vào https://supabase.com → Sign Up → New Project
2. Chọn Region: **Southeast Asia (Singapore)** cho tốc độ
3. Đặt tên project, tạo Database Password (LƯU LẠI)
4. Đợi ~2 phút để project khởi tạo
5. Vào **Settings → Database** → copy:
   - Connection string (Pooling): `postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres`
   - Direct connection: `postgresql://postgres.[ref]:[password]@...supabase.com:5432/postgres`
6. Vào **Settings → API** → copy:
   - Project URL: `https://xxx.supabase.co`
   - `anon` public key
   - `service_role` key

### Bước 2: Tạo Supabase Storage Bucket (cho upload ảnh)

1. Trong Supabase Dashboard → **Storage** → New Bucket
2. Tên: `images`, Public bucket: ✅
3. Vào bucket → Policies → New Policy → Allow all cho authenticated users

### Bước 3: Push code lên GitHub

```bash
# Clone hoặc copy project
cd mixstay

# Init git
git init
git add .
git commit -m "Initial commit - MixStay Manager"

# Tạo repo trên GitHub (github.com/new)
git remote add origin https://github.com/YOUR_USERNAME/mixstay.git
git branch -M main
git push -u origin main
```

### Bước 4: Deploy lên Vercel (miễn phí)

1. Vào https://vercel.com → Sign Up bằng GitHub
2. **Add New → Project** → Import repo `mixstay`
3. **Environment Variables** → thêm từng biến:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
NEXTAUTH_SECRET=chay-lenh-openssl-rand-base64-32
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...
NEXT_PUBLIC_APP_NAME=MixStay
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

4. **Deploy** → đợi ~2-3 phút

### Bước 5: Setup Database

```bash
# Cài dependencies local
npm install

# Copy .env.example → .env rồi điền thông tin
cp .env.example .env

# Push schema lên Supabase
npx prisma db push

# Seed dữ liệu demo
npm run db:seed
```

### Bước 6: Kiểm tra

1. Vào `https://your-app.vercel.app`
2. Đăng nhập với tài khoản demo (mật khẩu: `123456`):
   - Admin: `admin@mixstay.vn`
   - Môi giới: `broker@mixstay.vn`
   - Chủ nhà: `landlord@mixstay.vn`

---

## 🔧 Chạy Local (Development)

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/mixstay.git
cd mixstay

# 2. Cài dependencies
npm install

# 3. Setup env
cp .env.example .env
# Điền thông tin Supabase vào .env

# 4. Setup database
npx prisma db push
npm run db:seed

# 5. Chạy dev server
npm run dev
# → http://localhost:3000
```

## 📁 Cấu trúc thư mục

```
mixstay/
├── app/
│   ├── admin/           # Admin dashboard pages
│   ├── broker/          # Broker pages
│   ├── landlord/        # Landlord pages
│   ├── share/[token]/   # Public share page (1 loại phòng)
│   ├── share/system/[token]/ # Public share page (kho phòng chủ nhà)
│   ├── api/             # API routes
│   ├── login/           # Login page
│   ├── register/        # Register page
│   └── page.tsx         # Landing page
├── components/
│   ├── layout/          # Dashboard layout, AuthProvider
│   ├── forms/           # PropertyForm, RoomTypeForm, RoomForm, QuickRoomTypeForm
│   └── ui/              # Skeleton, ImageUpload, VideoUpload, VideoLinkInput, VideoPlayer, VideoGallery, OptimizedImage, Pagination, DistrictPills, PriceRangeSlider, ZaloFab
├── hooks/
│   └── useData.ts       # SWR hooks (useProperties, useRoomTypes, useDeals, etc.)
├── lib/
│   ├── auth.ts                # NextAuth config
│   ├── prisma.ts              # Prisma client
│   ├── utils.ts               # Helper functions
│   ├── fetcher.ts             # SWR fetcher
│   ├── pagination.ts          # Server-side pagination helper
│   ├── rate-limit.ts          # API rate limiter
│   ├── video-utils.ts         # Parse YouTube/TikTok/Facebook URL, thumbnail, embed
│   ├── validations.ts         # Zod validation schemas
│   ├── permissions.ts         # RBAC client-safe: hasPermission(), ALL_ADMIN_PERMISSIONS
│   ├── permissions-server.ts  # requirePermission() — API guard
│   ├── user-company.ts        # getUserCompany() — resolve company của user
│   ├── zalo.ts                # Resolve link Zalo (company → landlord → env → fallback)
│   └── supabase.ts            # Supabase client (storage upload)
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Demo data
└── middleware.ts         # Route protection
```

## 🔐 Phân quyền dữ liệu

| Thông tin | Admin | Admin Staff | Môi giới | Chủ nhà | Khách (qua link) |
|-----------|:-----:|:-----------:|:--------:|:-------:|:-----------------:|
| Ảnh phòng | ✅ | ✅ | ✅ | ✅ | ✅ |
| Giá thuê | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tiện ích | ✅ | ✅ | ✅ | ✅ | ✅ |
| Khu vực / Quận | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tuyến phố | ✅ | ✅ | ✅ | ✅ | ✅ |
| Địa chỉ chi tiết | ✅ | ✅ | ✅ | ✅ | ❌ |
| SĐT Chủ nhà | ✅ | ✅ | ✅ | — | ❌ |
| Hoa hồng / doanh thu | ✅ | ⚙️* | Của mình | ❌ | ❌ |

> **Admin Staff (`ADMIN_STAFF`):** hành động được phép theo `User.permissions[]` (enum `Permission`, 9 quyền). `ADMIN` là super-admin bypass tất cả; staff chỉ làm được hành động được cấp.
> `⚙️*` Hoa hồng/doanh thu áp **field-strip**: API vẫn trả key nhưng set `null` nếu thiếu `VIEW_FINANCIAL_REPORTS`. Guard: `lib/permissions.ts` (client `hasPermission()`) + `lib/permissions-server.ts` (`requirePermission()`).

## Performance & Optimization

- **SWR Caching:** Tất cả dashboard pages dùng SWR hooks (`hooks/useData.ts`) với deduping 10s, keepPreviousData
- **Pagination:** Server-side pagination cho tất cả API list endpoints (`lib/pagination.ts`)
- **Image Optimization:** Next.js Image component wrapper (`OptimizedImage`) với lazy loading, AVIF/WebP, responsive sizes
- **Database Indexes:** Composite indexes trên Prisma schema cho các query phổ biến
- **Rate Limiting:** In-memory rate limiter (`lib/rate-limit.ts`) cho tất cả API routes
- **Input Validation:** Zod schemas (`lib/validations.ts`) validate request body trước khi xử lý
- **Error Boundaries:** `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx` cho UX mượt
- **Skeleton Loading:** Pulse animation skeletons thay thế text "Đang tải..." trên tất cả trang dashboard
- **SEO:** Dynamic OG tags cho share pages (`generateMetadata`), sitemap.xml, robots.txt
- **OG image chuẩn Zalo:** `app/api/og/[id]` render ảnh tin đăng thành **JPEG 1200×630** (Zalo không đọc được WebP/HEIC — ảnh gốc Supabase phần lớn là .webp). `lib/og.ts` dựng URL tuyệt đối theo host request cho mọi trang chia sẻ
- **PWA (cài như app):** `manifest.json` (standalone, portrait), icon 192/512 + maskable, `apple-touch-icon` 180×180 + meta `apple-mobile-web-app-*` (icon + full-screen trên iPhone), service worker `public/sw.js` (network-first cho trang, không cache /api → luôn dữ liệu thật), banner cài đặt `components/ui/InstallPWA.tsx` (Android 1 chạm / hướng dẫn Safari cho iPhone). Đăng nhập nhớ sẵn qua session JWT 30 ngày.

## Changelog

### v9.29 — 2026-07-24 (chuẩn hóa 104 tiêu đề tòa nhà + tin đăng)
- **Claude tự soát và viết lại từng dòng** (không AI tự động mù): 51 tên tòa + 53 tiêu đề tin bị viết thường toàn bộ ("ccmn trần cung siêu thoáng" → "CCMN Trần Cung siêu thoáng"), sai chính tả (nghách→ngách, gác xếp→gác xép, dhoc→ĐH, STIU→Studio, vimcom→Vincom), thừa tab/ngoặc kép/khoảng trắng, tiêu đề dính cả đoạn mô tả rác. KHÔNG đổi nội dung/loại hình. Backup: `~/.mixstay-backups/backup-fix-titles-2026-07-24.json`.

### v9.28 — 2026-07-24 (rà pin lần cuối theo chuẩn "đúng tuyến đường": kéo thêm 97+7 pin về đúng phố)
- **Chốt chiến lược với chủ dự án:** đúng TUYẾN ĐƯỜNG là đạt (~95% yêu cầu); không chắc vị trí cụ thể → đặt 1 điểm TRÊN tuyến. `scripts/geocode-audit-pins.js` bản cuối: (1) chỉ tin kết quả mà **đoạn đầu display_name chứa đúng tên phố** — chặn hẳn Nominatim gạ "ngõ khác cùng phường" (Ngõ 64 Kim Giang khi hỏi Ngõ 236 Khương Đình); (2) tên phố **tự rút chữ thừa từ phải** ("Khương Đình đối diện Five Star" → "Khương Đình"); (3) thử "Phố X"/"Đường X" trước tên trần; (4) neo cửa ngõ lệch >0,3km / neo tuyến phố lệch >1km mới kéo về.
- Chạy toàn bộ: **kéo 97 pin về đúng tuyến** + xử tay nhóm Khương Đình/Khương Trung/Phú Đô chủ dự án báo.

### v9.27 — 2026-07-23 (re-pin chính xác 224 tòa: tra tới CỬA NGÕ + bắt buộc kết quả chứa đúng tên phố)
- **Chủ dự án soát thấy nhiều pin vẫn sai** (Đông Quan lạc sang Đống Đa, cụm Quan Nhân/Nguyễn Ngọc Vũ chụm 1 điểm...). 2 lỗi gốc: audit v9.26 nhận mỏ neo Nominatim mà KHÔNG kiểm display_name có chứa tên phố; và các vòng backfill cắt số ngõ nên pin rơi về giữa phố thay vì đúng ngõ (OSM Hà Nội thực ra có map từng ngõ).
- **`scripts/geocode-audit-pins.js` viết lại:** thử "Ngõ N + tên phố" trước (ra đúng cửa ngõ), lùi về tên phố; MỌI kết quả phải chứa tên phố trong display_name + trong 7km tâm quận; chỉ ghi khi lệch >0,25km. Chạy toàn bộ: **dời lại 224 pin**.
- Xử tay nhóm chủ dự án báo (Yên Hòa/Nguyễn Phúc Lai/Quan Nhân — tên phố trùng tên phường nên máy dễ lẫn) + sửa 2 ô tên đường ghi bậy ("Ô Chợ Dừa" → "Ngõ 16 Nguyễn Phúc Lai", "Yên Hòa" → "Ngõ 125 Nguyễn Ngọc Vũ").

### v9.26 — 2026-07-23 (audit pin toàn bộ + gộp quận trùng hoa-thường — phủ pin 100%)
- **Audit pin theo tuyến phố** (`scripts/geocode-audit-pins.js` mới): đối chiếu pin từng tòa với vị trí TUYẾN PHỐ của chính nó (geocode mỗi cụm phố+quận 1 lần) — pin lệch >3km khỏi phố mình thì ghim lại. Sửa **43 pin sai** (Yên Xá lệch 8,9km, Chùa Láng 7,1km, Tân Ấp/Phú Lương pin nhầm về Hồ Gươm...) + 4 ca chủ dự án báo + ca Bạch Mai bị ô tên đường ghi bậy "Pháo Đài Láng". Backup: `~/.mixstay-backups/backup-fix-pins-2026-07-23.json`.
- **Ghim nốt "Ngõ Hòa Bình 6 Minh Khai"** (chủ dự án xác nhận thuộc Hai Bà Trưng) → phủ pin **466/466 tòa (100%)**.
- **Gộp quận trùng hoa-thường:** 36 tòa "đống đa "/"THANH XUÂN"/"bắc từ liêm"... về đúng tên chuẩn — bản đồ hết cảnh 1 quận 3 cụm; sửa 2 quận ghi nhầm (Chương Dương→Hoàn Kiếm, Quốc Oai→Thanh Trì). **Chặn tái phát:** helper `canonicalDistrict()` (lib/hanoi-locations.ts) tự chuẩn hóa tên quận ở API tạo/sửa tòa + import Excel.

### v9.25 — 2026-07-23 (geocode nấc 4 bằng AI: địa chỉ bẩn vẫn tự ghim gần đúng lên bản đồ)
- **`lib/geocode.ts` thêm bước 4 (AI):** khi 3 nấc thường trượt, Gemini BÓC TÁCH địa chỉ bẩn thành `{phố chuẩn, phường, mốc lân cận}` (VD "Nhà 66 ven hồ Hạ Đình, ngay trường tiểu học Hạ Đình" → mốc "Trường tiểu học Hạ Đình") rồi geocode từng phần qua Nominatim. Gemini KHÔNG bao giờ tự trả tọa độ (chống bịa) — Nominatim định vị + chốt chặn 7km quanh tâm quận vẫn giữ nguyên. Ghim gần đúng khu vực là đạt (theo yêu cầu chủ dự án — người đăng lớn tuổi không cần biết dùng bản đồ). Fail-soft: không có key/AI lỗi → trả null, không chặn lưu tòa.
- **`lib/gemini.ts`:** xoay key cả khi Google trả 5xx (503 quá tải thoáng qua) — trước chỉ xoay khi 429.
- **Backfill nốt dữ liệu cũ** (AI + xử tay từng ca qua Nominatim có kiểm vùng): phủ tọa độ **465/466 tòa (99,8%)**. Còn đúng 1 tòa "Hoà Bình 6 Minh Khai" ghi quận Hai Bà Trưng nhưng phố Hòa Bình 6 thật nằm ở Bắc Từ Liêm — mâu thuẫn dữ liệu, cần admin xác nhận đúng quận rồi sửa.

### v9.24 — 2026-07-23 (bản đồ: gọn attribution + phủ pin 96% + vá geocode theo hệ phường mới OSM)
- **Ẩn hộp attribution mặc định của Leaflet** (chữ "Leaflet" + cờ) trên `/ban-do`; giữ dòng **© OpenStreetMap** thu nhỏ, mờ ở góc (bắt buộc theo giấy phép tile OSM — không được bỏ hẳn).
- **Tìm ra gốc rễ tòa không hiện pin:** OSM Hà Nội đã chuyển sang HỆ PHƯỜNG MỚI (bỏ cấp quận) → query Nominatim kèm tên quận cũ ("X, Hai Bà Trưng") trượt hàng loạt; cộng thêm streetName chứa "ngõ 91/1..." Nominatim không biết. 172/466 tòa thiếu tọa độ.
- **Backfill 4 vòng** (fullAddress → làm sạch → tên phố trần → bỏ quận + xác minh 7km quanh tâm quận): 172 → còn **19 tòa** thiếu pin (địa chỉ quá bẩn kiểu "TÒA 148", cần sửa tay). Phủ tọa độ **447/466 (96%)**, bản đồ hiện **429 pin**.
- **Vá `lib/geocode.ts` cho tòa MỚI:** thêm bước 3 — bóc ngõ/ngách lấy tên phố trần, query KHÔNG kèm quận, chỉ nhận kết quả trong 7km quanh tâm quận (bảng `DISTRICT_CENTERS` 13 quận, median từ 447 tòa đã pin) — tòa mới đăng sẽ tự có pin với tỷ lệ cao hơn hẳn, không lặp lại lỗi cũ.

### v9.23 — 2026-07-23 (kho công ty: khóa khách trong hệ sinh thái công ty — không link/hotline ra ngoài)
- **Chế độ kho công ty trên trang tin lẻ:** thẻ phòng ở `/share/company/[id]` dẫn sang `/tin/[id]?kho=<companyId>` — trang tin nhận `?kho=` (chỉ hiệu lực khi đúng công ty của tin, không hiệu lực trên link CTV) và: logo KHÔNG dẫn về trang chủ; nav thay hotline MixStay bằng nút "🏢 Kho phòng {công ty}" quay về kho; **Tin đăng liên quan chỉ gợi ý tin CÙNG công ty** (`/api/rooms/related?companyId=`) và các thẻ liên quan giữ nguyên `?kho=` khi bấm tiếp; nút chia sẻ cũng giữ `?kho=`.
- **Liên hệ chỉ về công ty/quản lý tòa:** FAB Zalo = link nhóm Zalo công ty → SĐT chủ tòa (KHÔNG fallback Zalo hệ thống); FAB Gọi = SĐT công ty → SĐT chủ tòa, không có thì ẨN (không hiện hotline MixStay). API `rooms/public/[id]` trả thêm `company.phone` cho việc này. Trang kho `/share/company` cũng bỏ fallback hotline MixStay khi công ty thiếu SĐT.
- Trang `/tin` thường (không `?kho=`) + link chia sẻ CTV giữ nguyên hành vi cũ.

### v9.22 — 2026-07-23 (hoàn tất mô tả tin: 760/760 tin đủ mô tả, gỡ cron)
- **219 tin còn thiếu mô tả đã được Claude viết trực tiếp** (6 luồng song song, chỉ dùng dữ kiện thật của tin, cấm số nhà/SĐT, văn phong đa dạng) + guard khi ghi DB: chỉ ghi tin mô tả còn <40 ký tự, chặn mô tả lộ dãy số giống SĐT. Kết quả: **0/760 tin thiếu mô tả**.
- **Gỡ cron 15:30** (không cần nữa, đỡ tốn tài nguyên/quota); `scripts/ai-fill-descriptions.js` vẫn giữ trong repo — chạy tay khi có tin mới thiếu mô tả.

### v9.21 — 2026-07-23 (đợt chuẩn hóa dữ liệu: tách số nhà, sửa tiêu đề, AI viết mô tả ngắn)
- **Backup trước khi sửa:** toàn bộ bản gốc lưu `~/.mixstay-backups/backup-chuanhoa-2026-07-23.json` (hoàn tác được).
- **③ Tách số nhà viết nhầm vào ô ngõ/đường:** 101/101 tòa — thuật toán từ `lib/address.ts` (redact/extract), 100 tự động + 1 sửa tay ("55/55/78"); chuẩn hóa luôn ô số nhà bị nhét cả địa chỉ.
- **① Tiêu đề không dấu:** 4/4 tin sửa bằng AI + soát tay ("cho thuee mat bang kim giang"→"Cho thuê mặt bằng Kim Giang" — giữ đúng loại hình).
- **② Mô tả quá ngắn (<40 ký tự):** script mới `scripts/ai-fill-descriptions.js` — AI viết mô tả CHỈ từ dữ liệu thật của tin (cấm bịa/số nhà/SĐT), idempotent. Đã ghi 6/286, HẾT QUOTA Gemini ngày (1 key); chạy lại `node scripts/ai-fill-descriptions.js` khi quota reset (hoặc thêm GEMINI_API_KEY_2… để nhanh hơn) — tự làm nốt 280 tin còn lại.

### v9.20 — 2026-07-23 (AI chuẩn hóa: giữ đúng loại hình tiêu đề gốc + user sửa được kết quả)
- **Giữ ý chính tiêu đề gốc:** prompt yêu cầu GIỮ NGUYÊN loại hình trong tiêu đề gốc — "mặt bằng"/"kho"/"văn phòng"/"nhà nguyên căn" không bị đổi thành loại phòng lấy từ trường Kiểu phòng; chỉ sửa chính tả + thêm dấu + làm gọn. Verify: "cho thuee mat bang kim giang" (typeName=don) → "Cho thuê mặt bằng Kim Giang 30m² có bãi đỗ ô tô" ✓.
- **User tham gia sửa kết quả AI:** preview trong "✨ AI chuẩn hóa tiêu đề + mô tả" đổi thành Ô NHẬP SỬA ĐƯỢC (input tiêu đề + textarea mô tả) — chỉnh xong bấm "Dùng bản này (đã gồm chỉnh sửa của bạn)" mới áp vào form, rồi vẫn phải bấm Lưu tin như thường.

### v9.19 — 2026-07-23 (AI chuẩn hóa CẢ TIÊU ĐỀ + mô tả tin đăng)
- **Vấn đề:** nhiều tin người dùng đăng tiêu đề không dấu ("cho thuee mat bang kim giang"), mô tả sơ sài; nút AI cũ chỉ viết lại MÔ TẢ.
- **Nâng cấp:** `/api/ai/listing` structured output trả `{title, description}` — tiêu đề chuẩn hóa tiếng Việt CÓ DẤU ≤60 ký tự (giữ ý + địa danh, không số nhà/SĐT). `AiListingAssistant` (nút "✨ AI chuẩn hóa tiêu đề + mô tả" trong form Sửa tin — admin/chủ nhà đều dùng được) preview cả 2, bấm "Dùng bản này" áp vào cả ô tiêu đề lẫn mô tả (không auto-lưu, người dùng bấm Lưu như thường).
- Verify: "cho thuee mat bang kim giang" → "Cho thuê phòng đơn Kim Giang 30m² ban công, đủ đồ" + mô tả gọn giữ đúng số liệu.

### v9.18 — 2026-07-23 (bộ lọc "Chờ duyệt" ở quản trị Tin đăng + staff thấy được tin chờ duyệt)
- **Thiếu lọc duyệt:** admin muốn duyệt tin phải tự nhìn từng badge vàng. Thêm dropdown thứ 4: **"⏳ Chờ duyệt / ✓ Đã duyệt"** — lọc server-side (`/api/rooms?approved=false`), dò xuyên trang, dồn về trang 1.
- **Fix quyền kèm theo:** ADMIN_STAFF trước bị ép chỉ thấy tin đã duyệt → có quyền APPROVE_LISTINGS cũng KHÔNG thấy tin để duyệt. Nay admin-family (ADMIN + ADMIN_STAFF) thấy mọi tin.

### v9.17 — 2026-07-23 (fix menu quản trị mobile bị "rơi khỏi màn hình" + bảng Tin đăng 8 cột)
- **ROOT CAUSE menu mobile:** thanh menu dưới (bottom nav) vốn CÓ sẵn nhưng `<main>` (flex item) thiếu `min-w-0` → không co theo màn hình mà PHÌNH theo bảng rộng → mobile browser mở viewport như desktop (chữ bé tí, phải zoom out, bottom nav rơi xuống đáy trang ~2500px). Fix 1 dòng `min-w-0` → viewport mobile chuẩn 390px, menu dưới hiện NGAY trên mọi trang quản trị (mọi vai trò), bảng cuộn ngang gọn trong khung riêng.
- **Bảng Tin đăng 14 → 8 cột** (đỡ kéo ngang, laptop 1366px hết cuộn): gộp Ảnh vào cột Tin đăng; Loại + Diện tích + Ngắn hạn thành dòng phụ dưới tiêu đề; Công ty thành badge cạnh quận; Duyệt xếp dọc cùng cột Trạng thái. min-w bảng 1280→900.
- **Gợi ý vuốt ngang** "⇠ Vuốt ngang bảng ⇢" hiện trên mobile (nhiều người không biết bảng cuộn được).

### v9.16 — 2026-07-23 (bảng tin đăng gọn: tiêu đề dài tối đa 2 dòng, hết hàng cao)
- **Lỗi view:** tiêu đề tin dài (cột hẹp do bảng nhiều cột) gãy 5–6 dòng → mỗi hàng cao gấp 3, nhiều nền trắng, cuộn mãi mới hết trang.
- **Sửa:** cột "Tin đăng" + "Tòa nhà" đặt bề rộng tối thiểu (240px/170px, bảng đã có cuộn ngang) + tiêu đề `line-clamp-2` (tối đa 2 dòng, hover xem đủ). Áp cùng kiểu cho danh sách tin ở trang chủ nhà (list view + wizard) và kho CTV. Hàng từ ~330px → ~110px.

### v9.15 — 2026-07-23 (hết hẳn popup đổi trạng thái + chọn nhiều phòng đặt trạng thái hàng loạt)
- **Fix sót popup:** trang CHỦ NHÀ (landlord/properties) vẫn còn `prompt()` hỏi ngày khi bấm đổi trạng thái (v9.14 mới sửa trang admin) → đã bỏ ở CẢ 2 view (card + list): bấm là đổi ngay, sang "Sắp trống" tự đặt ngày = đầu tháng sau + ô ngày inline khung vàng "⚠️ Sẽ trống từ" để sửa (bỏ trống = đầu tháng sau).
- **Chọn nhiều phòng đặt trạng thái hàng loạt (admin/rooms):** checkbox từng dòng + chọn cả trang; tick chọn → thanh "Đã chọn N phòng" với 3 nút 🟢/🟡/🔴 đổi một thể ("Sắp trống" hàng loạt tự đặt đầu tháng sau, sửa lẻ từng phòng bằng ô ngày).

### v9.14 — 2026-07-23 (bật/tắt nhanh trạng thái phòng + infinite scroll trang /phong)
- **Bật/tắt nhanh trạng thái phòng (admin/rooms):** nút trạng thái mỗi dòng bấm để xoay vòng 🟢 Còn → 🟡 Sắp trống → 🔴 Hết → 🟢. Sang "Sắp trống" **tự đặt ngày = đầu tháng sau** (bỏ prompt cũ), kèm **ô ngày inline khung vàng** để sửa "sẽ trống từ"; để trống = tháng sau.
- **Trang /phong infinite scroll:** cuộn tới gần cuối **tự nạp thêm phòng** (IntersectionObserver, nạp trước ~600px), khỏi bấm "Xem thêm" (vẫn giữ nút dự phòng cho list ngắn). Verify Playwright: 12 → 36 phòng khi cuộn.

### v9.13 — 2026-07-22 (fix: mã công ty chưa ghép vào mã tin ở TRANG TIN CÔNG KHAI)
- **Lỗi:** trang tin công khai (`/tin/[id]`, `/share/[token]`) vẫn hiện `MS-RWQYQ5` dù tòa thuộc công ty có mã (VD TimeHouse #010) → phải là `MS-010-RWQYQ5`. Trước chỉ áp `formatListingCode` cho trang admin/broker/landlord, quên trang công khai; và API công khai không trả `company.code`.
- **Sửa:** API `/api/rooms/public/[id]` + `/api/share-links` thêm `code` vào company select; `ShareViewClient` ghép mã hiển thị `MS-<code>-XXXXXX` cho cả "Mã tin" lẫn nội dung Copy. Verify Playwright: `/tin/[id]` hiện đúng `MS-010-RWQYQ5`.

### v9.12 — 2026-07-21 (nút bản đồ nổi bật trên nav + gọn trên mobile)
- **Nav trang chủ:** nút bản đồ cạnh logo đổi từ link mờ → **nền vàng gold** (gold-400 + chữ brand-900, nổi bật trên nền nav xanh đậm), **bo góc rounded-xl giống nút Đăng ký**; text desktop "🗺️ Tìm trên bản đồ", mobile "🗺️ Bản đồ".
- **Module tìm phòng:** nút "Tìm phòng theo bản đồ" → "**Tìm theo bản đồ**" (ngắn gọn, bỏ icon), giữ **cạnh nút Tìm phòng** (mobile chia đôi hàng) cho gọn.

### v9.11 — 2026-07-21 (công ty: tự điền, cảnh báo trùng tên, quét & gộp công ty trùng)
- **Form tự điền công ty:** chủ nhà có ĐÚNG 1 công ty → form tạo tòa điền sẵn công ty đó (khỏi phải chọn, vẫn đổi được). `GET /api/companies?scope=mine` + `defaultCompanyId` cho PropertyForm.
- **Cảnh báo trùng tên khi tạo công ty:** gõ tên trùng công ty đã có (bỏ dấu) → PropertyForm (+ Công ty mới) hiện banner + nút "Dùng công ty này"; admin/companies hiện cảnh báo "đã có công ty tên này (mã …)".
- **Quét & gộp công ty trùng (admin/companies):** `GET /api/companies/duplicates` gom nhóm ≥2 công ty cùng tên (trừ nhóm đã đánh dấu không-trùng); banner "N nhóm nghi trùng" → chọn công ty giữ lại → `POST /api/companies/merge` (chuyển hết tòa về keeper + xoá các cty kia, transaction an toàn); hoặc "Không trùng — bỏ cảnh báo" (`POST /api/companies/duplicates` lưu Setting `dismissed_duplicate_companies`, ẩn nhóm đó vĩnh viễn).

### v9.10 — 2026-07-21 (fix: tòa chủ nhà "mồ côi" công ty — tự gắn công ty của chính họ)
- **Lỗi:** chủ nhà tạo công ty riêng (VD C QUỲNH VTL→TQ HOUSING, Viết Cường→HC HOUSE) nhưng khi thêm tòa lại không chọn công ty → tòa `companyId=null`, công ty hiện "0 tòa", cột Công ty ở admin hiện "—".
- **Vá gốc rễ:** `POST /api/properties` — nếu người tạo là LANDLORD, KHÔNG chọn công ty, VÀ có ĐÚNG 1 công ty do chính họ tạo → tự gắn tòa vào công ty đó (phủ mọi luồng: form, AI, import). Chủ nhà có 0 hoặc >1 công ty thì giữ nguyên (không đoán).
- **Dọn dữ liệu cũ:** gắn 6 tòa "mồ côi" của 2 chủ nhà (mỗi người đúng 1 công ty) về công ty của họ; bỏ qua tài khoản tạo nhiều công ty (admin) vì mơ hồ.

### v9.9 — 2026-07-21 (fix: cột Công ty ở admin/rooms hiện "—" dù tòa đã gắn công ty)
- **Lỗi:** bảng Tin đăng (admin/rooms) cột "Công ty" hiện "—" với nhiều tin dù tòa nhà đã thuộc công ty đã duyệt. Nguyên nhân: cột tra công ty QUA 2 lớp — `properties.find(...)` (list `useProperties` chỉ APPROVED, **limit 200**) rồi mới `companies.find(...)`; dự án có ~428 tòa APPROVED nên tòa NGOÀI top 200 → `prop=undefined` → hiện "—" (dù `r.property.company` đã có sẵn từ API).
- **Sửa:** lấy thẳng `r.property.company.name` / `r.property.companyId` (API `/api/rooms` đã trả cho admin) cho cột hiển thị, bộ lọc theo công ty, và export Excel — bỏ phụ thuộc list bị giới hạn. File: `app/admin/rooms/page.tsx`.

### v9.8 — 2026-07-19 (sửa bản đồ mobile: panel tìm địa điểm xuống bottom + 100dvh)
- **Root cause mobile bị che phần dưới bản đồ:** `h-screen` (= `100vh`) trên mobile tính cả phần bị browser chrome (URL bar, toolbar) che → phần đáy bản đồ bị mất. Sửa bằng `height: 100dvh` (dynamic viewport height, tự co khi toolbar hiện/ẩn).
- **Panel tìm địa điểm xuống bottom (giống Google Maps):** trước ở `top-16` (ngay dưới chip quận) → đưa xuống `bottom: max(12px, env(safe-area-inset-bottom))` — luôn nằm trên address bar/toolbar mobile, không bị che. iPhone có notch/home indicator dùng `safe-area-inset-bottom`.
- **Dropdown gợi ý mở lên trên:** `top-full` → `bottom-full` — dropdown hiển thị phía trên ô tìm thay vì xuống dưới, phù hợp khi panel ở bottom.
- **Thu gọn tip text** hiển thị khi chưa ghim vị trí cho gọn hơn.
- **Files thay đổi:** `app/ban-do/page.tsx` (`100dvh`), `app/ban-do/MapClient.tsx` (bottom + safe-area + dropdown direction).

### v9.7 — 2026-07-19 (nút Định vị địa điểm bất kỳ trên bản đồ + nhập Mã công ty trực tiếp)
- **Điền Mã công ty trực tiếp ngoài thẻ (`admin/companies`):**
  - Đưa ô nhập Mã công ty (`CompanyCodeInlineInput`) ra trực tiếp giao diện chính của thẻ công ty: **Tên công ty ➔ Trạng thái (Hoạt động/Tạm dừng) ➔ Ô điền Mã công ty**.
  - Admin có thể gõ trực tiếp mã (VD: `066`) và bấm nút `Lưu` (hoặc Enter) để cập nhật tức thì mà không cần bấm nút "Sửa" hay mở modal.
- **Nút "🎯 Định vị" & Ghim vị trí bất kỳ (`MapClient.tsx`):**
  - **Nhập tên địa điểm + Bấm 🎯 Định vị (hoặc Enter):** Gõ tên địa điểm (VD: *Đại học Bách Khoa*, *Ngã Tư Sở*, *88 Láng Hạ*...) rồi bấm nút **"🎯 Định vị"** ➔ Tự động xác định tọa độ (ưu tiên dữ liệu local trường ĐH/quận Hà Nội, fallback gọi Nominatim Geocoding API), ghim vị trí ngay lập tức 📍 (`customPin`), cuộn bản đồ tới vị trí đó và hiển thị slider bán kính.
  - **Ghim trực tiếp bằng cách click:** Click vào bất kỳ vị trí nào trên bản đồ để ghim nhanh điểm cần tìm.
  - **Slider bán kính nấc 500m:** Slider từ `0.5km` đến `10km`, mỗi nấc nhảy **500m** (`step=0.5`).
  - **Lọc & Báo cáo:** Tự động tính cự ly toán học, vẽ vòng tròn bán kính đỏ, lọc/tô nổi bật các tòa trong bán kính và báo tổng số tòa/số tin tìm thấy.

### v9.6 — 2026-07-17 (loạt sửa lớn: lọc/số liệu, mã công ty, bản đồ ĐH, đăng ký chủ nhà)
- **Lọc dồn trang 1 (server-side):** ô gõ-để-lọc ở admin/users, admin/properties, landlord/properties trước chỉ lọc client trên 20 dòng của trang → nay đẩy từ khoá + bộ lọc lên server, debounce + `setPage(1)`, dò xuyên toàn bộ. API properties search thêm fullAddress + tên chủ nhà.
- **Số liệu TỔNG nền tảng:** thẻ thống kê Quản lý người dùng + Giao dịch lấy `/api/users/stats` & `/api/deals/stats` (aggregate groupBy) thay vì cộng theo trang; hoa hồng gate `VIEW_FINANCIAL_REPORTS`.
- **Tiện ích:** bỏ trùng "Bình nóng lạnh" → "Bàn ăn"; RoomForm/QuickRoomTypeForm dùng chung `lib/listing-options`; migrate 667 phòng cũ "Bình nóng lạnh" → "Nóng lạnh".
- **Ô "Thuộc công ty":** `SearchableSelect` (gõ lọc); `scope=active` trả thêm công ty do CHÍNH user tạo (kể cả chờ duyệt) → chủ nhà chọn được công ty vừa tạo; tạo công ty chờ duyệt → notification nhắc admin.
- **Mã công ty:** `Company.code` (admin đặt, VD 066, unique ≤8 ký tự); mã tin HIỂN THỊ ghép `MS-066-XXXXXX` (không đổi listingCode gốc); tìm "066" ra mọi tin công ty đó. `lib/listing-code`: formatListingCode/parseComposedListingCode/normalizeCompanyCode.
- **Bản đồ:** chip quận đếm SỐ TIN; popup ảnh tòa banner lớn; bấm quận tô nổi bật (mờ quận khác); 18 trường ĐH lớn (`HANOI_UNIVERSITIES`) + chọn trường + slider bán kính 0.5–5km + toggle lọc + vòng tròn; nút trang chủ gradient nổi bật.
- **Cảnh báo trùng tòa (admin):** `/api/properties/duplicate-check` — tòa chờ duyệt hiện "⚠️ Có thể trùng" nếu tên gần giống cùng quận HOẶC toạ độ < ~150m; tự mất sau khi duyệt.
- **Đăng ký:** Chủ nhà đứng trước CTV; chủ nhà đăng ký kèm tên công ty → tạo công ty chờ duyệt; DUYỆT công ty → tự duyệt các TÒA NHÀ chờ duyệt của công ty (tin đăng vẫn duyệt riêng).

### v9.5.1 — 2026-07-17 (sửa bản đồ Google trang tin bị chặn + lối vào bản đồ dễ thấy hơn)
- **Sửa "This content is blocked" ở bản đồ trang tin đăng:** iframe Google Maps (`maps.google.com/...&output=embed`) bị CHÍNH CSP `frame-src` của app chặn từ đợt siết bảo mật (chỉ cho YouTube/TikTok/Facebook). Thêm `https://maps.google.com https://www.google.com` vào `frame-src` (next.config.js) → bản đồ chỉ đường trên trang tin hoạt động lại như cũ.
- **Nút bản đồ trên nav:** desktop đổi thành "🗺️ Tìm phòng theo bản đồ"; mobile hiện "🗺️ Bản đồ" (có chữ, không còn mỗi icon).
- **Mobile dễ thấy lối vào bản đồ:** thay link chữ nhỏ trong form tìm kiếm bằng nút to "🗺️ Tìm theo bản đồ" đứng cạnh nút "Tìm phòng" (mobile 2 nút chia đôi hàng, desktop nằm giữa).

### v9.5 — 2026-07-17 (Tạo tin nhanh bằng AI + Bản đồ tìm phòng)
- **⚡ Tạo tin nhanh bằng AI** (admin + chủ nhà): nút mới ở Quản lý phòng (admin) và Tòa nhà (chủ nhà) — dán nguyên tin đăng copy từ Facebook/Zalo → Gemini structured output (`POST /api/ai/parse-listing`, helper chung `lib/gemini.ts` xoay key) bóc tách vào đúng trường: tòa nhà (tên/quận/đường/số nhà/SĐT/flags đỗ xe-pet...), tin đăng (tiêu đề, kiểu phòng đúng 6 enum, m², giá "5tr5"→5500000, cọc, tiện ích khớp `lib/listing-options.ts`, phòng trống, mô tả đã dọn — TỰ LOẠI SĐT/địa chỉ khỏi mô tả). Tự match tòa CÓ SẴN theo tên+quận (landlord chỉ match tòa mình) hoặc tạo tòa mới ngay trong modal → đổ vào `RoomTypeForm` điền sẵn, người dùng bổ sung trường thiếu rồi Lưu như luồng thường (không auto-đăng; vẫn qua duyệt + `createdById`).
- **🗺️ Bản đồ tìm phòng `/ban-do`** (public): Leaflet + OpenStreetMap (miễn phí, không cần key). Zoom xa gom bong bóng theo QUẬN (bấm phóng tới), zoom gần pin từng tòa hiện "giá từ" → popup danh sách tin còn hàng link sang `/tin/[id]`. Pin đặt đúng vị trí nhưng KHÔNG kèm số nhà — tên tòa/tên đường qua `redactName`/`redactHouseNumber` như API public. `GET /api/rooms/map` (cache 5 phút) chỉ trả tòa APPROVED còn tin hiệu lực. Link vào từ PublicNav ("🗺️ Bản đồ") + PublicSearch ("Tìm trên bản đồ →").
- **Toạ độ tòa nhà:** backfill bằng `scripts/geocode-properties.js` + `geocode-properties-pass2.js` (vòng 2 làm sạch địa chỉ bẩn: bỏ số nhà/ngoặc, rút về tên ngõ/phố) — Nominatim/OSM 1 req/s, chặn toạ độ ngoài Hà Nội, KHÔNG rơi về tâm quận. Kết quả: **280/429 tòa có toạ độ, 272 tòa lên bản đồ**; 149 tòa địa chỉ quá bẩn cần admin sửa địa chỉ (lưu lại sẽ tự geocode). Tòa tạo/sửa từ nay TỰ geocode server-side (`lib/geocode.ts`, fail không chặn luồng lưu).
- **Vá redact tên tòa (`lib/address.ts`):** bắt thêm số nhà đứng giữa tên ("CCMN **26A** NGÁCH 52…", "TRỌ **68/53** CẦU GIẤY", "CCMN **69A** NGUYỄN TRÃI") mà không đụng số ngõ/ngách hợp lệ ("Ngõ 165/30…") hay số-đếm ("CCMN 5 tầng") — áp dụng cho cả API public lẫn bản đồ.

### v9.4.1 — 2026-07-16 (hotfix sửa lỗi refresh trang ở tìm kiếm CTV)
- **Sửa lỗi:** CTV gõ vào ô "Tìm kiếm thông minh" bị refresh/giật trang và mất focus. Nguyên nhân do `if (loading) return Skeleton` unmount toàn bộ component (bao gồm cả ô input).
- **Giải pháp:**
  - Loại bỏ check loading unmount toàn bộ giao diện; chuyển skeleton loading xuống phần danh sách tin đăng (`ROOM CARDS`).
  - Tách ô tìm kiếm sang state `localSearch`, chỉ trigger re-fetch thực sự khi bấm Enter hoặc click nút "Lọc" (hoặc khi tương tác các bộ lọc khác), đồng bộ với cơ chế dual slider giá để tránh spam API và tăng hiệu năng.

### v9.4 — 2026-07-15 (admin xem nguồn tin đăng + truy vết tài khoản tạo)
- **Nhu cầu:** admin muốn biết một tin do ai tạo (kể cả admin tạo hộ / import), tài khoản nào, đăng/cập nhật lúc nào.
- **Truy vết người tạo (mới):** thêm cột `RoomType.createdById` (`String?`, quan hệ `RoomTypeCreatedBy` → User, `onDelete: SetNull`, nullable cho 666 tin cũ) — ghi **tài khoản thực sự bấm tạo** ở `POST /api/rooms` và `POST /api/rooms/import` (`session.user.id`). Khác với "Chủ nhà" = chủ sở hữu tòa nhà (`property.landlordId`). Tin cũ hiện "Tin cũ — chưa ghi tài khoản tạo".
- **API:** `GET /api/rooms` trả thêm `createdBy {id,name,email,role}` — CHỈ cho ADMIN (không lộ ai tạo cho CTV/khách).
- **Modal Sửa tin đăng** (`app/admin/rooms`): khối "Nguồn tin đăng" (chỉ khi sửa tin có sẵn) — Người tạo (tên + badge vai trò + email) / Chủ nhà / Tài khoản chủ nhà (email) / SĐT (bấm gọi) / Công ty / Tòa nhà / Lượt xem / Đăng lúc / Cập nhật (`formatDateTime`).
- **Bảng danh sách:** cột "Tin đăng" thêm dòng nhỏ `👤 {tên chủ} · {ngày}` để liếc nhanh.
- ADMIN_STAFF thiếu quyền xem liên hệ vẫn thấy người tạo/công ty/thời gian, còn email/SĐT chủ nhà hiện "—".

### v9.3 — 2026-07-15 (cài web thành app trên điện thoại — PWA đầy đủ)
- **Vấn đề:** iPhone thêm web vào Màn hình chính nhưng icon là ảnh chụp trang + mở ra vẫn có thanh Safari (không giống app). Nguyên nhân: thiếu `apple-touch-icon` và các meta `apple-mobile-web-app-*` (iOS bỏ qua `manifest.json`, chỉ đọc meta apple-*).
- **Icon app:** tạo `public/apple-touch-icon.png` 180×180 (flatten nền xanh `#1b3624` để iOS không bo góc thành viền đen) + `favicon-32.png`. Khai báo qua `metadata.icons` + `metadata.appleWebApp` trong `app/layout.tsx`; `theme_color`/manifest đồng bộ về `#1b3624`.
- **Service worker** `public/sw.js`: đủ điều kiện "cài đặt" trên Android/Chrome (cần SW có fetch handler) + mở được khi mất mạng. An toàn: trang = network-first (offline mới lấy cache), `/api` + `/_next/data` KHÔNG cache (dữ liệu & đăng nhập luôn thật), tĩnh băm hash = cache-first. Chỉ đăng ký ở domain thật, bỏ qua localhost.
- **Banner cài đặt** `components/ui/InstallPWA.tsx`: tự nhận diện thiết bị — Android/Chrome desktop bắt `beforeinstallprompt` → nút "Cài đặt" 1 chạm; iPhone Safari → hướng dẫn Chia sẻ → Thêm vào Màn hình chính; iPhone mở bằng Chrome/app khác → nhắc mở lại bằng Safari. Ẩn khi đã chạy standalone hoặc user tắt (nhớ trong localStorage).
- **Nhớ đăng nhập:** session JWT đã đặt `maxAge` 30 ngày → mở app lần sau vẫn đăng nhập sẵn (không phải đổi gì).

### v9.2 — 2026-07-14 (giữ bộ lọc tìm phòng khi bấm Back)
- **Lỗi:** khách lọc phòng ở trang chủ / `/phong`, bấm vào 1 tin để xem rồi Back → bộ lọc, danh sách kết quả và vị trí cuộn **mất sạch** (phải lọc lại từ đầu). Nguyên nhân: `app/PublicSearch.tsx` giữ toàn bộ filter + results trong React state, không có trong URL — Back làm component mount lại với state rỗng.
- **Sửa:** mỗi lần tìm / "Xem thêm", bộ lọc + số trang đã tải được ghi vào URL bằng `history.replaceState` (`?q=&district=&typeName=&minPrice=&maxPrice=&parkingCar=…&p=2`). Lúc mount, component đọc lại URL → khôi phục form và **gộp N trang vào 1 request** (`limit = 12×N`, tối đa 8 trang vì API kẹp `limit ≤ 100`) nên "Xem thêm" tiếp theo vẫn khớp offset, không trùng/sót tin.
- **Cuộn về đúng chỗ:** vị trí cuộn được lưu vào `sessionStorage` khi bấm vào thẻ phòng, khôi phục sau khi kết quả render xong (Next tự khôi phục scroll quá sớm — lúc đó danh sách chưa có).
- **Phụ:** link có bộ lọc giờ chia sẻ / bookmark được (mở ra là thấy đúng kết quả); "Xoá lọc" khi đang có kết quả sẽ tìm lại không lọc để URL luôn khớp danh sách đang hiện.

### v9.1 — 2026-07-13 (CTV bắt buộc có SĐT trước khi tạo link chia sẻ)
- **Trang hồ sơ tự phục vụ:** `app/broker/profile` + API `app/api/users/me` (GET/PUT) — trước đây chỉ có `PUT /api/users` (gated `MANAGE_USERS` = admin) nên CTV **không có cách nào tự điền SĐT**. `/api/users/me` chỉ cho sửa `name` + `phone`, KHÔNG đụng role/permissions/isActive (chống tự nâng quyền); chặn SĐT trùng tài khoản khác (409) vì SĐT là field đăng nhập.
- **Chặn tạo link khi thiếu SĐT:** `POST /api/share-links` kiểm SĐT trong DB với role BROKER (cả link lẻ lẫn link kho) → 400 `{ code: 'PHONE_REQUIRED' }`. Client (`/broker/inventory`, `/broker/share-links`) bắt code này → toast + đẩy sang `/broker/profile?need=phone`.
- **Nhắc trước khi bấm:** `components/ui/PhoneRequiredNotice.tsx` — banner vàng ở đầu trang Kho hàng + Link chia sẻ khi CTV chưa có SĐT. Sidebar CTV thêm mục "Hồ sơ".
- **Session refresh ngay:** `lib/auth.ts` jwt callback nạp lại DB khi `trigger === 'update'` (trước chỉ refresh mỗi 60s) → lưu hồ sơ xong là banner tắt luôn.

### v9.0 — 2026-07-13 (nút liên hệ trang kho CTV + ảnh preview link Zalo)
- **Trang kho CTV (`/share/system/[token]`) luôn có nút liên hệ:** trước đây nút Zalo/Gọi chỉ hiện khi người tạo link có SĐT trong hồ sơ → 4/8 CTV không điền SĐT ⇒ trang kho của họ KHÔNG có nút liên hệ nào. Nay FAB Zalo + Gọi luôn hiển thị (không có SĐT → lùi về Zalo/hotline hệ thống, giống trang tin đăng lẻ). Thêm nút liên hệ **dính đáy modal chi tiết phòng** (FAB bị lớp phủ modal che) và nút Zalo/Gọi trong thẻ CTA cuối trang.
- **Ảnh preview khi share link lên Zalo:** `og:image` cũ trỏ thẳng ảnh gốc Supabase — 324/465 tin có ảnh đầu là `.webp` mà **Zalo không hiển thị WebP** ⇒ mất thumbnail trong chat (link nào ảnh `.jpg` thì hiện → tưởng lỗi theo loại link). Nay mọi trang chia sẻ (`/tin/[id]`, `/share/[token]`, `/p/[token]`, `/share/system/[token]`) dùng `og:image = /api/og/{roomTypeId}` → JPEG 1200×630 (sharp), kèm `og:image:width/height/type` + `twitter:card=summary_large_image`. Thứ tự nguồn ảnh: ảnh phòng → ảnh tòa nhà → thumbnail YouTube (tin chỉ có video) → `/default.jpg`. Link kho (`/share/system`) trước đây KHÔNG có `og:image` nào, nay có ảnh đại diện.

### v8.9 — 2026-07-06 (tìm phòng theo từ khóa + nút tìm nổi ngay trang chủ)
- **Tìm theo TỪ KHÓA ở trang chủ:** thêm ô tìm + nút "Tìm" ngay ĐẦU khung lọc (`app/PublicSearch.tsx`). API `/api/rooms/public` nhận `?q=` → khớp tên tin, mã tin (MS-…), mô tả, tên đường/khu vực, quận, tên tòa (case-insensitive; các điều kiện property được AND với bộ lọc gốc nên không lộ tin ẩn/chưa duyệt). Từ khóa gộp AND với các bộ lọc khác; `loadMore` giữ nguyên từ khóa; "Xoá lọc" xoá cả từ khóa.
- **Mobile: thấy nút Tìm ngay khi vào** (không phải vuốt): gọn hero (`pt-20`, tiêu đề `text-2xl`, bớt margin) + đặt ô tìm + nút "Tìm" lên trên cùng khung lọc → nút search nằm ~y222px (trên nếp gấp màn 375×812).

### v8.8 — 2026-07-03 (chủ nhà chọn/tạo công ty + duyệt công ty + lọc tòa nhà)
- **Chủ nhà tự đăng tin chọn công ty:** form tòa nhà (`PropertyForm`) hiện ô "Thuộc công ty" cho CẢ chủ nhà (trước chỉ admin), lấy danh sách **công ty đang hoạt động + đã duyệt** (`useActiveCompanies` → `GET /api/companies?scope=active`).
- **Tạo công ty mới ngay trong form** (nút "+ Công ty mới"): chủ nhà tự tạo → công ty **CHỜ DUYỆT** (`isApproved=false`), chưa vào danh sách đang chạy; admin/quản trị tạo → duyệt luôn. `POST /api/companies` cho phép LANDLORD (server tự set isApproved theo vai trò).
- **Admin duyệt công ty:** `/admin/companies` thêm bộ lọc **Tất cả / Chờ duyệt (N) / Đã duyệt**, badge "Chờ duyệt" + viền vàng, nút **"✓ Duyệt công ty này"** (`PUT isApproved=true` → tự bật `isActive`). Đếm "N chờ duyệt" ở tiêu đề.
- **Lọc tòa nhà nhanh:** `/admin/properties` thêm ô **gõ để lọc** theo tên/địa chỉ/quận/chủ nhà (không dấu, lọc tức thì client-side) — riêng 1 dòng; 3 select (công ty/chủ nhà/trạng thái) gom 1 hàng responsive.
- **Schema:** `Company.isApproved Boolean @default(true)` (công ty cũ giữ nguyên đã duyệt) + `createdById`. Ẩn công ty chờ duyệt khỏi: ô chọn công ty (chủ nhà/CTV), kho công ty công khai (`/api/companies/[id]/inventory`, `/share/company/[id]` thêm `isApproved: true`). Kho CTV chuyển sang `useActiveCompanies`.

### v8.7 — 2026-07-03 (gọn giao diện + responsive admin + phí dịch vụ)
- **Thẻ tin chỉ có video (không ảnh):** thay placeholder 🏠 trống bằng ảnh đại diện lấy từ video — video upload (khung hình đầu) / thumbnail YouTube / nền gradient + nút ▶ + badge 🎬. Helper chung `pickVideoCover()` (lib/video-utils.ts); API `rooms/public`, `companies/[id]/inventory`, `saved-listings` trả thêm `videos[]`.
- **Gọn module tìm kiếm trang chủ** (`app/PublicSearch.tsx`): giảm padding/margin giữa các phần (p-3 sm:p-4, mb-6, divider mt-3 pt-3, pill px-2.5 py-1) → bớt khoảng trống ~35%.
- **Bộ lọc admin gọn 1 hàng:** `admin/users` — 3 bộ lọc (vai trò/trạng thái/sắp xếp) vào `grid sm:grid-cols-3`, ô tìm kiếm riêng 1 dòng. `admin/rooms` — "Tất cả tòa nhà" tách RIÊNG 1 dòng dạng typeahead `SearchableSelect` (gõ lọc dần, bắt buộc chọn trong danh sách); Công ty + Kiểu phòng + Trạng thái cùng 1 hàng.
- **Dịch vụ tòa nhà — điền sẵn mặc định** (`PropertyForm`): Điện 4000 / Nước 120000 / Dịch vụ chung 150000 / Internet 100000; người dùng chỉ sửa lại.
- **Hiển thị phí dịch vụ đầy đủ:** helper `formatServiceValue(label,value)` (lib/utils.ts) → "Điện: 4.000đ/số", "Nước: 120.000đ/người", "Internet: 100.000đ/phòng" (thêm dấu nghìn + đơn vị suy từ tên; số <1000 hiểu là "nghìn"). Áp ở trang tin đăng.
- **Trang tin đăng:** đưa Đặt cọc lên CÙNG dòng với giá thuê, đẩy sát lề phải (`ml-auto`), tự xuống dòng khi màn hình hẹp.
- **Responsive admin (mobile + PC):** topbar padding `px-3 sm:px-6` + role label `truncate`; mobile bottom-nav hiện ĐỦ mục (cuộn ngang, bỏ giới hạn 4); `.stat-card`/`.table-cell`/`.table-header` padding co theo breakpoint; thêm util `.scrollbar-hide`.

### v8.6 — 2026-06-22
- **Bật lại đăng nhập Google (OAuth) cho user tự đăng ký:**
  - Sửa flag hiển thị nút OAuth ở `app/login/page.tsx` + `app/register/page.tsx`: từ presence-based `!!(process.env.NEXT_PUBLIC_GOOGLE_ENABLED)` (lỗi: `!!"false" === true`) sang `=== 'true'` → để trống/"false" = ẩn nút, "true" = hiện. Áp cho cả google/facebook/apple.
  - `.env`: dọn block GOOGLE bị trùng (xuất hiện 2 lần) → gom 1, ghi rõ redirect URIs (localhost + mixstay.vn). `.env.example`: default 3 cờ `*_ENABLED=false` cho khớp ngữ nghĩa mới (fresh clone không hiện nút OAuth gãy).
  - Server provider (`lib/auth.ts`) vốn đã tự bật khi có `GOOGLE_CLIENT_ID`+`SECRET` (không đổi). Luồng tự đăng ký: nút → `signIn('google', {callbackUrl:'/auth/callback'})` → user mới chọn vai trò ở `/auth/callback` → tạo tài khoản.
  - **Còn lại để bật trên Production (mixstay.vn):** thêm redirect URIs mixstay.vn vào OAuth client (Google Console) + publish OAuth consent screen (Production) + set `GOOGLE_CLIENT_ID/SECRET` + `NEXT_PUBLIC_GOOGLE_ENABLED=true` ở Vercel env + redeploy. Scope cơ bản (email/profile/openid) KHÔNG cần Google "verification" để user đăng nhập được.

### v8.5 — 2026-06-20
- **Gate API companies + settings ở tầng server (đóng TODO v9 của v8.4):**
  - `api/companies/*` (GET/POST/PUT/DELETE): thay check `role==='ADMIN'` thô bằng `requirePermission(session,'MANAGE_COMPANIES')` → ADMIN bypass, ADMIN_STAFF có quyền (vd `manager@`) dùng được, thiếu quyền → 403.
  - `api/settings/*` (GET + POST): `requirePermission(session,'EDIT_COMMISSION')`. Lý do: setting duy nhất là `commission_broker_percent` — đúng phạm vi `EDIT_COMMISSION`; không có permission "view settings" riêng nên gate cả đọc lẫn ghi. GET trước đây KHÔNG có auth (ai cũng đọc) → đã vá.
  - Sidebar: "Công ty" gate `MANAGE_COMPANIES`, "Cài đặt" gate `EDIT_COMMISSION` (thay vì ẩn cứng). `MenuItem.perm` mở rộng từ literal `'MANAGE_USERS'` → `AdminPermission`. middleware redirect `/admin/{companies,users,settings}` cho ADMIN_STAFF thiếu quyền tương ứng.
- **Vá 7 lỗ hổng phân quyền (authz) tự phát hiện khi rà — KHÔNG nằm trong 9 permission nhưng nghiêm trọng:**
  - `rooms` PUT/POST/DELETE: thêm chặn role + check sở hữu. Trước đây BẤT KỲ ai đăng nhập (kể cả CUSTOMER) cũng sửa/xoá/tạo được mọi tin đăng. Nay: ADMIN/ADMIN_STAFF, hoặc LANDLORD sở hữu tòa; BROKER/CUSTOMER → 403. Chỉ ADMIN-family được đổi `isApproved` (landlord không tự duyệt).
  - `properties` POST: chỉ LANDLORD/ADMIN/ADMIN_STAFF (chặn BROKER/CUSTOMER tạo property với `landlordId` tuỳ ý).
  - `deals` POST: chỉ BROKER/ADMIN/ADMIN_STAFF (chặn CUSTOMER/LANDLORD tạo deal với `brokerId` tuỳ ý).
  - `inquiries` PUT: thêm check sở hữu (chủ nhà chỉ trả lời câu hỏi của tin đăng MÌNH) — trước đây chủ nhà A reply "HẾT" ép phòng chủ nhà B về UNAVAILABLE.
  - `notifications` PUT: scope `updateMany({id, userId})` chống IDOR (trước đây đọc/đánh dấu được thông báo người khác).
- **APPROVE_LISTINGS — sửa lỗi chức năng:** `rooms` PUT đổi guard từ presence-check sang **diff** `isApproved`. Trước đây staff thiếu APPROVE_LISTINGS bị 403 khi lưu BẤT KỲ sửa đổi nào của tin đăng (vì form luôn gửi kèm `isApproved`); nay chỉ chặn khi thực sự đổi trạng thái duyệt.
- **VIEW_FINANCIAL_REPORTS UI:** card "Doanh thu HH"/"Tổng HH" ở admin Tổng quan hiện "—" thay vì "0 ₫" gây hiểu nhầm khi staff bị field-strip.
- **`listingCode` — mã tin đăng cho mỗi RoomType:**
  - Schema: `RoomType.listingCode String? @unique` (nullable trước cho an toàn dữ liệu cũ; backfill phủ hết → thực tế không còn null; chưa siết NOT NULL).
  - Format: `"MS-" + 6 ký tự IN HOA` từ bảng `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (bỏ 0/O, 1/I/L dễ nhầm) → vd `MS-7K3P9Q`. Random (không tăng dần) ⇒ không lộ tổng số tin, không đoán được tin khác. **Bất biến** (sinh server-side khi tạo, client không gửi/sửa được).
  - Helper: `lib/listing-code.ts` (client-safe: `LISTING_CODE_REGEX`, `normalizeListingCode`) + `lib/listing-code-server.ts` (server-only, dùng `crypto`: `generateListingCode`, `generateUniqueListingCode` — retry chống trùng, `@unique` là chốt chặn cuối). Tách 2 file để KHÔNG kéo `crypto` vào client bundle.
  - Gắn vào `POST /api/rooms` (tin mới tự có mã). Hiển thị badge "Mã: MS-…" ở: card+list chủ nhà, card+modal inventory môi giới, bảng + modal Phòng admin, và trang tin đăng share link (khách/đối tác trích dẫn được). Tìm kiếm theo mã (admin có ô tìm server-side; broker dùng ô "Tìm kiếm thông minh"; landlord lọc client) — nhập mã đầy đủ → tra chính xác, nhập 1 phần → contains. API trả `listingCode`: rooms, share-links, rooms/public, rooms/related.
- **Sau khi pull code v8.5:** `npx prisma db push --accept-data-loss` (additive: thêm cột `listingCode` nullable + unique index — cảnh báo data-loss là generic, cột mới toàn NULL nên 0 trùng, an toàn) → `npm run db:backfill-codes` (idempotent, sinh mã cho tin cũ, tự verify 100% có mã & không null).

### v8.4.1 — 2026-06-19 (docs sync)
- Đồng bộ `CLAUDE.md` + `README.md` với schema v8.4: bổ sung `ADMIN_STAFF` + hệ RBAC (enum `Permission` 9 quyền, `User.permissions[]`, guard `lib/permissions.ts` / `lib/permissions-server.ts`, cơ chế field-strip số liệu tài chính).
- Sửa mô tả RoomType: bỏ `isAvailable`, dùng `status` (RoomStatus: AVAILABLE/UPCOMING/UNAVAILABLE) + `expectedAvailableDate`. Bổ sung `parkingBike` vào tiện ích Property.
- Bổ sung file vào cấu trúc thư mục: `lib/{permissions,permissions-server,user-company,zalo,supabase}.ts`, `components/ui/{DistrictPills,PriceRangeSlider,ZaloFab}`, thư mục `components/forms/`.
- Xác nhận brand chính thức là **MixStay**; `PriceRangeSlider` hiện ở mức **0–20tr** (step 500k).
- Chỉ cập nhật tài liệu — KHÔNG đổi schema/DB, không chạy `prisma db push`.

### v8.4 — 2026-04-30
- **Login page 7 demo cards:** grid 4 cột (2×4, ô cuối trống), mỗi card icon + role + email, click auto-fill. Thêm `company@`, `customer@`, `staff@`, `manager@`. Helper text mật khẩu chung `123456`.
- **RBAC cho admin staff (permission system):**
  - Schema: `enum Role` thêm `ADMIN_STAFF`; `enum Permission` (9 quyền: TRANSFER_PROPERTY_OWNERSHIP, DELETE_PROPERTY, EDIT_COMMISSION, APPROVE_LISTINGS, MANAGE_USERS, VIEW_FINANCIAL_REPORTS, EXPORT_DATA, MANAGE_COMPANIES, MANAGE_SYSTEM_SHARE_LINKS); `User.permissions Permission[]`.
  - `lib/permissions.ts` (client-safe): `hasPermission()`, `ALL_ADMIN_PERMISSIONS`. `lib/permissions-server.ts`: `requirePermission()` API guard. ADMIN bypass tất cả; ADMIN_STAFF cần permission trong array.
  - JWT/session callback (`lib/auth.ts`) include `permissions`.
  - **API guard 10 endpoint:** properties PUT (transfer + approve), DELETE (delete); rooms POST/PUT (commission + approve); users CRUD (manage users + chống privilege escalation); share-links POST/DELETE + system POST (manage system links). dashboard-stats + deals GET: **field-strip** (giữ key, set null) số tài chính nếu thiếu VIEW_FINANCIAL_REPORTS.
  - **UI gate:** sidebar ẩn "Người dùng"/"Cài đặt" theo quyền; nút Xuất Excel / Xoá tòa nhà / Duyệt tin / section Hoa hồng disable + tooltip nếu thiếu quyền tương ứng.
  - **Admin/users editor:** chọn role=ADMIN_STAFF → hiện 9 checkbox permission (label + mô tả tiếng Việt), pre-check theo permission hiện có. Badge phân biệt Super Admin (👑) vs Staff (🛡️ X quyền).
  - middleware: `/admin/*` cho cả ADMIN + ADMIN_STAFF; `/admin/settings` chặn staff.
- **Admin chuyển sở hữu tòa nhà:** PropertyForm khi edit hiện selector chủ nhà — enabled nếu có TRANSFER_PROPERTY_OWNERSHIP, disabled + tooltip nếu không. Đổi chủ nhà → warning "tin đăng/giao dịch/link share chuyển theo". RoomType ownership qua `property.landlordId` (không cần cascade).
- **Seed:** thêm `staff@mixstay.vn` `[APPROVE_LISTINGS, VIEW_FINANCIAL_REPORTS]` + `manager@mixstay.vn` `[APPROVE_LISTINGS, EXPORT_DATA, MANAGE_COMPANIES, MANAGE_SYSTEM_SHARE_LINKS]` (không có VIEW_FINANCIAL_REPORTS → demo field-strip).
- **TODO v9:** wrap permission cho `api/companies` (MANAGE_COMPANIES) + `api/settings` (EDIT_COMMISSION) — hiện skip, staff bị chặn ở UI (ẩn menu). → ✅ **đã làm ở v8.5.**
- **Sau khi pull code v8.4:** `npx prisma db push --skip-generate` (additive: Permission enum + permissions column), rồi `npm run db:seed`.

### v8.3.1 — 2026-04-29 (hotfix)
- **PriceRangeSlider 0 - 50.000.000 step 500.000:** đổi range từ 1tr-20tr sang 0-50tr để cover hết spectrum thị trường (phòng 0₫ rất hiếm nhưng giữ slot, phòng cao cấp lên tới 50tr).
- **Explicit apply (no live filter):**
  - **Broker:** thêm `pendingPrice` state. Slider onChange → set pending; bấm nút **Lọc** → copy pending vào filter chính → SWR re-fetch. Badge cảnh báo "⚠️ Chưa áp dụng — bấm Lọc" khi pending lệch applied.
  - **Public:** đổi 2 input số `priceMin/priceMax` sang slider. Public đã có nút **Tìm phòng** + form `onSubmit={handleSearch}` từ trước → slider onChange chỉ set state, fetch chỉ trigger khi bấm submit. Nhất quán với pills + features (cũng explicit-submit).
- **Smart label:** "Mọi mức giá" khi cả 2 handle ở 2 đầu, "Đến X₫" khi chỉ giới hạn trên, "Từ X₫" khi chỉ giới hạn dưới, "X — Y₫" khi cả 2.

### v8.3 — 2026-04-29
- **Bug fix admin thêm tòa nhà:** Form không có selector chủ nhà → POST không có `landlordId` → Prisma fail nhưng API nuốt lỗi thành "Lỗi server". Fix: thêm landlord selector (search input + select) khi `isAdmin && !isEdit`, API guard early-return 400 khi thiếu, client đọc `error.message` thật từ response, áp cho cả admin + landlord pages.
- **Schema 3 trạng thái RoomType:** Bỏ `isAvailable Boolean`, thêm `enum RoomStatus { AVAILABLE / UNAVAILABLE / UPCOMING }` + `expectedAvailableDate DateTime?`. Migration script `prisma/migrate-status.ts` backfill từ isAvailable trước khi `prisma db push --accept-data-loss`. Indexes đổi `@@index([isAvailable])` + composite → `@@index([status])` + `@@index([status, isApproved, priceMonthly])`.
- **UI 3-state:** RoomTypeForm có 3-button chooser (🟢 Còn / 🟡 Sắp trống / 🔴 Hết) + date picker bắt buộc khi UPCOMING. Cycle toggle ở admin/rooms + landlord/properties (bấm badge → chọn xoay vòng, chọn UPCOMING → prompt date). Customer share link hiện badge "🟡 Sắp trống từ DD/MM/YYYY".
- **Sort UPCOMING:** rooms/public + share-links + share-links/system orderBy `[status: asc, expectedAvailableDate: asc nulls-last, createdAt: desc]` → AVAILABLE trước, UPCOMING (sắp trống sớm nhất) tiếp, UNAVAILABLE ẩn ở public.
- **Rename text:** "Loại phòng" → "Tin đăng (theo loại phòng)" (menu/title/breadcrumb), "Tên loại phòng" → "Tiêu đề bài đăng", "Mô tả" → "Mô tả và giá dịch vụ", "Loại phòng" filter → "Kiểu phòng" (đồng bộ toàn app).
- **Security: bỏ leak `availableRoomNames`:** Customer-facing API (`/api/share-links` single+system, `/api/rooms/public`, `/api/rooms/related`) chuyển từ `include` sang `select` rõ ràng, KHÔNG select `availableRoomNames`. Verified `curl` 3 endpoint → CLEAN. Internal pages (broker/landlord/admin) vẫn thấy đầy đủ. Field giữ ở DB + Zod schema để admin/landlord/broker quản trị, helper text trong RoomTypeForm cảnh báo "🔒 Chỉ hiển thị nội bộ".
- **Auto-fill deposit:** RoomTypeForm theo dõi `depositTouched` flag. Auto sync deposit = priceMonthly khi user chưa chỉnh tay; xoá hẳn deposit → reset flag, sync lại với current price; gõ "0" → respect intent "không cọc"; load existing record với deposit ≠ price → giữ touched.
- **Broker filter:** Thêm `district` filter qua hybrid pills + dropdown (`components/ui/DistrictPills.tsx` — 7 quận chính + dropdown 23 quận/huyện còn lại Hà Nội). Thay 2 input số "từ/đến" bằng dual-handle range slider (`components/ui/PriceRangeSlider.tsx` — 1tr-20tr step 500k, 24px touch target, format VND vi-VN). Backend không đổi.
- **Public search homepage:** Áp pills quận giống broker (component dùng chung `DistrictPills`). GIỮ 2 input số giá (khách lần đầu cần ô số trực quan hơn slider).
- **Share link polish:**
  - Bỏ Section 5 "🏢 Thông tin tòa nhà" trên `share/[token]`. Tên tòa merge vào header dưới dạng "Thuộc tòa: {name}". Tiện ích chung tòa nhà merge vào Section 3 thành subsection.
  - Đổi "Tạo link gửi khách" → "Chia sẻ link" (broker + landlord).
  - Floating Zalo button (`components/ui/ZaloFab.tsx`): fixed góc dưới phải, 56px, safe-area-inset iOS, z-50. Logic resolve qua `lib/zalo.ts` chain: company `zaloGroupLink` → landlord phone deeplink (`zalo.me/{digits}`, KHÔNG render UI) → env `NEXT_PUBLIC_SUPPORT_ZALO` → fallback. FAB + Section 7 "Liên hệ" cùng dùng helper → luôn point đến cùng destination. Modal trong SystemShareClient bump z-50 → z-[60] để FAB không che.
- **Sau khi pull code v8.3:** chạy `npm install`, rồi `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-status.ts` để backfill, sau đó `npx prisma db push --accept-data-loss` để drop `isAvailable` và sync indexes. Không có production data thật → an toàn one-shot.

### v8.2 (ff6103a) — 2026-04-23
- Filter "Đặc điểm nổi bật" trên trang chủ public (5 toggle AND): 🚗 Ô tô đỗ cửa, 🏍️ Để xe máy, ⚡ Sạc xe điện, 🐾 Thú cưng OK, 🌍 Người nước ngoài
- API `/api/rooms/public`: đọc 5 query params (`parkingCar`, `parkingBike`, `evCharging`, `petAllowed`, `foreignerOk`) và nest vào `property: {}` filter
- Nút "Xoá lọc" reset toàn bộ filter (khu vực, kiểu phòng, giá, 5 feature)
- UI chip: bật → brand-600 + trắng, tắt → border nhạt; wrap đẹp trên mobile 375px
- **[Gộp cùng commit] v8.1:** default list view cho landlord/properties + demo account `company@mixstay.vn` + helper `getUserCompany` (`lib/user-company.ts`) + API `/api/me/company` + section "Đơn vị vận hành" trên share link

### v9 — Hybrid video: upload trực tiếp + embed YouTube/TikTok/Facebook
- **Hai cách thêm video cho loại phòng:** field `videos[]` (URL file upload, tối đa 3) + field `videoLinks[]` (link YouTube/TikTok/Facebook) — chủ nhà có thể trộn cả hai
- **Upload qua signed URL:** API mới `app/api/upload/signed-url/route.ts` dùng Supabase `createSignedUploadUrl()` — client PUT file thẳng lên Storage bucket `videos`, KHÔNG qua Vercel serverless (tránh giới hạn 4.5MB và timeout)
- **Component mới:**
  - `components/ui/VideoLinkInput.tsx`: nhập & validate link YouTube/TikTok/Facebook, preview thumbnail ngay
  - `components/ui/VideoPlayer.tsx`: player lazy load — click thumbnail mới load iframe/`<video>` (tiết kiệm bandwidth), responsive 16:9
  - `components/ui/VideoGallery.tsx`: gallery gộp cả video upload + video link trên trang tin đăng
- **Thumbnail tự động:**
  - YouTube: lấy từ `img.youtube.com/vi/{id}/hqdefault.jpg` (không cần API key)
  - TikTok/Facebook: icon placeholder (không có free API)
- **Ảnh đại diện thẻ từ video (khi tin KHÔNG có ảnh):** thay vì placeholder 🏠 trống, thẻ lấy ảnh đại diện từ video — ưu tiên (1) video tự upload → khung hình đầu (`<video preload="metadata"` + `#t=0.5`), (2) link YouTube → thumbnail thật, (3) link TikTok/Facebook → nền gradient thương hiệu; kèm nút ▶ + badge "🎬 Video". Helper dùng chung `pickVideoCover()` trong `lib/video-utils.ts`, áp dụng ở tất cả thẻ dùng `ListingImageMosaic` (trang chủ, phòng nổi bật, kho công ty, kho hệ thống, tin đã lưu) và carousel kho hàng CTV (`app/broker/inventory`). API `rooms/public`, `companies/[id]/inventory`, `saved-listings` trả thêm `videos[]` + `videoLinks[]` để thẻ dùng
- **Helper `lib/video-utils.ts`:** `getYouTubeId`, `getTikTokId`, `getFacebookVideoId`, `getVideoPlatform`, `getVideoThumbnail`, `pickVideoCover`, `getEmbedUrl`
- **Schema changes:** RoomType thêm `videos String[]` và `videoLinks String[]` (field cũ `videoUrl` được thay thế/mở rộng)
- **API updates:**
  - `/api/rooms/public`: trả `videoLinks[]` + `hasVideo` boolean (KHÔNG trả `videos[]` để giảm payload trang chủ)
  - `/api/share-links` (system + single token): trả đầy đủ `videos[]` + `videoLinks[]` cho `ShareViewClient` / `SystemShareClient`
- **Sau khi pull code v9:** chạy `npm install && npx prisma db push`; nếu chưa có, tạo bucket Supabase Storage tên `videos` (public) + policy cho authenticated users upload

### v8 — Public search, video upload, related listings, short share link, UX polish
- **Trang chủ public có tìm kiếm:** `app/page.tsx` + `app/PublicSearch.tsx` hiển thị grid phòng trống đã duyệt cho khách chưa đăng nhập, có bộ lọc nhanh (khu vực, khoảng giá, kiểu phòng) — dùng API `/api/rooms/public`
- **Gộp module chủ nhà:** Xoá `app/landlord/rooms/page.tsx`, toàn bộ CRUD loại phòng gom về trang `app/landlord/properties/page.tsx` (quản lý tòa nhà + loại phòng ở cùng một màn hình) để giảm thao tác chuyển trang
- **Trang tin đăng có toggle grid/list:** Trang kho phòng hệ thống `/share/system/[token]` thêm switch Grid ↔ List view cho khách duyệt nhanh trên mobile
- **Upload video phòng:** Component `components/ui/VideoUpload.tsx` + field `videoUrl` trên RoomType, chủ nhà upload 1 video giới thiệu phòng (hiển thị trên trang tin đăng)
- **Tin đăng liên quan:** API `/api/rooms/related` gợi ý 4 phòng cùng khu vực / cùng khoảng giá hiển thị cuối trang `/share/[token]`
- **Short share link `/p/{token}`:** Route `app/p/[token]` rút gọn URL chia sẻ, tự redirect sang `/share/[token]` hoặc `/share/system/[token]` tuỳ loại link
- **Admin > Quản lý phòng:** Cột "Phòng trống" (VD: 3/5) giờ hiện thêm tên phòng trống cụ thể ngay dưới (VD: "201, 301, 501")
- **Text liên hệ:** Chuẩn hoá text liên hệ MG/Zalo trên tất cả trang public (share link + system share) cho đồng nhất
- **Sau khi pull code v8:** chạy `npm install && npx prisma db push` (có field mới `videoUrl` trên room_types)

### v7 — Performance, Security, SEO, PWA, Pre-launch Polish
- **Database Indexes:** Thêm composite indexes cho các query phổ biến (properties by landlord/company, rooms by property, deals by broker/status, etc.)
- **Pagination:** Server-side pagination helper (`lib/pagination.ts`) cho tất cả API list endpoints, component `Pagination` cho client
- **Image Optimization:** `OptimizedImage` component wrapper Next.js Image, AVIF/WebP format, responsive device sizes
- **SWR Caching:** Custom hooks (`hooks/useData.ts`) cho tất cả data fetching, deduping 10s, `keepPreviousData`
- **Rate Limiting:** In-memory rate limiter (`lib/rate-limit.ts`) bảo vệ tất cả API routes
- **Input Validation:** Zod schemas (`lib/validations.ts`) validate đầu vào cho register, property, room, deal, share-link, settings
- **Error Boundaries:** `app/error.tsx` (runtime error), `app/loading.tsx` (root loading), `app/not-found.tsx` (404)
- **SEO + OG Tags:** Rich metadata trong `layout.tsx`, `generateMetadata()` cho share pages (dynamic title, description, OG image), `sitemap.ts`, `robots.ts`
- **PWA:** `manifest.json`, SVG icons (192/512), theme-color, apple-touch-icon — có thể "Add to Home Screen" trên mobile
- **Skeleton Loading:** 6 skeleton components (`SkeletonCard`, `SkeletonTable`, `SkeletonStats`, `SkeletonText`, `SkeletonCardGrid`, `SkeletonList`) thay thế text loading trên tất cả 11 trang dashboard
- **Notification Badge:** Badge đỏ số thông báo chưa đọc trên sidebar + mobile nav, poll mỗi 30s
- **Responsive Polish:** Sửa toàn bộ trang cho viewport 375px — table overflow-x-auto, filter wrap, header stack, stats grid-cols-2, modal responsive, image gallery adapt
- **Sau khi pull code v7:** chạy `npm install && npx prisma db push`

### v6 — RoomType, system links, trang tin đăng, Excel import/export
- **Chuyển Room → RoomType:** Toàn bộ hệ thống quản lý theo loại phòng (RoomType) thay vì từng phòng riêng lẻ. Mỗi loại: totalUnits, availableUnits, availableRoomNames
- **Wizard tạo tòa nhà 2 bước:** Bước 1 thông tin tòa nhà → Bước 2 thêm loại phòng ngay (form inline nhanh)
- **Quản lý phòng theo loại:** Card RoomType với inline edit số phòng trống, bật/tắt nhanh, sửa chi tiết
- **Share link hệ thống:** 1 link chứa tất cả phòng trống của landlord. Trang public `/share/system/{token}` có grid cards (carousel 3 ảnh), bộ lọc (khu vực, giá, kiểu phòng), modal chi tiết + Google Maps
- **Trang tin đăng loại phòng:** Gallery 3 ảnh grid + lightbox, info đầy đủ (giá, ngắn hạn, số trống, tiện ích), Google Maps, liên hệ MG
- **API share-links/system:** POST tạo link hệ thống, GET lấy kho phòng theo token
- **Company.zaloGroupLink:** Link Zalo nhóm hiển thị trong kho hàng MG
- **Bộ lọc cascade:** Admin filter Công ty → Tòa nhà → Loại phòng → Trạng thái
- **Excel Import/Export (Admin > Quản lý phòng):**
  - Tải form mẫu: file .xlsx 2 sheet (dữ liệu mẫu 3 dòng + hướng dẫn tiếng Việt)
  - Import: upload .xlsx → preview bảng + validate từng dòng → match tòa nhà theo tên+quận (nếu chưa có → tạo mới PENDING) → bulk create
  - Xuất Excel: export toàn bộ hoặc chỉ kết quả filter hiện tại
- **Package mới:** xlsx (SheetJS)
- **Sau khi pull code v6:** chạy `npm install && npx prisma db push`

### v5 — Hệ thống Công ty quản lý đa cấp + Bộ lọc nâng cao
- **Model Company:** Thêm entity Công ty — mỗi công ty quản lý nhiều tòa nhà, mỗi tòa nhà có nhiều căn hộ
- **Trang admin/companies:** CRUD công ty (tên, mô tả, SĐT, email, địa chỉ, trạng thái)
- **Bộ lọc đa cấp:** Tất cả trang admin đều có filter theo Công ty → Chủ nhà → Tòa nhà → Phòng
  - Properties: filter Công ty + Chủ nhà + Trạng thái
  - Rooms: filter Công ty + Tòa nhà + Loại phòng (cascade: chọn Công ty → chỉ hiện tòa nhà thuộc Công ty đó)
  - Deals: filter Công ty + Trạng thái
- **PropertyForm:** Thêm dropdown chọn Công ty khi Admin tạo/sửa tòa nhà
- **Sidebar:** Thêm link "Công ty" cho Admin
- **Sau khi pull code v5:** bắt buộc chạy `npx prisma db push`

### v4 — Đăng nhập OAuth (Google, Facebook, Apple) + Quản lý User nâng cao
- **OAuth login/register:** Thêm đăng nhập/đăng ký nhanh bằng Google, Facebook, Apple
  - OAuth là **tuỳ chọn** — app vẫn chạy bình thường bằng email/password nếu không cấu hình
  - Tự động liên kết tài khoản nếu email đã tồn tại trong hệ thống
  - User mới đăng nhập OAuth lần đầu → redirect trang chọn vai trò (`/auth/callback`)
  - Dùng field `setupComplete` để phân biệt user mới chưa chọn role vs user đã có role
- **Quản lý User (Admin):** CRUD đầy đủ với modal thêm/sửa, xoá (soft/hard delete), search, filter, sort, stats
- **Schema changes:** User.password nullable, thêm Account/Session/VerificationToken, thêm `setupComplete`
- **Sau khi pull code v4:** bắt buộc chạy `npx prisma db push` để sync schema mới lên database

### Cấu hình OAuth (tuỳ chọn)

**Google:** Vào [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client ID → Web application → thêm Authorized redirect URI: `https://your-domain.com/api/auth/callback/google`

**Facebook:** Vào [Facebook Developers](https://developers.facebook.com/apps) → New App → Facebook Login → Settings → thêm Valid OAuth Redirect URI: `https://your-domain.com/api/auth/callback/facebook`

**Apple:** Vào [Apple Developer](https://developer.apple.com/account/resources/identifiers) → Identifiers → Services ID → tạo Private Key → thêm Return URL: `https://your-domain.com/api/auth/callback/apple`

Sau khi có credentials, thêm vào `.env` hoặc Vercel Environment Variables:
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_GOOGLE_ENABLED=true

FACEBOOK_CLIENT_ID=your-app-id
FACEBOOK_CLIENT_SECRET=your-app-secret
NEXT_PUBLIC_FACEBOOK_ENABLED=true

APPLE_ID=your-services-id
APPLE_SECRET=your-private-key
NEXT_PUBLIC_APPLE_ENABLED=true
```

> Nếu không thêm các biến này, nút OAuth sẽ không hiển thị trên trang login/register.

### v3 — Dashboard upgrade, image upload, gallery, full product forms
- **Upload ảnh:** Tích hợp Supabase Storage, component `ImageUpload` kéo thả/chọn nhiều ảnh, preview & xóa
- **Form sản phẩm nâng cao:** `PropertyForm` & `RoomForm` đầy đủ trường (amenities, commissionJson, landlordNotes, images...)
- **Admin dashboard:**
  - Trang Properties: form tạo/sửa đầy đủ với upload ảnh, hiển thị ảnh cover trong bảng
  - Trang Rooms: form nâng cao, carousel ảnh, hiển thị amenities & hoa hồng
  - Trang Deals: card layout đẹp hơn với ảnh phòng thumbnail, stat cards
  - Trang Users: UI cải thiện, stat cards, avatar placeholder
- **Landlord dashboard:**
  - Properties: form tạo/sửa đầy đủ với upload ảnh, card layout có ảnh cover
  - Rooms: form đầy đủ amenities/ảnh/hoa hồng, card hiển thị ảnh thật
- **Broker dashboard:**
  - Kho hàng: ảnh thật với carousel (prev/next, badge số ảnh), fallback gradient
  - Deals: card layout với ảnh thumbnail, stat cards (Tổng deal, Chờ duyệt, Hoa hồng)
  - Share links: ảnh thumbnail, hiển thị giá phòng, nút actions có màu
- **Trang khách xem phòng (share link):**
  - Gallery ảnh: ảnh lớn + thumbnails, lightbox toàn màn hình, prev/next navigation
  - Grid thông tin: diện tích, tầng, tổng tầng
  - Đặc điểm tòa nhà: grid 2 cột với icon màu (ô tô, EV, pet, foreigner)
- **API updates:** Include room/property images trong deals & share-links API

### v2 — Landing page redesign
- Landing page mới với search bar, card layout, rich backgrounds

### v1 — Initial release
- CRUD tòa nhà, phòng, deal, user
- 4 vai trò: Admin, Môi giới, Chủ nhà, Khách
- Share link ẩn thông tin nhạy cảm
- Hoa hồng tự động

## Tài khoản Demo

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Admin | admin@mixstay.vn | 123456 |
| Môi giới | broker@mixstay.vn | 123456 |
| Chủ nhà | landlord@mixstay.vn | 123456 |
| Chủ nhà (Công ty) | company@mixstay.vn | 123456 |
| Khách | customer@mixstay.vn | 123456 |

> Tài khoản `company@mixstay.vn` có toàn bộ tòa nhà thuộc **Công ty BĐS MixHome** → topbar hiện logo + tên công ty, card tòa nhà có badge 🏢 và trang share `/p/{token}` có section "Đơn vị vận hành" + link nhóm Zalo công ty. So sánh với `landlord@mixstay.vn` (chủ nhà cá nhân, không có companyId) để thấy khác biệt UI.
