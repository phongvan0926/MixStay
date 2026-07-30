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

/**
 * Gộp địa chỉ bị DÁN 2 LẦN ("6/22/282 Kim giang 6/22/282 Kim giang" → "6/22/282 Kim giang").
 *
 * 46/466 tòa đang public có địa chỉ lặp đôi (do form/import dán chồng). Việc ẩn số nhà chỉ
 * cắt được cụm số ở ĐẦU chuỗi, nên bản lặp thứ hai giữ nguyên số nhà và lọt ra trang công
 * khai — kể cả vào <title> mà Google index. Phải gộp TRƯỚC khi cắt.
 */
function collapseDoubled(input: string): string {
  const s = input.trim();
  const words = s.split(/\s+/);
  if (words.length < 4) return s;
  const norm = (a: string[]) => a.join(' ').toLowerCase();
  // Tìm CHU KỲ NGẮN NHẤT: có bản ghi bị dán 3 lần chứ không chỉ 2 lần.
  for (let k = 2; k <= words.length / 2; k++) {
    if (words.length % k !== 0) continue;
    const first = norm(words.slice(0, k));
    let periodic = true;
    for (let i = k; i < words.length; i += k) {
      if (norm(words.slice(i, i + k)) !== first) { periodic = false; break; }
    }
    if (periodic) return words.slice(0, k).join(' ');
  }
  return s;
}

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
  s = collapseDoubled(s);                  // gộp địa chỉ dán 2 lần TRƯỚC khi cắt số nhà
  s = s.replace(ADDR_LABEL, '');           // bỏ nhãn "Địa chỉ:"

  // Có gỡ được một cụm SỐ NHÀ TƯỜNG MINH ra khỏi chuỗi hay không — quyết định cách xử lý
  // chuỗi ngõ/ngách bên dưới.
  let removedHouseNumber = false;
  const afterMid = s.replace(HOUSE_MID, ' ');           // "nhà 44" ở bất kỳ đâu
  if (afterMid !== s) removedHouseNumber = true;
  s = afterMid;
  const afterSo = s.replace(HOUSE_LEAD_SO, '');         // "Số 4" ở đầu
  if (afterSo !== s) removedHouseNumber = true;
  s = afterSo;

  // Bỏ số nhà trần ở đầu CHỈ KHI không phải mở đầu bằng ngõ/ngách/phố/đường.
  // LẶP: rất nhiều bản ghi dán số nhà 2 lần ở mức TOKEN ("65B 65B Yên Hòa", "15 143 Quan Hoa",
  // "6 6 Ngõ 79 Thuỵ Khê") — cắt một lần thì bản thứ hai chính là số nhà và vẫn lọt ra ngoài.
  // Địa chỉ hợp lệ không bao giờ mở đầu bằng hai cụm số liên tiếp, nên cắt hết là an toàn.
  for (let i = 0; i < 4; i++) {
    if (/^\s*(?:ngõ|ngách|hẻm|hem|ngo|ngach|phố|pho|đường|duong|tổ|to)\b/i.test(s)) break;
    const next = s.replace(HOUSE_LEAD_BARE, '');
    if (next === s) break;
    s = next;
    removedHouseNumber = true;
  }

  // Chuỗi ngõ/ngách nhiều cấp ("Ngõ 103/2/5"): đoạn CUỐI là số nhà hay số ngách?
  // Quy tắc nghiệp vụ: nếu địa chỉ ĐÃ ghi số nhà tường minh ở chỗ khác ("Số 4 Ngõ 103/2/5")
  // thì cả chuỗi là đường đi vào ngõ → GIỮ NGUYÊN. Nếu KHÔNG có số nhà nào khác
  // ("Ngõ 103/2/5 Cổ Nhuế") thì đoạn cuối chính là số nhà → cắt bỏ đoạn cuối.
  // Cắt MỌI chuỗi trong câu (cờ /g): có bản ghi nhắc lại địa chỉ nhiều lần không đều nhau
  // nên collapseDoubled không gộp được — bỏ sót một chuỗi là lộ số nhà.
  if (!removedHouseNumber) {
    s = s.replace(
      /\b(ngõ|ngo|ngách|ngach|hẻm|hem)\s+(\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)+)/gi,
      (_m, kw: string, chain: string) => {
        const parts = chain.split('/').map(x => x.trim());
        return `${kw} ${parts.slice(0, -1).join('/')}`;
      }
    );
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
  s = collapseDoubled(s);                  // tên tòa cũng bị dán 2 lần y như địa chỉ
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
