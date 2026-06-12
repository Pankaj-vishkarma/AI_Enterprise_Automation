import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, Mail, Lock, Eye, EyeOff, Sparkles, Shield } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { validateEmail } from '../../../utils/validators';
import BrandLogo from '../../landing/components/ui/BrandLogo';
import { BRAND } from '../../landing/constants';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-center w-full max-w-[445px] mx-auto px-5 sm:px-6 lg:px-8 py-6 md:py-4">
      <Link to="/" className="flex items-center gap-2.5 mb-5 md:mb-6 w-fit">
        <BrandLogo />
      </Link>

      <div className="glass rounded-full pl-1 pr-3 py-1 flex items-center gap-2 text-xs w-fit mb-4">
        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] font-medium flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Welcome back
        </span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A14]">
        Sign in to your account
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
        Access your {BRAND.fullName} and continue building the future.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#1A1A14] mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              id="password"
              {...register('password', { required: 'Password is required' })}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="landing-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[#1A1A14] transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-[#1A1A14]/20 accent-[#1A1A14]"
            />
            <span className="text-sm text-[var(--muted-foreground)]">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-[#1A1A14] font-medium hover:underline shrink-0">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? 'Signing in...' : (
            <>Sign in <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-[#1A1A14] font-medium hover:underline inline-flex items-center gap-1">
          Sign up <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>

      <div className="mt-5 md:mt-6 flex items-center justify-center gap-2 text-[10px] sm:text-xs text-[var(--muted-foreground)] text-center">
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span>Enterprise grade security • SOC 2 Type II Compliant</span>
      </div>
    </div>
  );
}
