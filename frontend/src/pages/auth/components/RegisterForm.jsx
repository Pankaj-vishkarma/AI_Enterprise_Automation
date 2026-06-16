import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowRight, Mail, Lock, Eye, EyeOff, Sparkles, Shield, User, Building2,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { validateAuthEmail, validateAuthPassword, trimAuthEmail, validateOrganizationName, validateFirstName } from '../../../utils/validators';
import { getApiErrorMessage } from '../../../utils/apiError';
import BrandLogo from '../../landing/components/ui/BrandLogo';
import { BRAND } from '../../landing/constants';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register: authRegister } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    shouldFocusError: true,
    defaultValues: {
      organization_name: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await authRegister({
        organization_name: data.organization_name.trim(),
        first_name: data.first_name.trim(),
        last_name: data.last_name?.trim() || null,
        email: trimAuthEmail(data.email),
        password: data.password,
      });
      toast.success('Registration successful.');
      navigate('/dashboard');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Registration failed. Please try again.');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-center w-full min-w-0 max-w-[445px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-4 box-border">
      <Link to="/" className="flex items-center gap-2.5 mb-5 md:mb-6 w-fit">
        <BrandLogo />
      </Link>

      <div className="glass rounded-full pl-1 pr-3 py-1 flex items-center gap-2 text-xs w-fit mb-4">
        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] font-medium flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Get started
        </span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A14]">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
        Join {BRAND.fullName} and start building your AI workforce.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-5 space-y-3.5"
      >
        <div>
          <label htmlFor="organization_name" className="block text-sm font-medium text-[#1A1A14] mb-1.5">
            Organization name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              id="organization_name"
              {...register('organization_name', {
                validate: validateOrganizationName,
              })}
              type="text"
              autoComplete="organization"
              placeholder="Your company or team name"
              className="landing-input"
            />
          </div>
          {errors.organization_name && (
            <p className="text-red-600 text-sm mt-1">{errors.organization_name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-[#1A1A14] mb-1.5">First name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
              <input
                id="first_name"
                {...register('first_name', { validate: validateFirstName })}
                type="text"
                autoComplete="given-name"
                placeholder="First name"
                className="landing-input"
              />
            </div>
            {errors.first_name && <p className="text-red-600 text-sm mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-[#1A1A14] mb-1.5">Last name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
              <input
                id="last_name"
                {...register('last_name')}
                type="text"
                autoComplete="family-name"
                placeholder="Last name (optional)"
                className="landing-input"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#1A1A14] mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              id="email"
              {...register('email', {
                setValueAs: trimAuthEmail,
                validate: validateAuthEmail,
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
              {...register('password', {
                validate: (v) => validateAuthPassword(v, { checkStrength: true }),
              })}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a password"
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

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1A1A14] mb-1.5">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              id="confirmPassword"
              {...register('confirmPassword', {
                validate: (v) => {
                  const result = validateAuthPassword(v);
                  if (result !== true) return result;
                  return v === password || 'Passwords do not match';
                },
              })}
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm your password"
              className="landing-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[#1A1A14] transition"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? 'Creating account...' : (
            <>Create account <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{' '}
        <Link to="/login" className="text-[#1A1A14] font-medium hover:underline inline-flex items-center gap-1">
          Sign in <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>

      <div className="mt-5 md:mt-6 flex items-center justify-center gap-2 text-[10px] sm:text-xs text-[var(--muted-foreground)] text-center">
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span>Enterprise grade security • SOC 2 Type II Compliant</span>
      </div>
    </div>
  );
}
