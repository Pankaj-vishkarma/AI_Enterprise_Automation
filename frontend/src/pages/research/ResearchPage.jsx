import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { researchAPI } from '../../api/research';
import { formatApiError } from '../../utils/apiError';
import {
  Compass, Search, Loader, FileText, BarChart3, History, Download, Trash2,
} from 'lucide-react';

export default function ResearchPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('run');
  const [requestText, setRequestText] = useState('');
  const [researchType, setResearchType] = useState('Business Intelligence');
  const [useBrowser, setUseBrowser] = useState(false);
  const [latestReport, setLatestReport] = useState(null);
  const [errorText, setErrorText] = useState('');

  const { data: templatesRes } = useQuery({
    queryKey: ['research-templates'],
    queryFn: () => researchAPI.getTemplates(),
  });
  const { data: reportsRes, isLoading: reportsLoading } = useQuery({
    queryKey: ['research-reports'],
    queryFn: () => researchAPI.list({ limit: 50 }),
  });
  const { data: metricsRes } = useQuery({
    queryKey: ['research-metrics'],
    queryFn: () => researchAPI.getMetrics(),
  });

  const templates = templatesRes?.data || {};
  const reports = reportsRes?.data || [];
  const metrics = metricsRes?.data || {};

  const runMutation = useMutation({
    mutationFn: (payload) => researchAPI.run(payload),
    onSuccess: (res) => {
      setLatestReport(res.data);
      setErrorText('');
      queryClient.invalidateQueries({ queryKey: ['research-reports'] });
      queryClient.invalidateQueries({ queryKey: ['research-metrics'] });
      setActiveTab('library');
    },
    onError: (err) => setErrorText(formatApiError(err, 'Research request failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => researchAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['research-reports'] }),
  });

  const runResearch = (text, type = researchType) => {
    if (!text.trim() || runMutation.isPending) return;
    setRequestText(text);
    setResearchType(type);
    runMutation.mutate({
      request_text: text,
      research_type: type,
      use_browser: useBrowser,
    });
  };

  const handleDownload = (report) => {
    const element = document.createElement('a');
    const file = new Blob([report.final_report || ''], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${(report.title || 'report').replace(/\s+/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const tabs = [
    { id: 'run', label: 'New Research', icon: Search },
    { id: 'library', label: 'Saved Reports', icon: FileText },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Compass size={32} className="text-primary" />
            Business Research Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Multi-agent market analysis powered by organizational knowledge, AI employees, and research tools.
          </p>
        </div>

        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                }`}
              >
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </div>

        {errorText && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorText}</div>
        )}

        {activeTab === 'run' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold">Launch Research Request</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Research Type</label>
                  <select
                    value={researchType}
                    onChange={(e) => setResearchType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm"
                  >
                    {Object.keys(templates).map((key) => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={useBrowser} onChange={(e) => setUseBrowser(e.target.checked)} />
                    Include browser extraction (if URL in request)
                  </label>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); runResearch(requestText); }} className="flex gap-2">
                <input
                  required
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  placeholder="e.g. Analyze the AI market in India..."
                  disabled={runMutation.isPending}
                  className="flex-1 px-4 py-3 border border-border rounded-xl bg-input text-sm"
                />
                <button
                  type="submit"
                  disabled={runMutation.isPending || !requestText.trim()}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {runMutation.isPending ? <Loader className="animate-spin" size={16} /> : <Compass size={16} />}
                  Run
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(templates).map(([key, tpl]) => (
                <div key={key} className="bg-card border border-border rounded-xl p-5 space-y-2">
                  <h3 className="font-bold text-sm">{key}</h3>
                  <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  <button
                    onClick={() => runResearch(tpl.example, key)}
                    disabled={runMutation.isPending}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Use template →
                  </button>
                </div>
              ))}
            </div>

            {runMutation.isPending && (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Loader className="animate-spin text-primary mx-auto mb-3" size={32} />
                <p className="text-sm font-medium">Running multi-agent research pipeline...</p>
                <p className="text-xs text-muted-foreground mt-1">Research → Analyst → Reviewer → Documentation agents</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-4">
            {reportsLoading ? (
              <Loader className="animate-spin text-primary mx-auto" size={24} />
            ) : reports.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                No saved reports yet. Run a research request to build your library.
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <Link to={`/research/${report.id}`} className="font-bold text-foreground hover:text-primary">
                        {report.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.research_type} • {report.status} • {report.confidence_score != null ? `${report.confidence_score}% confidence` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleDownload(report)} className="p-1.5 hover:bg-secondary rounded-lg"><Download size={16} /></button>
                      <button onClick={() => window.confirm('Delete?') && deleteMutation.mutate(report.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {report.summary && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{report.summary}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Total Reports', metrics.total_reports ?? 0],
              ['Completed', metrics.completed_reports ?? 0],
              ['Success Rate', `${metrics.success_rate ?? 0}%`],
              ['Avg Generation Time', metrics.average_execution_time_ms ? `${(metrics.average_execution_time_ms / 1000).toFixed(1)}s` : '—'],
              ['Failed', metrics.failed_reports ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground uppercase">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>
        )}

        {latestReport && activeTab === 'library' && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
            Latest report saved. <Link to={`/research/${latestReport.id}`} className="text-primary font-semibold hover:underline">View full report →</Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
