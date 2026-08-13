import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

interface Form {
  role: 'tenant' | 'landlord';
  fullName: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  citizenshipNumber?: string;
  panNumber?: string;
  occupation?: 'student' | 'job' | 'business' | 'other';
  organization?: string;
}

export default function Register() {
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'landlord' ? 'landlord' : 'tenant';
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    defaultValues: { role: initialRole },
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const role = watch('role');

  async function onSubmit(data: Form) {
    setError('');
    try {
      const r = await api.post('/auth/register', data);
      login(r.data.token, r.data.user);
      navigate(data.role === 'landlord' ? '/landlord' : '/');
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="max-w-lg mx-auto card p-6 mt-8">
      <h1 className="text-xl font-bold">नयाँ खाता दर्ता</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label className="label">म हुँ:</label>
          <div className="grid grid-cols-2 gap-2">
            <label className={`border rounded-lg p-3 text-center cursor-pointer ${role === 'tenant' ? 'border-primary bg-blue-50 text-primary font-medium' : 'border-gray-300'}`}>
              <input type="radio" value="tenant" className="sr-only" {...register('role')} />
              भाडामा बस्ने (Tenant)
            </label>
            <label className={`border rounded-lg p-3 text-center cursor-pointer ${role === 'landlord' ? 'border-primary bg-blue-50 text-primary font-medium' : 'border-gray-300'}`}>
              <input type="radio" value="landlord" className="sr-only" {...register('role')} />
              घरबेटी (Landlord)
            </label>
          </div>
        </div>

        <div>
          <label className="label">पूरा नाम *</label>
          <input className="input" {...register('fullName', { required: 'पूरा नाम लेख्नुहोस्', minLength: { value: 2, message: 'नाम छोटो भयो' } })} />
          {errors.fullName && <p className="err">{errors.fullName.message}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" {...register('email', { required: 'Email आवश्यक छ' })} />
            {errors.email && <p className="err">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">मोबाइल नम्बर *</label>
            <input className="input" placeholder="98XXXXXXXX" {...register('phone', {
              required: 'फोन नम्बर आवश्यक छ',
              pattern: { value: /^9[678]\d{8}$/, message: 'मान्य नेपाली मोबाइल नम्बर लेख्नुहोस्' },
            })} />
            {errors.phone && <p className="err">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Password * (कम्तिमा ८ अक्षर)</label>
          <PasswordInput {...register('password', {
            required: 'Password आवश्यक छ',
            minLength: { value: 8, message: 'कम्तिमा ८ अक्षर चाहिन्छ' },
          })} />
          {errors.password && <p className="err">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">ठेगाना *</label>
          <input className="input" placeholder="टोल, वडा, नगरपालिका, जिल्ला" {...register('address', { required: 'ठेगाना आवश्यक छ' })} />
          {errors.address && <p className="err">{errors.address.message}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">नागरिकता नं</label>
            <input className="input" {...register('citizenshipNumber')} />
          </div>
          {role === 'landlord' ? (
            <div>
              <label className="label">PAN नम्बर (optional)</label>
              <input className="input" {...register('panNumber')} />
            </div>
          ) : (
            <div>
              <label className="label">पेशा</label>
              <select className="input" {...register('occupation')}>
                <option value="student">विद्यार्थी</option>
                <option value="job">जागिर</option>
                <option value="business">व्यवसाय</option>
                <option value="other">अन्य</option>
              </select>
            </div>
          )}
        </div>

        {role === 'tenant' && (
          <div>
            <label className="label">संस्था / कलेज (optional)</label>
            <input className="input" {...register('organization')} />
          </div>
        )}

        {error && <p className="err">{error}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>दर्ता गर्नुहोस्</button>
        <p className="text-xs text-gray-500">
          दर्ता गरेपछि फोन OTP verification गरिनेछ (Phase 2)। तपाईंको डाटा Individual Privacy Act 2075 अनुसार सुरक्षित राखिन्छ।
        </p>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        पहिले नै खाता छ? <Link to="/login" className="text-primary underline">लगइन</Link>
      </p>
    </div>
  );
}
