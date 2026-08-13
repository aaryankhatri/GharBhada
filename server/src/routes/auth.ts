import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken, requireAuth, AuthRequest } from '../middleware/auth';
import { sendPasswordResetEmail, MailerConfigError } from '../lib/mailer';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('मान्य email लेख्नुहोस्'),
  phone: z.string().regex(/^9[678]\d{8}$/, 'मान्य नेपाली मोबाइल नम्बर लेख्नुहोस् (98XXXXXXXX)'),
  password: z.string().min(8, 'Password कम्तिमा ८ अक्षरको हुनुपर्छ'),
  role: z.enum(['tenant', 'landlord']),
  fullName: z.string().min(2, 'पूरा नाम लेख्नुहोस्'),
  address: z.string().min(3, 'ठेगाना लेख्नुहोस्'),
  citizenshipNumber: z.string().regex(/^[\d-]{10,14}$/, 'नागरिकता नं १०–१२ अंकको हुनुपर्छ').optional().or(z.literal('')),
  panNumber: z.string().optional(),
  occupation: z.enum(['student', 'job', 'business', 'other']).optional(),
  organization: z.string().optional(),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message, issues: parsed.error.issues });
  }
  const d = parsed.data;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: d.email }, { phone: d.phone }] },
  });
  if (existing) {
    return res.status(409).json({ error: 'यो email वा फोन नम्बर पहिले नै दर्ता भइसकेको छ' });
  }
  const passwordHash = await bcrypt.hash(d.password, 12);
  const user = await prisma.user.create({
    data: {
      email: d.email,
      phone: d.phone,
      passwordHash,
      role: d.role,
      fullName: d.fullName,
      address: d.address,
      citizenshipNumber: d.citizenshipNumber || null,
      panNumber: d.panNumber || null,
      occupation: d.occupation || null,
      organization: d.organization || null,
    },
  });
  // Phase 2: यहाँ SMS OTP पठाउने (Sparrow SMS / AakashSMS integration)
  const token = signToken({ id: user.id, role: user.role as any });
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { emailOrPhone, password } = req.body ?? {};
  if (!emailOrPhone || !password) {
    return res.status(400).json({ error: 'Email/फोन र password आवश्यक छ' });
  }
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }] },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Email/फोन वा password मिलेन' });
  }
  const token = signToken({ id: user.id, role: user.role as any });
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/forgot-password — sends a 6-digit reset code to the account's registered email
router.post('/forgot-password', async (req, res) => {
  const emailOrPhone = req.body?.emailOrPhone;
  if (!emailOrPhone) return res.status(400).json({ error: 'Email वा फोन नम्बर आवश्यक छ' });

  const user = await prisma.user.findFirst({ where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }] } });
  // Always respond success (don't leak whether an account exists)
  if (!user) return res.json({ message: 'यदि खाता अवस्थित छ भने, reset code email मा पठाइयो' });

  const code = String(crypto.randomInt(100000, 1000000)); // 6 digits
  await prisma.user.update({
    where: { id: user.id },
    data: { resetCode: code, resetCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });

  try {
    await sendPasswordResetEmail(user.email, code);
  } catch (e: any) {
    if (e instanceof MailerConfigError) return res.status(503).json({ error: e.message });
    console.error(e);
    return res.status(502).json({ error: 'Email पठाउन सकिएन' });
  }
  res.json({ message: 'यदि खाता अवस्थित छ भने, reset code email मा पठाइयो' });
});

// POST /api/auth/reset-password — verifies the code and sets a new password
router.post('/reset-password', async (req, res) => {
  const { emailOrPhone, code, newPassword } = req.body ?? {};
  if (!emailOrPhone || !code || !newPassword) {
    return res.status(400).json({ error: 'Email/फोन, code, र नयाँ password आवश्यक छ' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Password कम्तिमा ८ अक्षरको हुनुपर्छ' });
  }
  const user = await prisma.user.findFirst({ where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }] } });
  if (!user || !user.resetCode || !user.resetCodeExpiresAt) {
    return res.status(400).json({ error: 'Code अमान्य छ' });
  }
  if (user.resetCode !== String(code) || user.resetCodeExpiresAt < new Date()) {
    return res.status(400).json({ error: 'Code अमान्य वा expired छ' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetCode: null, resetCodeExpiresAt: null },
  });
  res.json({ message: 'Password सफलतापूर्वक फेरियो — अब लगइन गर्नुहोस्' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User फेला परेन' });
  res.json({ user: publicUser(user) });
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  const updatable = ['fullName', 'address', 'citizenshipNumber', 'panNumber', 'occupation', 'organization'];
  const data: Record<string, string> = {};
  for (const k of updatable) if (typeof req.body?.[k] === 'string') data[k] = req.body[k];
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ user: publicUser(user) });
});

export function publicUser(u: any) {
  const { passwordHash, ...rest } = u;
  return rest;
}

export default router;
