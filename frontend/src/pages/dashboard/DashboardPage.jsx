import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Welcome back, {user?.firstName}</h1>
          <p className="text-muted-foreground mt-2">Here&apos;s what&apos;s happening with your business today.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Users', value: '1,248', trend: '+12%' },
            { title: 'Active Teams', value: '48', trend: '+5%' },
            { title: 'Documents', value: '2,891', trend: '+23%' },
            { title: 'Conversations', value: '456', trend: '+8%' },
          ].map((card, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">{card.title}</p>
              <p className="text-3xl font-bold text-foreground">{card.value}</p>
              <p className="text-sm text-green-600 mt-2">{card.trend} this month</p>
            </div>
          ))}
        </div>

        {/* Recent Activity & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <div>
                    <p className="font-medium text-foreground">Activity {i}</p>
                    <p className="text-sm text-muted-foreground">2 hours ago</p>
                  </div>
                  <span className="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded-full">Completed</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="font-semibold text-foreground">85%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <span className="font-semibold text-foreground">1,248</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-accent h-2 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
