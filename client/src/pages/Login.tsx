import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

interface Form {
  emailOrPhone: string;
  password: string;
}

const ROLE_HEADING: Record<string, string> = {
  tenant: 'Tenant लगइन',
  landlord: 'Landlord लगइन',
};

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role');
  const [error, setError] = useState('');

  async function onSubmit(data: Form) {
    setError('');
    try {
      const r = await api.post('/auth/login', data);
      login(r.data.token, r.data.user);
      const role = r.data.user.role;
      navigate(role === 'landlord' ? '/landlord' : role === 'admin' ? '/admin' : '/');
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="max-w-md mx-auto card p-6 mt-8">
      <Link to="/welcome" className="text-xs text-gray-500 hover:text-primary">← फेरि छान्नुहोस्</Link>
      <h1 className="text-xl font-bold mt-1">{role ? ROLE_HEADING[role] ?? 'लगइन' : 'लगइन'}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label className="label">Email वा फोन नम्बर</label>
          <input className="input" {...register('emailOrPhone', { required: 'यो field आवश्यक छ' })} />
          {errors.emailOrPhone && <p className="err">{errors.emailOrPhone.message}</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <PasswordInput {...register('password', { required: 'Password आवश्यक छ' })} />
          {errors.password && <p className="err">{errors.password.message}</p>}
          <Link to="/forgot-password" className="text-xs text-primary underline mt-1 inline-block">Password बिर्सनुभयो?</Link>
        </div>
        {error && <p className="err">{error}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>लगइन</button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        खाता छैन? <Link to={role ? `/register?role=${role}` : '/register'} className="text-primary underline">दर्ता गर्नुहोस्</Link>
      </p>
      <div className="mt-4 text-xs bg-gray-50 border rounded-lg p-3 text-gray-500">
        <p className="font-medium text-gray-600">Demo accounts (password: password123)</p>
        <p>Tenant: tenant@test.com | Landlord: landlord@test.com | Admin: admin@gharbhada.com</p>
      </div>
    </div>
  );
}
