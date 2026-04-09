# 🏢 MiniZen Manager

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
- **Trang tin đăng loại phòng:** gallery 3 ảnh grid + lightbox, thông tin đầy đủ (giá, diện tích, tiện ích, ngắn hạn, số phòng trống), nút Google Maps, nút liên hệ MG
- **Trang kho phòng hệ thống:** xem tất cả phòng trống của 1 hệ thống, card carousel 3 ảnh, bộ lọc (khu vực, giá, kiểu phòng), nút "Xem chi tiết"
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
cd minizen

# Init git
git init
git add .
git commit -m "Initial commit - MiniZen Manager"

# Tạo repo trên GitHub (github.com/new)
git remote add origin https://github.com/YOUR_USERNAME/minizen.git
git branch -M main
git push -u origin main
```

### Bước 4: Deploy lên Vercel (miễn phí)

1. Vào https://vercel.com → Sign Up bằng GitHub
2. **Add New → Project** → Import repo `minizen`
3. **Environment Variables** → thêm từng biến:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
NEXTAUTH_SECRET=chay-lenh-openssl-rand-base64-32
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...
NEXT_PUBLIC_APP_NAME=MiniZen
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
   - Admin: `admin@minizen.vn`
   - Môi giới: `broker@minizen.vn`
   - Chủ nhà: `landlord@minizen.vn`

---

## 🔧 Chạy Local (Development)

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/minizen.git
cd minizen

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
minizen/
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
│   └── ui/              # Skeleton, ImageUpload, OptimizedImage, Pagination
├── hooks/
│   └── useData.ts       # SWR hooks (useProperties, useRoomTypes, useDeals, etc.)
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client
│   ├── utils.ts         # Helper functions
│   ├── fetcher.ts       # SWR fetcher
│   ├── pagination.ts    # Server-side pagination helper
│   ├── rate-limit.ts    # API rate limiter
│   └── validations.ts   # Zod validation schemas
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Demo data
└── middleware.ts         # Route protection
```

## 🔐 Phân quyền dữ liệu

| Thông tin | Admin | Môi giới | Chủ nhà | Khách (qua link) |
|-----------|:-----:|:--------:|:-------:|:-----------------:|
| Ảnh phòng | ✅ | ✅ | ✅ | ✅ |
| Giá thuê | ✅ | ✅ | ✅ | ✅ |
| Tiện ích | ✅ | ✅ | ✅ | ✅ |
| Khu vực / Quận | ✅ | ✅ | ✅ | ✅ |
| Tuyến phố | ✅ | ✅ | ✅ | ✅ |
| Địa chỉ chi tiết | ✅ | ✅ | ✅ | ❌ |
| SĐT Chủ nhà | ✅ | ✅ | — | ❌ |
| Hoa hồng | ✅ | Của mình | ❌ | ❌ |

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
- **PWA:** Web app manifest, SVG icons, standalone display mode

## Changelog

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
| Admin | admin@minizen.vn | 123456 |
| Môi giới | broker@minizen.vn | 123456 |
| Chủ nhà | landlord@minizen.vn | 123456 |
| Khách | customer@minizen.vn | 123456 |
