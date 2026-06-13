import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { authAPI } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { validatePassword } from '../../utils/validators';
import { getApiErrorMessage } from '../../utils/apiError';
import LoginVisual from './components/LoginVisual';
import BrandLogo from '../landing/components/ui/BrandLogo';
import '../landing/landing.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');

  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    return () => document.documentElement.classList.remove('landing-active');
  }, []);

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid or missing reset token');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword(token, data.password);
      navigate('/login', { state: { message: 'Password reset successfully. Please sign in.' } });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to reset password. Please try again.'));
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
              Reset password
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
              Enter your new password below.
            </p>

            {!token && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Invalid reset link. Please request a new password reset.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#1A1A14] mb-1.5">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
                  <input
                    id="password"
                    {...register('password', {
                      required: 'Password is required',
                      validate: (v) => validatePassword(v) || 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
                    })}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    className="landing-input pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[#1A1A14]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1A1A14] mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
                  <input
                    id="confirmPassword"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (v) => v === password || 'Passwords do not match',
                    })}
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    className="landing-input pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[#1A1A14]">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading || !token}
                className="landing-btn-primary w-full"
              >
                {isLoading ? 'Resetting...' : 'Reset password'}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
              <Link to="/login" className="text-[#1A1A14] font-medium hover:underline">
                Back to sign in
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
