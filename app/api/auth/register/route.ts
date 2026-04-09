import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { registerSchema, validateBody } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'auth');
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const validated = validateBody(registerSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { name, email, phone, password, role } = validated.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, phone, password: hashedPassword, role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
