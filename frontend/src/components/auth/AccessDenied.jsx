import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import { appGlassCard, appPageShell, appPageTitle, appPageDesc, appBtnPrimary } from '../../styles/appStyles';
import { ShieldOff } from 'lucide-react';

export default function AccessDenied({ title = 'Access Denied', message }) {
  return (
    <MainLayout>
      <div className={appPageShell}>
        <div className={`${appGlassCard} max-w-xl`}>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 grid place-items-center shrink-0">
              <ShieldOff size={22} />
            </div>
            <div>
              <h1 className={appPageTitle}>{title}</h1>
              <p className={appPageDesc}>
                {message || 'You do not have permission to view this page. Contact your administrator if you believe this is an error.'}
              </p>
              <Link to="/dashboard" className={`${appBtnPrimary} mt-5 inline-flex`}>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
