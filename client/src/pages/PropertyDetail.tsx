import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiError, photoUrl } from '../lib/api';
import type { Property } from '../lib/types';
import { AMENITY_LABELS, formatWaterAvailability } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import TaxCalculator from '../components/TaxCalculator';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitRequested, setVisitRequested] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);

  useEffect(() => {
    api.get(`/properties/${id}`)
      .then(r => setProperty(r.data.property))
      .catch(e => setError(apiError(e)));
  }, [id]);

  if (error) return <p className="err">{error}</p>;
  if (!property) return <p className="text-gray-500 text-center py-10">लोड हुँदैछ...</p>;

  const agreementType = property.monthlyRent >= 20000 ? 'standard' : 'simple';

  function onBookClick() {
    if (!user) return navigate('/login');
    if (user.role !== 'tenant') return alert('Booking को लागि tenant खाता चाहिन्छ');
    setShowVisitModal(true);
  }

  async function onVisitRequestClick() {
    if (!user) return navigate('/login');
    if (user.role !== 'tenant') return alert('Visit अनुरोधको लागि tenant खाता चाहिन्छ');
    setVisitLoading(true);
    try {
      await api.post('/visits', { propertyId: property!.id });
      setVisitRequested(true);
    } catch (e) {
      alert(apiError(e));
    } finally {
      setVisitLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Photos */}
        <div className="card overflow-hidden">
          <div className="aspect-video bg-gray-200">
            <img
              src={photoUrl(property.photos[activePhoto]?.url)}
              alt={property.photos[activePhoto]?.label}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2 p-3 overflow-x-auto">
            {property.photos.map((ph, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`shrink-0 w-24 rounded-lg overflow-hidden border-2 ${i === activePhoto ? 'border-primary' : 'border-transparent'}`}
              >
                <img src={photoUrl(ph.url)} alt={ph.label} className="aspect-[4/3] object-cover w-full" />
                <span className="block text-[10px] text-gray-500 py-0.5">{ph.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h1 className="text-2xl font-bold">{property.title}</h1>
          <p className="text-gray-500 mt-1">
            वडा {property.wardNumber}, {property.tole}, {property.municipality}, {property.district}
          </p>
          {property.description && <p className="mt-3 text-gray-700 whitespace-pre-wrap">{property.description}</p>}

          <h2 className="font-semibold mt-5">पानी उपलब्धता</h2>
          <p className={`mt-2 inline-block text-sm rounded-lg px-3 py-2 ${property.waterAvailability.type === '24hours' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {formatWaterAvailability(property.waterAvailability)}
          </p>

          <h2 className="font-semibold mt-5">सुविधाहरू</h2>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(AMENITY_LABELS) as (keyof typeof AMENITY_LABELS)[]).map(k => (
              <div key={k} className={`text-sm rounded-lg px-3 py-2 ${property.amenities[k] ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400 line-through'}`}>
                {AMENITY_LABELS[k]}
              </div>
            ))}
          </div>
        </div>

        <TaxCalculator initialRent={property.monthlyRent} />
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="card p-5">
          <p>
            <span className="text-2xl font-bold text-primary">रु {property.monthlyRent.toLocaleString('en-IN')}</span>
            <span className="text-gray-500"> /महिना</span>
          </p>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2 text-gray-500">Advance</td><td className="py-2 text-right font-medium">रु {property.advanceAmount.toLocaleString('en-IN')}</td></tr>
              <tr><td className="py-2 text-gray-500">भाडा तिर्ने</td><td className="py-2 text-right font-medium">{property.rentDueDay} गते भित्र</td></tr>
              <tr><td className="py-2 text-gray-500">उपलब्ध मिति</td><td className="py-2 text-right font-medium">{new Date(property.availableFrom).toLocaleDateString('ne-NP')}</td></tr>
              <tr>
                <td className="py-2 text-gray-500">सम्झौता</td>
                <td className="py-2 text-right font-medium">
                  {agreementType === 'standard' ? 'Standard (लिखित अनिवार्य)' : 'Simple (नि:शुल्क)'}
                </td>
              </tr>
            </tbody>
          </table>
          {agreementType === 'standard' && (
            <p className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2">
              रु २०,०००+ भाडा — Muluki Civil Code 2074 (धारा ३८६) अनुसार लिखित सम्झौता अनिवार्य छ।
            </p>
          )}
          <button className="btn-primary w-full mt-4" onClick={onBookClick} disabled={!property.isAvailable}>
            कोठा बुक गर्नुहोस्
          </button>
          <button
            className="btn-outline w-full mt-2"
            onClick={onVisitRequestClick}
            disabled={visitRequested || visitLoading}
          >
            {visitRequested ? 'अनुरोध पठाइयो ✓' : visitLoading ? 'पठाउँदै...' : 'भ्रमणको लागि अनुरोध'}
          </button>
        </div>

        <div className="card p-5 text-sm">
          <h3 className="font-semibold">घरबेटी</h3>
          <p className="mt-1">{property.landlord?.fullName}</p>
          <p className="text-gray-500">{property.landlord?.phone}</p>
          <p className="text-xs text-gray-400 mt-2">सम्पर्क विवरण booking स्वीकृत भएपछि मात्र खुल्छ।</p>
        </div>
      </div>

      {/* Visit warning modal */}
      {showVisitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold">के तपाईंले physically कोठा हेर्नुभयो?</h3>
            <p className="mt-2 text-gray-600 text-sm">
              Photos र वास्तविक कोठा फरक हुन सक्छ। Booking अघि कोठा आफैं गएर हेर्न सिफारिस गरिन्छ।
            </p>
            <div className="mt-5 grid gap-2">
              <button
                className="btn-primary"
                onClick={() => { setShowVisitModal(false); navigate(`/properties/${property.id}/book`); }}
              >
                हो, मैले कोठा हेरेको छु
              </button>
              <button className="btn-outline" onClick={() => setShowVisitModal(false)}>
                छैन, पहिला हेर्छु
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
