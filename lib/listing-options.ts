// lib/listing-options.ts — Danh mục dùng chung cho form đăng tin + AI parse.
// Client-safe (không import gì server-only). RoomTypeForm và /api/ai/parse-listing
// cùng import từ đây để enum AI luôn khớp lựa chọn trên form.

export const AMENITY_OPTIONS = [
  'Điều hoà', 'Nóng lạnh', 'WC riêng', 'Bếp riêng', 'Ban công',
  'Giường', 'Tủ quần áo', 'Máy giặt riêng', 'Tủ lạnh', 'Bàn làm việc',
  'Kệ bếp', 'Bàn ăn', 'Rèm cửa', 'Quạt trần', 'Smart TV',
];

export const ROOM_TYPE_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: 'gac_xep', label: 'Gác xép' },
  { value: 'don', label: 'Phòng đơn' },
  { value: '1k1n', label: '1 ngủ 1 khách' },
  { value: '2k1n', label: '2 ngủ 1 khách' },
  { value: 'duplex', label: 'Duplex' },
] as const;

export const ROOM_TYPE_VALUES = ROOM_TYPE_OPTIONS.map(o => o.value);
