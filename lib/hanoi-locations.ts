// Dữ liệu địa chỉ Hà Nội dùng chung (theo đơn vị hành chính TRƯỚC sáp nhập 7/2025).
// - HANOI_DISTRICTS: danh sách 30 quận/huyện/thị xã → dùng cho dropdown chọn cố định.
// - COMMON_STREETS: danh sách tên đường/phố phổ biến → dùng làm GỢI Ý (người dùng vẫn
//   gõ tự do được, đây chỉ là gợi ý nên không cần đầy đủ tuyệt đối).

// 7 quận nội thành hay dùng nhất (hiện lên trước trong dropdown / pills).
export const PRIMARY_DISTRICTS = [
  'Cầu Giấy',
  'Đống Đa',
  'Thanh Xuân',
  'Ba Đình',
  'Hai Bà Trưng',
  'Nam Từ Liêm',
  'Hoàng Mai',
];

// Các quận/huyện/thị xã còn lại.
export const OTHER_DISTRICTS = [
  // Nội thành còn lại
  'Bắc Từ Liêm', 'Hà Đông', 'Hoàn Kiếm', 'Long Biên', 'Tây Hồ',
  // Thị xã + huyện ngoại thành
  'Sơn Tây',
  'Ba Vì', 'Chương Mỹ', 'Đan Phượng', 'Đông Anh', 'Gia Lâm',
  'Hoài Đức', 'Mê Linh', 'Mỹ Đức', 'Phú Xuyên', 'Phúc Thọ',
  'Quốc Oai', 'Sóc Sơn', 'Thạch Thất', 'Thanh Oai', 'Thanh Trì',
  'Thường Tín', 'Ứng Hòa',
];

// Danh sách đầy đủ 30 quận/huyện (quận hay dùng đứng trước cho tiện chọn).
export const HANOI_DISTRICTS = [...PRIMARY_DISTRICTS, ...OTHER_DISTRICTS];

// 12 quận nội thành (trước sáp nhập 7/2025) — dùng cho gợi ý nhanh "Phổ biến" ở trang chủ.
export const INNER_CITY_DISTRICTS = [
  'Ba Đình', 'Hoàn Kiếm', 'Tây Hồ', 'Long Biên', 'Cầu Giấy', 'Đống Đa',
  'Hai Bà Trưng', 'Hoàng Mai', 'Thanh Xuân', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Hà Đông',
];

// Đường/phố phổ biến Hà Nội THEO QUẬN. Thứ tự quận: trung tâm/nổi tiếng trước → khi 1 đường
// thuộc nhiều quận, map đường→quận sẽ lấy quận XUẤT HIỆN ĐẦU TIÊN (ưu tiên quận đường đó
// nổi tiếng hơn). Đây là gợi ý — người dùng vẫn gõ/sửa được nên không cần đầy đủ tuyệt đối.
const STREETS_BY_DISTRICT: { district: string; streets: string[] }[] = [
  { district: 'Hoàn Kiếm', streets: [
    'Tràng Tiền', 'Tràng Thi', 'Hàng Bài', 'Bà Triệu', 'Phố Huế', 'Lý Thường Kiệt',
    'Trần Hưng Đạo', 'Hai Bà Trưng', 'Lê Thái Tổ', 'Đinh Tiên Hoàng', 'Hàng Khay',
    'Quán Sứ', 'Phan Bội Châu', 'Lý Thái Tổ', 'Ngô Quyền', 'Hàng Bông', 'Hàng Gai',
    'Hàng Đào', 'Hàng Ngang', 'Lương Văn Can', 'Cầu Gỗ', 'Hàng Buồm', 'Mã Mây',
  ] },
  { district: 'Ba Đình', streets: [
    'Kim Mã', 'Nguyễn Thái Học', 'Giảng Võ', 'Cát Linh', 'Tôn Đức Thắng', 'Liễu Giai',
    'Đội Cấn', 'Hoàng Hoa Thám', 'Văn Cao', 'Nguyễn Chí Thanh', 'Núi Trúc', 'Ngọc Khánh',
    'Kim Mã Thượng', 'Đào Tấn', 'Phan Đình Phùng', 'Quán Thánh', 'Thanh Niên', 'Điện Biên Phủ',
  ] },
  { district: 'Đống Đa', streets: [
    'Tây Sơn', 'Nguyễn Lương Bằng', 'Xã Đàn', 'Phạm Ngọc Thạch', 'Chùa Bộc', 'Thái Hà',
    'Hoàng Cầu', 'Đê La Thành', 'Ô Chợ Dừa', 'Khâm Thiên', 'Tôn Thất Tùng', 'Trường Chinh',
    'Láng', 'Láng Hạ', 'Nguyễn Khuyến', 'Văn Miếu', 'Quốc Tử Giám', 'Hồ Đắc Di', 'Đặng Văn Ngữ',
    'Vũ Ngọc Phan', 'Huỳnh Thúc Kháng', 'Nguyên Hồng', 'Thái Thịnh',
  ] },
  { district: 'Hai Bà Trưng', streets: [
    'Bạch Mai', 'Minh Khai', 'Đại La', 'Trương Định', 'Lò Đúc', 'Kim Ngưu', 'Trần Khát Chân',
    'Võ Thị Sáu', 'Thanh Nhàn', 'Đại Cồ Việt', 'Tạ Quang Bửu', 'Lê Thanh Nghị', 'Bùi Ngọc Dương',
    'Phố Vọng', 'Giải Phóng', 'Lê Đại Hành', 'Mai Hắc Đế', 'Triệu Việt Vương',
  ] },
  { district: 'Thanh Xuân', streets: [
    'Nguyễn Trãi', 'Lê Văn Lương', 'Nguyễn Xiển', 'Khuất Duy Tiến', 'Nguyễn Tuân', 'Vũ Trọng Phụng',
    'Quan Nhân', 'Nhân Hòa', 'Khương Đình', 'Khương Trung', 'Bùi Xương Trạch', 'Hoàng Đạo Thúy',
    'Hoàng Ngân', 'Lê Trọng Tấn', 'Định Công', 'Nguyễn Huy Tưởng', 'Ngụy Như Kon Tum', 'Vương Thừa Vũ',
  ] },
  { district: 'Cầu Giấy', streets: [
    'Cầu Giấy', 'Xuân Thủy', 'Hồ Tùng Mậu', 'Trần Đăng Ninh', 'Nguyễn Phong Sắc', 'Trần Thái Tông',
    'Duy Tân', 'Trần Quốc Hoàn', 'Nguyễn Khánh Toàn', 'Trung Kính', 'Vũ Phạm Hàm', 'Nguyễn Khang',
    'Trần Duy Hưng', 'Hoàng Quốc Việt', 'Nghĩa Tân', 'Tô Hiệu', 'Dương Quảng Hàm', 'Doãn Kế Thiện',
    'Yên Hòa', 'Trung Hòa', 'Mạc Thái Tổ', 'Mạc Thái Tông', 'Phạm Tuấn Tài',
  ] },
  { district: 'Nam Từ Liêm', streets: [
    'Phạm Hùng', 'Mễ Trì', 'Lê Đức Thọ', 'Hàm Nghi', 'Nguyễn Cơ Thạch', 'Tôn Thất Thuyết',
    'Châu Văn Liêm', 'Đỗ Đức Dục', 'Mỹ Đình', 'Đại Mỗ', 'Tây Mỗ', 'Trần Hữu Dực',
    'Nguyễn Hoàng', 'Đình Thôn', 'Nguyễn Quốc Trị',
  ] },
  { district: 'Bắc Từ Liêm', streets: [
    'Phạm Văn Đồng', 'Cầu Diễn', 'Phú Diễn', 'Xuân Đỉnh', 'Đông Ngạc', 'Cổ Nhuế', 'Tây Tựu',
  ] },
  { district: 'Hoàng Mai', streets: [
    'Tam Trinh', 'Lĩnh Nam', 'Vĩnh Hưng', 'Vĩnh Tuy', 'Kim Đồng', 'Tân Mai', 'Đền Lừ',
    'Nguyễn An Ninh', 'Giáp Bát', 'Pháp Vân', 'Yên Sở', 'Nguyễn Hữu Thọ',
    'Linh Đường', 'Hoàng Liệt', 'Bằng Liệt', 'Nghiêm Xuân Yêm', 'Thúy Lĩnh',
  ] },
  { district: 'Tây Hồ', streets: [
    'Lạc Long Quân', 'Âu Cơ', 'Nghi Tàm', 'Yên Phụ', 'Xuân Diệu', 'Tô Ngọc Vân', 'Quảng An',
    'Võng Thị', 'Thụy Khuê', 'Đặng Thai Mai', 'An Dương Vương', 'Phú Thượng', 'Nhật Tân',
  ] },
  { district: 'Long Biên', streets: [
    'Nguyễn Văn Cừ', 'Ngọc Lâm', 'Ngọc Thụy', 'Nguyễn Sơn', 'Nguyễn Văn Linh', 'Cổ Linh',
    'Thạch Bàn', 'Sài Đồng', 'Ngô Gia Tự', 'Bồ Đề', 'Hồng Tiến', 'Đức Giang',
  ] },
  { district: 'Hà Đông', streets: [
    'Quang Trung', 'Trần Phú', 'Phùng Hưng', 'Tố Hữu', 'Vạn Phúc', 'Yên Nghĩa',
    'Lê Lợi', 'Phúc La', 'Văn Khê', 'Mậu Lương', 'Nguyễn Văn Lộc', 'Chiến Thắng',
  ] },
];

// Danh sách đường phẳng (gợi ý cho combobox), loại trùng giữ thứ tự xuất hiện đầu tiên.
export const COMMON_STREETS = Array.from(
  new Set(STREETS_BY_DISTRICT.flatMap(g => g.streets))
);

// Chuẩn hoá để tra cứu không phân biệt dấu/hoa-thường.
function normStreet(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim();
}

// Map tên đường (đã chuẩn hoá) → quận. Quận đầu tiên thắng (ưu tiên quận đường đó nổi tiếng hơn).
const STREET_DISTRICT_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const g of STREETS_BY_DISTRICT) {
    for (const s of g.streets) {
      const k = normStreet(s);
      if (!(k in map)) map[k] = g.district;
    }
  }
  return map;
})();

/** Tra quận chứa một tên đường (không phân biệt dấu). Trả null nếu chưa biết đường đó. */
export function findDistrictForStreet(street: string | null | undefined): string | null {
  if (!street) return null;
  return STREET_DISTRICT_MAP[normStreet(street)] ?? null;
}
