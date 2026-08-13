import { useEffect, useState } from 'react';
import { api, apiError, photoUrl } from '../lib/api';
import type { Property } from '../lib/types';

export default function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'approved'>('pending');

  async function load() {
    try {
      const r = await api.get('/properties/admin/all');
      setProperties(r.data.properties);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function approve(id: number) {
    try {
      await api.put(`/properties/${id}/verify`, { approve: true });
      load();
    } catch (e) {
      alert(apiError(e));
    }
  }

  async function unpublish(id: number) {
    try {
      await api.put(`/properties/${id}/verify`, { approve: false });
      load();
    } catch (e) {
      alert(apiError(e));
    }
  }

  async function reject(id: number) {
    if (!confirm('यो listing अस्वीकार गरेर मेटाउने? यो पूर्ववत गर्न मिल्दैन।')) return;
    try {
      await api.delete(`/properties/${id}`);
      load();
    } catch (e) {
      alert(apiError(e));
    }
  }

  const pending = properties.filter(p => !p.isVerified);
  const approved = properties.filter(p => p.isVerified);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Admin — Listing Approval</h1>
        <a
          href="http://localhost:5555"
          target="_blank"
          rel="noreferrer"
          className="btn-outline text-sm"
          title="पूरा database (Users, Properties, Bookings, Payments...) हेर्नुहोस्। यसको लागि server मा 'npx prisma studio' चलिरहेको हुनुपर्छ।"
        >
          🗄️ Database Studio खोल्नुहोस्
        </a>
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Database Studio ले सबै tables (Users, Bookings, Payments...) देखाउँछ — server मा <code className="bg-gray-100 px-1 rounded">npx prisma studio</code> चलिरहेको हुनुपर्छ।
      </p>
      {error && <p className="err mt-2">{error}</p>}

      <div className="flex gap-1 mt-5 border-b">
        {([
          ['pending', `स्वीकृतिको पर्खाइमा (${pending.length})`],
          ['approved', `Approved (${approved.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 mt-6">लोड हुँदैछ...</p>
      ) : (
        <div className="mt-5 space-y-4">
          {(tab === 'pending' ? pending : approved).length === 0 && (
            <p className="text-gray-500">कुनै listing छैन।</p>
          )}
          {(tab === 'pending' ? pending : approved).map(p => (
            <div key={p.id} className="card p-4 flex gap-4 items-start flex-wrap">
              <img src={photoUrl(p.photos[0]?.url)} alt="" className="w-28 h-20 rounded-lg object-cover aspect-[4/3]" />
              <div className="flex-1 min-w-56">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-gray-500">वडा {p.wardNumber}, {p.tole} | रु {p.monthlyRent.toLocaleString('en-IN')}/महिना</p>
                <p className="text-sm text-gray-500">घरबेटी: {p.landlord?.fullName} — {p.landlord?.phone}</p>
                <p className="text-xs text-gray-400 mt-1">पेश गरिएको: {new Date(p.createdAt).toLocaleString('ne-NP')}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs rounded-full px-2 py-0.5 ${p.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.isVerified ? 'Approved' : 'Pending'}
                  </span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${p.isAvailable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.isAvailable ? 'खाली छ' : 'भरिएको'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {p.isVerified ? (
                  <>
                    <button className="btn-outline text-sm" onClick={() => unpublish(p.id)}>Unpublish</button>
                    <button className="btn-danger text-sm" onClick={() => reject(p.id)}>मेटाउनुहोस्</button>
                  </>
                ) : (
                  <>
                    <button className="btn-success text-sm" onClick={() => approve(p.id)}>स्वीकार</button>
                    <button className="btn-danger text-sm" onClick={() => reject(p.id)}>अस्वीकार</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
