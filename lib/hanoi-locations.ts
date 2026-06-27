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

// Tên đường/phố phổ biến ở Hà Nội (gợi ý — không phân biệt dấu khi lọc).
// Sắp xếp tương đối theo khu vực; một số đường nằm ở nhiều quận nên RAW có trùng,
// COMMON_STREETS đã loại trùng (giữ thứ tự xuất hiện đầu tiên).
const RAW_STREETS = [
  // Hoàn Kiếm / trung tâm
  'Tràng Tiền', 'Tràng Thi', 'Hàng Bài', 'Bà Triệu', 'Phố Huế', 'Lý Thường Kiệt',
  'Trần Hưng Đạo', 'Hai Bà Trưng', 'Lê Thái Tổ', 'Đinh Tiên Hoàng', 'Hàng Khay',
  'Quán Sứ', 'Phan Bội Châu', 'Lý Thái Tổ', 'Ngô Quyền', 'Hàng Bông', 'Hàng Gai',
  'Hàng Đào', 'Hàng Ngang', 'Lương Văn Can', 'Cầu Gỗ', 'Hàng Buồm', 'Mã Mây',
  // Ba Đình
  'Kim Mã', 'Nguyễn Thái Học', 'Giảng Võ', 'Cát Linh', 'Tôn Đức Thắng', 'Liễu Giai',
  'Đội Cấn', 'Hoàng Hoa Thám', 'Văn Cao', 'Nguyễn Chí Thanh', 'Núi Trúc', 'Ngọc Khánh',
  'Kim Mã Thượng', 'Đào Tấn', 'Phan Đình Phùng', 'Quán Thánh', 'Thanh Niên', 'Điện Biên Phủ',
  // Đống Đa
  'Tây Sơn', 'Nguyễn Lương Bằng', 'Xã Đàn', 'Phạm Ngọc Thạch', 'Chùa Bộc', 'Thái Hà',
  'Hoàng Cầu', 'Đê La Thành', 'Ô Chợ Dừa', 'Khâm Thiên', 'Tôn Thất Tùng', 'Trường Chinh',
  'Láng', 'Láng Hạ', 'Nguyễn Khuyến', 'Văn Miếu', 'Quốc Tử Giám', 'Hồ Đắc Di', 'Đặng Văn Ngữ',
  'Vũ Ngọc Phan', 'Huỳnh Thúc Kháng', 'Nguyên Hồng', 'Thái Thịnh', 'Tôn Thất Tùng',
  // Hai Bà Trưng
  'Bạch Mai', 'Minh Khai', 'Đại La', 'Trương Định', 'Lò Đúc', 'Kim Ngưu', 'Trần Khát Chân',
  'Võ Thị Sáu', 'Thanh Nhàn', 'Đại Cồ Việt', 'Tạ Quang Bửu', 'Lê Thanh Nghị', 'Bùi Ngọc Dương',
  'Phố Vọng', 'Giải Phóng', 'Lê Đại Hành', 'Bà Triệu', 'Mai Hắc Đế', 'Triệu Việt Vương',
  // Thanh Xuân
  'Nguyễn Trãi', 'Lê Văn Lương', 'Nguyễn Xiển', 'Khuất Duy Tiến', 'Nguyễn Tuân', 'Vũ Trọng Phụng',
  'Quan Nhân', 'Nhân Hòa', 'Khương Đình', 'Khương Trung', 'Bùi Xương Trạch', 'Hoàng Đạo Thúy',
  'Hoàng Ngân', 'Lê Trọng Tấn', 'Định Công', 'Nguyễn Huy Tưởng', 'Ngụy Như Kon Tum', 'Vương Thừa Vũ',
  // Cầu Giấy
  'Cầu Giấy', 'Xuân Thủy', 'Hồ Tùng Mậu', 'Trần Đăng Ninh', 'Nguyễn Phong Sắc', 'Trần Thái Tông',
  'Duy Tân', 'Trần Quốc Hoàn', 'Nguyễn Khánh Toàn', 'Trung Kính', 'Vũ Phạm Hàm', 'Nguyễn Khang',
  'Trần Duy Hưng', 'Hoàng Quốc Việt', 'Nghĩa Tân', 'Tô Hiệu', 'Dương Quảng Hàm', 'Doãn Kế Thiện',
  'Yên Hòa', 'Trung Hòa', 'Mạc Thái Tổ', 'Mạc Thái Tông', 'Phạm Tuấn Tài',
  // Nam/Bắc Từ Liêm
  'Phạm Hùng', 'Mễ Trì', 'Lê Đức Thọ', 'Hàm Nghi', 'Nguyễn Cơ Thạch', 'Tôn Thất Thuyết',
  'Châu Văn Liêm', 'Đỗ Đức Dục', 'Mỹ Đình', 'Phạm Văn Đồng', 'Hồ Tùng Mậu', 'Cầu Diễn',
  'Phú Diễn', 'Xuân Đỉnh', 'Đông Ngạc', 'Cổ Nhuế', 'Tây Tựu', 'Đại Mỗ', 'Tây Mỗ', 'Trần Hữu Dực',
  'Nguyễn Hoàng', 'Hàm Nghi', 'Đình Thôn', 'Nguyễn Quốc Trị',
  // Hoàng Mai
  'Tam Trinh', 'Lĩnh Nam', 'Vĩnh Hưng', 'Vĩnh Tuy', 'Kim Đồng', 'Tân Mai', 'Đền Lừ',
  'Nguyễn An Ninh', 'Giáp Bát', 'Trương Định', 'Pháp Vân', 'Yên Sở', 'Nguyễn Hữu Thọ',
  'Linh Đường', 'Hoàng Liệt', 'Bằng Liệt', 'Nghiêm Xuân Yêm', 'Giải Phóng', 'Thúy Lĩnh',
  // Tây Hồ
  'Lạc Long Quân', 'Âu Cơ', 'Nghi Tàm', 'Yên Phụ', 'Xuân Diệu', 'Tô Ngọc Vân', 'Quảng An',
  'Võng Thị', 'Thụy Khuê', 'Đặng Thai Mai', 'An Dương Vương', 'Phú Thượng', 'Nhật Tân',
  // Long Biên
  'Nguyễn Văn Cừ', 'Ngọc Lâm', 'Ngọc Thụy', 'Nguyễn Sơn', 'Nguyễn Văn Linh', 'Cổ Linh',
  'Thạch Bàn', 'Sài Đồng', 'Ngô Gia Tự', 'Bồ Đề', 'Hồng Tiến', 'Đức Giang',
  // Hà Đông
  'Quang Trung', 'Trần Phú', 'Lê Trọng Tấn', 'Phùng Hưng', 'Tố Hữu', 'Vạn Phúc', 'Yên Nghĩa',
  'Bà Triệu', 'Nguyễn Trãi', 'Lê Lợi', 'Ngô Quyền', 'Nguyễn Khuyến', 'Phúc La', 'Văn Khê',
  'Mậu Lương', 'Nguyễn Văn Lộc', 'Chiến Thắng', 'Lê Văn Lương', 'Khương Đình',
];

// Loại trùng, giữ thứ tự xuất hiện đầu tiên.
export const COMMON_STREETS = Array.from(new Set(RAW_STREETS));
