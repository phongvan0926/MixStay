// Ẩn SỐ NHÀ khỏi địa chỉ hiển thị cho khách: khách chỉ được biết tới ngõ/ngách + tên đường,
// KHÔNG biết số nhà chính xác (để không tự tìm tới cửa, giữ vai trò cộng tác viên/chủ nhà).
//
// Data thật rất lộn xộn: số nhà có thể ở ĐẦU ("Số 25 ngách 8 ngõ Quỳnh", "69A Nguyễn Trãi",
// "136/43 Cầu Diễn") hoặc ở GIỮA sau ngõ/ngách ("Ngõ 204 nhà 44 Trần Duy Hưng",
// "Ngõ 592 số nhà 91 Trường Chinh"), đôi khi có dấu ngoặc kép / nhãn "Địa chỉ:".
// Vì vậy hàm redact LỌC theo token số nhà thay vì cắt cố định — an toàn với mọi định dạng.

const HOUSE_MID = /\b(?:số\s*nhà|nhà\s*số|nhà)\s*\d+[a-zA-Z0-9]*\b/gi;       // "nhà 44", "số nhà 91", "nhà 28A", "Nhà 12N02"
const HOUSE_LEAD_SO = /^\s*(?:số\s*nhà|số|s\.)\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b[\s,.\-]*/i; // "Số 25", "SỐ 30B", "số 8"
const HOUSE_LEAD_BARE = /^\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b[\s,.\-]*/i; // "75", "69A", "136/43", "26a", "56"
const ADDR_LABEL = /^\s*(?:địa\s*chỉ|đ\/c|dc)\s*[:.]?\s*/i;

function clean(s: string): string {
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.\-/]+/, '')
    .replace(/[\s,]+$/, '')
    .trim();
}

/**
 * Trả về địa chỉ AN TOÀN cho khách (đã bỏ số nhà): chỉ còn ngõ/ngách + đường + ghi chú.
 * Không bao giờ làm lộ số nhà; nếu không chắc thì cắt nhiều hơn là ít.
 */
export function redactHouseNumber(input?: string | null): string {
  if (!input) return '';
  let s = input.trim().replace(/^["'""']+/, '').replace(/["'""']+$/, ''); // bỏ ngoặc kép bao ngoài
  s = s.replace(ADDR_LABEL, '');           // bỏ nhãn "Địa chỉ:"
  s = s.replace(HOUSE_MID, ' ');           // bỏ "nhà X" ở bất kỳ đâu
  s = s.replace(HOUSE_LEAD_SO, '');        // bỏ "Số X" ở đầu
  // bỏ số nhà trần ở đầu CHỈ KHI không phải mở đầu bằng ngõ/ngách/phố/đường
  if (!/^\s*(?:ngõ|ngách|hẻm|hem|ngo|ngach|phố|pho|đường|duong|tổ|to)\b/i.test(s)) {
    s = s.replace(HOUSE_LEAD_BARE, '');
  }
  return clean(s);
}

/** Địa chỉ công khai cho khách = redact số nhà. Rỗng thì fallback đường + quận. */
export function publicAddress(fullAddress?: string | null, streetName?: string | null): string {
  const red = redactHouseNumber(fullAddress);
  if (red) return red;
  return (streetName || '').trim();
}

/**
 * Lọc số nhà khỏi TÊN tòa nhà do chủ nhà tự đặt (nhiều tên = địa chỉ kèm số nhà:
 * "75 ĐỨC DIỄN", "CCMN 69A NGUYỄN TRÃI", "TRỌ 68/53 CẦU GIẤY"). Giữ phần chữ.
 */
export function redactName(input?: string | null): string {
  if (!input) return '';
  let s = input.trim().replace(/^["'""']+/, '').replace(/["'""']+$/, '');
  s = s.replace(HOUSE_MID, ' ');
  // bỏ cụm "Số X" / số trần đứng riêng trong tên (không nuốt "ngõ 2", "101/12" sau "ngõ")
  s = s.replace(/\b(?:số\s*nhà|số)\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b/gi, ' ');
  // số trần đầu tên ("75 ĐỨC DIỄN", "177 Cầu Diễn") — chỉ ở đầu, không đụng "Ngõ 2"
  if (!/^\s*(?:ngõ|ngách|hẻm|ngo|ngach|phố|đường)\b/i.test(s)) {
    s = s.replace(/^\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b[\s,.\-]*/i, '');
  }
  // số nhà đứng GIỮA tên ngay trước "ngách/ngõ/hẻm" ("CCMN 26A NGÁCH 52 NGÕ 91" → bỏ "26A"):
  // số của ngõ/ngách nằm SAU từ khóa nên không bị đụng ("Ngõ 91" giữ nguyên)
  s = s.replace(/\b\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\s+(?=(?:ngách|ngach|ngõ|ngo|hẻm|hem)\b)/gi, '');
  // số nhà ngay SAU từ loại hình nhà ("CCMN 69A NGUYỄN TRÃI", "TRỌ 68/53 CẦU GIẤY") — giữ từ loại hình.
  // KHÔNG đụng số-đếm mô tả: "CCMN 5 tầng", "trọ 10 phòng"...
  s = s.replace(/\b(ccmn|trọ|tro|nhà\s*trọ|chung\s*cư(?:\s*mini)?|toà|tòa|toa)\s+\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*(?!\s*(?:tầng|tang|phòng|phong|tháng|thang|m2|m²|triệu|tr\b|k\b|người|nguoi))\b\s*/gi, '$1 ');
  const out = clean(s);
  return out || (input || '').trim(); // nếu lỡ rỗng hết thì trả tên gốc (an toàn UX hơn là trống)
}

/**
 * Tách BEST-EFFORT số nhà từ fullAddress (để backfill field houseNumber + prefill form).
 * Không dùng cho việc ẩn (việc ẩn dùng redactHouseNumber). Trả '' nếu không nhận ra.
 */
export function extractHouseNumber(fullAddress?: string | null): string {
  if (!fullAddress) return '';
  const s = fullAddress.trim().replace(/^["'""']+/, '');
  // ưu tiên "Số X" / "số nhà X" ở đầu
  const lead = s.match(/^\s*(?:số\s*nhà|số|s\.)\s*(\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*)\b/i);
  if (lead) return clean(lead[0]);
  // "nhà X" / "số nhà X" ở giữa
  const mid = s.match(/\b(?:số\s*nhà|nhà\s*số|nhà)\s*(\d+[a-zA-Z0-9]*)\b/i);
  if (mid) return clean(mid[0]);
  // số trần ở đầu, nhưng không phải "ngõ/ngách/phố/đường"
  if (!/^\s*(?:ngõ|ngách|hẻm|ngo|ngach|phố|đường|tổ)\b/i.test(s)) {
    const bare = s.match(/^\s*(\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*)\b/i);
    if (bare) return clean(bare[1]);
  }
  return '';
}
