import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { aiEmployeesAPI } from '../../api/aiEmployees';
import { departmentsAPI } from '../../api/departments';
import { knowledgeAPI } from '../../api/knowledge';
import {
  ArrowLeft,
  Bot,
  BarChart3,
  History,
  Play,
  Power,
  Trash2,
  Edit,
  Loader,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [runResult, setRunResult] = useState(null);
  const [errorText, setErrorText] = useState('');

  const { data: employeeRes, isLoading } = useQuery({
    queryKey: ['ai-employee', id],
    queryFn: () => aiEmployeesAPI.get(id),
  });
  const { data: runsRes } = useQuery({
    queryKey: ['ai-employee-runs', id],
    queryFn: () => aiEmployeesAPI.listRuns(id, { limit: 50 }),
    enabled: activeTab === 'history' || activeTab === 'overview',
  });
  const { data: metricsRes } = useQuery({
    queryKey: ['ai-employee-metrics', id],
    queryFn: () => aiEmployeesAPI.getMetrics(id),
    enabled: activeTab === 'metrics' || activeTab === 'overview',
  });
  const { data: configRes } = useQuery({
    queryKey: ['ai-employees-config'],
    queryFn: () => aiEmployeesAPI.getConfig(),
  });
  const { data: deptRes } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsAPI.list(),
  });
  const { data: docsRes } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => knowledgeAPI.listDocuments(),
  });

  const employee = employeeRes?.data;
  const data = employee?.data || {};
  const runs = runsRes?.data || [];
  const metrics = metricsRes?.data || data.metrics || {};
  const config = configRes?.data || {};
  const departments = deptRes?.data || [];
  const documents = docsRes?.data || [];

  const [editForm, setEditForm] = useState(null);

  React.useEffect(() => {
    if (employee && !editForm) {
      setEditForm({
        title: employee.title,
        role: data.role,
        department_id: data.department_id || '',
        model: data.model || config.models?.[0] || '',
        instructions: data.instructions || '',
        tools: data.tools || [],
        knowledge_document_ids: data.knowledge_document_ids || [],
      });
    }
  }, [employee, data, config.models, editForm]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-employee', id] });
    queryClient.invalidateQueries({ queryKey: ['ai-employees'] });
    queryClient.invalidateQueries({ queryKey: ['ai-employee-runs', id] });
    queryClient.invalidateQueries({ queryKey: ['ai-employee-metrics', id] });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      aiEmployeesAPI.update(id, {
        title: editForm.title,
        data: {
          role: editForm.role,
          department_id: editForm.department_id ? Number(editForm.department_id) : null,
          model: editForm.model,
          instructions: editForm.instructions,
          tools: editForm.tools,
          knowledge_document_ids: editForm.knowledge_document_ids.map(Number),
        },
      }),
    onSuccess: () => {
      invalidate();
      setIsEditing(false);
      setErrorText('');
    },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Update failed'),
  });

  const enableMutation = useMutation({
    mutationFn: () => aiEmployeesAPI.enable(id),
    onSuccess: invalidate,
  });
  const disableMutation = useMutation({
    mutationFn: () => aiEmployeesAPI.disable(id),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: () => aiEmployeesAPI.delete(id),
    onSuccess: () => navigate('/employees'),
  });
  const runMutation = useMutation({
    mutationFn: (task) => aiEmployeesAPI.run(id, task),
    onSuccess: (res) => {
      setRunResult(res.data);
      setTaskInput('');
      invalidate();
    },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Task execution failed'),
  });

  const toggleTool = (tool) => {
    setEditForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter((t) => t !== tool)
        : [...prev.tools, tool],
    }));
  };

  const toggleDocument = (docId) => {
    setEditForm((prev) => ({
      ...prev,
      knowledge_document_ids: prev.knowledge_document_ids.includes(docId)
        ? prev.knowledge_document_ids.filter((d) => d !== docId)
        : [...prev.knowledge_document_ids, docId],
    }));
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-primary" size={32} />
        </div>
      </MainLayout>
    );
  }

  if (!employee) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">AI employee not found.</p>
          <Link to="/employees" className="text-primary mt-4 inline-block hover:underline">
            Back to studio
          </Link>
        </div>
      </MainLayout>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Bot },
    { id: 'history', label: 'Run History', icon: History },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/employees" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{employee.title}</h1>
            <p className="text-sm text-muted-foreground">
              {data.role} • {data.department || 'No department'} • {employee.status}
            </p>
          </div>
          <div className="flex gap-2">
            {employee.status === 'Active' ? (
              <button
                onClick={() => disableMutation.mutate()}
                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-secondary"
              >
                <Power size={14} />
                Disable
              </button>
            ) : (
              <button
                onClick={() => enableMutation.mutate()}
                className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-secondary"
              >
                <Power size={14} />
                Enable
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm('Soft-delete this AI employee?')) deleteMutation.mutate();
              }}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium ${
              isEditing ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit size={16} />
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </button>
        </div>

        {errorText && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorText}
          </div>
        )}

        {isEditing && editForm && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Edit AI Employee</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm"
                >
                  {(config.employee_types || []).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select
                  value={editForm.department_id}
                  onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm"
                >
                  <option value="">No department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={editForm.model}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm"
                >
                  {(config.models || []).map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Instructions</label>
              <textarea
                rows={4}
                value={editForm.instructions}
                onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tools</label>
              <div className="grid grid-cols-2 gap-2">
                {(config.tools || []).map((tool) => (
                  <label key={tool} className="flex items-center gap-2 p-2 border border-border rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.tools.includes(tool)}
                      onChange={() => toggleTool(tool)}
                    />
                    <span className="text-sm">{tool}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Knowledge Documents</label>
              <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                {documents.map((doc) => (
                  <label key={doc.id} className="flex items-center gap-2 p-1.5 cursor-pointer hover:bg-secondary/40 rounded">
                    <input
                      type="checkbox"
                      checked={editForm.knowledge_document_ids.includes(doc.id)}
                      onChange={() => toggleDocument(doc.id)}
                    />
                    <span className="text-sm">{doc.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Runs', value: metrics.total_runs ?? 0 },
                { label: 'Successful', value: metrics.successful_runs ?? 0 },
                { label: 'Failed', value: metrics.failed_runs ?? 0 },
                {
                  label: 'Avg Time',
                  value: metrics.average_execution_time_ms
                    ? `${metrics.average_execution_time_ms}ms`
                    : '—',
                },
              ].map((item) => (
                <div key={item.label} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground uppercase">{item.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <h3 className="font-semibold text-foreground">Instructions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.instructions}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {(data.tools || []).map((tool) => (
                  <span key={tool} className="text-xs bg-secondary px-2.5 py-1 rounded-lg border border-border">
                    {tool}
                  </span>
                ))}
              </div>
              {data.knowledge_document_ids?.length > 0 && (
                <p className="text-xs text-muted-foreground pt-2">
                  Scoped to {data.knowledge_document_ids.length} knowledge document(s)
                </p>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Play size={18} className="text-primary" />
                Assign Task
              </h3>
              <textarea
                rows={3}
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Describe the task for this AI employee..."
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-sm resize-none"
              />
              <button
                onClick={() => taskInput.trim() && runMutation.mutate(taskInput.trim())}
                disabled={runMutation.isPending || !taskInput.trim()}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {runMutation.isPending ? <Loader className="animate-spin" size={16} /> : <Play size={16} />}
                Run Task
              </button>
              {runResult && (
                <div className="mt-4 p-4 bg-secondary/30 border border-border rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {runResult.status === 'completed' ? (
                      <CheckCircle2 size={16} className="text-green-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    <span className="font-medium">{runResult.status}</span>
                    {runResult.execution_time_ms && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {runResult.execution_time_ms}ms
                      </span>
                    )}
                  </div>
                  {(runResult.tools_used || []).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tools: {runResult.tools_used.join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{runResult.output}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {runs.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">No runs yet.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="p-5 space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-sm font-medium text-foreground">{run.task}</p>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        run.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {run.output}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {run.created_at && <span>{new Date(run.created_at).toLocaleString()}</span>}
                    {run.execution_time_ms != null && <span>{run.execution_time_ms}ms</span>}
                    {(run.tools_used || []).length > 0 && (
                      <span>Tools: {run.tools_used.join(', ')}</span>
                    )}
                    {run.token_usage?.total_tokens > 0 && (
                      <span>{run.token_usage.total_tokens} tokens</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Run Statistics</h3>
              {[
                ['Total Runs', metrics.total_runs ?? 0],
                ['Successful', metrics.successful_runs ?? 0],
                ['Failed', metrics.failed_runs ?? 0],
                ['Avg Execution', metrics.average_execution_time_ms ? `${metrics.average_execution_time_ms}ms` : '—'],
                ['Last Run', metrics.last_run_at ? new Date(metrics.last_run_at).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Most Used Tools</h3>
              {(metrics.most_used_tools || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No tool usage recorded yet.</p>
              ) : (
                metrics.most_used_tools.map((item) => (
                  <div key={item.tool} className="flex justify-between text-sm">
                    <span className="text-foreground">{item.tool}</span>
                    <span className="text-muted-foreground">{item.count} runs</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
