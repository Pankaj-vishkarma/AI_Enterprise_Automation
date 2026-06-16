import React, { useCallback, useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { analyticsAPI } from '../../api/analytics';
import {
  BarChart3, Download, Sparkles, BookOpen, Bot, Layers, LifeBuoy, AlertCircle,
  Mic, MessageCircle, Search, Globe, Building2, Users, GitMerge,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  appPageShell, appPageTitle, appPageDesc, appGlassCard, appBtnPrimary, appBtnGhost,
  appTabActive, appTabInactive, appBadgeInactive, appBadgeWarning, appInputPlain, appLabel,
  appEmpty,
} from '../../styles/appStyles';

const CHART_COLORS = ['#1A1A14', '#4B4B42', '#6A6A60', '#E8C547', '#8B7355', '#C4A882'];

const TABS = [
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'employees', label: 'AI Employees', icon: Bot },
  { id: 'collaboration', label: 'Collaboration', icon: GitMerge },
  { id: 'workflows', label: 'Workflows', icon: Layers },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'browser', label: 'Browser', icon: Globe },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'omnichannel', label: 'Omnichannel', icon: MessageCircle },
  { id: 'organization', label: 'Organization', icon: Building2 },
];

function BarList({ items, labelKey, valueKey, suffix = '' }) {
  if (!items?.length) return <div className={appEmpty}>No data available.</div>;
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex justify-between items-center p-3 bg-[#1A1A14]/[0.03] rounded-xl border border-[#1A1A14]/10">
          <span className="text-xs font-semibold text-[#1A1A14] truncate mr-2">{item[labelKey]}</span>
          <span className="text-xs text-[#1A1A14] font-bold flex-shrink-0">{item[valueKey]}{suffix}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressBars({ items, labelKey, valueKey, maxValue }) {
  if (!items?.length) return <div className={appEmpty}>No data available.</div>;
  const max = maxValue || Math.max(...items.map((i) => i[valueKey]), 1);
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#1A1A14] truncate">{item[labelKey]}</span>
            <span className="text-[#1A1A14] font-bold">{item[valueKey]}</span>
          </div>
          <div className="w-full bg-[#1A1A14]/10 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-[#1A1A14] to-[#4B4B42]"
              style={{ width: `${Math.min(100, (item[valueKey] / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('knowledge');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate).toISOString();
      const { data } = await analyticsAPI.dashboard(params);
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleExport = async (reportType) => {
    try {
      const params = { format: 'markdown' };
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate).toISOString();
      const { data } = await analyticsAPI.report(reportType, params);
      const element = document.createElement('a');
      const file = new Blob([data.content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${reportType}_report.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch {
      /* ignore */
    }
  };

  const handleBinaryExport = async (reportType, format) => {
    try {
      const params = { format };
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate).toISOString();
      const { data } = await analyticsAPI.exportReport(reportType, params);
      const element = document.createElement('a');
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      element.href = URL.createObjectURL(data);
      element.download = `${reportType}_report.${ext}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch {
      /* ignore */
    }
  };

  const s = dashboard?.summary;
  const k = dashboard?.knowledge;
  const e = dashboard?.employees;
  const c = dashboard?.collaboration;
  const w = dashboard?.workflows;
  const sup = dashboard?.support;
  const r = dashboard?.research;
  const b = dashboard?.browser;
  const v = dashboard?.voice;
  const o = dashboard?.omnichannel;
  const org = dashboard?.organization;

  const supportCategoryData = Object.entries(sup?.category_distribution || {}).map(([name, value]) => ({
    name, value,
  }));

  const channelData = Object.entries(o?.conversations_by_channel || {}).map(([name, value]) => ({
    name, value,
  }));

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
          <div className="min-w-0">
            <h1 className={`${appPageTitle} flex flex-wrap items-center gap-2`}>
              <BarChart3 size={32} className="text-[#1A1A14] shrink-0" />
              Analytics &amp; Reporting
            </h1>
            <p className={appPageDesc}>
              Monitor knowledge utilization, AI productivity, workflow performance, support metrics, and cross-channel engagement.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full md:flex-row md:w-auto md:shrink-0">
            <button type="button" onClick={() => handleExport('executive')} className={`${appBtnGhost} w-full md:w-auto`}>
              <Download size={14} /> Executive Summary
            </button>
            <button type="button" onClick={() => handleExport('operational')} className={`${appBtnGhost} w-full md:w-auto`}>
              <Download size={14} /> Operational Report
            </button>
            <button type="button" onClick={() => handleExport('business')} className={`${appBtnPrimary} w-full md:w-auto`}>
              <Download size={14} /> Business Report
            </button>
            <button type="button" onClick={() => handleBinaryExport('executive', 'pdf')} className={`${appBtnGhost} w-full md:w-auto`}>
              PDF Export
            </button>
            <button type="button" onClick={() => handleBinaryExport('executive', 'xlsx')} className={`${appBtnGhost} w-full md:w-auto`}>
              Excel Export
            </button>
          </div>
        </div>

        <div className={`${appGlassCard} grid grid-cols-1 sm:grid-cols-2 gap-3`}>
          <div>
            <label className={appLabel}>Start Date</label>
            <input type="date" value={startDate} onChange={(ev) => setStartDate(ev.target.value)} className={appInputPlain} />
          </div>
          <div>
            <label className={appLabel}>End Date</label>
            <input type="date" value={endDate} onChange={(ev) => setEndDate(ev.target.value)} className={appInputPlain} />
          </div>
        </div>

        {loading ? (
          <div className={appEmpty}>Loading analytics...</div>
        ) : !dashboard ? (
          <div className={appEmpty}>Unable to load analytics data.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Knowledge Queries', value: s?.knowledge_queries ?? 0, icon: BookOpen },
                { title: 'Active AI Employees', value: s?.active_ai_employees ?? 0, icon: Bot },
                { title: 'Workflow Completion', value: `${s?.workflow_completion_rate ?? 0}%`, icon: Layers },
                { title: 'Resolved Tickets', value: s?.resolved_support_tickets ?? 0, icon: LifeBuoy },
                { title: 'Conversations', value: s?.total_conversations ?? 0, icon: MessageCircle },
                { title: 'Voice Sessions', value: s?.total_voice_sessions ?? 0, icon: Mic },
                { title: 'Research Reports', value: s?.total_research_reports ?? 0, icon: Search },
                { title: 'Active Users', value: s?.active_users ?? 0, icon: Users },
              ].map((kpi) => (
                <div key={kpi.title} className={appGlassCard}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#6A6A60] uppercase">{kpi.title}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-[#1A1A14] bg-[#1A1A14]/5 border-[#1A1A14]/10">
                      <kpi.icon size={16} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[#1A1A14] mt-3">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="border-b border-[#1A1A14]/10 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? appTabActive : appTabInactive}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={`${appGlassCard} min-h-[300px]`}>
              {activeTab === 'knowledge' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Most Searched Topics</h3>
                    <BarList items={k?.most_searched_topics} labelKey="topic" valueKey="count" suffix=" queries" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14] flex items-center gap-1.5">
                      <AlertCircle className="text-amber-600" size={16} />
                      Knowledge Gaps
                    </h3>
                    <div className="space-y-2">
                      {(k?.knowledge_gaps || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-[#1A1A14]/[0.02] border border-dashed border-[#1A1A14]/10 rounded-xl">
                          <div className="text-xs">
                            <p className="font-semibold text-[#1A1A14]">{item.topic}</p>
                            <p className="text-[10px] text-[#6A6A60]">{item.count} missed queries</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.severity === 'High' ? 'bg-red-100 text-red-800' :
                              item.severity === 'Medium' ? appBadgeWarning : appBadgeInactive
                            }`}>{item.severity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Most Accessed Documents</h3>
                    <BarList items={k?.most_accessed_documents} labelKey="title" valueKey="count" suffix=" hits" />
                  </div>
                </div>
              )}

              {activeTab === 'employees' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Most Active Employees</h3>
                    <ProgressBars
                      items={(e?.most_active_employees || []).map((a) => ({
                        name: a.name,
                        runs: a.runs,
                      }))}
                      labelKey="name"
                      valueKey="runs"
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Task Completion Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border border-[#1A1A14]/10 text-center">
                        <p className="text-2xl font-bold text-[#1A1A14]">{e?.total_runs ?? 0}</p>
                        <p className="text-xs text-[#6A6A60]">Total Runs</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border border-[#1A1A14]/10 text-center">
                        <p className="text-2xl font-bold text-[#1A1A14]">{e?.success_rate ?? 0}%</p>
                        <p className="text-xs text-emerald-700 font-semibold">Success Rate</p>
                      </div>
                    </div>
                    <div className="p-3.5 bg-[#1A1A14]/5 border border-[#1A1A14]/10 rounded-xl text-xs flex gap-2">
                      <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
                      <span>Top tools: {(e?.tool_usage || []).slice(0, 3).map((t) => t.tool).join(', ') || 'None yet'}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'collaboration' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Collaboration Runs</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{c?.total_runs ?? 0}</p>
                        <p className="text-xs text-[#6A6A60]">Total Runs</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{c?.success_rate ?? 0}%</p>
                        <p className="text-xs text-[#6A6A60]">Success Rate</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Most Used Teams</h3>
                    <BarList items={c?.most_used_teams || []} labelKey="team" valueKey="count" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Most Used Agents</h3>
                    <BarList items={c?.most_used_agents || []} labelKey="agent" valueKey="count" />
                  </div>
                </div>
              )}

              {activeTab === 'workflows' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Workflow Completion</h3>
                    <ProgressBars
                      items={(w?.workflow_performance || []).map((wf) => ({
                        name: wf.workflow_name,
                        rate: wf.completion_rate,
                      }))}
                      labelKey="name"
                      valueKey="rate"
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Bottlenecks &amp; Approvals</h3>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-xl font-bold">{w?.pending_approvals ?? 0}</p>
                        <p className="text-[10px] text-[#6A6A60]">Pending Approvals</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-xl font-bold">{w?.average_completion_hours ?? '—'}</p>
                        <p className="text-[10px] text-[#6A6A60]">Avg Hours</p>
                      </div>
                    </div>
                    <BarList
                      items={(w?.bottlenecks || []).map((b) => ({
                        step: b.step_name,
                        delay: `${b.delay_hours}h`,
                      }))}
                      labelKey="step"
                      valueKey="delay"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'support' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Tickets by Category</h3>
                    {supportCategoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={supportCategoryData}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#1A1A14" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={appEmpty}>No support tickets yet.</div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Support Performance</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-xl font-bold">{sup?.average_resolution_hours ?? '—'} hrs</p>
                        <p className="text-[10px] text-[#6A6A60]">Avg Resolution</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-xl font-bold">{sup?.resolution_rate ?? 0}%</p>
                        <p className="text-[10px] text-[#6A6A60]">Resolution Rate</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-xl font-bold">{sup?.open_tickets ?? 0}</p>
                        <p className="text-[10px] text-[#6A6A60]">Open Tickets</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-xl font-bold">{sup?.escalation_rate ?? 0}%</p>
                        <p className="text-[10px] text-[#6A6A60]">Escalation Rate</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#6A6A60]">
                      Sentiment: {Object.entries(sup?.sentiment_distribution || {}).map(([k2, v]) => `${k2}: ${v}`).join(' · ') || 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'research' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Most Requested Topics</h3>
                    <BarList items={r?.most_requested_topics} labelKey="topic" valueKey="count" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Research Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{r?.total_reports ?? 0}</p>
                        <p className="text-xs text-[#6A6A60]">Total Reports</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{r?.success_rate ?? 0}%</p>
                        <p className="text-xs text-emerald-700">Success Rate</p>
                      </div>
                    </div>
                    <BarList items={r?.research_categories} labelKey="research_type" valueKey="count" />
                  </div>
                </div>
              )}

              {activeTab === 'browser' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Task Types</h3>
                    <BarList items={b?.task_type_breakdown} labelKey="task_type" valueKey="count" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Browser Automation</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{b?.total_tasks ?? 0}</p>
                        <p className="text-xs text-[#6A6A60]">Total Tasks</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{b?.success_rate ?? 0}%</p>
                        <p className="text-xs text-emerald-700">Success Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Most Used Assistants</h3>
                    <BarList items={v?.most_used_assistants} labelKey="assistant" valueKey="count" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Most Used Commands</h3>
                    <BarList items={v?.most_used_commands} labelKey="intent" valueKey="count" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{v?.total_sessions ?? 0}</p>
                        <p className="text-xs text-[#6A6A60]">Sessions</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{v?.total_interactions ?? 0}</p>
                        <p className="text-xs text-[#6A6A60]">Interactions</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'omnichannel' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Conversations by Channel</h3>
                    {channelData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {channelData.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className={appEmpty}>No conversations yet.</div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Engagement</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{o?.human_handoffs ?? 0}</p>
                        <p className="text-xs text-[#6A6A60]">Human Handoffs</p>
                      </div>
                      <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                        <p className="text-2xl font-bold">{o?.ai_reply_count ?? 0}</p>
                        <p className="text-xs text-[#6A6A60]">AI Replies</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'organization' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Department Activity</h3>
                    <BarList items={org?.department_activity} labelKey="name" valueKey="events" suffix=" events" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1A1A14]">Organization Overview</h3>
                    <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border text-center">
                      <p className="text-3xl font-bold text-[#1A1A14]">{org?.active_users ?? 0}</p>
                      <p className="text-xs text-[#6A6A60]">Active Users</p>
                    </div>
                    <BarList
                      items={(org?.most_active_users || []).map((u) => ({
                        user: `User #${u.user_id}`,
                        events: u.events,
                      }))}
                      labelKey="user"
                      valueKey="events"
                      suffix=" events"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
