import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowRight } from 'lucide-react';
import { authAPI } from '../../api/auth';
import { validateEmail } from '../../utils/validators';
import LoginVisual from './components/LoginVisual';
import BrandLogo from '../landing/components/ui/BrandLogo';
import '../landing/landing.css';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '' },
  });

  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    return () => document.documentElement.classList.remove('landing-active');
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await authAPI.forgotPassword(data.email);
      setSuccess('Password reset link sent to your email. Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-page h-[100dvh] min-h-screen overflow-hidden">
      <div className="h-full md:grid md:grid-cols-2">
        <div className="flex items-center justify-center h-full min-h-0 bg-[var(--bg)] md:order-2 md:border-l border-[#1A1A14]/[0.08] overflow-y-auto md:overflow-hidden">
          <div className="relative flex flex-col justify-center w-full max-w-[445px] mx-auto px-5 sm:px-6 lg:px-8 py-6 md:py-4">
            <Link to="/" className="flex items-center gap-2.5 mb-5 md:mb-6 w-fit">
              <BrandLogo />
            </Link>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A14]">
              Forgot password?
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#1A1A14] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
                  <input
                    id="email"
                    {...register('email', {
                      required: 'Email is required',
                      validate: (v) => validateEmail(v) || 'Invalid email address',
                    })}
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="landing-input"
                  />
                </div>
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="landing-btn-primary w-full"
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
              Remember your password?{' '}
              <Link to="/login" className="text-[#1A1A14] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden md:block md:order-1 relative h-full min-h-0">
          <LoginVisual />
        </div>
      </div>
    </div>
  );
}
