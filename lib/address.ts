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
 * Lọc số nhà khỏi TÊN TIN ĐĂNG (RoomType.name) trước khi đưa ra công khai.
 *
 * Vì sao tách riêng khỏi redactName() (vốn cho TÊN TÒA): tiêu đề tin có văn phong khác hẳn —
 * mở đầu bằng loại phòng ("1 ngủ 1 khách…", "2N1K…") rồi mới tới địa chỉ sau chữ "tại".
 * Dùng redactName() ở đây sẽ ăn mất số 1 của "1 ngủ 1 khách" (nó cắt số trần ở ĐẦU chuỗi),
 * còn redactHouseNumber() thì cắt luôn cả chuỗi ngõ. Nên phải có luật riêng.
 *
 * Phát hiện 07/08/2026 khi kiểm định: 89/622 tin công khai (14%) có số nhà nằm ngay trong TÊN,
 * mà tên thì đi thẳng ra <title> của /tin/[id] (Google đã lập chỉ mục), thẻ tin mọi trang công
 * khai, JSON-LD, thẻ OG và ảnh bìa. Địa chỉ đã che số nhà đúng từ lâu, nhưng TÊN thì chưa ai che
 * → luật riêng tư cốt lõi bị lách qua đường khác.
 */
export function redactTitle(input?: string | null): string {
  if (!input) return '';
  let s = String(input).trim().replace(/^["'“”']+/, '').replace(/["'“”']+$/, '');
  s = collapseDoubled(s);
  let removed = false;
  const cut = (re: RegExp, rep: string) => {
    const next = s.replace(re, rep);
    if (next !== s) { removed = true; s = next; }
  };

  // "nhà 44", "số nhà 91", "Nhà số 19" ở bất kỳ đâu trong tiêu đề
  cut(HOUSE_MID, ' ');
  // "Số 24b", "SỐ 26A" (kèm chuỗi ngõ dính liền nếu có)
  cut(/\b(?:số\s*nhà|số)\s*\d+[a-zA-Z]?(?:\s*[-–]\s*\d+[a-zA-Z]?)?(?:\s*\/\s*\d+[a-zA-Z]?)*\b/gi, ' ');
  // số nhà TRẦN ngay sau "tại/ở": "tại 44 Trần Thái Tông" → "tại Trần Thái Tông".
  // Chặn nuốt nhầm số đếm mô tả: "tại 2 phòng ngủ", "tại 5 tầng"...
  // ⚠️ Danh sách chặn KHÔNG được có "tr"/"k": cờ /i khiến "tr\b" khớp luôn "Tr" của
  // Trần/Trương/Trung (sau "Tr" là "ầ" — không phải \w nên \b khớp), làm chết cả luật.
  cut(/\b(tại|tai|ở)\s+\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\s+(?!(?:tầng|tang|phòng|phong|ngủ|ngu|khách|khach|người|nguoi|giường|giuong|m2|m²|triệu)\b)(?=[^\d\s])/gi, '$1 ');
  // số nhà TRẦN đứng ngay trước "ngõ/ngách/hẻm" ("26A NGÁCH 52" → bỏ "26A").
  // Số CỦA ngõ nằm SAU từ khoá nên không bị đụng.
  // Lookbehind: số ĐỨNG SAU một từ khoá ngõ/ngách là số CỦA ngõ đó, không phải số nhà
  // ("NGÕ 58 NGÁCH 32" phải giữ 58). Thiếu lookbehind là cắt nhầm thành "NGÕ NGÁCH 32".
  cut(/(?<!(?:ngõ|ngo|ngách|ngach|hẻm|hem)\s{1,4})\b\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\s+(?=(?:ngách|ngach|ngõ|ngo|hẻm|hem)\b)/gi, '');
  // số nhà ngay sau từ loại hình nhà ("CCMN 69A NGUYỄN TRÃI"), chừa số đếm mô tả
  cut(/\b(ccmn|trọ|tro|nhà\s*trọ|chung\s*cư(?:\s*mini)?|toà|tòa|toa)\s+\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*(?!\s*(?:tầng|tang|phòng|phong|tháng|thang|m2|m²|triệu|tr\b|k\b|người|nguoi))\b\s*/gi, '$1 ');

  // QUY TẮC CHUỖI NGÕ (giống redactHouseNumber): chưa cắt được số nhà tường minh nào
  // → đoạn CUỐI của chuỗi "ngõ 205/37" chính là số nhà, phải bỏ.
  if (!removed) {
    s = s.replace(/\b(ngõ|ngo|ngách|ngach|hẻm|hem)\s+(\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)+)/gi,
      (_m, kw, chain) => `${kw} ${chain.split('/').map((x: string) => x.trim()).slice(0, -1).join('/')}`);
  }

  // Dọn rác do cắt để lại: ", ," · "tại ," · " ." · mảnh "-C5" mồ côi · thừa khoảng trắng
  s = s.replace(/\s*-\s*(?=[A-Za-zÀ-ỹ]?\d)/g, ' ')
       .replace(/([,.;])\s*(?=[,.;])/g, '')
       .replace(/\b(tại|tai|ở)\s*[,.]\s*/gi, '$1 ')
       .replace(/\s+([,.;])/g, '$1')
       .replace(/\s{2,}/g, ' ')
       .replace(/^[\s,.;\-]+|[\s,.;\-]+$/g, '');

  return s.trim() || String(input).trim(); // cắt sạch quá thì trả tên gốc, thà lộ còn hơn tiêu đề trống
}

/**
 * Lọc SỐ ĐIỆN THOẠI / handle Zalo khỏi văn bản tự do trước khi cho khách xem (mô tả tin).
 *
 * Luật của dự án: khách qua link share chỉ thấy khu vực + tiện ích, KHÔNG thấy SĐT — để CTV
 * không bị nhảy cóc mất hoa hồng. Nhưng mô tả là ô gõ tự do, chủ nhà vẫn kẹp số vào
 * (kiểm định 07/08/2026 bắt được 2 tin đang lộ). Che ở tầng hiển thị thì cả tin cũ lẫn tin
 * mới đều an toàn, không phải đi sửa từng bản ghi.
 *
 * Bắt cả các kiểu né: "0378 791 103", "0378.791.103", "037-879-1103", "+84378791103".
 */
export function redactPublicText(input?: string | null): string {
  if (!input) return '';
  return String(input)
    // +84 / 84 / 0 + 9 chữ số, cho phép chen . - khoảng trắng giữa các chữ số
    .replace(/(?:\+?84|0)(?:[\s.\-]?\d){9}\b/g, '[đã ẩn]')
    // "zalo: abc", "zalo 0378..." — phần số đã bị thay ở trên, dọn nốt nhãn thừa
    .replace(/\b(zalo|sđt|sdt|số\s*đt|điện\s*thoại|liên\s*hệ|lh)\s*[:\-]?\s*(?=\[đã ẩn\])/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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
