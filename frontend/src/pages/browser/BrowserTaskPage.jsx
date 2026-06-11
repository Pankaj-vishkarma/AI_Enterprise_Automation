import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { browserAPI } from '../../api/browser';
import { ArrowLeft, Download, Loader, Terminal, Trash2, Table } from 'lucide-react';

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
        <div className="flex justify-center py-16"><Loader className="animate-spin text-primary" size={32} /></div>
      </MainLayout>
    );
  }

  if (!task) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Task not found.</p>
          <Link to="/browser-automation" className="text-primary mt-4 inline-block hover:underline">Back</Link>
        </div>
      </MainLayout>
    );
  }

  const columns = task.results?.length ? Object.keys(task.results[0]) : [];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/browser-automation" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={20} /></Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <p className="text-sm text-muted-foreground">{task.task_type} • {task.status}</p>
          </div>
          <button onClick={handleDownload} className="text-xs border border-border px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => window.confirm('Delete?') && deleteMutation.mutate()} className="text-red-600 p-1.5">
            <Trash2 size={16} />
          </button>
        </div>

        {task.summary && (
          <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">{task.summary}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#0f172a] text-green-400 rounded-xl p-4 font-mono text-xs h-64 overflow-y-auto">
            <div className="flex items-center gap-1 text-slate-400 mb-2 font-sans"><Terminal size={14} /> Logs</div>
            {(task.logs || []).map((log, i) => <div key={i}>{log}</div>)}
            {(task.errors || []).map((err, i) => <div key={`e-${i}`} className="text-red-400">{err}</div>)}
          </div>

          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Table size={16} /> Extracted Data ({task.results?.length || 0})</h2>
            {!task.results?.length ? (
              <p className="text-sm text-muted-foreground">No structured records extracted.</p>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary">
                      {columns.map((col) => <th key={col} className="p-2 text-left">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {task.results.map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        {columns.map((col) => <td key={col} className="p-2">{String(row[col] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {task.report_text && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-2">Report</h2>
            <pre className="text-xs whitespace-pre-wrap">{task.report_text}</pre>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
