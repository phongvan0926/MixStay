# -*- coding: utf-8 -*-
"""Dựng bộ thư viện component MixStay cho Claude Design.
Mọi màu / class / kích thước đều lấy TỪ MÃ NGUỒN THẬT (tailwind.config.ts + app/globals.css),
không dựng lại theo trí nhớ."""
import os, pathlib

OUT = pathlib.Path(__file__).parent

CSS = """
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:24px;background:#fafaf9;color:#1c1917;
  font-family:'Be Vietnam Pro',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:'Space Grotesk',system-ui,sans-serif;margin:0}
.ds-h{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#78716c;margin:0 0 4px}
.ds-sub{font-size:13px;color:#78716c;margin:0 0 18px;line-height:1.55}
.ds-sec{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a8a29e;margin:26px 0 10px}
.ds-sec:first-of-type{margin-top:0}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.col{display:flex;flex-direction:column;gap:10px}
.note{margin-top:22px;padding:12px 14px;border-radius:12px;background:#f0f6f1;border:1px solid #dcebe0;
  font-size:12.5px;line-height:1.6;color:#275234}
.note b{color:#1b3624}
.warn{background:#fffbeb;border-color:#fde68a;color:#78350f}
.warn b{color:#78350f}
.tag{display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;
  background:#f5f5f4;border:1px solid #e7e5e4;border-radius:6px;padding:1px 6px;color:#57534e}

/* ==== các lớp DÙNG CHUNG, sao y app/globals.css ==== */
.btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  background:#2f6440;padding:10px 20px;min-height:44px;font-size:14px;font-weight:500;color:#fff;border:0;cursor:pointer;
  transition:all .15s}
.btn-primary:hover{background:#275234}
.btn-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  border:1px solid #e7e5e4;background:#fff;padding:10px 20px;min-height:44px;font-size:14px;font-weight:500;color:#44403c;cursor:pointer}
.btn-secondary:hover{background:#fafaf9}
.btn-danger{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  background:#dc2626;padding:10px 20px;min-height:44px;font-size:14px;font-weight:500;color:#fff;border:0;cursor:pointer}
.btn-success{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  background:#047857;padding:10px 20px;font-size:14px;font-weight:500;color:#fff;border:0;cursor:pointer}
.btn-ghost{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;
  padding:8px 16px;font-size:14px;font-weight:500;color:#57534e;background:transparent;border:0;cursor:pointer}
.btn-ghost:hover{background:#f5f5f4}
.input-field{width:100%;border-radius:12px;border:1px solid #e7e5e4;background:#fff;padding:10px 16px;min-height:44px;
  font-size:14px;color:#1c1917;outline:none;font-family:inherit}
.input-field::placeholder{color:#a8a29e}
.input-field:focus{border-color:#5d9b6e;box-shadow:0 0 0 2px #dcebe0}
.card{border-radius:16px;border:1px solid rgba(231,229,228,.6);background:#fff;padding:20px;
  box-shadow:0 1px 2px rgba(0,0,0,.05)}
.badge{display:inline-flex;align-items:center;border-radius:9999px;padding:2px 10px;font-size:12px;font-weight:500}
.stat-card{border-radius:16px;background:#fff;border:1px solid rgba(231,229,228,.6);padding:20px}
.sidebar-link{display:flex;align-items:center;gap:12px;border-radius:12px;padding:10px 12px;font-size:14px;
  font-weight:500;color:#57534e}
.sidebar-link-active{display:flex;align-items:center;gap:12px;border-radius:12px;padding:10px 12px;font-size:14px;
  font-weight:500;background:#f0f6f1;color:#275234;border:1px solid #dcebe0}
.table-header{padding:12px 16px;text-align:left;font-size:12px;font-weight:600;letter-spacing:.05em;
  text-transform:uppercase;color:#78716c}
.table-cell{padding:14px 16px;font-size:14px;color:#44403c}
"""

def page(title, group, subtitle, body, w=760, h=None):
    vp = f' viewport="{w}x{h}"' if h else f' viewport="{w}"'
    return f"""<!-- @dsCard group="{group}"{vp} -->
<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — MixStay</title><style>{CSS}</style></head><body>
<p class="ds-h">{title}</p><p class="ds-sub">{subtitle}</p>
{body}
</body></html>"""

F = {}

# ─────────────────────────── NỀN TẢNG ───────────────────────────
def swatches(name, shades):
    cells = "".join(
        f'<div style="flex:1;min-width:78px"><div style="height:52px;border-radius:10px;background:{hex_};'
        f'border:1px solid rgba(0,0,0,.06)"></div>'
        f'<div style="font-size:11px;color:#57534e;margin-top:5px">{k}</div>'
        f'<div style="font-size:10.5px;color:#a8a29e;font-family:ui-monospace,monospace">{hex_}</div></div>'
        for k, hex_ in shades.items())
    return f'<p class="ds-sec">{name}</p><div style="display:flex;gap:8px;flex-wrap:wrap">{cells}</div>'

BRAND = {50:'#f0f6f1',100:'#dcebe0',200:'#bbd8c2',300:'#8fbd9b',400:'#5d9b6e',500:'#3d7e50',
         600:'#2f6440',700:'#275234',800:'#21412b',900:'#1b3624',950:'#0e1f15'}
GOLD  = {50:'#fdf8ec',100:'#f9edc7',200:'#f2d98a',300:'#ebc24d',400:'#e2ad27',500:'#c8901c',
         600:'#a8741a',700:'#855818',800:'#6e4818',900:'#5d3d18',950:'#36210a'}
STONE = {50:'#fafaf9',100:'#f5f5f4',200:'#e7e5e4',300:'#d6d3d1',400:'#a8a29e',500:'#78716c',
         600:'#57534e',700:'#44403c',800:'#292524',900:'#1c1917'}
STATE = {'emerald-500':'#10b981','amber-500':'#f59e0b','red-500':'#ef4444','violet-600':'#7c3aed','zalo':'#0068FF'}

F['foundations/colors.html'] = page(
    "Bảng màu", "Nền tảng",
    "Lấy nguyên từ <span class='tag'>tailwind.config.ts</span>. Brand là xanh rêu đậm khớp logo — 600 là sắc chủ lực cho nút chính, 700 cho hover/link, 900 cho dải tối và chân trang.",
    swatches("brand — xanh rêu (chủ đạo)", BRAND)
    + swatches("gold — CHỈ dùng điểm nhấn", GOLD)
    + swatches("stone — nền &amp; chữ", STONE)
    + swatches("màu trạng thái", STATE)
    + """<div class="note warn"><b>Luật dùng gold:</b> chỉ cho điểm nhấn (CTA nhỏ, badge, highlight trên nền tối) —
       KHÔNG dùng làm nền diện rộng. An toàn tương phản: chữ tối trên gold-400, gold-300 trên nền brand tối,
       gold-700 làm chữ trên nền sáng.</div>""", w=860)

F['foundations/typography.html'] = page(
    "Kiểu chữ", "Nền tảng",
    "<b>Be Vietnam Pro</b> cho nội dung, <b>Space Grotesk</b> cho tiêu đề. Cỡ nhỏ nhất trên trang khách là <b>12px</b>.",
    """<div class="col" style="gap:16px">
      <div><div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:36px;font-weight:700">Tìm Phòng Khó Có MixStay Lo</div><div class="tag">display · 36px · 700</div></div>
      <div><div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:24px;font-weight:700">Phòng trọ, chung cư mini Cầu Giấy</div><div class="tag">display · 24px · 700</div></div>
      <div><div style="font-size:16px">Nền tảng kết nối Chủ nhà, Cộng tác viên và Khách thuê chung cư mini.</div><div class="tag">sans · 16px · 400</div></div>
      <div><div style="font-size:14px;color:#57534e">Giá thuê, diện tích, tiện ích — nội dung chính của thẻ tin.</div><div class="tag">sans · 14px · 400</div></div>
      <div><div style="font-size:12px;color:#78716c">Chú thích, nhãn phụ, đơn vị. Đây là mức NHỎ NHẤT cho trang khách.</div><div class="tag">sans · 12px — sàn</div></div>
      <div><div style="font-size:11px;color:#a8a29e">11px — chỉ dùng trong bảng quản trị mật độ dày.</div><div class="tag">sans · 11px — chỉ khu quản trị</div></div>
    </div>
    <div class="note"><b>Quy tắc:</b> dưới 12px không được xuất hiện trên trang khách xem.
    Đợt rà 07/08/2026 đã nâng 33 chỗ 11px lên 12px trên trang công khai và xoá hết 9px/8px trong khu quản trị.</div>""")

# ─────────────────────────── COMPONENT ───────────────────────────
F['components/buttons.html'] = page(
    "Nút", "Components",
    "5 kiểu dùng chung trong <span class='tag'>app/globals.css</span>. Tất cả đã có <span class='tag'>min-h-11</span> = 44px.",
    """<p class="ds-sec">Kiểu</p>
    <div class="row">
      <button class="btn-primary">Tìm phòng</button>
      <button class="btn-secondary">Xuất Excel</button>
      <button class="btn-danger">Xoá</button>
      <button class="btn-success">Xác nhận</button>
      <button class="btn-ghost">Bỏ qua</button>
    </div>
    <p class="ds-sec">Trạng thái</p>
    <div class="row">
      <button class="btn-primary">Bình thường</button>
      <button class="btn-primary" style="background:#275234">Di chuột</button>
      <button class="btn-primary" style="opacity:.5;cursor:not-allowed">Đang tải…</button>
    </div>
    <p class="ds-sec">Nút trong bảng quản trị (nhỏ hơn, nhưng tối thiểu 32px)</p>
    <div class="row">
      <button style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;min-height:32px;border-radius:8px;font-size:12px;font-weight:500;background:#f0f6f1;color:#275234;border:0;cursor:pointer">✏️ Sửa</button>
      <button style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;min-height:32px;border-radius:8px;font-size:12px;font-weight:500;background:#f5f3ff;color:#6d28d9;border:0;cursor:pointer">📢 Đăng</button>
      <button style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;min-height:32px;border-radius:8px;font-size:12px;font-weight:500;background:#fef2f2;color:#dc2626;border:0;cursor:pointer">Xoá</button>
    </div>
    <div class="note"><b>Vùng bấm tối thiểu 44×44px</b> trên trang khách, <b>32px</b> trong bảng quản trị.
    Chip/pill tự viết thì thêm <span class="tag">min-h-11 sm:min-h-0 inline-flex items-center</span> —
    44px trên điện thoại, vẫn gọn trên máy tính.</div>""")

F['components/inputs.html'] = page(
    "Ô nhập &amp; bộ lọc", "Components",
    "<span class='tag'>.input-field</span> dùng chung cho input / select / textarea. Cao 44px.",
    """<div class="col" style="max-width:420px">
      <div><label style="display:block;font-size:12px;font-weight:500;color:#78716c;margin-bottom:6px">Tìm theo mã, tên, khu vực</label>
        <input class="input-field" placeholder="VD: MS-URDB8D hoặc Cầu Giấy"></div>
      <div><label style="display:block;font-size:12px;font-weight:500;color:#78716c;margin-bottom:6px">Kiểu phòng</label>
        <select class="input-field"><option>Tất cả kiểu</option><option>Studio</option><option>1 ngủ 1 khách</option></select></div>
      <div><label style="display:block;font-size:12px;font-weight:500;color:#78716c;margin-bottom:6px">Đang nhập (focus)</label>
        <input class="input-field" value="0352871177" style="border-color:#5d9b6e;box-shadow:0 0 0 2px #dcebe0"></div>
      <div><label style="display:block;font-size:12px;font-weight:500;color:#78716c;margin-bottom:6px">Báo lỗi</label>
        <input class="input-field" value="09366258556" style="border-color:#fca5a5">
        <p style="font-size:12px;color:#dc2626;margin:6px 0 0">❌ thừa số — đang có 11 chữ số, số Việt Nam chỉ 10</p></div>
    </div>
    <p class="ds-sec">Viên lọc quận</p>
    <div class="row">
      <span style="display:inline-flex;align-items:center;padding:6px 14px;min-height:44px;border-radius:12px;font-size:12px;font-weight:500;background:#2f6440;color:#fff;border:1px solid #2f6440">Tất cả</span>
      <span style="display:inline-flex;align-items:center;padding:6px 14px;min-height:44px;border-radius:12px;font-size:12px;font-weight:500;background:#fff;color:#57534e;border:1px solid #e7e5e4">Cầu Giấy</span>
      <span style="display:inline-flex;align-items:center;padding:6px 14px;min-height:44px;border-radius:12px;font-size:12px;font-weight:500;background:#fff;color:#57534e;border:1px solid #e7e5e4">Đống Đa</span>
      <span style="display:inline-flex;align-items:center;padding:6px 14px;min-height:44px;border-radius:12px;font-size:12px;font-weight:500;background:#fff;color:#57534e;border:1px solid #e7e5e4">▾ Quận khác</span>
    </div>
    <div class="note"><b>Trợ năng:</b> nhãn nhìn thấy được vẫn CHƯA đủ — nếu <span class="tag">label</span> không nối
    <span class="tag">for</span>/<span class="tag">id</span> thì phải thêm <span class="tag">aria-label</span>,
    nếu không trình đọc màn hình đọc ô trống.</div>""")

F['components/badges-status.html'] = page(
    "Nhãn trạng thái phòng", "Components",
    "Ba trạng thái của <span class='tag'>RoomType.status</span>. Trạng thái và số phòng trống LUÔN đi cùng nhau.",
    """<p class="ds-sec">Trên thẻ tin (khách xem)</p>
    <div class="row">
      <span style="display:inline-flex;align-items:center;border-radius:9999px;background:#10b981;padding:4px 10px;font-size:12px;font-weight:600;color:#fff">Còn 3 phòng</span>
      <span style="display:inline-flex;align-items:center;border-radius:9999px;background:#f59e0b;padding:4px 10px;font-size:12px;font-weight:600;color:#fff">🟡 Sắp trống 15/08/2026</span>
      <span style="display:inline-flex;align-items:center;border-radius:9999px;background:#78716c;padding:4px 10px;font-size:12px;font-weight:600;color:#fff">🔴 Hết phòng</span>
    </div>
    <p class="ds-sec">Trong bảng quản trị</p>
    <div class="row">
      <span class="badge" style="background:#d1fae5;color:#047857">🟢 Còn phòng</span>
      <span class="badge" style="background:#fef3c7;color:#b45309">🟡 Sắp trống</span>
      <span class="badge" style="background:#f5f5f4;color:#57534e">🔴 Hết phòng</span>
      <span class="badge" style="background:#d1fae5;color:#047857">✓ Đã duyệt</span>
      <span class="badge" style="background:#fef3c7;color:#b45309">Chờ duyệt</span>
    </div>
    <div class="note warn"><b>TUYỆT ĐỐI không in “Còn 0 phòng”.</b> Nếu <span class="tag">availableUnits ≤ 0</span>
    thì hiện “🔴 Hết phòng”, kể cả khi trạng thái còn sót 🟢 — và JSON-LD chỉ khai <span class="tag">InStock</span>
    khi thật sự còn phòng, không Google sẽ quảng cáo phòng đã hết.</div>""")

F['components/listing-card.html'] = page(
    "Thẻ tin đăng", "Components",
    "Thành phần khách nhìn nhiều nhất. Render sẵn phía server để Google đọc được mà không cần chạy JS.",
    """<div style="max-width:340px">
      <div style="border-radius:16px;border:1px solid #e7e5e4;background:#fff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.05)">
        <div style="position:relative;height:180px;background:linear-gradient(135deg,#dcebe0,#bbd8c2);display:flex;align-items:center;justify-content:center;color:#5d9b6e;font-size:13px">ảnh phòng</div>
        <div style="position:relative;margin-top:-172px;padding:12px;display:flex;justify-content:space-between;align-items:flex-start">
          <span style="display:inline-flex;align-items:center;border-radius:9999px;background:rgba(255,255,255,.9);padding:4px 10px;font-size:12px;font-weight:500;color:#44403c;border:1px solid #fff">Studio</span>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:9999px;background:rgba(255,255,255,.9);border:1px solid #fff;font-size:14px">🤍</span>
            <span style="display:inline-flex;align-items:center;border-radius:9999px;background:#10b981;padding:4px 10px;font-size:12px;font-weight:600;color:#fff">Còn 2 phòng</span>
          </div>
        </div>
        <div style="padding:16px;margin-top:120px">
          <h3 style="font-size:16px;font-weight:600;color:#1c1917;margin:0">Studio tại Ngõ 105 Phú Xá</h3>
          <p style="font-size:14px;color:#78716c;margin:2px 0 0">📍 Tây Hồ • Phú Xá</p>
          <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:12px">
            <span style="font-size:20px;font-weight:700;color:#2f6440">4.500.000₫<span style="font-size:12px;font-weight:400;color:#a8a29e">/tháng</span></span>
            <span style="font-size:12px;color:#78716c">25m²</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">
            <span style="font-size:12px;background:#f5f5f4;color:#44403c;padding:2px 8px;border-radius:9999px;font-weight:500">🏍️ Để xe máy</span>
            <span style="font-size:12px;background:#f5f5f4;color:#44403c;padding:2px 8px;border-radius:9999px;font-weight:500">🐾 Thú cưng OK</span>
          </div>
        </div>
      </div>
    </div>
    <div class="note warn"><b>🔒 Tiêu đề đã che số nhà.</b> Tên tin do chủ nhà tự gõ rất hay kèm số nhà
    (“Studio tại <s>Số 17</s> Ngõ 105 Phú Xá”) — mọi đường ra công khai phải đi qua
    <span class="tag">redactTitle()</span>. Nút ❤ có vùng bấm 44px dù hình chỉ 32px.</div>""", w=460)

F['components/fabs.html'] = page(
    "Nút liên hệ nổi", "Components",
    "Cặp nút <b>Zalo</b> (dưới) + <b>Gọi</b> (trên) trên mọi trang công khai. Số lấy từ Cài đặt admin, không chép cứng.",
    """<p class="ds-sec">Điện thoại — tròn đều 56×56, cách nhau 16px</p>
    <div style="position:relative;height:190px;width:230px;background:#f5f5f4;border-radius:16px;border:1px solid #e7e5e4">
      <a style="position:absolute;right:16px;bottom:88px;width:56px;height:56px;display:inline-flex;align-items:center;justify-content:center;border-radius:9999px;background:#275234;color:#fff;box-shadow:0 8px 20px rgba(27,54,36,.3);text-decoration:none;font-size:24px">📞</a>
      <a style="position:absolute;right:16px;bottom:16px;width:56px;height:56px;display:inline-flex;align-items:center;justify-content:center;border-radius:9999px;background:#0068FF;color:#fff;box-shadow:0 8px 20px rgba(0,104,255,.3);text-decoration:none;font-size:20px;font-weight:700">Zalo</a>
    </div>
    <p class="ds-sec">Máy tính — nở thành viên thuốc có chữ</p>
    <div class="row">
      <span style="display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 20px;border-radius:9999px;background:#275234;color:#fff;font-size:14px;font-weight:600">📞 Hotline 0352 871 177</span>
      <span style="display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 20px;border-radius:9999px;background:#0068FF;color:#fff;font-size:14px;font-weight:600">💬 Tư vấn Zalo</span>
    </div>
    <div class="note"><b>Bài học đã trả giá:</b> đừng đặt <span class="tag">padding-bottom: env(safe-area-inset-bottom)</span>
    BÊN TRONG nút cao cố định — phần đệm ăn vào chiều cao, làm nút méo thành bầu dục và đẩy icon lệch lên.
    Safe-area phải đưa hết vào <span class="tag">bottom</span>.</div>""", w=560)

F['components/cards.html'] = page(
    "Thẻ &amp; ô số liệu", "Components",
    "<span class='tag'>.card</span>, <span class='tag'>.card-hover</span>, <span class='tag'>.stat-card</span>.",
    """<div style="display:flex;gap:14px;flex-wrap:wrap">
      <div class="stat-card" style="min-width:180px"><p style="font-size:12px;color:#78716c;margin:0">Tin đăng</p>
        <p style="font-size:28px;font-weight:700;color:#1c1917;margin:4px 0 0;font-family:'Space Grotesk',sans-serif">767</p>
        <p style="font-size:12px;color:#10b981;margin:2px 0 0">+10 trong 7 ngày</p></div>
      <div class="stat-card" style="min-width:180px"><p style="font-size:12px;color:#78716c;margin:0">Tòa nhà</p>
        <p style="font-size:28px;font-weight:700;color:#1c1917;margin:4px 0 0;font-family:'Space Grotesk',sans-serif">472</p>
        <p style="font-size:12px;color:#78716c;margin:2px 0 0">100% có toạ độ</p></div>
      <div class="stat-card" style="min-width:180px"><p style="font-size:12px;color:#78716c;margin:0">Cộng tác viên</p>
        <p style="font-size:28px;font-weight:700;color:#1c1917;margin:4px 0 0;font-family:'Space Grotesk',sans-serif">15</p>
        <p style="font-size:12px;color:#10b981;margin:2px 0 0">+2 trong 7 ngày</p></div>
    </div>
    <p class="ds-sec">Thẻ nội dung</p>
    <div class="card" style="max-width:420px">
      <h3 style="font-size:16px;font-weight:600;margin:0 0 4px">📅 Đặt lịch xem phòng</h3>
      <p style="font-size:13px;color:#78716c;margin:0 0 14px">Để lại số điện thoại — chúng tôi gọi lại hẹn giờ dẫn bạn đi xem. Hoàn toàn miễn phí cho người thuê.</p>
      <input class="input-field" placeholder="09xxxxxxxx" style="margin-bottom:10px">
      <button class="btn-primary" style="width:100%">Gửi yêu cầu xem phòng</button>
    </div>""", w=760)

F['components/alerts.html'] = page(
    "Cảnh báo &amp; thông báo", "Components",
    "Băng cảnh báo trong khu quản trị. Luôn kèm <b>lý do cụ thể</b> và <b>lối thoát</b>.",
    """<div style="border-radius:16px;border:1px solid #fcd34d;background:#fffbeb;padding:16px;max-width:640px">
      <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
        <span style="font-size:20px">⚠️</span>
        <div style="flex:1;min-width:240px">
          <p style="font-weight:600;color:#78350f;margin:0">Số điện thoại của bạn có thể sai</p>
          <p style="font-size:13px;color:#92400e;margin:2px 0 0">Đang lưu <b style="font-family:ui-monospace,monospace">09366258556</b> — thừa số, đang có 11 chữ số, số Việt Nam chỉ 10. Khách bấm gọi hoặc nhắn Zalo vào số này sẽ không tới được bạn.</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-primary" style="padding:8px 16px;min-height:40px;font-size:13px">Sửa số</button>
          <button style="padding:8px 16px;min-height:40px;font-size:13px;font-weight:500;border-radius:12px;border:1px solid #fcd34d;background:#fff;color:#92400e;cursor:pointer">Số này đúng</button>
        </div>
      </div>
    </div>
    <p class="ds-sec">Việc cần làm (trang Tổng quan)</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <div class="card" style="min-width:150px;border-color:#fca5a5;background:#fef2f2"><p style="font-size:12px;color:#991b1b;margin:0">📥 Khách xin xem phòng</p><p style="font-size:24px;font-weight:700;color:#dc2626;margin:4px 0 0">1</p></div>
      <div class="card" style="min-width:150px;border-color:#fcd34d;background:#fffbeb"><p style="font-size:12px;color:#92400e;margin:0">❓ CTV hỏi phòng</p><p style="font-size:24px;font-weight:700;color:#b45309;margin:4px 0 0">1</p></div>
      <div class="card" style="min-width:150px"><p style="font-size:12px;color:#78716c;margin:0">📝 Tin chờ duyệt</p><p style="font-size:24px;font-weight:700;color:#1c1917;margin:4px 0 0">0</p></div>
    </div>
    <div class="note"><b>Nguyên tắc:</b> cảnh báo phải nói SAI Ở ĐÂU (“thừa số, 11 chữ số”) chứ không chỉ
    “không hợp lệ”, và luôn có nút cho người dùng tự xác nhận để thôi nhắc.</div>""", w=760)

F['components/admin-table.html'] = page(
    "Bảng quản trị", "Khu quản trị",
    "<span class='tag'>.table-header</span> + <span class='tag'>.table-cell</span>. Luôn bọc trong <span class='tag'>overflow-x-auto</span>.",
    """<div style="border-radius:16px;border:1px solid #e7e5e4;background:#fff;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:640px">
        <thead style="background:#fafaf9"><tr>
          <th class="table-header" style="width:44px"><input type="checkbox" style="width:20px;height:20px;accent-color:#2f6440;cursor:pointer" aria-label="Chọn tất cả"></th>
          <th class="table-header">Tin đăng</th><th class="table-header">Giá thuê</th>
          <th class="table-header">Trạng thái</th><th class="table-header">Thao tác</th>
        </tr></thead>
        <tbody>
          <tr style="border-top:1px solid #f5f5f4">
            <td class="table-cell"><input type="checkbox" style="width:20px;height:20px;accent-color:#2f6440;cursor:pointer" aria-label="Chọn tin"></td>
            <td class="table-cell"><div style="font-weight:600;color:#1c1917">Phòng khép kín 25m²</div>
              <div style="font-size:11px;color:#a8a29e;font-family:ui-monospace,monospace">MS-URDB8D</div></td>
            <td class="table-cell"><b style="color:#2f6440">3.500.000₫</b></td>
            <td class="table-cell"><span class="badge" style="background:#d1fae5;color:#047857">🟢 Còn phòng</span></td>
            <td class="table-cell"><div style="display:flex;gap:8px">
              <button style="padding:6px 12px;min-height:32px;border-radius:8px;font-size:12px;font-weight:500;background:#f0f6f1;color:#275234;border:0;cursor:pointer">✏️ Sửa</button>
              <button style="padding:6px 12px;min-height:32px;border-radius:8px;font-size:12px;font-weight:500;background:#fef2f2;color:#dc2626;border:0;cursor:pointer">Xoá</button>
            </div></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="note"><b>Bảng quản trị được phép dày hơn</b> (chữ 11px, nút 32px) — nhưng ô tick tối thiểu
    <b>20×20px</b> và mọi ô tick phải có <span class="tag">aria-label</span>.
    Cột cuối đừng để bị khuất: canh <span class="tag">min-w</span> các cột sao cho bảng vừa khung.</div>""", w=860)

F['components/sidebar-nav.html'] = page(
    "Thanh điều hướng quản trị", "Khu quản trị",
    "<span class='tag'>.sidebar-link</span> / <span class='tag'>.sidebar-link-active</span>. Menu quyết định luôn TIÊU ĐỀ TAB.",
    """<div style="width:250px;background:#fff;border:1px solid #e7e5e4;border-radius:16px;padding:12px">
      <div class="sidebar-link-active">📊 <span>Tổng quan</span>
        <span style="margin-left:auto;background:#dc2626;color:#fff;border-radius:9999px;font-size:11px;padding:1px 7px;font-weight:600">8</span></div>
      <div class="sidebar-link">🏛️ <span>Công ty</span></div>
      <div class="sidebar-link">🏢 <span>Tòa nhà</span></div>
      <div class="sidebar-link">📝 <span>Tin đăng</span></div>
      <div class="sidebar-link">💰 <span>Giao dịch</span></div>
      <div class="sidebar-link">📥 <span>Khách để lại SĐT</span></div>
      <div class="sidebar-link">👥 <span>Người dùng</span></div>
      <div class="sidebar-link">⚙️ <span>Cài đặt</span></div>
    </div>
    <div class="note"><b>Trang quản trị là client component</b> nên không dùng được
    <span class="tag">export const metadata</span>. <span class="tag">DashboardLayout</span> đặt
    <span class="tag">document.title</span> theo mục menu đang mở → thêm mục mới là TỰ có tiêu đề tab
    (<span class="tag">Tin đăng | MixStay</span>), không phải làm gì thêm.</div>""", w=560)

F['components/share-toolbar.html'] = page(
    "Thanh công cụ bài đăng", "Components",
    "Tải ảnh · Copy nội dung · Chia sẻ — hiện cho <b>MỌI người</b>, kể cả khách chưa đăng nhập.",
    """<div class="row">
      <button class="btn-secondary" style="font-size:14px">⬇️ Tải ảnh</button>
      <button class="btn-secondary" style="font-size:14px">📋 Copy nội dung</button>
      <button class="btn-primary" style="font-size:14px">🔗 Chia sẻ</button>
    </div>
    <div class="note warn"><b>⚠️ ĐỪNG đề xuất ẩn 2 nút đầu.</b> Đây là CHỦ ĐÍCH của MixStay, không phải sơ hở:
    mục tiêu là để người ta mang tin đi đăng lại trên NHIỀU nền tảng khác một cách dễ dàng — càng nhiều nơi
    đăng thì tin càng tới được nhiều khách thuê. Số nhà đã được che ở tầng dữ liệu
    (<span class="tag">redactTitle</span> / <span class="tag">redactHouseNumber</span> /
    <span class="tag">redactPublicText</span>) nên nội dung mang đi vẫn an toàn.
    Bản kiểm định 07/08/2026 từng đề xuất ẩn; chủ dự án đã bác bỏ.</div>""", w=660)

F['components/skeleton.html'] = page(
    "Khung chờ tải", "Components",
    "Dùng thay chữ “Đang tải…” ở mọi trang có dữ liệu.",
    """<style>@keyframes p{0%,100%{opacity:1}50%{opacity:.45}}.sk{background:#e7e5e4;border-radius:8px;animation:p 1.6s ease-in-out infinite}</style>
    <div style="display:flex;gap:14px;flex-wrap:wrap">
      <div style="width:260px;border-radius:16px;border:1px solid #e7e5e4;background:#fff;overflow:hidden">
        <div class="sk" style="height:150px;border-radius:0"></div>
        <div style="padding:16px"><div class="sk" style="height:16px;width:75%"></div>
          <div class="sk" style="height:12px;width:50%;margin-top:10px"></div>
          <div class="sk" style="height:22px;width:60%;margin-top:14px"></div></div>
      </div>
      <div style="flex:1;min-width:240px">
        <div class="sk" style="height:70px"></div>
        <div class="sk" style="height:70px;margin-top:10px"></div>
        <div class="sk" style="height:70px;margin-top:10px"></div>
      </div>
    </div>
    <div class="note">Màn hình chờ toàn cục ở <span class="tag">app/loading.tsx</span> —
    nhớ giữ nhẹ để hiện tức thì trên mạng yếu, và <b>viết đúng dấu tiếng Việt</b>
    (“Đang tải…”, từng có lỗi hiện “Dang tai...”).</div>""", w=760)

for path, html in F.items():
    fp = OUT / path
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(html, encoding="utf-8")
    print(f"  {path}  ({len(html):,} bytes)")
print(f"\n→ {len(F)} file tại {OUT}")
