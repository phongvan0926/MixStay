// Các phong cách viết tin cho nút "AI hỗ trợ chuẩn hóa tin đăng".
// Client dùng key + label để render nút; server dùng instruction để dựng prompt.
export interface AiStyle {
  key: string;
  label: string;
  emoji: string;
  instruction: string;
}

export const AI_LISTING_STYLES: AiStyle[] = [
  { key: 'ngan_gon', label: 'Ngắn gọn', emoji: '⚡',
    instruction: 'Ngắn gọn, súc tích, đi thẳng ý chính, dễ lướt nhanh trên điện thoại; hạn chế câu rườm rà.' },
  { key: 'chuyen_nghiep', label: 'Chuyên nghiệp', emoji: '👔',
    instruction: 'Chuyên nghiệp, rõ ràng, chỉn chu, đáng tin cậy; câu chữ mạch lạc, lịch sự.' },
  { key: 'than_thien', label: 'Thân thiện', emoji: '😊',
    instruction: 'Thân thiện, gần gũi, ấm áp như đang trò chuyện với khách; xưng hô mình - bạn.' },
  { key: 'chi_tiet', label: 'Chi tiết', emoji: '📋',
    instruction: 'Chi tiết, đầy đủ, chia thành các mục rõ ràng để khách nắm hết thông tin.' },
  { key: 'hap_dan', label: 'Hấp dẫn', emoji: '🔥',
    instruction: 'Hấp dẫn, cuốn hút kiểu marketing, làm nổi bật điểm mạnh — nhưng TUYỆT ĐỐI không nói quá hay bịa thêm.' },
];

export const DEFAULT_AI_STYLE = 'ngan_gon';
