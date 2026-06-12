import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import { appPageShell, appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appBadgeActive, appGrid } from '../../styles/appStyles';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div>
          <h1 className={appPageTitle}>Welcome back, {user?.firstName}</h1>
          <p className={appPageDesc}>Here&apos;s what&apos;s happening with your business today.</p>
        </div>

        <div className={`${appGrid} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`}>
          {[
            { title: 'Total Users', value: '1,248', trend: '+12%' },
            { title: 'Active Teams', value: '48', trend: '+5%' },
            { title: 'Documents', value: '2,891', trend: '+23%' },
            { title: 'Conversations', value: '456', trend: '+8%' },
          ].map((card, i) => (
            <div key={i} className={appGlassCard}>
              <p className="text-sm text-[#6A6A60] mb-2">{card.title}</p>
              <p className="text-2xl sm:text-3xl font-bold text-[#1A1A14]">{card.value}</p>
              <p className="text-sm text-emerald-700 mt-2">{card.trend} this month</p>
            </div>
          ))}
        </div>

        <div className={`${appGrid} grid-cols-1 lg:grid-cols-3`}>
          <div className={`lg:col-span-2 ${appGlassCard}`}>
            <h2 className={`${appSectionTitle} mb-4`}>Recent Activity</h2>
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[#1A1A14]/[0.06] last:border-b-0 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1A1A14] truncate">Activity {i}</p>
                    <p className="text-sm text-[#6A6A60]">2 hours ago</p>
                  </div>
                  <span className={appBadgeActive}>Completed</span>
                </div>
              ))}
            </div>
          </div>

          <div className={appGlassCard}>
            <h2 className={`${appSectionTitle} mb-4`}>Quick Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#6A6A60]">Completion Rate</span>
                  <span className="font-semibold text-[#1A1A14]">85%</span>
                </div>
                <div className="w-full bg-[#1A1A14]/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#6A6A60]">Active Users</span>
                  <span className="font-semibold text-[#1A1A14]">1,248</span>
                </div>
                <div className="w-full bg-[#1A1A14]/10 rounded-full h-2">
                  <div className="bg-[#E8C547] h-2 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
