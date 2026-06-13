import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import { analyticsAPI } from '../../api/analytics';
import { supportAPI } from '../../api/support';
import { omnichannelAPI } from '../../api/omnichannel';
import { getDashboardConfig, hasPermission, PERMISSIONS } from '../../utils/rbac';
import {
  appPageShell,
  appPageTitle,
  appPageDesc,
  appSectionTitle,
  appGlassCard,
  appBadgeActive,
  appGrid,
} from '../../styles/appStyles';

function formatValue(value, suffix = '') {
  if (value === null || value === undefined) return '—';
  return `${value}${suffix}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const config = getDashboardConfig(user?.role);
  const canViewAnalytics = hasPermission(user, PERMISSIONS.ANALYTICS_VIEW);

  const { data: analyticsData } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => analyticsAPI.dashboard(),
    enabled: canViewAnalytics,
  });

  const { data: supportMetrics } = useQuery({
    queryKey: ['dashboard-support'],
    queryFn: () => supportAPI.metrics(),
    enabled: Boolean(user),
  });

  const { data: omnichannelData } = useQuery({
    queryKey: ['dashboard-omnichannel'],
    queryFn: () => omnichannelAPI.listConversations(),
    enabled: user?.role === 'EMPLOYEE',
  });

  const summary = analyticsData?.data?.summary;
  const support = supportMetrics?.data;

  const cards = (() => {
    if (canViewAnalytics && summary) {
      if (config.scope === 'platform') {
        return [
          { title: 'Active Users', value: formatValue(summary.active_users), trend: 'Platform-wide' },
          { title: 'Knowledge Queries', value: formatValue(summary.knowledge_queries), trend: 'All organizations' },
          { title: 'AI Employees', value: formatValue(summary.active_ai_employees), trend: 'Active agents' },
          { title: 'Conversations', value: formatValue(summary.total_conversations), trend: 'Omnichannel' },
        ];
      }
      if (config.scope === 'organization') {
        return [
          { title: 'Active Users', value: formatValue(summary.active_users), trend: user?.organizationName || 'Your org' },
          { title: 'Documents', value: formatValue(analyticsData?.data?.knowledge?.total_documents), trend: 'Knowledge base' },
          { title: 'Open Tickets', value: formatValue(analyticsData?.data?.support?.open_tickets ?? support?.open_tickets), trend: 'Support queue' },
          { title: 'Workflow Rate', value: formatValue(summary.workflow_completion_rate, '%'), trend: 'Completion' },
        ];
      }
      return [
        { title: 'Team Tickets', value: formatValue(support?.open_tickets), trend: 'Open queue' },
        { title: 'Resolved', value: formatValue(support?.resolved_tickets), trend: 'This period' },
        { title: 'Knowledge Queries', value: formatValue(summary.knowledge_queries), trend: 'Team usage' },
        { title: 'Collaboration', value: formatValue(analyticsData?.data?.collaboration?.active_teams), trend: 'Active teams' },
      ];
    }

    const assignedConversations = Array.isArray(omnichannelData?.data)
      ? omnichannelData.data.length
      : 0;

    return [
      { title: 'My Open Tickets', value: formatValue(support?.open_tickets), trend: 'Assigned to you' },
      { title: 'Resolved Tickets', value: formatValue(support?.resolved_tickets), trend: 'Your requests' },
      { title: 'Conversations', value: formatValue(assignedConversations), trend: 'Assigned inbox' },
      { title: 'Voice Sessions', value: formatValue(summary?.total_voice_sessions, ''), trend: 'Personal usage' },
    ];
  })();

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div>
          <h1 className={appPageTitle}>Welcome back, {user?.firstName}</h1>
          <p className={appPageDesc}>{config.description}</p>
          <p className="text-xs uppercase tracking-wider text-[#6A6A60] mt-1">{config.title}</p>
        </div>

        <div className={`${appGrid} grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`}>
          {cards.map((card) => (
            <div key={card.title} className={appGlassCard}>
              <p className="text-sm text-[#6A6A60] mb-2">{card.title}</p>
              <p className="text-2xl sm:text-3xl font-bold text-[#1A1A14]">{card.value}</p>
              <p className="text-sm text-emerald-700 mt-2">{card.trend}</p>
            </div>
          ))}
        </div>

        <div className={`${appGrid} grid-cols-1 lg:grid-cols-3`}>
          <div className={`lg:col-span-2 ${appGlassCard}`}>
            <h2 className={`${appSectionTitle} mb-4`}>Recent Activity</h2>
            <div className="space-y-1">
              {(canViewAnalytics
                ? [
                    `Knowledge queries: ${formatValue(summary?.knowledge_queries)}`,
                    `Support resolved: ${formatValue(summary?.resolved_support_tickets)}`,
                    `Research reports: ${formatValue(summary?.total_research_reports)}`,
                    `Voice sessions: ${formatValue(summary?.total_voice_sessions)}`,
                    `Workflow completion: ${formatValue(summary?.workflow_completion_rate, '%')}`,
                  ]
                : [
                    `Open support tickets: ${formatValue(support?.open_tickets)}`,
                    `Assigned conversations: ${formatValue(Array.isArray(omnichannelData?.data) ? omnichannelData.data.length : 0)}`,
                    `Organization: ${user?.organizationName || '—'}`,
                    `Role: ${user?.role || '—'}`,
                    `Team: ${user?.team || 'Unassigned'}`,
                  ]
              ).map((line) => (
                <div
                  key={line}
                  className="flex items-center justify-between py-3 border-b border-[#1A1A14]/[0.06] last:border-b-0 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#1A1A14] truncate">{line}</p>
                  </div>
                  <span className={appBadgeActive}>Live</span>
                </div>
              ))}
            </div>
          </div>

          <div className={appGlassCard}>
            <h2 className={`${appSectionTitle} mb-4`}>Quick Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#6A6A60]">Support Resolution</span>
                  <span className="font-semibold text-[#1A1A14]">
                    {formatValue(support?.resolution_rate, '%')}
                  </span>
                </div>
                <div className="w-full bg-[#1A1A14]/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] h-2 rounded-full"
                    style={{ width: `${Math.min(support?.resolution_rate || 0, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#6A6A60]">Scope</span>
                  <span className="font-semibold text-[#1A1A14] capitalize">{config.scope}</span>
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
