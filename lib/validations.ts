import { z } from 'zod';
import { isValidVideoUrl } from './video-utils';

// ===== Auth =====
export const loginSchema = z.object({
  // Định danh đăng nhập: email HOẶC số điện thoại
  email: z.string().min(1, 'Nhập email hoặc số điện thoại'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100, 'Tên tối đa 100 ký tự'),
  // Email KHÔNG bắt buộc. Cần ít nhất 1 trong email/SĐT (định danh đăng nhập) — refine bên dưới.
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  phone: z.string().min(8, 'Số điện thoại không hợp lệ').max(20).optional().or(z.literal('')),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(['BROKER', 'LANDLORD', 'CUSTOMER'], { message: 'Vai trò không hợp lệ' }),
}).refine(d => !!(d.email && d.email.trim()) || !!(d.phone && d.phone.trim()), {
  message: 'Vui lòng nhập Email hoặc Số điện thoại',
  path: ['phone'],
});

// ===== Property =====
export const propertyCreateSchema = z.object({
  name: z.string().min(1, 'Tên tòa nhà không được trống').max(200),
  fullAddress: z.string().min(1, 'Địa chỉ không được trống').max(500),
  district: z.string().min(1, 'Quận/Huyện không được trống').max(100),
  streetName: z.string().min(1, 'Tên đường không được trống').max(200),
  city: z.string().max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  latitude: z.union([z.number(), z.string()]).optional().nullable(),
  longitude: z.union([z.number(), z.string()]).optional().nullable(),
  totalFloors: z.union([z.number().int().positive(), z.string()]).optional(),
  zaloPhone: z.string().max(20).optional().nullable(),
  landlordNotes: z.string().max(2000).optional().nullable(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  parkingCar: z.boolean().optional(),
  parkingBike: z.boolean().optional(),
  evCharging: z.boolean().optional(),
  petAllowed: z.boolean().optional(),
  foreignerOk: z.boolean().optional(),
  companyId: z.string().optional().nullable(),
  landlordId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const propertyUpdateSchema = propertyCreateSchema.partial().extend({
  id: z.string().min(1, 'Thiếu id'),
  isActive: z.boolean().optional(),
});

// ===== RoomType =====
export const ROOM_STATUSES = ['AVAILABLE', 'UNAVAILABLE', 'UPCOMING'] as const;

const roomStatusRefine = (data: any) => {
  if (data?.status === 'UPCOMING') {
    return data.expectedAvailableDate != null && data.expectedAvailableDate !== '';
  }
  return true;
};

export const roomTypeCreateSchema = z.object({
  propertyId: z.string().min(1, 'Thiếu tòa nhà'),
  name: z.string().min(1, 'Tiêu đề bài đăng không được trống').max(200),
  typeName: z.string().optional(),
  areaSqm: z.union([z.number().positive('Diện tích phải > 0'), z.string()]),
  priceMonthly: z.union([z.number().positive('Giá thuê phải > 0'), z.string()]),
  deposit: z.union([z.number(), z.string()]).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  videoLinks: z
    .array(z.string().refine(isValidVideoUrl, 'Link video phải là YouTube/TikTok/Facebook hợp lệ'))
    .optional(),
  totalUnits: z.union([z.number().int().positive(), z.string()]).optional(),
  availableUnits: z.union([z.number().int().min(0), z.string()]).optional(),
  availableRoomNames: z.string().optional().nullable(),
  commissionJson: z.any().optional().nullable(),
  shortTermAllowed: z.boolean().optional(),
  shortTermMonths: z.string().max(100).optional().nullable(),
  shortTermPrice: z.union([z.number(), z.string()]).optional().nullable(),
  landlordNotes: z.string().max(2000).optional().nullable(),
  status: z.enum(ROOM_STATUSES).optional(),
  expectedAvailableDate: z.union([z.string(), z.date()]).optional().nullable(),
  isApproved: z.boolean().optional(),
}).refine(roomStatusRefine, {
  message: 'Phải nhập ngày phòng sẽ trống khi chọn trạng thái Sắp trống',
  path: ['expectedAvailableDate'],
});

export const roomTypeUpdateSchema = z.object({
  id: z.string().min(1, 'Thiếu id'),
  propertyId: z.string().optional(),
  name: z.string().min(1).max(200).optional(),
  typeName: z.string().optional(),
  areaSqm: z.union([z.number().positive(), z.string()]).optional(),
  priceMonthly: z.union([z.number().positive(), z.string()]).optional(),
  deposit: z.union([z.number(), z.string()]).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  videoLinks: z
    .array(z.string().refine(isValidVideoUrl, 'Link video phải là YouTube/TikTok/Facebook hợp lệ'))
    .optional(),
  totalUnits: z.union([z.number().int().positive(), z.string()]).optional(),
  availableUnits: z.union([z.number().int().min(0), z.string()]).optional(),
  availableRoomNames: z.string().optional().nullable(),
  commissionJson: z.any().optional().nullable(),
  shortTermAllowed: z.boolean().optional(),
  shortTermMonths: z.string().max(100).optional().nullable(),
  shortTermPrice: z.union([z.number(), z.string()]).optional().nullable(),
  landlordNotes: z.string().max(2000).optional().nullable(),
  status: z.enum(ROOM_STATUSES).optional(),
  expectedAvailableDate: z.union([z.string(), z.date()]).optional().nullable(),
  isApproved: z.boolean().optional(),
}).refine(roomStatusRefine, {
  message: 'Phải nhập ngày phòng sẽ trống khi chọn trạng thái Sắp trống',
  path: ['expectedAvailableDate'],
});

// ===== Deal =====
export const dealCreateSchema = z.object({
  roomTypeId: z.string().min(1, 'Thiếu loại phòng'),
  brokerId: z.string().optional(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().max(200).optional().nullable(),
  customerPhone: z.string().max(20).optional().nullable(),
  dealPrice: z.union([z.number().positive('Giá deal phải > 0'), z.string()]),
  commissionTotal: z.union([z.number(), z.string()]).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const dealUpdateSchema = z.object({
  id: z.string().min(1, 'Thiếu id'),
  status: z.enum(['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED']).optional(),
  commissionTotal: z.union([z.number(), z.string()]).optional(),
  commissionRate: z.number().optional(),
});

// ===== Share Link =====
export const shareLinkCreateSchema = z.object({
  roomTypeId: z.string().optional(),
  isSystem: z.boolean().optional(),
  expiresAt: z.string().optional().nullable(),
});

// ===== User (Admin) =====
const ROLES = ['ADMIN', 'ADMIN_STAFF', 'BROKER', 'LANDLORD', 'CUSTOMER'] as const;
const PERMISSIONS = [
  'TRANSFER_PROPERTY_OWNERSHIP',
  'DELETE_PROPERTY',
  'EDIT_COMMISSION',
  'APPROVE_LISTINGS',
  'MANAGE_USERS',
  'VIEW_FINANCIAL_REPORTS',
  'EXPORT_DATA',
  'MANAGE_COMPANIES',
  'MANAGE_SYSTEM_SHARE_LINKS',
] as const;

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100),
  // Email không bắt buộc khi admin tạo user (vd bản ghi chủ nhà/môi giới do admin quản lý).
  // Lưu ý: email là field đăng nhập — user không email chưa login bằng email/mật khẩu được.
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(ROLES, { message: 'Vai trò không hợp lệ' }),
  isActive: z.boolean().optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1, 'Thiếu id'),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').optional().or(z.literal('')),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
});

// ===== Notification =====
export const notificationUpdateSchema = z.object({
  id: z.string().optional(),
  markAll: z.boolean().optional(),
});

// ===== Helper =====
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }
  return { success: true, data: result.data };
}
