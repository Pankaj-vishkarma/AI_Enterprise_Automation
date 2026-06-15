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
import { appPageShell, appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appBtnPrimary, appBtnGhost, appBtnIcon, appError, appEmpty, appLoading, appInputPlain, appSelect, appLabel, appBadgeActive, appBadgeError, appBadgeInfo, appTabActive, appTabInactive } from '../../styles/appStyles';
import { applyRunToQueryCache } from './aiEmployeeCache';

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
    enabled: activeTab === 'history',
  });
  const { data: metricsRes } = useQuery({
    queryKey: ['ai-employee-metrics', id],
    queryFn: () => aiEmployeesAPI.getMetrics(id),
    enabled: activeTab === 'metrics',
  });
  const { data: configRes, isLoading: isConfigLoading } = useQuery({
    queryKey: ['ai-employees-config'],
    queryFn: () => aiEmployeesAPI.getConfig(),
    enabled: isEditing,
  });
  const { data: deptRes, isLoading: isDeptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsAPI.list(),
    enabled: isEditing,
  });
  const { data: docsRes, isLoading: isDocsLoading } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => knowledgeAPI.listDocuments(),
    enabled: isEditing,
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
    if (!employee || !isEditing) return;
    setEditForm({
      title: employee.title,
      role: data.role,
      department_id: data.department_id || '',
      model: data.model || config.models?.[0] || '',
      instructions: data.instructions || '',
      tools: data.tools || [],
      knowledge_document_ids: data.knowledge_document_ids || [],
    });
  }, [employee, isEditing, data.role, data.department_id, data.model, data.instructions, data.tools, data.knowledge_document_ids, config.models]);

  const invalidateEmployee = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-employee', id] });
  };

  const invalidateEmployeeAndStudio = () => {
    invalidateEmployee();
    queryClient.invalidateQueries({ queryKey: ['ai-employees'] });
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
      invalidateEmployeeAndStudio();
      setIsEditing(false);
      setEditForm(null);
      setErrorText('');
    },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Update failed'),
  });

  const enableMutation = useMutation({
    mutationFn: () => aiEmployeesAPI.enable(id),
    onSuccess: invalidateEmployeeAndStudio,
  });
  const disableMutation = useMutation({
    mutationFn: () => aiEmployeesAPI.disable(id),
    onSuccess: invalidateEmployeeAndStudio,
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
      applyRunToQueryCache(queryClient, id, res.data);
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
        <div className={appLoading}>
          <Loader className="animate-spin text-[#1A1A14] mx-auto" size={32} />
        </div>
      </MainLayout>
    );
  }

  if (!employee) {
    return (
      <MainLayout>
        <div className={`${appEmpty} py-16`}>
          <p className="text-[#6A6A60]">AI employee not found.</p>
          <Link to="/employees" className="text-[#1A1A14] mt-4 inline-block hover:underline font-medium">
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
      <div className={appPageShell}>
        <div className="flex items-center gap-3">
          <Link to="/employees" className={appBtnIcon}>
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className={appPageTitle}>{employee.title}</h1>
            <p className={`${appPageDesc} !mt-1`}>
              {data.role} • {data.department || 'No department'} • {employee.status}
            </p>
          </div>
          <div className="flex gap-2">
            {employee.status === 'Active' ? (
              <button
                onClick={() => disableMutation.mutate()}
                className={`${appBtnGhost} !py-2 !px-3 !text-sm`}
              >
                <Power size={14} />
                Disable
              </button>
            ) : (
              <button
                onClick={() => enableMutation.mutate()}
                className={`${appBtnGhost} !py-2 !px-3 !text-sm`}
              >
                <Power size={14} />
                Enable
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm('Soft-delete this AI employee?')) deleteMutation.mutate();
              }}
              className={`${appBtnGhost} !py-2 !px-3 !text-sm !text-red-600 !border-red-200 hover:!bg-red-50`}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
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
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => {
              if (isEditing) {
                setEditForm(null);
              }
              setIsEditing(!isEditing);
            }}
            className={`ml-auto px-4 py-2 text-sm flex items-center gap-2 ${
              isEditing ? appTabActive : appTabInactive
            }`}
          >
            <Edit size={16} />
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </button>
        </div>

        {errorText && <div className={appError}>{errorText}</div>}

        {isEditing && editForm && (
          <div className={`${appGlassCard} space-y-4`}>
            <h2 className={appSectionTitle}>Edit AI Employee</h2>
            {(isConfigLoading || isDeptLoading || isDocsLoading) && (
              <div className="flex justify-center py-4">
                <Loader className="animate-spin text-[#1A1A14]" size={24} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={appLabel}>Name</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className={appInputPlain}
                />
              </div>
              <div>
                <label className={appLabel}>Type</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className={appSelect}
                >
                  {(config.employee_types || []).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={appLabel}>Department</label>
                <select
                  value={editForm.department_id}
                  onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                  className={appSelect}
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
                <label className={appLabel}>Model</label>
                <select
                  value={editForm.model}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                  className={appSelect}
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
              <label className={appLabel}>Instructions</label>
              <textarea
                rows={4}
                value={editForm.instructions}
                onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                className={`${appInputPlain} resize-none`}
              />
            </div>
            <div>
              <label className={appLabel}>Tools</label>
              <div className="grid grid-cols-2 gap-2">
                {(config.tools || []).map((tool) => (
                  <label
                    key={tool}
                    className="flex items-center gap-2 p-2 border border-[#1A1A14]/10 rounded-xl cursor-pointer hover:bg-[#1A1A14]/[0.03]"
                  >
                    <input
                      type="checkbox"
                      checked={editForm.tools.includes(tool)}
                      onChange={() => toggleTool(tool)}
                    />
                    <span className="text-sm text-[#1A1A14]">{tool}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={appLabel}>Knowledge Documents</label>
              <div className="max-h-32 overflow-y-auto border border-[#1A1A14]/10 rounded-xl p-2 space-y-1">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 p-1.5 cursor-pointer hover:bg-[#1A1A14]/[0.03] rounded-lg"
                  >
                    <input
                      type="checkbox"
                      checked={editForm.knowledge_document_ids.includes(doc.id)}
                      onChange={() => toggleDocument(doc.id)}
                    />
                    <span className="text-sm text-[#1A1A14]">{doc.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className={appBtnPrimary}
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
                <div key={item.label} className={appGlassCard}>
                  <p className="text-xs text-[#6A6A60] uppercase">{item.label}</p>
                  <p className="text-2xl font-bold text-[#1A1A14] mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            <div className={`${appGlassCard} space-y-3`}>
              <h3 className={appSectionTitle}>Instructions</h3>
              <p className="text-sm text-[#6A6A60] whitespace-pre-wrap">{data.instructions}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {(data.tools || []).map((tool) => (
                  <span key={tool} className={appBadgeInfo}>
                    {tool}
                  </span>
                ))}
              </div>
              {data.knowledge_document_ids?.length > 0 && (
                <p className="text-xs text-[#6A6A60] pt-2">
                  Scoped to {data.knowledge_document_ids.length} knowledge document(s)
                </p>
              )}
            </div>

            <div className={`${appGlassCard} space-y-4`}>
              <h3 className={`${appSectionTitle} flex items-center gap-2`}>
                <Play size={18} className="text-[#1A1A14]" />
                Assign Task
              </h3>
              <textarea
                rows={3}
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Describe the task for this AI employee..."
                className={`${appInputPlain} resize-none`}
              />
              <button
                onClick={() => taskInput.trim() && runMutation.mutate(taskInput.trim())}
                disabled={runMutation.isPending || !taskInput.trim()}
                className={appBtnPrimary}
              >
                {runMutation.isPending ? <Loader className="animate-spin" size={16} /> : <Play size={16} />}
                Run Task
              </button>
              {runResult && (
                <div className="mt-4 p-4 bg-[#1A1A14]/[0.03] border border-[#1A1A14]/10 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {runResult.status === 'completed' ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <XCircle size={16} className="text-red-600" />
                    )}
                    <span className="font-medium text-[#1A1A14]">{runResult.status}</span>
                    {runResult.execution_time_ms && (
                      <span className="text-[#6A6A60] flex items-center gap-1">
                        <Clock size={12} />
                        {runResult.execution_time_ms}ms
                      </span>
                    )}
                  </div>
                  {(runResult.tools_used || []).length > 0 && (
                    <p className="text-xs text-[#6A6A60]">
                      Tools: {runResult.tools_used.join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-[#1A1A14] whitespace-pre-wrap">{runResult.output}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className={`${appGlassCard} !p-0 divide-y divide-[#1A1A14]/10 overflow-hidden`}>
            {runs.length === 0 ? (
              <p className={appEmpty}>No runs yet.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="p-5 space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-sm font-medium text-[#1A1A14]">{run.task}</p>
                    <span
                      className={
                        run.status === 'completed' ? appBadgeActive : appBadgeError
                      }
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#6A6A60] line-clamp-3 whitespace-pre-wrap">
                    {run.output}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-[#6A6A60]">
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
            <div className={`${appGlassCard} space-y-4`}>
              <h3 className={appSectionTitle}>Run Statistics</h3>
              {[
                ['Total Runs', metrics.total_runs ?? 0],
                ['Successful', metrics.successful_runs ?? 0],
                ['Failed', metrics.failed_runs ?? 0],
                ['Avg Execution', metrics.average_execution_time_ms ? `${metrics.average_execution_time_ms}ms` : '—'],
                ['Last Run', metrics.last_run_at ? new Date(metrics.last_run_at).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[#6A6A60]">{label}</span>
                  <span className="font-medium text-[#1A1A14]">{value}</span>
                </div>
              ))}
            </div>
            <div className={`${appGlassCard} space-y-4`}>
              <h3 className={appSectionTitle}>Most Used Tools</h3>
              {(metrics.most_used_tools || []).length === 0 ? (
                <p className="text-sm text-[#6A6A60]">No tool usage recorded yet.</p>
              ) : (
                metrics.most_used_tools.map((item) => (
                  <div key={item.tool} className="flex justify-between text-sm">
                    <span className="text-[#1A1A14]">{item.tool}</span>
                    <span className="text-[#6A6A60]">{item.count} runs</span>
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
