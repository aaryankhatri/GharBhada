import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError, submitFormRedirect } from '../lib/api';
import type { Booking, VisitRequest } from '../lib/types';
import LocationView from '../components/LocationView';

const STATUS_LABELS: Record<Booking['status'], { label: string; cls: string }> = {
  pending: { label: 'स्वीकृतिको पर्खाइमा', cls: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'स्वीकृत — advance तिर्नुहोस्', cls: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'अस्वीकृत', cls: 'bg-red-100 text-red-700' },
  completed: { label: 'सम्पन्न', cls: 'bg-emerald-100 text-emerald-700' },
};

const VISIT_STATUS_LABELS: Record<VisitRequest['status'], { label: string; cls: string }> = {
  pending: { label: 'स्वीकृतिको पर्खाइमा', cls: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'स्वीकृत', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'अस्वीकृत', cls: 'bg-red-100 text-red-700' },
};

export default function TenantDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'bookings' | 'visits'>('bookings');
  const [payingId, setPayingId] = useState<number | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  async function load() {
    try {
      const [b, v] = await Promise.all([api.get('/bookings/tenant'), api.get('/visits/tenant')]);
      setBookings(b.data.bookings);
      setVisitRequests(v.data.visitRequests);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function payWithEsewa(bookingId: number) {
    setPayLoading(true);
    try {
      const r = await api.post('/payments/esewa/initiate', { bookingId });
      submitFormRedirect(r.data.gatewayUrl, r.data.fields);
    } catch (e) {
      alert(apiError(e));
      setPayLoading(false);
    }
  }

  async function payWithKhalti(bookingId: number) {
    setPayLoading(true);
    try {
      const r = await api.post('/payments/khalti/initiate', { bookingId });
      window.location.href = r.data.paymentUrl;
    } catch (e) {
      alert(apiError(e));
      setPayLoading(false);
    }
  }

  const pendingVisitCount = visitRequests.filter(v => v.status === 'pending').length;

  return (
    <div>
      <h1 className="text-2xl font-bold">मेरो Dashboard</h1>
      {error && <p className="err mt-2">{error}</p>}

      <div className="flex gap-1 mt-5 border-b">
        {([
          ['bookings', `बुकिङहरू (${bookings.length})`],
          ['visits', `भ्रमण अनुरोध${pendingVisitCount ? ` (${pendingVisitCount} पर्खाइमा)` : ''}`],
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
      ) : tab === 'bookings' ? (
        bookings.length === 0 ? (
          <div className="card p-8 mt-6 text-center">
            <p className="text-gray-500">तपाईंको कुनै booking छैन।</p>
            <Link to="/" className="btn-primary mt-4">कोठा खोज्नुहोस्</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {bookings.map(b => (
              <div key={b.id} className="card p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{b.property?.title}</h3>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_LABELS[b.status].cls}`}>
                      {STATUS_LABELS[b.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    वडा {b.property?.wardNumber}, {b.property?.tole} | भाडा रु {b.property?.monthlyRent.toLocaleString('en-IN')}/महिना
                  </p>
                  <p className="text-sm text-gray-500">
                    Move-in: {new Date(b.moveInDate).toLocaleDateString('ne-NP')} | Advance: रु {b.advanceAmount.toLocaleString('en-IN')}
                  </p>
                  {(b.status === 'accepted' || b.status === 'completed') && (
                    <>
                      <p className="text-sm mt-1 text-emerald-700">
                        घरबेटी सम्पर्क: {b.property?.landlord?.fullName} — {b.property?.landlord?.phone}
                      </p>
                      {b.property?.googleMapsPin && (
                        <div className="mt-2 max-w-xs">
                          <LocationView pin={b.property.googleMapsPin} />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <Link to={`/properties/${b.propertyId}`} className="btn-outline text-sm">Property हेर्नुहोस्</Link>
                    {b.status === 'accepted' && payingId !== b.id && (
                      <button className="btn-success text-sm" onClick={() => setPayingId(b.id)}>
                        Advance तिर्नुहोस्
                      </button>
                    )}
                  </div>
                  {b.status === 'accepted' && payingId === b.id && (
                    <div className="flex gap-2">
                      <button className="btn-success text-sm" disabled={payLoading} onClick={() => payWithEsewa(b.id)}>
                        eSewa बाट तिर्नुहोस्
                      </button>
                      <button className="btn-success text-sm" disabled={payLoading} onClick={() => payWithKhalti(b.id)}>
                        Khalti बाट तिर्नुहोस्
                      </button>
                      <button className="btn-outline text-sm" disabled={payLoading} onClick={() => setPayingId(null)}>
                        रद्द
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : visitRequests.length === 0 ? (
        <div className="card p-8 mt-6 text-center">
          <p className="text-gray-500">तपाईंले कुनै visit अनुरोध पठाउनुभएको छैन।</p>
          <Link to="/" className="btn-primary mt-4">कोठा खोज्नुहोस्</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visitRequests.map(v => (
            <div key={v.id} className="card p-5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{v.property?.title}</h3>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${(VISIT_STATUS_LABELS[v.status] ?? VISIT_STATUS_LABELS.pending).cls}`}>
                  {(VISIT_STATUS_LABELS[v.status] ?? { label: v.status }).label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                वडा {v.property?.wardNumber}, {v.property?.tole}
              </p>
              {v.status === 'accepted' && (
                <>
                  <p className="text-sm mt-1 text-emerald-700">
                    घरबेटी सम्पर्क: {v.property?.landlord?.fullName} — {v.property?.landlord?.phone}
                  </p>
                  {v.property?.googleMapsPin && (
                    <div className="mt-2 max-w-xs">
                      <LocationView pin={v.property.googleMapsPin} />
                    </div>
                  )}
                </>
              )}
              <Link to={`/properties/${v.propertyId}`} className="btn-outline text-sm mt-3 inline-block">Property हेर्नुहोस्</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
