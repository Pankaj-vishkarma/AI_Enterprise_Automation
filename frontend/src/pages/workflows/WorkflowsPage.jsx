import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { workflowsAPI } from '../../api/workflows';
import { usersAPI } from '../../api/users';
import { departmentsAPI } from '../../api/departments';
import { teamsAPI } from '../../api/teams';
import { aiEmployeesAPI } from '../../api/aiEmployees';
import {
  Layers, Plus, Play, BarChart3, History, X, Loader, Trash2, Power, Edit,
} from 'lucide-react';
import {
  appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appInputPlain, appSelect,
  appBtnPrimary, appBtnGhost, appBtnIcon, appBtnIconDanger, appError, appEmpty, appLoading,
  appModalOverlay, appModal, appLabel, appTabActive, appTabInactive,
  appBadgeActive, appBadgeInactive, appBadgeWarning,
} from '../../styles/appStyles';

const emptyStep = () => ({
  name: '', step_type: 'approval', assignee_type: 'user', assignee_id: '', position: 0,
});

const emptyForm = {
  id: null, name: '', description: '', category: 'Custom', status: 'draft', steps: [emptyStep()],
};

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('instances');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [startModal, setStartModal] = useState({ open: false, workflowId: null, title: '' });
  const [errorText, setErrorText] = useState('');

  const { data: workflowsRes, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsAPI.list(),
  });
  const { data: instancesRes } = useQuery({
    queryKey: ['workflow-instances'],
    queryFn: () => workflowsAPI.listInstances({ limit: 50 }),
  });
  const { data: metricsRes } = useQuery({
    queryKey: ['workflow-metrics'],
    queryFn: () => workflowsAPI.getMetrics(),
  });
  const { data: templatesRes } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowsAPI.getTemplates(),
  });
  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => usersAPI.list() });
  const { data: deptRes } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsAPI.list() });
  const { data: teamsRes } = useQuery({ queryKey: ['teams'], queryFn: () => teamsAPI.list() });
  const { data: employeesRes } = useQuery({ queryKey: ['ai-employees'], queryFn: () => aiEmployeesAPI.list() });

  const workflows = workflowsRes?.data || [];
  const instances = instancesRes?.data || [];
  const metrics = metricsRes?.data || {};
  const templates = templatesRes?.data || {};
  const users = usersRes?.data || [];
  const departments = deptRes?.data || [];
  const teams = teamsRes?.data || [];
  const employees = employeesRes?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-metrics'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        category: form.category,
        status: form.status,
        steps: form.steps.map((s, i) => ({
          name: s.name,
          step_type: s.step_type,
          assignee_type: s.assignee_type || null,
          assignee_id: s.assignee_id ? Number(s.assignee_id) : null,
          position: i,
        })),
      };
      return form.id ? workflowsAPI.update(form.id, payload) : workflowsAPI.create(payload);
    },
    onSuccess: () => { invalidate(); setIsModalOpen(false); setForm(emptyForm); setErrorText(''); },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Unable to save workflow'),
  });

  const startMutation = useMutation({
    mutationFn: () => workflowsAPI.start(startModal.workflowId, startModal.title),
    onSuccess: () => {
      invalidate();
      setStartModal({ open: false, workflowId: null, title: '' });
      setActiveTab('instances');
    },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Unable to start workflow'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => workflowsAPI.delete(id),
    onSuccess: invalidate,
  });

  const disableMutation = useMutation({
    mutationFn: (id) => workflowsAPI.disable(id),
    onSuccess: invalidate,
  });

  const activateWorkflow = (id) =>
    workflowsAPI.update(id, { status: 'active' }).then(() => invalidate());

  const openBuilder = (workflow = null, templateKey = null) => {
    if (templateKey && templates[templateKey]) {
      const tpl = templates[templateKey];
      setForm({
        ...emptyForm,
        name: templateKey,
        description: tpl.description,
        category: templateKey,
        status: 'draft',
        steps: tpl.steps.map((s, i) => ({ ...emptyStep(), ...s, position: i, assignee_id: '' })),
      });
    } else if (workflow) {
      setForm({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        category: workflow.category,
        status: workflow.status,
        steps: (workflow.steps || []).map((s) => ({
          name: s.name,
          step_type: s.step_type,
          assignee_type: s.assignee_type || 'user',
          assignee_id: s.assignee_id || '',
        })),
      });
    } else {
      setForm({ ...emptyForm, steps: [emptyStep()] });
    }
    setErrorText('');
    setIsModalOpen(true);
  };

  const updateStep = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const assigneeOptions = (type) => {
    if (type === 'user') return users.map((u) => ({ id: u.id, label: `${u.first_name} ${u.last_name}` }));
    if (type === 'department') return departments.map((d) => ({ id: d.id, label: d.name }));
    if (type === 'team') return teams.map((t) => ({ id: t.id, label: t.name }));
    if (type === 'ai_employee') return employees.map((e) => ({ id: e.id, label: e.title }));
    return [];
  };

  const tabs = [
    { id: 'instances', label: 'Active & History', icon: History },
    { id: 'definitions', label: 'Workflow Definitions', icon: Layers },
    { id: 'templates', label: 'Templates', icon: Plus },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`${appPageTitle} flex items-center gap-2`}>
              <Layers size={32} className="text-[#1A1A14]" />
              Workflow Automation Platform
            </h1>
            <p className={appPageDesc}>Design, assign, and track multi-step approval processes.</p>
          </div>
          <button
            onClick={() => openBuilder()}
            className={appBtnPrimary}
          >
            <Plus size={18} /> Create Workflow
          </button>
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

        {activeTab === 'instances' && (
          <div className="space-y-4">
            {instances.length === 0 ? (
              <div className={appEmpty}>
                No workflow instances yet. Activate a workflow definition and start an instance.
              </div>
            ) : (
              instances.map((inst) => (
                <Link
                  key={inst.id}
                  to={`/workflows/instances/${inst.id}`}
                  className={`block ${appGlassCard}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-[#1A1A14]">{inst.title}</h3>
                      <p className="text-xs text-[#6A6A60] mt-1">{inst.workflow_name}</p>
                    </div>
                    <span className={`text-xs font-semibold capitalize ${
                      inst.status === 'completed' ? appBadgeActive
                        : inst.status === 'in_progress' ? appBadgeWarning
                        : inst.status === 'rejected' ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800'
                        : appBadgeInactive
                    }`}>
                      {inst.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 bg-[#1A1A14]/10 rounded-full h-2">
                      <div className="bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] h-2 rounded-full" style={{ width: `${inst.progress_percent}%` }} />
                    </div>
                    <span className="text-xs font-medium text-[#1A1A14]">{inst.progress_percent}%</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'definitions' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className={appLoading}>
                <Loader className="animate-spin text-[#1A1A14] mx-auto" size={24} />
              </div>
            ) : workflows.length === 0 ? (
              <div className={appEmpty}>
                No workflow definitions. Create one or use a template.
              </div>
            ) : (
              workflows.map((wf) => (
                <div key={wf.id} className={`${appGlassCard} space-y-3`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-[#1A1A14]">{wf.name}</h3>
                      <p className="text-xs text-[#6A6A60]">{wf.category} • {wf.step_count} steps • {wf.status}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openBuilder(wf)} className={appBtnIcon}><Edit size={16} /></button>
                      {wf.status !== 'active' && (
                        <button onClick={() => activateWorkflow(wf.id)} className={`${appBtnIcon} text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50`}><Power size={16} /></button>
                      )}
                      {wf.status === 'active' && (
                        <button onClick={() => setStartModal({ open: true, workflowId: wf.id, title: `${wf.name} - ${new Date().toLocaleDateString()}` })} className={`${appBtnIcon} text-[#1A1A14]`}><Play size={16} /></button>
                      )}
                      <button onClick={() => disableMutation.mutate(wf.id)} className={appBtnIcon}><Power size={16} /></button>
                      <button onClick={() => window.confirm('Delete workflow?') && deleteMutation.mutate(wf.id)} className={appBtnIconDanger}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(wf.steps || []).map((s, i) => (
                      <span key={s.id} className="text-xs bg-[#1A1A14]/5 text-[#1A1A14] px-2 py-1 rounded-lg border border-[#1A1A14]/10">
                        {i + 1}. {s.name} ({s.step_type})
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(templates).map(([key, tpl]) => (
              <div key={key} className={`${appGlassCard} space-y-3`}>
                <h3 className="font-bold text-[#1A1A14]">{key}</h3>
                <p className="text-sm text-[#6A6A60]">{tpl.description}</p>
                <p className="text-xs text-[#6A6A60]">{tpl.steps?.length || 0} predefined steps</p>
                <button
                  onClick={() => { openBuilder(null, key); setActiveTab('definitions'); }}
                  className="text-sm text-[#1A1A14] font-semibold hover:underline"
                >
                  Use Template →
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Total Definitions', metrics.total_workflows ?? 0],
              ['Active Definitions', metrics.active_workflows ?? 0],
              ['Total Instances', metrics.total_instances ?? 0],
              ['Completed', metrics.completed_instances ?? 0],
              ['In Progress', metrics.in_progress_instances ?? 0],
              ['Completion Rate', `${metrics.completion_rate ?? 0}%`],
            ].map(([label, value]) => (
              <div key={label} className={appGlassCard}>
                <p className="text-xs text-[#6A6A60] uppercase">{label}</p>
                <p className="text-2xl font-bold text-[#1A1A14] mt-1">{value}</p>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className={appModalOverlay}>
            <div className={`${appModal} max-w-2xl flex flex-col !p-0`}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#1A1A14]/10">
                <h2 className={appSectionTitle}>{form.id ? 'Edit Workflow' : 'Workflow Builder'}</h2>
                <button onClick={() => setIsModalOpen(false)} className={appBtnIcon}><X size={20} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={appLabel}>Name</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={appInputPlain} />
                  </div>
                  <div>
                    <label className={appLabel}>Category</label>
                    <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={appInputPlain} />
                  </div>
                </div>
                <div>
                  <label className={appLabel}>Description</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${appInputPlain} resize-none`} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-[#1A1A14]">Steps</label>
                    <button type="button" onClick={() => setForm({ ...form, steps: [...form.steps, emptyStep()] })} className="text-xs text-[#1A1A14] font-semibold">+ Add Step</button>
                  </div>
                  <div className="space-y-3">
                    {form.steps.map((step, index) => (
                      <div key={index} className="p-3 border border-[#1A1A14]/10 rounded-xl space-y-2 bg-[#1A1A14]/[0.03]">
                        <div className="flex gap-2">
                          <input required placeholder="Step name" value={step.name} onChange={(e) => updateStep(index, 'name', e.target.value)} className={`${appInputPlain} flex-1 !py-1.5 text-xs`} />
                          <select value={step.step_type} onChange={(e) => updateStep(index, 'step_type', e.target.value)} className={`${appSelect} !py-1.5 text-xs`}>
                            <option value="approval">Approval</option>
                            <option value="review">Review</option>
                            <option value="ai">AI Step</option>
                            <option value="user">User Step</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <select value={step.assignee_type} onChange={(e) => updateStep(index, 'assignee_type', e.target.value)} className={`${appSelect} !py-1.5 text-xs`}>
                            <option value="user">User</option>
                            <option value="department">Department</option>
                            <option value="team">Team</option>
                            <option value="ai_employee">AI Employee</option>
                          </select>
                          <select value={step.assignee_id} onChange={(e) => updateStep(index, 'assignee_id', e.target.value)} className={`${appSelect} flex-1 !py-1.5 text-xs`}>
                            <option value="">Select assignee...</option>
                            {assigneeOptions(step.assignee_type).map((o) => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                          {form.steps.length > 1 && (
                            <button type="button" onClick={() => setForm({ ...form, steps: form.steps.filter((_, i) => i !== index) })} className="text-red-600 text-xs px-2">Remove</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={appBtnGhost}>Cancel</button>
                  <button type="submit" disabled={saveMutation.isPending} className={appBtnPrimary}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Workflow'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {startModal.open && (
          <div className={appModalOverlay}>
            <div className={`${appModal} max-w-md`}>
              <h2 className={appSectionTitle}>Start Workflow Instance</h2>
              <input
                value={startModal.title}
                onChange={(e) => setStartModal({ ...startModal, title: e.target.value })}
                className={appInputPlain}
                placeholder="Instance title..."
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setStartModal({ open: false, workflowId: null, title: '' })} className={appBtnGhost}>Cancel</button>
                <button onClick={() => startMutation.mutate()} disabled={!startModal.title.trim() || startMutation.isPending} className={appBtnPrimary}>
                  {startMutation.isPending ? 'Starting...' : 'Start'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
