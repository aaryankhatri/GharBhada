import { Router } from 'express';
import { calculateHouseRentTax } from '../lib/tax';

const router = Router();

// GET /api/tax/calculate?monthlyRent=15000
router.get('/tax/calculate', (req, res) => {
  const monthlyRent = Number(req.query.monthlyRent);
  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    return res.status(400).json({ error: 'मान्य मासिक भाडा रकम दिनुहोस्' });
  }
  res.json(calculateHouseRentTax(monthlyRent));
});

// GET /api/kmc/tax-portal — Phase 1: redirect info (Option 1)
router.get('/kmc/tax-portal', (_req, res) => {
  res.json({
    portalUrl: 'https://kathmandu.gov.np',
    note: 'KMC tax portal मा गएर घरबहाल कर (१०%) बुझाउनुहोस्। Phase 3 मा direct API integration योजना छ।',
  });
});

export default router;
