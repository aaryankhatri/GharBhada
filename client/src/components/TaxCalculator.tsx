import { useState } from 'react';
import { api, apiError } from '../lib/api';

interface TaxResult {
  monthlyRent: number;
  annualRent: number;
  annualTax: number;
  message: string;
}

export default function TaxCalculator({ initialRent }: { initialRent?: number }) {
  const [rent, setRent] = useState(initialRent ? String(initialRent) : '');
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState('');

  async function calculate() {
    setError('');
    setResult(null);
    try {
      const r = await api.get('/tax/calculate', { params: { monthlyRent: rent } });
      setResult(r.data);
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-lg">घरबहाल कर क्याल्कुलेटर (KMC — १०%)</h3>
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          className="input"
          placeholder="मासिक भाडा (रु)"
          value={rent}
          min={1}
          onChange={e => setRent(e.target.value)}
        />
        <button className="btn-primary shrink-0" onClick={calculate} disabled={!rent}>
          गणना गर्नुहोस्
        </button>
      </div>
      {error && <p className="err">{error}</p>}
      {result && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-1">
          <p className="font-medium text-primary">{result.message}</p>
          <p className="text-gray-600">वार्षिक भाडा: रु {result.annualRent.toLocaleString('en-IN')}</p>
          <p className="text-gray-600">वार्षिक कर (१०%): रु {result.annualTax.toLocaleString('en-IN')}</p>
          <a
            href="https://kathmandu.gov.np"
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-primary underline"
          >
            KMC कर पोर्टलमा जानुहोस् →
          </a>
        </div>
      )}
    </div>
  );
}
