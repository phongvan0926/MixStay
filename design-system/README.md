# Bộ giao diện MixStay (design system)

Thư viện thành phần giao diện của MixStay, đồng bộ lên **claude.ai/design**
(dự án *"MixStay — Bộ giao diện"*, id `790d7c2b-1cdc-4925-a16d-bd9ce33e4681`).

## Có gì

| Nhóm | File |
|---|---|
| Nền tảng | `foundations/colors.html` · `foundations/typography.html` |
| Component | `buttons` · `inputs` · `badges-status` · `listing-card` · `cards` · `fabs` · `share-toolbar` · `alerts` · `skeleton` |
| Khu quản trị | `admin-table` · `sidebar-nav` |

Mỗi file là một trang HTML **tự chứa** (CSS nội tuyến, không tải gì từ ngoài) và mở đầu bằng
`<!-- @dsCard group="…" -->` — dòng này quyết định thẻ đó nằm nhóm nào trong Design System pane.

## Nguyên tắc

**Mọi màu, class và kích thước ở đây phải LẤY TỪ MÃ NGUỒN THẬT** — `tailwind.config.ts` và
`app/globals.css` — không dựng lại theo trí nhớ. Nếu sửa `globals.css` thì phải sửa lại đây,
nếu không bộ chuẩn sẽ nói dối.

Mỗi thẻ đều kèm phần ghi chú **lý do** (những bài học đã trả giá), không chỉ hình dạng:
sàn 44px cho vùng bấm, luật che số nhà, vì sao KHÔNG được ẩn nút "Tải ảnh"/"Copy nội dung",
vì sao không đặt safe-area vào padding của nút.

## Dựng lại & đồng bộ

```bash
python3 design-system/build.py     # dựng lại toàn bộ file HTML
```

Đẩy lên claude.ai/design bằng công cụ `DesignSync` theo thứ tự bắt buộc:
`list_files` → `finalize_plan` (khai rõ writes + deletes + localDir) → `write_files`.
