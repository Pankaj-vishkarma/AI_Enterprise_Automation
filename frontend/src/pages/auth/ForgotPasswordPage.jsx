import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowRight } from 'lucide-react';
import { authAPI } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { validateEmail } from '../../utils/validators';
import { getApiErrorMessage } from '../../utils/apiError';
import LoginVisual from './components/LoginVisual';
import BrandLogo from '../landing/components/ui/BrandLogo';
import '../landing/landing.css';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState(null);
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
    setResetLink(null);
    try {
      const { data: res } = await authAPI.forgotPassword(data.email);
      setSubmitted(true);
      toast.success(res?.message || 'If an account exists, a reset link has been sent.');
      if (res?.reset_link) {
        setResetLink(res.reset_link);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to send reset link. Please try again.'));
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

            {submitted && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                Check your email for reset instructions. If you do not receive an email, verify the address and try again.
              </div>
            )}

            {resetLink && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm break-all">
                <p className="font-medium mb-1">Development reset link</p>
                <a href={resetLink} className="underline">{resetLink}</a>
              </div>
            )}

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
