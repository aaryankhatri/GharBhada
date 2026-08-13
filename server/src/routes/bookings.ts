import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { citizenshipUpload } from '../middleware/upload';
import { serializeProperty } from './properties';

const router = Router();

const coTenantSchema = z.object({
  name: z.string().min(2),
  citizenshipNo: z.string().min(5),
  phone: z.string().min(10),
  relationship: z.string().min(2),
});

const bookingSchema = z.object({
  propertyId: z.coerce.number().int(),
  // Step 1: Personal Information
  tenantName: z.string().min(2, 'पूरा नाम लेख्नुहोस्'),
  tenantPermanentAddress: z.string().min(5, 'स्थायी ठेगाना लेख्नुहोस् (टोल, वडा, नगरपालिका, जिल्ला)'),
  tenantTemporaryAddress: z.string().optional(),
  tenantCitizenshipNumber: z.string().regex(/^[\d-]{10,14}$/, 'नागरिकता नं १०–१२ अंकको हुनुपर्छ'),
  tenantPhone: z.string().regex(/^9[678]\d{8}$/, 'मान्य मोबाइल नम्बर लेख्नुहोस्'),
  tenantEmail: z.string().email().optional().or(z.literal('')),
  tenantOccupation: z.enum(['student', 'job', 'business', 'other']),
  tenantOrganization: z.string().optional(),
  // Step 2: Co-tenants (JSON string, max 3)
  coTenants: z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s) return [] as z.infer<typeof coTenantSchema>[];
      try {
        const arr = z.array(coTenantSchema).max(3, 'बढीमा ३ जना co-tenant').parse(JSON.parse(s));
        return arr;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Co-tenant विवरण अमान्य छ (बढीमा ३ जना)' });
        return z.NEVER;
      }
    }),
  // Step 3: Emergency Contact
  emergencyContactName: z.string().min(2, 'आपतकालीन सम्पर्क नाम आवश्यक छ'),
  emergencyContactPhone: z.string().min(10, 'आपतकालीन सम्पर्क फोन आवश्यक छ'),
  emergencyContactRelationship: z.enum(['father', 'mother', 'brother', 'sister', 'friend', 'other']),
  // Step 4: Declarations
  declarationInfoCorrect: z.coerce.boolean().refine(v => v, '"मैले दिएको जानकारी सही छ" चेक गर्नुहोस्'),
  declarationVisited: z.coerce.boolean().refine(v => v, 'Physically room हेरेको पुष्टि आवश्यक छ'),
  declarationAdvanceReady: z.coerce.boolean().refine(v => v, 'Advance payment गर्न तयार भएको पुष्टि आवश्यक छ'),
  moveInDate: z.coerce.date(),
});

// POST /api/bookings — tenant submits booking (multipart: citizenship photos)
router.post(
  '/',
  requireAuth,
  requireRole('tenant'),
  citizenshipUpload.fields([
    { name: 'citizenshipPhotoFront', maxCount: 1 },
    { name: 'citizenshipPhotoBack', maxCount: 1 },
  ]),
  async (req: AuthRequest, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const front = files?.citizenshipPhotoFront?.[0];
    const back = files?.citizenshipPhotoBack?.[0];
    if (!front || !back) {
      return res.status(400).json({ error: 'नागरिकताको अगाडि र पछाडि दुवै फोटो अनिवार्य छ (JPG/PNG, max 2MB)' });
    }
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message, issues: parsed.error.issues });
    }
    const d = parsed.data;

    const property = await prisma.property.findUnique({ where: { id: d.propertyId } });
    if (!property || !property.isVerified || !property.isAvailable) {
      return res.status(404).json({ error: 'यो property उपलब्ध छैन' });
    }
    if (property.landlordId === req.user!.id) {
      return res.status(400).json({ error: 'आफ्नै property book गर्न मिल्दैन' });
    }
    const existing = await prisma.booking.findFirst({
      where: { tenantId: req.user!.id, propertyId: d.propertyId, status: { in: ['pending', 'accepted'] } },
    });
    if (existing) {
      return res.status(409).json({ error: 'तपाईंको यो property मा पहिले नै booking request छ' });
    }

    const booking = await prisma.booking.create({
      data: {
        tenantId: req.user!.id,
        propertyId: d.propertyId,
        status: 'pending',
        tenantName: d.tenantName,
        tenantPermanentAddress: d.tenantPermanentAddress,
        tenantTemporaryAddress: d.tenantTemporaryAddress ?? null,
        tenantCitizenshipNumber: d.tenantCitizenshipNumber,
        tenantCitizenshipPhotoFront: `/uploads/${front.filename}`,
        tenantCitizenshipPhotoBack: `/uploads/${back.filename}`,
        tenantPhone: d.tenantPhone,
        tenantEmail: d.tenantEmail || null,
        tenantOccupation: d.tenantOccupation,
        tenantOrganization: d.tenantOrganization ?? null,
        coTenants: d.coTenants.length ? JSON.stringify(d.coTenants) : null,
        emergencyContactName: d.emergencyContactName,
        emergencyContactPhone: d.emergencyContactPhone,
        emergencyContactRelationship: d.emergencyContactRelationship,
        hasPhysicallyVisited: true,
        moveInDate: d.moveInDate,
        advanceAmount: property.advanceAmount,
      },
    });
    // Phase 2: landlord लाई SMS/email notification
    res.status(201).json({ booking: serializeBooking(booking), message: 'Booking request घरबेटीलाई पठाइयो' });
  }
);

// GET /api/bookings/tenant — tenant's bookings
router.get('/tenant', requireAuth, requireRole('tenant'), async (req: AuthRequest, res) => {
  const bookings = await prisma.booking.findMany({
    where: { tenantId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: { property: { include: { landlord: { select: { id: true, fullName: true, phone: true } } } } },
  });
  res.json({
    bookings: bookings.map(b => {
      const sb: any = serializeBooking(b);
      sb.property = serializeProperty(b.property);
      // Landlord contact + exact map pin unmasked ONLY after acceptance
      if (b.status !== 'accepted' && b.status !== 'completed') {
        const ph = sb.property.landlord.phone as string;
        sb.property.landlord.phone = ph.slice(0, 3) + 'XXXXX' + ph.slice(-2);
        sb.property.googleMapsPin = null;
      }
      return sb;
    }),
  });
});

// GET /api/bookings/landlord — booking requests on landlord's properties
router.get('/landlord', requireAuth, requireRole('landlord'), async (req: AuthRequest, res) => {
  const bookings = await prisma.booking.findMany({
    where: { property: { landlordId: req.user!.id } },
    orderBy: { createdAt: 'desc' },
    include: { property: true },
  });
  res.json({
    bookings: bookings.map(b => {
      const sb: any = serializeBooking(b);
      sb.property = serializeProperty(b.property);
      return sb;
    }),
  });
});

// PUT /api/bookings/:id/accept
router.put('/:id/accept', requireAuth, requireRole('landlord'), async (req: AuthRequest, res) => {
  const booking = await ownBooking(req, res);
  if (!booking) return;
  if (booking.status !== 'pending') return res.status(409).json({ error: 'यो booking pending छैन' });
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'accepted' },
  });
  // Phase 2: tenant लाई notification + advance payment page redirect + agreement generation
  res.json({ booking: serializeBooking(updated), message: 'Booking स्वीकार गरियो — tenant लाई advance payment को लागि सूचित गरिनेछ' });
});

// PUT /api/bookings/:id/reject
router.put('/:id/reject', requireAuth, requireRole('landlord'), async (req: AuthRequest, res) => {
  const booking = await ownBooking(req, res);
  if (!booking) return;
  if (booking.status !== 'pending') return res.status(409).json({ error: 'यो booking pending छैन' });
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'rejected' },
  });
  res.json({ booking: serializeBooking(updated) });
});

async function ownBooking(req: AuthRequest, res: any) {
  const booking = await prisma.booking.findUnique({
    where: { id: Number(req.params.id) },
    include: { property: true },
  });
  if (!booking || booking.property.landlordId !== req.user!.id) {
    res.status(404).json({ error: 'Booking फेला परेन' });
    return null;
  }
  return booking;
}

function serializeBooking(b: any) {
  const { property, ...rest } = b;
  return { ...rest, coTenants: b.coTenants ? JSON.parse(b.coTenants) : [] };
}

export default router;
