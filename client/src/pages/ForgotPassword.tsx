import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import PasswordInput from '../components/PasswordInput';

interface RequestForm {
  emailOrPhone: string;
}

interface ResetForm {
  code: string;
  newPassword: string;
}

export default function ForgotPassword() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();

  const requestForm = useForm<RequestForm>();
  const resetForm = useForm<ResetForm>();

  async function onRequest(data: RequestForm) {
    setError('');
    setInfo('');
    try {
      const r = await api.post('/auth/forgot-password', data);
      setEmailOrPhone(data.emailOrPhone);
      setInfo(r.data.message || 'Reset code email मा पठाइयो');
      setStep('reset');
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function onReset(data: ResetForm) {
    setError('');
    try {
      const r = await api.post('/auth/reset-password', { emailOrPhone, ...data });
      alert(r.data.message || 'Password फेरियो');
      navigate('/login');
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="max-w-md mx-auto card p-6 mt-8">
      <h1 className="text-xl font-bold">Password बिर्सनुभयो?</h1>

      {step === 'request' ? (
        <form onSubmit={requestForm.handleSubmit(onRequest)} className="mt-4 space-y-4">
          <p className="text-sm text-gray-600">
            आफ्नो दर्ता गरिएको Email वा फोन नम्बर लेख्नुहोस् — दर्ता गरिएको email मा ६ अंकको reset code पठाइनेछ।
          </p>
          <div>
            <label className="label">Email वा फोन नम्बर</label>
            <input className="input" {...requestForm.register('emailOrPhone', { required: 'यो field आवश्यक छ' })} />
            {requestForm.formState.errors.emailOrPhone && (
              <p className="err">{requestForm.formState.errors.emailOrPhone.message}</p>
            )}
          </div>
          {error && <p className="err">{error}</p>}
          <button className="btn-primary w-full" disabled={requestForm.formState.isSubmitting}>
            Reset Code पठाउनुहोस्
          </button>
        </form>
      ) : (
        <form onSubmit={resetForm.handleSubmit(onReset)} className="mt-4 space-y-4">
          {info && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{info}</p>}
          <div>
            <label className="label">Reset Code (6 अंक)</label>
            <input
              className="input tracking-widest text-center text-lg"
              maxLength={6}
              placeholder="000000"
              {...resetForm.register('code', { required: 'Code लेख्नुहोस्', minLength: { value: 6, message: '6 अंकको code लेख्नुहोस्' } })}
            />
            {resetForm.formState.errors.code && <p className="err">{resetForm.formState.errors.code.message}</p>}
          </div>
          <div>
            <label className="label">नयाँ Password (कम्तिमा ८ अक्षर)</label>
            <PasswordInput {...resetForm.register('newPassword', {
              required: 'नयाँ password लेख्नुहोस्',
              minLength: { value: 8, message: 'कम्तिमा ८ अक्षर चाहिन्छ' },
            })} />
            {resetForm.formState.errors.newPassword && <p className="err">{resetForm.formState.errors.newPassword.message}</p>}
          </div>
          {error && <p className="err">{error}</p>}
          <button className="btn-primary w-full" disabled={resetForm.formState.isSubmitting}>
            Password फेर्नुहोस्
          </button>
          <button type="button" className="btn-outline w-full" onClick={() => setStep('request')}>
            फेरि code पठाउनुहोस्
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-gray-600">
        याद आयो? <Link to="/login" className="text-primary underline">लगइन</Link>
      </p>
    </div>
  );
}
