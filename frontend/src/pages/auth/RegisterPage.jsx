import { useEffect } from 'react';
import RegisterForm from './components/RegisterForm';
import LoginVisual from './components/LoginVisual';
import '../landing/landing.css';

export default function RegisterPage() {
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    return () => document.documentElement.classList.remove('landing-active');
  }, []);

  return (
    <div className="landing-page h-[100dvh] min-h-screen overflow-hidden overflow-x-hidden w-full">
      <div className="h-full w-full min-w-0 md:grid md:grid-cols-2">
        <div className="flex items-center justify-center h-full min-h-0 min-w-0 w-full bg-[var(--bg)] md:order-2 md:border-l border-[#1A1A14]/[0.08] overflow-y-auto overflow-x-hidden">
          <RegisterForm />
        </div>

        <div className="hidden md:block md:order-1 relative h-full min-h-0">
          <LoginVisual />
        </div>
      </div>
    </div>
  );
}
