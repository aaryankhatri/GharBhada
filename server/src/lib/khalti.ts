// Khalti ePayment (KPG-2). Docs: https://docs.khalti.com/khalti-epayment/
// Same host serves sandbox vs live traffic — which one you hit depends on whether
// KHALTI_SECRET_KEY is a test_secret_key or a live_secret_key.
const SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';
const INITIATE_URL = process.env.KHALTI_SANDBOX_URL || 'https://a.khalti.com/api/v2/epayment/initiate/';
const LOOKUP_URL = INITIATE_URL.replace('/initiate/', '/lookup/');

export class KhaltiConfigError extends Error {}

function requireKey() {
  if (!SECRET_KEY) {
    throw new KhaltiConfigError(
      'KHALTI_SECRET_KEY सेट गरिएको छैन। https://test-admin.khalti.com मा गएर test secret key लिनुहोस् र server/.env मा राख्नुहोस्।'
    );
  }
}

export interface KhaltiInitiateResult {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

export async function khaltiInitiate(opts: {
  amountPaisa: number;
  purchaseOrderId: string;
  purchaseOrderName: string;
  returnUrl: string;
  websiteUrl: string;
  customer: { name: string; email?: string | null; phone: string };
}): Promise<KhaltiInitiateResult> {
  requireKey();
  const res = await fetch(INITIATE_URL, {
    method: 'POST',
    headers: { Authorization: `Key ${SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      return_url: opts.returnUrl,
      website_url: opts.websiteUrl,
      amount: opts.amountPaisa,
      purchase_order_id: opts.purchaseOrderId,
      purchase_order_name: opts.purchaseOrderName,
      customer_info: {
        name: opts.customer.name,
        email: opts.customer.email || undefined,
        phone: opts.customer.phone,
      },
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.detail || body?.error_key || 'Khalti initiate असफल भयो');
  }
  return body;
}

export interface KhaltiLookupResult {
  pidx: string;
  total_amount: number;
  status: 'Completed' | 'Pending' | 'Expired' | 'User canceled' | 'Refunded' | string;
  transaction_id: string | null;
}

export async function khaltiLookup(pidx: string): Promise<KhaltiLookupResult> {
  requireKey();
  const res = await fetch(LOOKUP_URL, {
    method: 'POST',
    headers: { Authorization: `Key ${SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pidx }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.detail || 'Khalti lookup असफल भयो');
  }
  return body;
}
