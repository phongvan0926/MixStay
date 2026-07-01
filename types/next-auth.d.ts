import { DefaultSession } from 'next-auth';

type AppRole = 'ADMIN' | 'ADMIN_STAFF' | 'BROKER' | 'LANDLORD' | 'CUSTOMER';

type AppPermission =
  | 'TRANSFER_PROPERTY_OWNERSHIP'
  | 'DELETE_PROPERTY'
  | 'EDIT_COMMISSION'
  | 'APPROVE_LISTINGS'
  | 'MANAGE_USERS'
  | 'VIEW_FINANCIAL_REPORTS'
  | 'EXPORT_DATA'
  | 'MANAGE_COMPANIES'
  | 'MANAGE_SYSTEM_SHARE_LINKS';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      phone?: string;
      permissions?: AppPermission[];
      canViewContact?: boolean;
      canViewCommission?: boolean;
      needsRoleSetup?: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: AppRole;
    id: string;
    phone?: string;
    permissions?: AppPermission[];
    canViewContact?: boolean;
    canViewCommission?: boolean;
    needsRoleSetup?: boolean;
  }
}
