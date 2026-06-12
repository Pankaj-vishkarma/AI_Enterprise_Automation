import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { operationsAPI } from '../../api/operations';
import { BarChart3, Download, Sparkles, BookOpen, Bot, Layers, LifeBuoy, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import {
  appPageTitle, appPageDesc, appGlassCard, appBtnPrimary, appBtnGhost,
  appTabActive, appTabInactive, appBadgeInactive, appBadgeWarning,
} from '../../styles/appStyles';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('knowledge'); // knowledge, employees, workflows, support
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    operationsAPI.analytics().then(({ data }) => setAnalytics(data)).catch(() => {});
  }, []);

  const handleExport = (reportType) => {
    let reportContent = `
# Executive Performance Report: ${reportType} 2026

## 1. Summary Metrics
- **Analysis Period:** Q1 2026
- **System Adoption:** +28% increase in internal AI employee queries.
- **Workflow Efficiency:** Average cycle times reduced by 3.2 days.
- **Support CSAT:** 4.8 / 5.0 average user rating.

## 2. Segment Insights
Detailed metrics regarding ${reportType.toLowerCase()} have been processed. Systems are running within target operational thresholds.

---
*Report generated automatically by the Analytics & Reporting engine.*
    `;
    const element = document.createElement("a");
    const file = new Blob([reportContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${reportType.replace(/\s+/g, '_')}_Report_2026.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`${appPageTitle} flex items-center gap-2`}>
              <BarChart3 size={32} className="text-[#1A1A14]" />
              Analytics & Reporting
            </h1>
            <p className={appPageDesc}>Monitor knowledge utilization, evaluate AI worker productivity, track automation bottlenecks, and review customer satisfaction.</p>
          </div>

          {/* Export Actions dropdown */}
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("Operational Summary")}
              className={appBtnGhost}
            >
              <Download size={14} />
              Export Summary
            </button>
            <button
              onClick={() => handleExport("Support Performance Report")}
              className={appBtnPrimary}
            >
              <Download size={14} />
              Export Support Report
            </button>
          </div>
        </div>

        {/* Top KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Knowledge Queries", value: analytics?.summary.knowledge_queries ?? "0", icon: BookOpen, label: "organization total" },
            { title: "Active AI Employees", value: `${analytics?.summary.active_ai_employees ?? 0} Active`, icon: Bot, label: "currently deployed" },
            { title: "Workflow Throughput", value: `${analytics?.summary.workflow_completion_rate ?? 0}%`, icon: Layers, label: "completion rate" },
            { title: "Resolved Tickets", value: analytics?.summary.resolved_support_tickets ?? "0", icon: LifeBuoy, label: "organization total" }
          ].map((kpi, idx) => (
            <div key={idx} className={appGlassCard}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#6A6A60] uppercase">{kpi.title}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center border text-[#1A1A14] bg-[#1A1A14]/5 border-[#1A1A14]/10">
                  <kpi.icon size={16} />
                </div>
              </div>
              <div className="space-y-1 mt-3">
                <p className="text-2xl font-bold text-[#1A1A14]">{kpi.value}</p>
                <p className="text-[10px] text-emerald-700 font-semibold">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab selection */}
        <div className="border-b border-[#1A1A14]/10 flex gap-4 text-xs font-bold uppercase tracking-wider">
          {[
            { id: 'knowledge', label: 'Knowledge Analytics', icon: BookOpen },
            { id: 'employees', label: 'AI Employees', icon: Bot },
            { id: 'workflows', label: 'Workflow Performance', icon: Layers },
            { id: 'support', label: 'Customer Support', icon: LifeBuoy }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? appTabActive : appTabInactive}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div className={`${appGlassCard} min-h-[300px]`}>
          {activeTab === 'knowledge' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Popular queries */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#1A1A14]">Most Searched Topics</h3>
                <div className="space-y-2">
                  {[
                    { topic: "Reimbursement Policy", count: 128 },
                    { topic: "Annual Paid Leaves allowed", count: 92 },
                    { topic: "Customer Refund Process", count: 74 },
                    { topic: "Employee Probation period", count: 48 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-[#1A1A14]/[0.03] rounded-xl border border-[#1A1A14]/10">
                      <span className="text-xs font-semibold text-[#1A1A14]">{item.topic}</span>
                      <span className="text-xs text-[#1A1A14] font-bold">{item.count} queries</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Knowledge gaps */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#1A1A14] flex items-center gap-1.5">
                  <AlertCircle className="text-amber-600" size={16} />
                  Identified Knowledge Gaps
                </h3>
                <p className="text-xs text-[#6A6A60]">Topics queried that returned empty or low-confidence results from the document base.</p>
                <div className="space-y-2">
                  {[
                    { topic: "Travel insurance coverage rules", missCount: 14, severity: "High" },
                    { topic: "Maternity leave payout formula", missCount: 8, severity: "Medium" },
                    { topic: "Corporate wellness gym discount", missCount: 5, severity: "Low" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-[#1A1A14]/[0.02] border border-[#1A1A14]/10 border-dashed rounded-xl">
                      <div className="text-xs font-medium text-[#1A1A14]">
                        <p className="font-semibold">{item.topic}</p>
                        <p className="text-[10px] text-[#6A6A60]">Failed query count: {item.missCount}</p>
                      </div>
                      <span className={`text-[10px] font-bold ${
                        item.severity === 'High' ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800' :
                        item.severity === 'Medium' ? appBadgeWarning :
                        appBadgeInactive
                      }`}>
                        {item.severity} Gap
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Usage stats */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#1A1A14]">AI Agent Usage Share</h3>
                <div className="space-y-4">
                  {[
                    { name: "Alex - Support Assistant", percent: 45, color: "bg-gradient-to-r from-[#1A1A14] to-[#4B4B42]" },
                    { name: "Emma - HR Assistant", percent: 25, color: "bg-[#4B4B42]" },
                    { name: "David - Research Assistant", percent: 18, color: "bg-[#6A6A60]" },
                    { name: "Sarah - Sales Assistant", percent: 12, color: "bg-[#E8C547]" }
                  ].map((agent, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#1A1A14]">{agent.name}</span>
                        <span className="text-[#1A1A14] font-bold">{agent.percent}%</span>
                      </div>
                      <div className="w-full bg-[#1A1A14]/10 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${agent.color}`} style={{ width: `${agent.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task completion rates */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#1A1A14]">Task Completion Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border border-[#1A1A14]/10 text-center space-y-1">
                    <p className="text-2xl font-bold text-[#1A1A14]">1,482</p>
                    <p className="text-xs text-[#6A6A60]">Total Tasks Executed</p>
                  </div>
                  <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border border-[#1A1A14]/10 text-center space-y-1">
                    <p className="text-2xl font-bold text-[#1A1A14]">94.8%</p>
                    <p className="text-xs text-emerald-700 font-semibold">Success rate</p>
                  </div>
                </div>
                <div className="p-3.5 bg-[#1A1A14]/5 border border-[#1A1A14]/10 rounded-xl text-xs leading-relaxed text-[#1A1A14] flex items-start gap-2">
                  <Sparkles className="text-[#1A1A14] flex-shrink-0 mt-0.5" size={14} />
                  <span><strong>AI Efficiency Peak:</strong> Support Assistant automated 42% of inbound support cases today with zero human intervention.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Throughput */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#1A1A14]">Workflow Completion Success</h3>
                <div className="space-y-4">
                  {[
                    { label: "Refund Processing", rate: 100, color: "bg-gradient-to-r from-[#1A1A14] to-[#4B4B42]" },
                    { label: "Employee Onboarding", rate: 84, color: "bg-[#4B4B42]" },
                    { label: "Leave Approvals", rate: 93, color: "bg-[#1A1A14]" },
                    { label: "Vendor Approvals", rate: 72, color: "bg-[#E8C547]" }
                  ].map((wf, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#1A1A14]">{wf.label}</span>
                        <span className="text-[#1A1A14]">{wf.rate}%</span>
                      </div>
                      <div className="w-full bg-[#1A1A14]/10 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${wf.color}`} style={{ width: `${wf.rate}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottlenecks */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#1A1A14]">Identified Process Bottlenecks</h3>
                <div className="space-y-2">
                  {[
                    { step: "Finance Team Sign-off", delay: "2.4 days avg delay", severity: "Critical" },
                    { step: "IT Asset Allocation check", delay: "1.1 days avg delay", severity: "Minor" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-red-50/40 border border-red-100 rounded-xl text-xs">
                      <div>
                        <p className="font-semibold text-[#1A1A14]">{item.step}</p>
                        <p className="text-[10px] text-[#6A6A60]">{item.delay}</p>
                      </div>
                      <span className={`text-[9px] font-bold ${
                        item.severity === 'Critical' ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800' : appBadgeWarning
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ticket volume metrics */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#1A1A14]">Ticket Volumes by Category</h3>
                <div className="space-y-3">
                  {[
                    { label: "Billing Issues", count: 48, rate: 45 },
                    { label: "Technical Problems", count: 32, rate: 30 },
                    { label: "Feature Requests", count: 18, rate: 17 },
                    { label: "General Questions", count: 8, rate: 8 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#1A1A14]">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#6A6A60]">{item.count} tickets</span>
                        <div className="w-16 bg-[#1A1A14]/10 h-1.5 rounded-full">
                          <div className="bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] h-1.5 rounded-full" style={{ width: `${item.rate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution times */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#1A1A14]">Support Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border border-[#1A1A14]/10 text-center space-y-1">
                    <p className="text-xl font-bold text-[#1A1A14]">14.2 min</p>
                    <p className="text-[10px] text-[#6A6A60] uppercase font-bold tracking-wider">Avg Resolution Time</p>
                  </div>
                  <div className="p-4 bg-[#1A1A14]/[0.03] rounded-xl border border-[#1A1A14]/10 text-center space-y-1">
                    <p className="text-xl font-bold text-[#1A1A14]">98.2%</p>
                    <p className="text-[10px] text-[#6A6A60] uppercase font-bold tracking-wider">CSAT Score</p>
                  </div>
                </div>
                <div className="p-3 bg-[#1A1A14]/[0.03] border border-[#1A1A14]/10 rounded-xl text-xs text-[#6A6A60]">
                  <strong className="text-[#1A1A14]">SLA Target Alert:</strong> All tickets resolved today complied with the SLA limit of under 30 minutes resolution threshold.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
