import crypto from 'node:crypto';

// eSewa ePay v2 (sandbox: rc-epay.esewa.com.np). Docs: https://developer.esewa.com.np/pages/Epay%23v2
const PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const SECRET_KEY = process.env.ESEWA_SECRET_KEY || '';
const SANDBOX_URL = process.env.ESEWA_SANDBOX_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

function sign(message: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');
}

export interface EsewaFormFields {
  gatewayUrl: string;
  fields: Record<string, string>;
}

/** Builds the field set the client must POST (as an HTML form) to eSewa's payment page. */
export function buildEsewaForm(opts: {
  amount: number;
  transactionUuid: string;
  successUrl: string;
  failureUrl: string;
}): EsewaFormFields {
  const totalAmount = String(opts.amount);
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const message = `total_amount=${totalAmount},transaction_uuid=${opts.transactionUuid},product_code=${PRODUCT_CODE}`;
  const signature = sign(message);

  return {
    gatewayUrl: SANDBOX_URL,
    fields: {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: opts.transactionUuid,
      product_code: PRODUCT_CODE,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: opts.successUrl,
      failure_url: opts.failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

export interface EsewaCallbackData {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
  [key: string]: string;
}

/** Decodes + verifies the base64 `data` param eSewa appends to success_url on redirect. */
export function verifyEsewaCallback(base64Data: string): { ok: boolean; data: EsewaCallbackData | null } {
  let data: EsewaCallbackData;
  try {
    data = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf8'));
  } catch {
    return { ok: false, data: null };
  }
  const fieldNames = data.signed_field_names.split(',');
  const message = fieldNames.map(f => `${f}=${data[f]}`).join(',');
  const expected = sign(message);
  const ok = expected === data.signature && data.status === 'COMPLETE';
  return { ok, data };
}
