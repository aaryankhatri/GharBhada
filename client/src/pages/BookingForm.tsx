import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import type { Property, CoTenant } from '../lib/types';

interface Form {
  tenantName: string;
  tenantPermanentAddress: string;
  tenantTemporaryAddress?: string;
  tenantCitizenshipNumber: string;
  tenantPhone: string;
  tenantEmail?: string;
  tenantOccupation: 'student' | 'job' | 'business' | 'other';
  tenantOrganization?: string;
  hasCoTenants: 'yes' | 'no';
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: 'father' | 'mother' | 'brother' | 'sister' | 'friend' | 'other';
  moveInDate: string;
  declarationInfoCorrect: boolean;
  declarationVisited: boolean;
  declarationAdvanceReady: boolean;
}

const STEPS = ['व्यक्तिगत विवरण', 'सँगै बस्नेहरू', 'आपतकालीन सम्पर्क', 'घोषणा र पेश'];

export default function BookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [backPhoto, setBackPhoto] = useState<File | null>(null);
  const [coTenants, setCoTenants] = useState<CoTenant[]>([]);

  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm<Form>({
    defaultValues: { hasCoTenants: 'no', tenantOccupation: 'student' },
    mode: 'onTouched',
  });
  const hasCoTenants = watch('hasCoTenants');
  const declarations = watch(['declarationInfoCorrect', 'declarationVisited', 'declarationAdvanceReady']);

  useEffect(() => {
    api.get(`/properties/${id}`).then(r => setProperty(r.data.property)).catch(e => setError(apiError(e)));
  }, [id]);

  async function nextStep() {
    setError('');
    if (step === 0) {
      const ok = await trigger(['tenantName', 'tenantPermanentAddress', 'tenantCitizenshipNumber', 'tenantPhone', 'tenantOccupation']);
      if (!ok) return;
      if (!frontPhoto || !backPhoto) {
        setError('नागरिकताको अगाडि र पछाडि दुवै फोटो upload गर्नुहोस् (JPG/PNG, max 2MB)');
        return;
      }
    }
    if (step === 1 && hasCoTenants === 'yes') {
      const invalid = coTenants.some(c => !c.name || !c.citizenshipNo || !c.phone || !c.relationship);
      if (coTenants.length === 0 || invalid) {
        setError('Co-tenant को सबै विवरण भर्नुहोस् वा "छैन" छान्नुहोस्');
        return;
      }
    }
    if (step === 2) {
      const ok = await trigger(['emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship', 'moveInDate']);
      if (!ok) return;
    }
    setStep(s => s + 1);
  }

  async function onSubmit(data: Form) {
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('propertyId', String(property!.id));
      fd.append('tenantName', data.tenantName);
      fd.append('tenantPermanentAddress', data.tenantPermanentAddress);
      if (data.tenantTemporaryAddress) fd.append('tenantTemporaryAddress', data.tenantTemporaryAddress);
      fd.append('tenantCitizenshipNumber', data.tenantCitizenshipNumber);
      fd.append('tenantPhone', data.tenantPhone);
      if (data.tenantEmail) fd.append('tenantEmail', data.tenantEmail);
      fd.append('tenantOccupation', data.tenantOccupation);
      if (data.tenantOrganization) fd.append('tenantOrganization', data.tenantOrganization);
      if (hasCoTenants === 'yes' && coTenants.length) fd.append('coTenants', JSON.stringify(coTenants));
      fd.append('emergencyContactName', data.emergencyContactName);
      fd.append('emergencyContactPhone', data.emergencyContactPhone);
      fd.append('emergencyContactRelationship', data.emergencyContactRelationship);
      fd.append('moveInDate', data.moveInDate);
      fd.append('declarationInfoCorrect', String(data.declarationInfoCorrect));
      fd.append('declarationVisited', String(data.declarationVisited));
      fd.append('declarationAdvanceReady', String(data.declarationAdvanceReady));
      fd.append('citizenshipPhotoFront', frontPhoto!);
      fd.append('citizenshipPhotoBack', backPhoto!);

      await api.post('/bookings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Booking request घरबेटीलाई पठाइयो! स्वीकृत भएपछि advance payment गर्न सक्नुहुनेछ।');
      navigate('/tenant');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function updateCoTenant(i: number, field: keyof CoTenant, value: string) {
    setCoTenants(list => list.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  if (!property) return <p className="text-gray-500 text-center py-10">{error || 'लोड हुँदैछ...'}</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">कोठा बुकिङ — {property.title}</h1>
      <p className="text-sm text-gray-500 mt-1">
        भाडा रु {property.monthlyRent.toLocaleString('en-IN')}/महिना | Advance रु {property.advanceAmount.toLocaleString('en-IN')}
      </p>

      {/* Stepper */}
      <div className="flex mt-5 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < step ? 'bg-success text-white' : i === step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <p className={`mt-1 text-[11px] ${i === step ? 'text-primary font-medium' : 'text-gray-400'}`}>{s}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        {step === 0 && (
          <>
            <div>
              <label className="label">पूरा नाम *</label>
              <input className="input" {...register('tenantName', { required: 'पूरा नाम लेख्नुहोस्' })} />
              {errors.tenantName && <p className="err">{errors.tenantName.message}</p>}
            </div>
            <div>
              <label className="label">स्थायी ठेगाना * (टोल, वडा, नगरपालिका, जिल्ला)</label>
              <textarea className="input" rows={2} {...register('tenantPermanentAddress', { required: 'स्थायी ठेगाना लेख्नुहोस्', minLength: { value: 5, message: 'पूरा ठेगाना लेख्नुहोस्' } })} />
              {errors.tenantPermanentAddress && <p className="err">{errors.tenantPermanentAddress.message}</p>}
            </div>
            <div>
              <label className="label">अस्थायी ठेगाना (optional)</label>
              <textarea className="input" rows={2} {...register('tenantTemporaryAddress')} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">नागरिकता नं *</label>
                <input className="input" {...register('tenantCitizenshipNumber', {
                  required: 'नागरिकता नं आवश्यक छ',
                  pattern: { value: /^[\d-]{10,14}$/, message: '१०–१२ अंक (dash सहित) लेख्नुहोस्' },
                })} />
                {errors.tenantCitizenshipNumber && <p className="err">{errors.tenantCitizenshipNumber.message}</p>}
              </div>
              <div>
                <label className="label">फोन नम्बर *</label>
                <input className="input" {...register('tenantPhone', {
                  required: 'फोन नम्बर आवश्यक छ',
                  pattern: { value: /^9[678]\d{8}$/, message: 'मान्य मोबाइल नम्बर लेख्नुहोस्' },
                })} />
                {errors.tenantPhone && <p className="err">{errors.tenantPhone.message}</p>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">नागरिकता फोटो (अगाडि) * — max 2MB</label>
                <input type="file" accept="image/jpeg,image/png" className="input"
                  onChange={e => setFrontPhoto(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <label className="label">नागरिकता फोटो (पछाडि) * — max 2MB</label>
                <input type="file" accept="image/jpeg,image/png" className="input"
                  onChange={e => setBackPhoto(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Email (optional)</label>
                <input type="email" className="input" {...register('tenantEmail')} />
              </div>
              <div>
                <label className="label">पेशा *</label>
                <select className="input" {...register('tenantOccupation', { required: true })}>
                  <option value="student">विद्यार्थी</option>
                  <option value="job">जागिर</option>
                  <option value="business">व्यवसाय</option>
                  <option value="other">अन्य</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">संस्था / कलेज (optional)</label>
              <input className="input" {...register('tenantOrganization')} />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <label className="label">के अरू कोही सँगै बस्ने छन्?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" value="no" {...register('hasCoTenants')} onClick={() => setCoTenants([])} /> छैन
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" value="yes" {...register('hasCoTenants')}
                    onClick={() => coTenants.length === 0 && setCoTenants([{ name: '', citizenshipNo: '', phone: '', relationship: '' }])} /> छन्
                </label>
              </div>
            </div>
            {hasCoTenants === 'yes' && (
              <div className="space-y-4">
                {coTenants.map((c, i) => (
                  <div key={i} className="border rounded-lg p-4 relative">
                    <p className="font-medium text-sm mb-3">Co-tenant {i + 1}</p>
                    <button type="button" className="absolute top-3 right-3 text-red-500 text-sm"
                      onClick={() => setCoTenants(list => list.filter((_, idx) => idx !== i))}>हटाउनुहोस्</button>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input className="input" placeholder="नाम" value={c.name} onChange={e => updateCoTenant(i, 'name', e.target.value)} />
                      <input className="input" placeholder="नागरिकता नं" value={c.citizenshipNo} onChange={e => updateCoTenant(i, 'citizenshipNo', e.target.value)} />
                      <input className="input" placeholder="फोन" value={c.phone} onChange={e => updateCoTenant(i, 'phone', e.target.value)} />
                      <input className="input" placeholder="नाता (श्रीमती, भाइ...)" value={c.relationship} onChange={e => updateCoTenant(i, 'relationship', e.target.value)} />
                    </div>
                  </div>
                ))}
                {coTenants.length < 3 && (
                  <button type="button" className="btn-outline text-sm"
                    onClick={() => setCoTenants(list => [...list, { name: '', citizenshipNo: '', phone: '', relationship: '' }])}>
                    + अर्को co-tenant थप्नुहोस् (max ३)
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="label">आपतकालीन सम्पर्क नाम *</label>
              <input className="input" {...register('emergencyContactName', { required: 'नाम आवश्यक छ' })} />
              {errors.emergencyContactName && <p className="err">{errors.emergencyContactName.message}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">फोन नम्बर *</label>
                <input className="input" {...register('emergencyContactPhone', { required: 'फोन आवश्यक छ', minLength: { value: 10, message: 'मान्य नम्बर लेख्नुहोस्' } })} />
                {errors.emergencyContactPhone && <p className="err">{errors.emergencyContactPhone.message}</p>}
              </div>
              <div>
                <label className="label">नाता *</label>
                <select className="input" {...register('emergencyContactRelationship', { required: true })}>
                  <option value="father">बुबा</option>
                  <option value="mother">आमा</option>
                  <option value="brother">दाइ/भाइ</option>
                  <option value="sister">दिदी/बहिनी</option>
                  <option value="friend">साथी</option>
                  <option value="other">अन्य</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">बसाइ सर्ने मिति (Move-in) *</label>
              <input type="date" className="input" {...register('moveInDate', { required: 'मिति छान्नुहोस्' })} />
              {errors.moveInDate && <p className="err">{errors.moveInDate.message}</p>}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p><span className="text-gray-500">Property:</span> {property.title}</p>
              <p><span className="text-gray-500">मासिक भाडा:</span> रु {property.monthlyRent.toLocaleString('en-IN')}</p>
              <p><span className="text-gray-500">Advance:</span> रु {property.advanceAmount.toLocaleString('en-IN')}</p>
              <p><span className="text-gray-500">सम्झौता प्रकार:</span> {property.monthlyRent >= 20000 ? 'Standard (लिखित अनिवार्य — Civil Code 2074, धारा ३८६)' : 'Simple (नि:शुल्क)'}</p>
            </div>
            <div className="space-y-3">
              <label className="flex gap-2 items-start text-sm">
                <input type="checkbox" className="mt-1" {...register('declarationInfoCorrect', { required: true })} />
                मैले दिएको जानकारी सही छ
              </label>
              <label className="flex gap-2 items-start text-sm">
                <input type="checkbox" className="mt-1" {...register('declarationVisited', { required: true })} />
                मैले physically कोठा हेरेको छु
              </label>
              <label className="flex gap-2 items-start text-sm">
                <input type="checkbox" className="mt-1" {...register('declarationAdvanceReady', { required: true })} />
                Booking स्वीकृत भएपछि म advance payment गर्न तयार छु
              </label>
            </div>
          </>
        )}

        {error && <p className="err">{error}</p>}

        <div className="flex justify-between pt-2">
          {step > 0 ? (
            <button type="button" className="btn-outline" onClick={() => setStep(s => s - 1)}>← पछाडि</button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" className="btn-primary" onClick={nextStep}>अगाडि →</button>
          ) : (
            <button type="submit" className="btn-success" disabled={submitting || !declarations.every(Boolean)}>
              {submitting ? 'पेश हुँदैछ...' : 'Booking पेश गर्नुहोस्'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
