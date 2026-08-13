import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { serializeProperty } from './properties';

const router = Router();

const visitRequestSchema = z.object({
  propertyId: z.coerce.number().int(),
  message: z.string().max(500).optional(),
});

// POST /api/visits — tenant requests a physical visit
router.post('/', requireAuth, requireRole('tenant'), async (req: AuthRequest, res) => {
  const parsed = visitRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message, issues: parsed.error.issues });
  }
  const d = parsed.data;

  const property = await prisma.property.findUnique({ where: { id: d.propertyId } });
  if (!property || !property.isVerified || !property.isAvailable) {
    return res.status(404).json({ error: 'यो property उपलब्ध छैन' });
  }
  if (property.landlordId === req.user!.id) {
    return res.status(400).json({ error: 'आफ्नै property को लागि visit अनुरोध गर्न मिल्दैन' });
  }
  const existing = await prisma.visitRequest.findFirst({
    where: { tenantId: req.user!.id, propertyId: d.propertyId, status: 'pending' },
  });
  if (existing) {
    return res.status(409).json({ error: 'तपाईंको यो property मा पहिले नै visit अनुरोध पठाइसकिएको छ' });
  }

  const visitRequest = await prisma.visitRequest.create({
    data: {
      tenantId: req.user!.id,
      propertyId: d.propertyId,
      message: d.message ?? null,
    },
  });
  // Phase 2: landlord लाई SMS/email notification
  res.status(201).json({ visitRequest, message: 'Visit अनुरोध घरबेटीलाई पठाइयो' });
});

// GET /api/visits/tenant — tenant's own visit requests
// Landlord contact + exact map pin only unmasked once the landlord accepts.
router.get('/tenant', requireAuth, requireRole('tenant'), async (req: AuthRequest, res) => {
  const visitRequests = await prisma.visitRequest.findMany({
    where: { tenantId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: { property: { include: { landlord: { select: { id: true, fullName: true, phone: true } } } } },
  });
  res.json({
    visitRequests: visitRequests.map(v => {
      const property: any = serializeProperty(v.property);
      const landlord = v.property.landlord;
      if (v.status === 'accepted') {
        property.landlord = { id: landlord.id, fullName: landlord.fullName, phone: landlord.phone };
      } else {
        property.landlord = { id: landlord.id, fullName: landlord.fullName, phone: landlord.phone.slice(0, 3) + 'XXXXX' + landlord.phone.slice(-2) };
        property.googleMapsPin = null;
      }
      return { ...v, property };
    }),
  });
});

// GET /api/visits/landlord — visit requests on landlord's properties
router.get('/landlord', requireAuth, requireRole('landlord'), async (req: AuthRequest, res) => {
  const visitRequests = await prisma.visitRequest.findMany({
    where: { property: { landlordId: req.user!.id } },
    orderBy: { createdAt: 'desc' },
    include: {
      property: true,
      tenant: { select: { id: true, fullName: true, phone: true, email: true } },
    },
  });
  res.json({
    visitRequests: visitRequests.map(v => ({ ...v, property: serializeProperty(v.property) })),
  });
});

// PUT /api/visits/:id/accept — landlord accepts; tenant will now see contact + map pin
router.put('/:id/accept', requireAuth, requireRole('landlord'), async (req: AuthRequest, res) => {
  const visitRequest = await ownVisitRequest(req, res);
  if (!visitRequest) return;
  if (visitRequest.status !== 'pending') return res.status(409).json({ error: 'यो अनुरोध pending छैन' });
  const updated = await prisma.visitRequest.update({ where: { id: visitRequest.id }, data: { status: 'accepted' } });
  res.json({ visitRequest: updated });
});

// PUT /api/visits/:id/reject — landlord declines the visit request
router.put('/:id/reject', requireAuth, requireRole('landlord'), async (req: AuthRequest, res) => {
  const visitRequest = await ownVisitRequest(req, res);
  if (!visitRequest) return;
  if (visitRequest.status !== 'pending') return res.status(409).json({ error: 'यो अनुरोध pending छैन' });
  const updated = await prisma.visitRequest.update({ where: { id: visitRequest.id }, data: { status: 'rejected' } });
  res.json({ visitRequest: updated });
});

async function ownVisitRequest(req: AuthRequest, res: any) {
  const visitRequest = await prisma.visitRequest.findUnique({
    where: { id: Number(req.params.id) },
    include: { property: true },
  });
  if (!visitRequest || visitRequest.property.landlordId !== req.user!.id) {
    res.status(404).json({ error: 'Visit अनुरोध फेला परेन' });
    return null;
  }
  return visitRequest;
}

export default router;
