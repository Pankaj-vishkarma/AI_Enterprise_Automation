import React from 'react';
import { useNavigate } from 'react-router-dom';
import { appBtnPrimary } from '../styles/appStyles';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F1F0E3] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl sm:text-8xl font-bold text-[#1A1A14]/10 mb-2">404</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A14] mb-2">Page not found</h1>
        <p className="text-sm text-[#6A6A60] mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <button onClick={() => navigate('/dashboard')} className={appBtnPrimary}>
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
