import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { AMENITY_LABELS, type Amenities, type WaterAvailability } from '../lib/types';
import LocationPicker from '../components/LocationPicker';
import WaterAvailabilityPicker from '../components/WaterAvailabilityPicker';

interface Form {
  title: string;
  wardNumber: number;
  tole: string;
  monthlyRent: number;
  advanceAmount: number;
  rentDueDay: number;
  availableFrom: string;
  description?: string;
  declaration: boolean;
}

export default function AddProperty() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    defaultValues: { rentDueDay: 5 },
  });
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [amenities, setAmenities] = useState<Partial<Amenities>>({});
  const [waterAvailability, setWaterAvailability] = useState<WaterAvailability>({
    type: '24hours', daysPerWeek: 7, timesPerDay: 1, hoursPerSession: 24, timeSlots: [],
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');

  async function onSubmit(data: Form) {
    setError('');
    if (!photos || photos.length < 3) {
      setError('कम्तिमा ३ वटा फोटो अनिवार्य छ: कोठा, बाथरूम, भवन/प्रवेशद्वार (JPG/PNG, प्रत्येक max 5MB)');
      return;
    }
    if (!location) {
      setError('नक्सामा घरको स्थान छान्नुहोस्');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('title', data.title);
      fd.append('wardNumber', String(data.wardNumber));
      fd.append('tole', data.tole);
      fd.append('monthlyRent', String(data.monthlyRent));
      fd.append('advanceAmount', String(data.advanceAmount));
      fd.append('rentDueDay', String(data.rentDueDay));
      fd.append('availableFrom', data.availableFrom);
      if (data.description) fd.append('description', data.description);
      fd.append('amenities', JSON.stringify(amenities));
      fd.append('waterAvailability', JSON.stringify(waterAvailability));
      fd.append('googleMapsPin', `${location.lat},${location.lng}`);
      fd.append('declaration', String(data.declaration));
      Array.from(photos).forEach(f => fd.append('photos', f));

      const r = await api.post('/properties', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(r.data.message || 'Listing पेश भयो');
      navigate('/landlord');
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">नयाँ Property थप्नुहोस्</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 mt-4 space-y-4">
        <div>
          <label className="label">शीर्षक * (जस्तै: "घाम लाग्ने एकल कोठा — बागबजार")</label>
          <input className="input" {...register('title', { required: 'शीर्षक लेख्नुहोस्' })} />
          {errors.title && <p className="err">{errors.title.message}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">वडा नं * (KMC १–३२)</label>
            <select className="input" {...register('wardNumber', { required: 'वडा छान्नुहोस्' })}>
              <option value="">छान्नुहोस्</option>
              {Array.from({ length: 32 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>वडा {w}</option>
              ))}
            </select>
            {errors.wardNumber && <p className="err">{errors.wardNumber.message}</p>}
          </div>
          <div>
            <label className="label">टोल / क्षेत्र *</label>
            <input className="input" {...register('tole', { required: 'टोल लेख्नुहोस्' })} />
            {errors.tole && <p className="err">{errors.tole.message}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-2">नगरपालिका: काठमाडौं महानगरपालिका | जिल्ला: काठमाडौं (auto)</p>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">मासिक भाडा (रु) *</label>
            <input type="number" className="input" {...register('monthlyRent', {
              required: 'भाडा लेख्नुहोस्',
              min: { value: 5000, message: 'कम्तिमा रु ५,०००' },
            })} />
            {errors.monthlyRent && <p className="err">{errors.monthlyRent.message}</p>}
          </div>
          <div>
            <label className="label">Advance (रु) *</label>
            <input type="number" className="input" {...register('advanceAmount', { required: 'Advance लेख्नुहोस्', min: { value: 0, message: 'मान्य रकम' } })} />
            {errors.advanceAmount && <p className="err">{errors.advanceAmount.message}</p>}
          </div>
          <div>
            <label className="label">भाडा तिर्ने गते *</label>
            <select className="input" {...register('rentDueDay')}>
              {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d} गते भित्र</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">उपलब्ध मिति *</label>
          <input type="date" className="input" {...register('availableFrom', { required: 'मिति छान्नुहोस्' })} />
          {errors.availableFrom && <p className="err">{errors.availableFrom.message}</p>}
        </div>

        <div>
          <label className="label">फोटोहरू * (कम्तिमा ३: कोठा, बाथरूम, भवन — JPG/PNG, max 5MB)</label>
          <input type="file" multiple accept="image/jpeg,image/png" className="input"
            onChange={e => setPhotos(e.target.files)} />
          {photos && <p className="text-xs text-gray-500 mt-1">{photos.length} फोटो छानियो</p>}
        </div>

        <div>
          <label className="label">घरको स्थान (नक्सा) * — visit/booking स्वीकृत भएपछि मात्र tenant लाई देखिनेछ</label>
          <LocationPicker value={location} onChange={setLocation} />
        </div>

        <div>
          <label className="label">पानी उपलब्धता *</label>
          <WaterAvailabilityPicker value={waterAvailability} onChange={setWaterAvailability} />
        </div>

        <div>
          <label className="label">सुविधाहरू</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(AMENITY_LABELS) as (keyof Amenities)[]).map(k => (
              <label key={k} className={`border rounded-lg px-3 py-2 text-sm cursor-pointer ${amenities[k] ? 'border-success bg-emerald-50 text-emerald-700' : 'border-gray-300'}`}>
                <input type="checkbox" className="sr-only" checked={!!amenities[k]}
                  onChange={() => setAmenities(a => ({ ...a, [k]: !a[k] }))} />
                {AMENITY_LABELS[k]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">कोठाको विवरण (max ५०० शब्द)</label>
          <textarea className="input" rows={4} placeholder="जस्तै: कोठा south-facing छ, morning sunlight आउँछ, quiet area छ"
            {...register('description')} />
        </div>

        <label className="flex gap-2 items-start text-sm">
          <input type="checkbox" className="mt-1" {...register('declaration', { required: 'घोषणामा सहमति आवश्यक छ' })} />
          मैले माथि दिएको जानकारी सही छ, photos upload गरेको छु, र facilities सही छानेको छु।
        </label>
        {errors.declaration && <p className="err">{errors.declaration.message}</p>}

        {error && <p className="err">{error}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'पेश हुँदैछ...' : 'Listing पेश गर्नुहोस् (admin approval २४–४८ घण्टा)'}
        </button>
      </form>
    </div>
  );
}
