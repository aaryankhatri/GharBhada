import { useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import type { Property } from '../lib/types';
import { AMENITY_LABELS } from '../lib/types';
import PropertyCard from '../components/PropertyCard';

const RENT_RANGES = [
  { label: 'सबै', min: '', max: '' },
  { label: 'रु ५–१० हजार', min: '5000', max: '10000' },
  { label: 'रु १०–२० हजार', min: '10000', max: '20000' },
  { label: 'रु २० हजार+', min: '20000', max: '' },
];

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ward, setWard] = useState('');
  const [range, setRange] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/properties', {
        params: {
          ward: ward || undefined,
          minRent: RENT_RANGES[range].min || undefined,
          maxRent: RENT_RANGES[range].max || undefined,
          amenities: amenities.length ? amenities.join(',') : undefined,
          q: q || undefined,
        },
      });
      setProperties(r.data.properties);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [ward, range, amenities]);

  return (
    <div>
      <div className="bg-brand-gradient rounded-2xl text-white p-6 md:p-10 mb-6 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute right-16 bottom-0 w-32 h-32 rounded-full bg-amber-400/20" />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-bold">काठमाडौंमा कोठा खोज्नुहोस्</h1>
          <p className="mt-1 text-blue-100">Verified listing, लिखित सम्झौता, र पारदर्शी भाडा — सबै एकै ठाउँमा।</p>
          <div className="mt-4 flex gap-2 max-w-xl">
            <input
              className="input text-gray-900"
              placeholder="टोल, क्षेत्र वा विवरण खोज्नुहोस्..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
            <button className="btn-accent shrink-0" onClick={load}>खोज्नुहोस्</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">वडा नं (KMC १–३२)</label>
          <select className="input w-36" value={ward} onChange={e => setWard(e.target.value)}>
            <option value="">सबै वडा</option>
            {Array.from({ length: 32 }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>वडा {w}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">भाडा दायरा</label>
          <div className="flex gap-1 flex-wrap">
            {RENT_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setRange(i)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${i === range ? 'bg-brand-gradient text-white border-transparent shadow-sm' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">सुविधा</label>
          <div className="flex gap-1 flex-wrap">
            {(['wifi', 'parking', 'attachedBathroom'] as const).map(k => (
              <button
                key={k}
                onClick={() =>
                  setAmenities(a => (a.includes(k) ? a.filter(x => x !== k) : [...a, k]))
                }
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${amenities.includes(k) ? 'bg-success text-white border-success shadow-sm' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                {AMENITY_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="err mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500 text-center py-10">लोड हुँदैछ...</p>
      ) : properties.length === 0 ? (
        <p className="text-gray-500 text-center py-10">कुनै property फेला परेन — filter परिवर्तन गरी हेर्नुहोस्।</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map(p => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
