import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { propertyPhotoUpload } from '../middleware/upload';
import { sendNewListingNotification, MailerConfigError } from '../lib/mailer';

const router = Router();

const AMENITY_KEYS = [
  'wifi', 'parking', 'attachedBathroom', 'commonBathroom',
  'kitchenAccess', 'laundry', 'security', 'elevator',
] as const;

const TIME_SLOT_KEYS = ['morning', 'afternoon', 'evening', 'night'] as const;

const waterAvailabilitySchema = z.object({
  type: z.enum(['24hours', 'limited']),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  timesPerDay: z.coerce.number().int().min(1).max(6),
  hoursPerSession: z.coerce.number().min(0.5).max(24),
  timeSlots: z.array(z.enum(TIME_SLOT_KEYS)).max(4),
});

const propertySchema = z.object({
  title: z.string().min(3, 'शीर्षक लेख्नुहोस्'),
  wardNumber: z.coerce.number().int().min(1).max(32, 'वडा नं १–३२ भित्र हुनुपर्छ (KMC)'),
  tole: z.string().min(2, 'टोल/क्षेत्र लेख्नुहोस्'),
  monthlyRent: z.coerce.number().int().min(5000, 'मासिक भाडा कम्तिमा रु ५,००० हुनुपर्छ'),
  advanceAmount: z.coerce.number().int().min(0),
  rentDueDay: z.coerce.number().int().min(1).max(5, 'भाडा तिर्ने मिति १–५ गते भित्र हुनुपर्छ'),
  availableFrom: z.coerce.date(),
  description: z.string().max(3500, 'विवरण ५०० शब्दभित्र राख्नुहोस्').optional(),
  amenities: z.string().transform((s, ctx) => {
    try {
      const obj = JSON.parse(s);
      const out: Record<string, boolean> = {};
      for (const k of AMENITY_KEYS) out[k] = Boolean(obj[k]);
      return out;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amenities अमान्य छ' });
      return z.NEVER;
    }
  }),
  waterAvailability: z.string().transform((s, ctx) => {
    try {
      return waterAvailabilitySchema.parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'पानी उपलब्धता जानकारी अमान्य छ' });
      return z.NEVER;
    }
  }),
  googleMapsPin: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'नक्सामा घरको स्थान छान्नुहोस्'),
  declaration: z.coerce.boolean().refine(v => v, 'घोषणा (declaration) मा सहमति आवश्यक छ'),
});

// GET /api/properties — public listing with filters (verified + available only)
router.get('/', async (req, res) => {
  const { ward, minRent, maxRent, amenities, q } = req.query as Record<string, string>;
  const where: any = { isVerified: true, isAvailable: true };
  if (ward) where.wardNumber = Number(ward);
  if (minRent || maxRent) {
    where.monthlyRent = {};
    if (minRent) where.monthlyRent.gte = Number(minRent);
    if (maxRent) where.monthlyRent.lte = Number(maxRent);
  }
  if (q) where.OR = [{ title: { contains: q } }, { tole: { contains: q } }, { description: { contains: q } }];

  let properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { landlord: { select: { id: true, fullName: true } } },
  });

  // amenities filter: comma-separated keys, all must be true
  if (amenities) {
    const wanted = amenities.split(',').filter(Boolean);
    properties = properties.filter(p => {
      const a = JSON.parse(p.amenities);
      return wanted.every(k => a[k]);
    });
  }

  res.json({ properties: properties.map(p => ({ ...serializeProperty(p), googleMapsPin: null })) });
});

// GET /api/properties/admin/all — admin: every listing, any status, for approval
router.get('/admin/all', requireAuth, requireRole('admin'), async (_req, res) => {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: 'desc' },
    include: { landlord: { select: { id: true, fullName: true, phone: true, email: true } } },
  });
  res.json({ properties: properties.map(serializeProperty) });
});

// GET /api/properties/mine — landlord's own listings (all statuses)
router.get('/mine', requireAuth, requireRole('landlord'), async (req: AuthRequest, res) => {
  const properties = await prisma.property.findMany({
    where: { landlordId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ properties: properties.map(serializeProperty) });
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: Number(req.params.id) },
    include: { landlord: { select: { id: true, fullName: true, phone: true, email: true } } },
  });
  if (!property) return res.status(404).json({ error: 'Property फेला परेन' });
  const p: any = serializeProperty(property);
  // Landlord contact + exact map pin masked until a visit/booking request is accepted
  p.landlord = {
    id: property.landlord.id,
    fullName: property.landlord.fullName,
    phone: property.landlord.phone.slice(0, 3) + 'XXXXX' + property.landlord.phone.slice(-2),
  };
  p.googleMapsPin = null;
  res.json({ property: p });
});

// POST /api/properties — landlord creates listing (min 3 photos)
router.post(
  '/',
  requireAuth,
  requireRole('landlord'),
  propertyPhotoUpload.array('photos', 8),
  async (req: AuthRequest, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length < 3) {
      return res.status(400).json({
        error: 'कम्तिमा ३ वटा फोटो अनिवार्य छ (कोठा, बाथरूम, भवन/प्रवेशद्वार)',
      });
    }
    const parsed = propertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message, issues: parsed.error.issues });
    }
    const d = parsed.data;
    const labels = ['कोठा', 'बाथरूम', 'भवन/प्रवेशद्वार', 'भान्सा', 'पार्किङ', 'अन्य', 'अन्य', 'अन्य'];
    const photos = files.map((f, i) => ({ url: `/uploads/${f.filename}`, label: labels[i] ?? 'अन्य' }));

    const property = await prisma.property.create({
      data: {
        landlordId: req.user!.id,
        title: d.title,
        wardNumber: d.wardNumber,
        tole: d.tole,
        monthlyRent: d.monthlyRent,
        advanceAmount: d.advanceAmount,
        rentDueDay: d.rentDueDay,
        availableFrom: d.availableFrom,
        description: d.description ?? null,
        amenities: JSON.stringify(d.amenities),
        waterAvailability: JSON.stringify(d.waterAvailability),
        photos: JSON.stringify(photos),
        googleMapsPin: d.googleMapsPin,
        isVerified: false, // admin approval पछि मात्र public
      },
    });
    res.status(201).json({
      property: serializeProperty(property),
      message: 'Listing admin approval को लागि पठाइयो (२४–४८ घण्टा)',
    });

    // Notify admins — best effort, runs after responding so it never blocks/breaks listing creation
    try {
      const [admins, landlord] = await Promise.all([
        prisma.user.findMany({ where: { role: 'admin' }, select: { email: true } }),
        prisma.user.findUnique({ where: { id: req.user!.id }, select: { fullName: true } }),
      ]);
      await Promise.all(
        admins.map(a =>
          sendNewListingNotification(a.email, {
            propertyId: property.id,
            title: property.title,
            landlordName: landlord?.fullName ?? 'Landlord',
            wardNumber: property.wardNumber,
            tole: property.tole,
            monthlyRent: property.monthlyRent,
          })
        )
      );
    } catch (e) {
      if (!(e instanceof MailerConfigError)) console.error('Admin notification email failed:', e);
    }
  }
);

// PUT /api/properties/:id — landlord updates own listing
router.put('/:id', requireAuth, requireRole('landlord'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing || existing.landlordId !== req.user!.id) {
    return res.status(404).json({ error: 'Property फेला परेन' });
  }
  const allowed = ['title', 'tole', 'description', 'googleMapsPin'];
  const data: any = {};
  for (const k of allowed) if (typeof req.body?.[k] === 'string') data[k] = req.body[k];
  if (req.body?.monthlyRent != null) data.monthlyRent = Number(req.body.monthlyRent);
  if (req.body?.advanceAmount != null) data.advanceAmount = Number(req.body.advanceAmount);
  if (req.body?.isAvailable != null) data.isAvailable = Boolean(req.body.isAvailable);
  if (req.body?.amenities != null) data.amenities = JSON.stringify(req.body.amenities);
  if (req.body?.waterAvailability != null) {
    const parsed = waterAvailabilitySchema.safeParse(req.body.waterAvailability);
    if (!parsed.success) return res.status(400).json({ error: 'पानी उपलब्धता जानकारी अमान्य छ' });
    data.waterAvailability = JSON.stringify(parsed.data);
  }
  if (data.monthlyRent != null && data.monthlyRent < 5000) {
    return res.status(400).json({ error: 'मासिक भाडा कम्तिमा रु ५,००० हुनुपर्छ' });
  }
  const property = await prisma.property.update({ where: { id }, data });
  res.json({ property: serializeProperty(property) });
});

// DELETE /api/properties/:id
router.delete('/:id', requireAuth, requireRole('landlord', 'admin'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Property फेला परेन' });
  if (req.user!.role === 'landlord' && existing.landlordId !== req.user!.id) {
    return res.status(403).json({ error: 'अनुमति छैन' });
  }
  const bookingCount = await prisma.booking.count({ where: { propertyId: id, status: { in: ['pending', 'accepted', 'completed'] } } });
  if (bookingCount > 0) {
    return res.status(409).json({ error: 'सक्रिय booking भएको property delete गर्न मिल्दैन — पहिले unavailable mark गर्नुहोस्' });
  }
  await prisma.property.delete({ where: { id } });
  res.json({ ok: true });
});

// PUT /api/properties/:id/verify — admin approves listing
router.put('/:id/verify', requireAuth, requireRole('admin'), async (req, res) => {
  const property = await prisma.property.update({
    where: { id: Number(req.params.id) },
    data: { isVerified: Boolean(req.body?.approve ?? true) },
  });
  res.json({ property: serializeProperty(property) });
});

export function serializeProperty(p: any) {
  return {
    ...p,
    amenities: JSON.parse(p.amenities),
    waterAvailability: JSON.parse(p.waterAvailability),
    photos: JSON.parse(p.photos),
  };
}

export default router;
