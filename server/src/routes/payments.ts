import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { buildEsewaForm, verifyEsewaCallback } from '../lib/esewa';
import { khaltiInitiate, khaltiLookup, KhaltiConfigError } from '../lib/khalti';

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/** Loads the tenant's own booking, checked eligible for an advance payment. */
async function loadPayableBooking(bookingId: number, tenantId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: { include: { landlord: true } }, tenant: true },
  });
  if (!booking || booking.tenantId !== tenantId) return { error: 'Booking फेला परेन' as const, booking: null };
  if (booking.status !== 'accepted') return { error: 'यो booking advance payment को लागि तयार छैन' as const, booking: null };
  return { error: null, booking };
}

// POST /api/payments/esewa/initiate — tenant starts an eSewa advance payment
router.post('/esewa/initiate', requireAuth, requireRole('tenant'), async (req: AuthRequest, res) => {
  const bookingId = Number(req.body?.bookingId);
  const { error, booking } = await loadPayableBooking(bookingId, req.user!.id);
  if (!booking) return res.status(400).json({ error });

  const transactionUuid = crypto.randomUUID();
  const payment = await prisma.payment.create({
    data: {
      tenantId: booking.tenantId,
      landlordId: booking.property.landlordId,
      bookingId: booking.id,
      paymentType: 'advance',
      amount: booking.advanceAmount,
      paymentMethod: 'esewa',
      transactionUuid,
      paymentStatus: 'pending',
    },
  });

  const form = buildEsewaForm({
    amount: booking.advanceAmount,
    transactionUuid,
    successUrl: `${CLIENT_URL}/payment/callback?method=esewa`,
    failureUrl: `${CLIENT_URL}/payment/callback?method=esewa&status=failed`,
  });
  res.json({ paymentId: payment.id, gatewayUrl: form.gatewayUrl, fields: form.fields });
});

// POST /api/payments/esewa/verify — called by the client from the success redirect page
router.post('/esewa/verify', async (req, res) => {
  const base64Data = req.body?.data;
  if (!base64Data) return res.status(400).json({ error: 'data आवश्यक छ' });

  const { ok, data } = verifyEsewaCallback(base64Data);
  if (!data) return res.status(400).json({ error: 'Callback data पढ्न सकिएन' });

  const payment = await prisma.payment.findUnique({ where: { transactionUuid: data.transaction_uuid } });
  if (!payment) return res.status(404).json({ error: 'Payment फेला परेन' });

  if (!ok) {
    await prisma.payment.update({ where: { id: payment.id }, data: { paymentStatus: 'failed' } });
    return res.status(400).json({ error: 'eSewa payment verify असफल भयो', paymentStatus: 'failed' });
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { paymentStatus: 'success' },
  });
  if (payment.bookingId) {
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'completed', paymentId: payment.id },
    });
  }
  res.json({ ok: true, paymentStatus: 'success' });
});

// POST /api/payments/khalti/initiate — tenant starts a Khalti advance payment
router.post('/khalti/initiate', requireAuth, requireRole('tenant'), async (req: AuthRequest, res) => {
  const bookingId = Number(req.body?.bookingId);
  const { error, booking } = await loadPayableBooking(bookingId, req.user!.id);
  if (!booking) return res.status(400).json({ error });

  const transactionUuid = crypto.randomUUID();
  const payment = await prisma.payment.create({
    data: {
      tenantId: booking.tenantId,
      landlordId: booking.property.landlordId,
      bookingId: booking.id,
      paymentType: 'advance',
      amount: booking.advanceAmount,
      paymentMethod: 'khalti',
      transactionUuid,
      paymentStatus: 'pending',
    },
  });

  try {
    const result = await khaltiInitiate({
      amountPaisa: booking.advanceAmount * 100,
      purchaseOrderId: transactionUuid,
      purchaseOrderName: `GharBhada Advance — ${booking.property.title}`,
      returnUrl: `${CLIENT_URL}/payment/callback?method=khalti`,
      websiteUrl: CLIENT_URL,
      customer: { name: booking.tenant.fullName, email: booking.tenant.email, phone: booking.tenant.phone },
    });
    res.json({ paymentId: payment.id, paymentUrl: result.payment_url, pidx: result.pidx });
  } catch (e: any) {
    await prisma.payment.update({ where: { id: payment.id }, data: { paymentStatus: 'failed' } });
    if (e instanceof KhaltiConfigError) return res.status(503).json({ error: e.message });
    res.status(502).json({ error: e?.message || 'Khalti initiate असफल भयो' });
  }
});

// POST /api/payments/khalti/verify — called by the client from the return_url page
// body: { pidx, purchase_order_id } — both come straight from Khalti's return_url query params
router.post('/khalti/verify', async (req, res) => {
  const pidx = req.body?.pidx;
  const purchaseOrderId = req.body?.purchase_order_id;
  if (!pidx || !purchaseOrderId) return res.status(400).json({ error: 'pidx र purchase_order_id आवश्यक छ' });

  const target = await prisma.payment.findFirst({
    where: { paymentMethod: 'khalti', transactionUuid: purchaseOrderId },
  });
  if (!target) return res.status(404).json({ error: 'Payment फेला परेन' });

  try {
    const lookup = await khaltiLookup(pidx);
    if (lookup.status !== 'Completed') {
      await prisma.payment.update({ where: { id: target.id }, data: { paymentStatus: 'failed' } });
      return res.status(400).json({ error: `Khalti payment ${lookup.status}`, paymentStatus: 'failed' });
    }
    await prisma.payment.update({ where: { id: target.id }, data: { paymentStatus: 'success' } });
    if (target.bookingId) {
      await prisma.booking.update({
        where: { id: target.bookingId },
        data: { status: 'completed', paymentId: target.id },
      });
    }
    res.json({ ok: true, paymentStatus: 'success' });
  } catch (e: any) {
    if (e instanceof KhaltiConfigError) return res.status(503).json({ error: e.message });
    res.status(502).json({ error: e?.message || 'Khalti verify असफल भयो' });
  }
});

export default router;
