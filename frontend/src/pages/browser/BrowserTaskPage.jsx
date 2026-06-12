import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { browserAPI } from '../../api/browser';
import { ArrowLeft, Download, Loader, Terminal, Trash2, Table } from 'lucide-react';
import { appPageShell, appPageTitle, appPageDesc, appGlassCard, appBtnGhost, appBtnIconDanger, appTableWrap, appTableHead, appTh, appTr, appTd, appEmpty, appBadgeInfo } from '../../styles/appStyles';

export default function BrowserTaskPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: taskRes, isLoading } = useQuery({
    queryKey: ['browser-task', id],
    queryFn: () => browserAPI.getTask(id),
  });
  const task = taskRes?.data;

  const deleteMutation = useMutation({
    mutationFn: () => browserAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browser-tasks'] });
      window.location.href = '/browser-automation';
    },
  });

  const handleDownload = () => {
    if (!task?.results?.length) return;
    const keys = Object.keys(task.results[0]);
    let csv = keys.join(',') + '\n';
    task.results.forEach((row) => {
      csv += keys.map((k) => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const element = document.createElement('a');
    element.href = encodeURI(`data:text/csv;charset=utf-8,${csv}`);
    element.download = `browser_task_${id}.csv`;
    element.click();
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-[#1A1A14]" size={32} />
        </div>
      </MainLayout>
    );
  }

  if (!task) {
    return (
      <MainLayout>
        <div className={appEmpty}>
          <p>Task not found.</p>
          <Link to="/browser-automation" className="text-[#1A1A14] mt-4 inline-block font-medium hover:underline">Back to tasks</Link>
        </div>
      </MainLayout>
    );
  }

  const columns = task.results?.length ? Object.keys(task.results[0]) : [];

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link to="/browser-automation" className="text-[#6A6A60] hover:text-[#1A1A14] transition p-1 rounded-lg hover:bg-[#1A1A14]/5">
              <ArrowLeft size={20} />
            </Link>
            <div className="min-w-0">
              <h1 className={`${appPageTitle} !text-xl sm:!text-2xl truncate`}>{task.title}</h1>
              <p className={appPageDesc}>
                <span className={appBadgeInfo}>{task.task_type}</span>
                <span className="mx-2">•</span>
                {task.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleDownload} className={`${appBtnGhost} !text-xs !py-2`}>
              <Download size={14} /> Export CSV
            </button>
            <button onClick={() => window.confirm('Delete?') && deleteMutation.mutate()} className={appBtnIconDanger}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {task.summary && (
          <div className={`${appGlassCard} text-sm text-[#6A6A60]`}>{task.summary}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-[#1A1A14] text-emerald-400 rounded-2xl p-4 font-mono text-xs h-64 overflow-y-auto border border-[#1A1A14]/20">
            <div className="flex items-center gap-1 text-[#6A6A60] mb-2 font-sans"><Terminal size={14} /> Logs</div>
            {(task.logs || []).map((log, i) => <div key={i}>{log}</div>)}
            {(task.errors || []).map((err, i) => <div key={`e-${i}`} className="text-red-400">{err}</div>)}
          </div>

          <div className={`lg:col-span-2 ${appGlassCard}`}>
            <h2 className="font-semibold text-sm text-[#1A1A14] mb-3 flex items-center gap-2">
              <Table size={16} /> Extracted Data ({task.results?.length || 0})
            </h2>
            {!task.results?.length ? (
              <p className="text-sm text-[#6A6A60]">No structured records extracted.</p>
            ) : (
              <div className={`${appTableWrap} !shadow-none overflow-x-auto max-h-64 overflow-y-auto`}>
                <table className="w-full text-xs min-w-[400px]">
                  <thead className={appTableHead}>
                    <tr>
                      {columns.map((col) => <th key={col} className={appTh}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {task.results.map((row, i) => (
                      <tr key={i} className={appTr}>
                        {columns.map((col) => <td key={col} className={appTd}>{String(row[col] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {task.report_text && (
          <div className={appGlassCard}>
            <h2 className="font-semibold text-[#1A1A14] mb-2">Report</h2>
            <pre className="text-xs text-[#6A6A60] whitespace-pre-wrap">{task.report_text}</pre>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
