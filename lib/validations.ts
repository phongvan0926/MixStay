import { z } from 'zod';

// ===== Auth =====
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100, 'Tên tối đa 100 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(['BROKER', 'LANDLORD', 'CUSTOMER'], { message: 'Vai trò không hợp lệ' }),
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
export const roomTypeCreateSchema = z.object({
  propertyId: z.string().min(1, 'Thiếu tòa nhà'),
  name: z.string().min(1, 'Tên loại phòng không được trống').max(200),
  typeName: z.string().optional(),
  areaSqm: z.union([z.number().positive('Diện tích phải > 0'), z.string()]),
  priceMonthly: z.union([z.number().positive('Giá thuê phải > 0'), z.string()]),
  deposit: z.union([z.number(), z.string()]).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  totalUnits: z.union([z.number().int().positive(), z.string()]).optional(),
  availableUnits: z.union([z.number().int().min(0), z.string()]).optional(),
  availableRoomNames: z.string().optional().nullable(),
  commissionJson: z.any().optional().nullable(),
  shortTermAllowed: z.boolean().optional(),
  shortTermMonths: z.number().int().optional().nullable(),
  shortTermPrice: z.union([z.number(), z.string()]).optional().nullable(),
  landlordNotes: z.string().max(2000).optional().nullable(),
  isAvailable: z.boolean().optional(),
  isApproved: z.boolean().optional(),
});

export const roomTypeUpdateSchema = roomTypeCreateSchema.partial().extend({
  id: z.string().min(1, 'Thiếu id'),
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
export const userCreateSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(['ADMIN', 'BROKER', 'LANDLORD', 'CUSTOMER'], { message: 'Vai trò không hợp lệ' }),
  isActive: z.boolean().optional(),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1, 'Thiếu id'),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email('Email không hợp lệ').optional(),
  phone: z.string().max(20).optional().nullable(),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'BROKER', 'LANDLORD', 'CUSTOMER']).optional(),
  isActive: z.boolean().optional(),
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
