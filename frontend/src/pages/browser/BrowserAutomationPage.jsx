import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { browserAPI } from '../../api/browser';
import { formatApiError } from '../../utils/apiError';
import {
  Globe, Play, Loader, Terminal, Table, Download, Search, BarChart3, History, Trash2,
} from 'lucide-react';
import {
  appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appInputWithIcon, appSelect,
  appBtnPrimary, appBtnGhost, appBtnIcon, appBtnIconDanger, appError, appEmpty, appLoading,
  appTabActive, appTabInactive, appLabel, appTableWrap, appTableHead, appTh, appTr, appTd,
} from '../../styles/appStyles';

export default function BrowserAutomationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('run');
  const [instruction, setInstruction] = useState('Find React developer jobs at https://example.com/careers');
  const [taskType, setTaskType] = useState('job_search');
  const [errorText, setErrorText] = useState('');
  const [activeTask, setActiveTask] = useState(null);

  const { data: templatesRes } = useQuery({
    queryKey: ['browser-templates'],
    queryFn: () => browserAPI.getTemplates(),
  });
  const { data: tasksRes, isLoading } = useQuery({
    queryKey: ['browser-tasks'],
    queryFn: () => browserAPI.listTasks({ limit: 50 }),
  });
  const { data: metricsRes } = useQuery({
    queryKey: ['browser-metrics'],
    queryFn: () => browserAPI.getMetrics(),
  });

  const templates = templatesRes?.data || {};
  const tasks = tasksRes?.data || [];
  const metrics = metricsRes?.data || {};

  const runMutation = useMutation({
    mutationFn: (payload) => browserAPI.run(payload),
    onSuccess: (res) => {
      setActiveTask(res.data);
      setErrorText('');
      queryClient.invalidateQueries({ queryKey: ['browser-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['browser-metrics'] });
      setActiveTab('history');
    },
    onError: (err) => setErrorText(formatApiError(err, 'Browser task failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => browserAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['browser-tasks'] }),
  });

  const runTask = (text, type = taskType) => {
    if (!text.trim() || runMutation.isPending) return;
    setInstruction(text);
    setTaskType(type);
    runMutation.mutate({ instruction: text, task_type: type });
  };

  const handleDownload = (task) => {
    const results = task?.results || [];
    if (!results.length) return;
    const keys = Object.keys(results[0]);
    let csv = keys.join(',') + '\n';
    results.forEach((row) => {
      csv += keys.map((k) => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const element = document.createElement('a');
    element.href = encodeURI(`data:text/csv;charset=utf-8,${csv}`);
    element.download = `browser_export_${task.id || 'data'}.csv`;
    element.click();
  };

  const displayTask = activeTask;
  const results = displayTask?.results || [];
  const columns = results.length ? Object.keys(results[0]) : [];

  const tabs = [
    { id: 'run', label: 'New Task', icon: Play },
    { id: 'history', label: 'Task History', icon: History },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className={`${appPageTitle} flex items-center gap-2`}>
            <Globe size={32} className="text-[#1A1A14]" />
            Browser Automation Hub
          </h1>
          <p className={appPageDesc}>
            Automate web extraction with Playwright — jobs, pricing, tables, forms, and competitor research.
          </p>
        </div>

        <div className="flex gap-2 border-b border-[#1A1A14]/10 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm ${activeTab === tab.id ? appTabActive : appTabInactive}`}
              >
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </div>

        {errorText && (
          <div className={appError}>{errorText}</div>
        )}

        {activeTab === 'run' && (
          <div className="space-y-4">
            <div className={`${appGlassCard} space-y-4`}>
              <h2 className={appSectionTitle}>Launch Automated Browser Task</h2>
              <div>
                <label className={appLabel}>Task Type</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className={appSelect}
                >
                  {Object.entries(templates).map(([key, tpl]) => (
                    <option key={key} value={tpl.task_type || key}>{key.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-[#6A6A60]" size={20} />
                  <input
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    disabled={runMutation.isPending}
                    placeholder="Include a public https:// URL in your instruction..."
                    className={appInputWithIcon}
                  />
                </div>
                <button
                  onClick={() => runTask(instruction)}
                  disabled={runMutation.isPending || !instruction.trim()}
                  className={appBtnPrimary}
                >
                  {runMutation.isPending ? <Loader className="animate-spin" size={16} /> : <Play size={16} />}
                  Execute
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(templates).map(([key, tpl]) => (
                <div key={key} className={`${appGlassCard} space-y-2`}>
                  <h3 className="font-bold text-sm text-[#1A1A14] capitalize">{key.replace(/_/g, ' ')}</h3>
                  <p className="text-xs text-[#6A6A60]">{tpl.description}</p>
                  <button
                    onClick={() => runTask(tpl.example, tpl.task_type || key)}
                    disabled={runMutation.isPending}
                    className="text-xs text-[#1A1A14] font-semibold hover:underline"
                  >
                    Use template →
                  </button>
                </div>
              ))}
            </div>

            {runMutation.isPending && (
              <div className={appLoading}>
                <Loader className="animate-spin text-[#1A1A14] mx-auto mb-2" size={32} />
                <p className="text-sm text-[#6A6A60]">Playwright is navigating and extracting data...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader className="animate-spin text-[#1A1A14]" size={24} />
              </div>
            ) : tasks.length === 0 ? (
              <div className={`${appGlassCard} ${appEmpty}`}>
                No browser tasks yet. Run a task with a public URL.
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className={appGlassCard}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <Link to={`/browser-automation/${task.id}`} className="font-bold text-[#1A1A14] hover:underline">{task.title}</Link>
                      <p className="text-xs text-[#6A6A60] mt-1">
                        {task.task_type} • {task.status} • {task.results?.length || 0} records
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleDownload(task)} className={appBtnIcon}><Download size={16} /></button>
                      <button onClick={() => window.confirm('Delete?') && deleteMutation.mutate(task.id)} className={appBtnIconDanger}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Total Tasks', metrics.total_tasks ?? 0],
              ['Completed', metrics.completed_tasks ?? 0],
              ['Success Rate', `${metrics.success_rate ?? 0}%`],
              ['Avg Time', metrics.average_execution_time_ms ? `${(metrics.average_execution_time_ms / 1000).toFixed(1)}s` : '—'],
            ].map(([label, value]) => (
              <div key={label} className={appGlassCard}>
                <p className="text-xs text-[#6A6A60] uppercase">{label}</p>
                <p className="text-2xl font-bold mt-1 text-[#1A1A14]">{value}</p>
              </div>
            ))}
          </div>
        )}

        {displayTask && activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#1A1A14] text-emerald-400 rounded-2xl p-4 font-mono text-xs h-48 overflow-y-auto border border-[#1A1A14]/20">
              <div className="flex items-center gap-1 text-[#6A6A60] mb-2 font-sans"><Terminal size={14} /> Latest Logs</div>
              {(displayTask.logs || []).map((log, i) => <div key={i}>{log}</div>)}
            </div>
            <div className={`lg:col-span-2 ${appGlassCard}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm text-[#1A1A14] flex items-center gap-2"><Table size={16} /> Results</h3>
                {results.length > 0 && (
                  <button onClick={() => handleDownload(displayTask)} className={`${appBtnGhost} !text-xs !py-1.5`}>
                    <Download size={12} /> CSV
                  </button>
                )}
              </div>
              {results.length === 0 ? (
                <p className="text-sm text-[#6A6A60]">No records extracted. Ensure your instruction includes a public URL.</p>
              ) : (
                <div className={`${appTableWrap} !shadow-none overflow-x-auto max-h-48 overflow-y-auto`}>
                  <table className="w-full text-xs">
                    <thead className={appTableHead}>
                      <tr>{columns.map((c) => <th key={c} className={appTh}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} className={appTr}>
                          {columns.map((c) => <td key={c} className={appTd}>{String(row[c] ?? '').slice(0, 80)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
