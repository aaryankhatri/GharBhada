import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError, photoUrl } from '../lib/api';
import type { Booking, Property, VisitRequest } from '../lib/types';
import TaxCalculator from '../components/TaxCalculator';

export default function LandlordDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'properties' | 'bookings' | 'visits' | 'tax'>('properties');

  async function load() {
    try {
      const [p, b, v] = await Promise.all([
        api.get('/properties/mine'),
        api.get('/bookings/landlord'),
        api.get('/visits/landlord'),
      ]);
      setProperties(p.data.properties);
      setBookings(b.data.bookings);
      setVisitRequests(v.data.visitRequests);
    } catch (e) {
      setError(apiError(e));
    }
  }
  useEffect(() => { load(); }, []);

  async function act(resource: 'bookings' | 'visits', id: number, action: 'accept' | 'reject') {
    try {
      await api.put(`/${resource}/${id}/${action}`);
      load();
    } catch (e) {
      alert(apiError(e));
    }
  }

  async function toggleAvailable(p: Property) {
    try {
      await api.put(`/properties/${p.id}`, { isAvailable: !p.isAvailable });
      load();
    } catch (e) {
      alert(apiError(e));
    }
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const pendingVisitCount = visitRequests.filter(v => v.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">घरबेटी Dashboard</h1>
        <Link to="/landlord/add-property" className="btn-primary">+ नयाँ Property</Link>
      </div>
      {error && <p className="err mt-2">{error}</p>}

      <div className="flex gap-1 mt-5 border-b">
        {([
          ['properties', `मेरा Properties (${properties.length})`],
          ['bookings', `Booking अनुरोध${pendingCount ? ` (${pendingCount} नयाँ)` : ''}`],
          ['visits', `भ्रमण अनुरोध${pendingVisitCount ? ` (${pendingVisitCount} नयाँ)` : ''}`],
          ['tax', 'कर घोषणा'],
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

      {tab === 'properties' && (
        <div className="mt-5 space-y-4">
          {properties.length === 0 && <p className="text-gray-500">कुनै property छैन — पहिलो listing थप्नुहोस्।</p>}
          {properties.map(p => (
            <div key={p.id} className="card p-4 flex gap-4 items-center flex-wrap">
              <img src={photoUrl(p.photos[0]?.url)} alt="" className="w-24 h-18 rounded-lg object-cover aspect-[4/3]" />
              <div className="flex-1 min-w-48">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-gray-500">वडा {p.wardNumber}, {p.tole} | रु {p.monthlyRent.toLocaleString('en-IN')}/महिना</p>
                <div className="flex gap-2 mt-1">
                  <span className={`text-xs rounded-full px-2 py-0.5 ${p.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.isVerified ? 'Approved' : 'Admin approval पर्खाइमा'}
                  </span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${p.isAvailable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.isAvailable ? 'खाली छ' : 'भरिएको'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-outline text-sm" onClick={() => toggleAvailable(p)}>
                  {p.isAvailable ? 'भरिएको mark गर्नुहोस्' : 'खाली mark गर्नुहोस्'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="mt-5 space-y-4">
          {bookings.length === 0 && <p className="text-gray-500">कुनै booking अनुरोध छैन।</p>}
          {bookings.map(b => (
            <div key={b.id} className="card p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold">{b.tenantName} <span className="text-gray-400 font-normal">→ {b.property?.title}</span></h3>
                  <p className="text-sm text-gray-500 mt-1">
                    फोन: {b.tenantPhone} | पेशा: {b.tenantOccupation}{b.tenantOrganization ? ` (${b.tenantOrganization})` : ''}
                  </p>
                  <p className="text-sm text-gray-500">
                    Move-in: {new Date(b.moveInDate).toLocaleDateString('ne-NP')} | सँगै बस्ने: {b.coTenants.length ? `${b.coTenants.length} जना` : 'कोही छैन'}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {b.status === 'pending' ? (
                    <>
                      <button className="btn-success text-sm" onClick={() => act('bookings', b.id, 'accept')}>स्वीकार</button>
                      <button className="btn-danger text-sm" onClick={() => act('bookings', b.id, 'reject')}>अस्वीकार</button>
                    </>
                  ) : (
                    <span className={`text-xs rounded-full px-3 py-1 font-medium ${
                      b.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                      b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {b.status === 'accepted' ? 'स्वीकृत' : b.status === 'completed' ? 'सम्पन्न' : 'अस्वीकृत'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'visits' && (
        <div className="mt-5 space-y-4">
          {visitRequests.length === 0 && <p className="text-gray-500">कुनै visit अनुरोध छैन।</p>}
          {visitRequests.map(v => (
            <div key={v.id} className="card p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold">{v.tenant?.fullName} <span className="text-gray-400 font-normal">→ {v.property?.title}</span></h3>
                  <p className="text-sm text-gray-500 mt-1">फोन: {v.tenant?.phone} | इमेल: {v.tenant?.email}</p>
                  {v.message && <p className="text-sm text-gray-600 mt-1">"{v.message}"</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(v.createdAt).toLocaleString('ne-NP')}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {v.status === 'pending' ? (
                    <>
                      <button className="btn-success text-sm" onClick={() => act('visits', v.id, 'accept')}>स्वीकार</button>
                      <button className="btn-danger text-sm" onClick={() => act('visits', v.id, 'reject')}>अस्वीकार</button>
                    </>
                  ) : (
                    <span className={`text-xs rounded-full px-3 py-1 font-medium ${v.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {v.status === 'accepted' ? 'स्वीकृत' : 'अस्वीकृत'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'tax' && (
        <div className="mt-5 max-w-xl space-y-4">
          <TaxCalculator />
          <div className="card p-5 text-sm">
            <h3 className="font-semibold">KMC मा बहाल घोषणा</h3>
            <p className="text-gray-600 mt-2">
              घरबहाल कर (१०%) काठमाडौं महानगरपालिकामा बुझाउनु घरबेटीको कानूनी दायित्व हो।
              हाल KMC portal मा redirect गरिन्छ; Phase 3 मा direct API integration योजना छ।
            </p>
            <a href="https://kathmandu.gov.np" target="_blank" rel="noreferrer" className="btn-primary mt-3">
              KMC कर पोर्टलमा जानुहोस् →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
