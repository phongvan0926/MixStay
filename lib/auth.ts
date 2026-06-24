import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import AppleProvider from 'next-auth/providers/apple';
import { compare } from 'bcryptjs';
import prisma from './prisma';

const providers: any[] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user || !user.isActive) return null;
      if (!user.password) return null; // OAuth-only account

      const isValid = await compare(credentials.password, user.password);
      if (!isValid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        image: user.avatar,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // NOTE: allowDangerousEmailAccountLinking REMOVED — it let an OAuth sign-in attach
      // to a pre-existing account, which is how dev Google logins inherited seeded ADMIN.
      // Without it, OAuth either creates a fresh non-privileged user or fails safely.
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    })
  );
}

if (process.env.APPLE_ID && process.env.APPLE_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    })
  );
}

// --- Adapter shim: map AdapterUser.image -> User.avatar -----------------------
// The schema stores the profile picture in `avatar`, but @auth/prisma-adapter (and
// NextAuth's AdapterUser) write/read `image`. Without this mapping the FIRST Google
// sign-in throws Prisma "Unknown argument `image`" at createUser, so OAuth fails even
// with valid Google creds. The new user still gets role=CUSTOMER (schema default) and
// setupComplete=false, then the jwt callback flags needsRoleSetup for /auth/callback.
// Code-only shim — no DB/schema change; email+password flow is unaffected (it never
// touches the adapter).
const baseAdapter = PrismaAdapter(prisma);
const mixStayAdapter = {
  ...baseAdapter,
  async createUser({ id, image, ...rest }: any) {
    const created = await prisma.user.create({
      data: { ...rest, ...(image !== undefined ? { avatar: image } : {}) },
    });
    return { ...created, image: created.avatar };
  },
  async updateUser({ id, image, ...rest }: any) {
    const updated = await prisma.user.update({
      where: { id },
      data: { ...rest, ...(image !== undefined ? { avatar: image } : {}) },
    });
    return { ...updated, image: updated.avatar };
  },
};

export const authOptions: NextAuthOptions = {
  adapter: mixStayAdapter as any,
  providers,
  callbacks: {
    // Defense-in-depth against OAuth account-takeover / privilege escalation:
    // refuse any OAuth sign-in that resolves to an existing user whose email differs
    // from the verified OAuth email (i.e. the identity is being linked onto someone
    // else's account — exactly how Google logins inherited seeded ADMIN). New OAuth
    // users (createUser sets email = OAuth email) and same-email logins pass unaffected.
    async signIn({ user, account, profile }) {
      if (account?.type === 'oauth') {
        const oauthEmail = ((profile as any)?.email ?? '').toLowerCase();
        const resolvedEmail = (user?.email ?? '').toLowerCase();
        if (resolvedEmail && oauthEmail && resolvedEmail !== oauthEmail) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Handle manual session update (after user selects role)
      if (trigger === 'update' && session) {
        if (session.role) token.role = session.role;
        if (session.needsRoleSetup !== undefined) token.needsRoleSetup = session.needsRoleSetup;
        return token;
      }

      if (user) {
        // Fetch fresh user from DB (adapter user may lack custom fields)
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser) return token;

        token.id = dbUser.id;
        token.role = dbUser.role;
        token.phone = dbUser.phone ?? undefined;
        token.permissions = (dbUser as any).permissions ?? [];

        // OAuth user who hasn't completed role setup yet
        if (account?.type === 'oauth' && !dbUser.password && !dbUser.setupComplete) {
          token.needsRoleSetup = true;
        } else {
          token.needsRoleSetup = false;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).phone = token.phone;
        (session.user as any).needsRoleSetup = token.needsRoleSetup ?? false;
        (session.user as any).permissions = token.permissions ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
