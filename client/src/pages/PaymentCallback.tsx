import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';

type Result = { state: 'checking' } | { state: 'success' } | { state: 'failed'; message: string };

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<Result>({ state: 'checking' });

  useEffect(() => {
    const method = params.get('method');

    async function verifyEsewa() {
      if (params.get('status') === 'failed') {
        return setResult({ state: 'failed', message: 'eSewa payment रद्द/असफल भयो' });
      }
      const data = params.get('data');
      if (!data) return setResult({ state: 'failed', message: 'eSewa बाट कुनै जानकारी फेला परेन' });
      try {
        await api.post('/payments/esewa/verify', { data });
        setResult({ state: 'success' });
      } catch (e) {
        setResult({ state: 'failed', message: apiError(e) });
      }
    }

    async function verifyKhalti() {
      const pidx = params.get('pidx');
      const purchaseOrderId = params.get('purchase_order_id');
      const status = params.get('status');
      if (!pidx || !purchaseOrderId) {
        return setResult({ state: 'failed', message: 'Khalti बाट कुनै जानकारी फेला परेन' });
      }
      if (status && status !== 'Completed') {
        return setResult({ state: 'failed', message: `Khalti payment ${status}` });
      }
      try {
        await api.post('/payments/khalti/verify', { pidx, purchase_order_id: purchaseOrderId });
        setResult({ state: 'success' });
      } catch (e) {
        setResult({ state: 'failed', message: apiError(e) });
      }
    }

    if (method === 'esewa') verifyEsewa();
    else if (method === 'khalti') verifyKhalti();
    else setResult({ state: 'failed', message: 'अमान्य payment callback' });
  }, [params]);

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="card p-8 text-center">
        {result.state === 'checking' && <p className="text-gray-500">Payment verify गर्दैछ...</p>}
        {result.state === 'success' && (
          <>
            <p className="text-3xl">✅</p>
            <h1 className="text-xl font-bold mt-2">Advance payment सफल भयो!</h1>
            <p className="text-gray-500 mt-1">तपाईंको booking अब सम्पन्न भयो।</p>
          </>
        )}
        {result.state === 'failed' && (
          <>
            <p className="text-3xl">❌</p>
            <h1 className="text-xl font-bold mt-2">Payment असफल भयो</h1>
            <p className="text-gray-500 mt-1">{result.message}</p>
          </>
        )}
        <Link to="/tenant" className="btn-primary mt-5 inline-block">मेरो बुकिङहरूमा फर्कनुहोस्</Link>
      </div>
    </div>
  );
}
