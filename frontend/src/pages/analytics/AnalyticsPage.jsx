import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { BarChart3, Download, Sparkles, BookOpen, Bot, Layers, LifeBuoy, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('knowledge'); // knowledge, employees, workflows, support

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
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 size={32} className="text-primary" />
              Analytics & Reporting
            </h1>
            <p className="text-muted-foreground mt-1">Monitor knowledge utilization, evaluate AI worker productivity, track automation bottlenecks, and review customer satisfaction.</p>
          </div>

          {/* Export Actions dropdown */}
          <div className="flex gap-2">
            <button
              onClick={() => handleExport("Operational Summary")}
              className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground px-3 py-2 rounded-lg border border-border text-xs font-semibold cursor-pointer transition"
            >
              <Download size={14} />
              Export Summary
            </button>
            <button
              onClick={() => handleExport("Support Performance Report")}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm"
            >
              <Download size={14} />
              Export Support Report
            </button>
          </div>
        </div>

        {/* Top KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Knowledge Queries", value: "3,892", icon: BookOpen, color: "text-blue-600 bg-blue-50 border-blue-100", label: "+14% this week" },
            { title: "Active AI Employees", value: "8 Active", icon: Bot, color: "text-purple-600 bg-purple-50 border-purple-100", label: "2 created recently" },
            { title: "Workflow Throughput", value: "92.4%", icon: Layers, color: "text-green-600 bg-green-50 border-green-100", label: "-0.5d avg duration" },
            { title: "Customer CSAT", value: "4.82 / 5.0", icon: LifeBuoy, color: "text-amber-600 bg-amber-50 border-amber-100", label: "98 tickets resolved" }
          ].map((kpi, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground uppercase">{kpi.title}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${kpi.color}`}>
                  <kpi.icon size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-[10px] text-green-600 font-semibold">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab selection */}
        <div className="border-b border-border flex gap-4 text-xs font-bold uppercase tracking-wider">
          {[
            { id: 'knowledge', label: 'Knowledge Analytics', icon: BookOpen },
            { id: 'employees', label: 'AI Employees', icon: Bot },
            { id: 'workflows', label: 'Workflow Performance', icon: Layers },
            { id: 'support', label: 'Customer Support', icon: LifeBuoy }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[300px]">
          {activeTab === 'knowledge' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Popular queries */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground">Most Searched Topics</h3>
                <div className="space-y-2">
                  {[
                    { topic: "Reimbursement Policy", count: 128 },
                    { topic: "Annual Paid Leaves allowed", count: 92 },
                    { topic: "Customer Refund Process", count: 74 },
                    { topic: "Employee Probation period", count: 48 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border">
                      <span className="text-xs font-semibold text-foreground">{item.topic}</span>
                      <span className="text-xs text-primary font-bold">{item.count} queries</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Knowledge gaps */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <AlertCircle className="text-amber-500" size={16} />
                  Identified Knowledge Gaps
                </h3>
                <p className="text-xs text-muted-foreground">Topics queried that returned empty or low-confidence results from the document base.</p>
                <div className="space-y-2">
                  {[
                    { topic: "Travel insurance coverage rules", missCount: 14, severity: "High" },
                    { topic: "Maternity leave payout formula", missCount: 8, severity: "Medium" },
                    { topic: "Corporate wellness gym discount", missCount: 5, severity: "Low" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-secondary/10 border border-border border-dashed rounded-lg">
                      <div className="text-xs font-medium text-foreground">
                        <p className="font-semibold">{item.topic}</p>
                        <p className="text-[10px] text-muted-foreground">Failed query count: {item.missCount}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.severity === 'High' ? 'bg-red-100 text-red-800' :
                        item.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
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
                <h3 className="text-sm font-bold text-foreground">AI Agent Usage Share</h3>
                <div className="space-y-4">
                  {[
                    { name: "Alex - Support Assistant", percent: 45, color: "bg-green-600" },
                    { name: "Emma - HR Assistant", percent: 25, color: "bg-blue-600" },
                    { name: "David - Research Assistant", percent: 18, color: "bg-purple-600" },
                    { name: "Sarah - Sales Assistant", percent: 12, color: "bg-amber-600" }
                  ].map((agent, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{agent.name}</span>
                        <span className="text-primary font-bold">{agent.percent}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${agent.color}`} style={{ width: `${agent.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task completion rates */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground">Task Completion Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/30 rounded-xl border border-border text-center space-y-1">
                    <p className="text-2xl font-bold text-foreground">1,482</p>
                    <p className="text-xs text-muted-foreground">Total Tasks Executed</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-xl border border-border text-center space-y-1">
                    <p className="text-2xl font-bold text-foreground">94.8%</p>
                    <p className="text-xs text-green-600 font-semibold">Success rate</p>
                  </div>
                </div>
                <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl text-xs leading-relaxed text-foreground flex items-start gap-2">
                  <Sparkles className="text-primary flex-shrink-0 mt-0.5" size={14} />
                  <span><strong>AI Efficiency Peak:</strong> Support Assistant automated 42% of inbound support cases today with zero human intervention.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Throughput */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground">Workflow Completion Success</h3>
                <div className="space-y-4">
                  {[
                    { label: "Refund Processing", rate: 100, color: "bg-green-600" },
                    { label: "Employee Onboarding", rate: 84, color: "bg-primary" },
                    { label: "Leave Approvals", rate: 93, color: "bg-primary" },
                    { label: "Vendor Approvals", rate: 72, color: "bg-yellow-500" }
                  ].map((wf, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">{wf.label}</span>
                        <span className="text-foreground">{wf.rate}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${wf.color}`} style={{ width: `${wf.rate}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottlenecks */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground">Identified Process Bottlenecks</h3>
                <div className="space-y-2">
                  {[
                    { step: "Finance Team Sign-off", delay: "2.4 days avg delay", severity: "Critical" },
                    { step: "IT Asset Allocation check", delay: "1.1 days avg delay", severity: "Minor" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-red-50/40 border border-red-100 rounded-lg text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{item.step}</p>
                        <p className="text-[10px] text-muted-foreground">{item.delay}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
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
                <h3 className="text-sm font-bold text-foreground">Ticket Volumes by Category</h3>
                <div className="space-y-3">
                  {[
                    { label: "Billing Issues", count: 48, rate: 45 },
                    { label: "Technical Problems", count: 32, rate: 30 },
                    { label: "Feature Requests", count: 18, rate: 17 },
                    { label: "General Questions", count: 8, rate: 8 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{item.count} tickets</span>
                        <div className="w-16 bg-secondary h-1.5 rounded-full">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${item.rate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution times */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground font-heading">Support Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/30 rounded-xl border border-border text-center space-y-1">
                    <p className="text-xl font-bold text-foreground">14.2 min</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Avg Resolution Time</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-xl border border-border text-center space-y-1">
                    <p className="text-xl font-bold text-foreground">98.2%</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">CSAT Score</p>
                  </div>
                </div>
                <div className="p-3 bg-secondary/20 border border-border rounded-xl text-xs text-muted-foreground">
                  <strong className="text-foreground">SLA Target Alert:</strong> All tickets resolved today complied with the SLA limit of under 30 minutes resolution threshold.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
