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
  Layers, Plus, Play, BarChart3, History, X, Loader, Trash2, Power, Edit, Bell,
} from 'lucide-react';
import { appPageShell, appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appInputPlain, appSelect, appBtnPrimary, appBtnGhost, appBtnIcon, appBtnIconDanger, appError, appEmpty, appLoading, appModalOverlay, appModal, appLabel, appTabActive, appTabInactive, appBadgeActive, appBadgeInactive, appBadgeWarning } from '../../styles/appStyles';
import { useRbac } from '../../hooks/useRbac';
import { PERMISSIONS } from '../../utils/rbac';
import { REFERENCE_LIST_LIMIT } from '../../utils/pagination';
import { getApiErrorMessage } from '../../utils/apiError';

const UNASSIGNED_APPROVAL_MESSAGE = 'Please select an assignee for all approval steps.';

function formatUserLabel(user) {
  const name = [user.first_name, user.last_name]
    .filter((part) => part != null && String(part).trim() !== '')
    .join(' ')
    .trim();
  return name || user.email || `User #${user.id}`;
}

function parseAssigneeId(raw) {
  if (raw === '' || raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasUnassignedApprovalSteps(steps) {
  return (steps || []).some(
    (step) => step.step_type === 'approval' && step.assignee_type && !parseAssigneeId(step.assignee_id),
  );
}

function isApprovalStepUnassigned(step) {
  return step.step_type === 'approval' && step.assignee_type && !parseAssigneeId(step.assignee_id);
}

function normalizeAssigneeId(raw) {
  const parsed = parseAssigneeId(raw);
  return parsed != null ? String(parsed) : '';
}

function userMatchesStepAssignee(user, step) {
  if (!user || !step) return false;
  if (step.assignee_type === 'user' && step.assignee_id === user.id) return true;
  if (step.assignee_type === 'department' && step.assignee_id === user.department_id) return true;
  if (step.assignee_type === 'team' && step.assignee_id === user.team_id) return true;
  return false;
}

function getPendingStepForUser(instance, user) {
  return (instance.steps || []).find(
    (step) => step.status === 'pending' && userMatchesStepAssignee(user, step),
  );
}

function getCurrentPendingStep(instance) {
  return (instance.steps || []).find((step) => step.status === 'pending');
}

const emptyStep = () => ({
  name: '', step_type: 'approval', assignee_type: 'user', assignee_id: '', position: 0,
});

const emptyForm = {
  id: null, name: '', description: '', category: 'Custom', status: 'draft', steps: [emptyStep()],
};

export default function WorkflowsPage() {
  const { hasPermission, user } = useRbac();
  const canUseWorkflows = hasPermission(PERMISSIONS.WORKFLOW_USE);
  const canManageWorkflows = hasPermission(PERMISSIONS.WORKFLOW_MANAGE);
  const canViewOrgMetrics = hasPermission(PERMISSIONS.ANALYTICS_VIEW);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('instances');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [startModal, setStartModal] = useState({ open: false, workflowId: null, title: '' });
  const [instanceScope, setInstanceScope] = useState('mine');
  const [errorText, setErrorText] = useState('');

  const { data: workflowsRes, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsAPI.list(),
    enabled: activeTab === 'definitions' || isModalOpen,
  });
  const { data: instancesRes } = useQuery({
    queryKey: ['workflow-instances', instanceScope],
    queryFn: () => workflowsAPI.listInstances({ limit: 50, scope: instanceScope }),
    enabled: activeTab === 'instances',
  });
  const { data: activeWorkflowsRes } = useQuery({
    queryKey: ['workflows', 'active-start'],
    queryFn: async () => {
      const { data } = await workflowsAPI.list();
      return (data || []).filter((w) => w.status === 'active');
    },
    enabled: activeTab === 'instances' && canUseWorkflows,
  });
  const { data: metricsRes } = useQuery({
    queryKey: ['workflow-metrics'],
    queryFn: () => workflowsAPI.getMetrics(),
    enabled: activeTab === 'metrics',
  });
  const { data: templatesRes } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowsAPI.getTemplates(),
    enabled: activeTab === 'templates' || isModalOpen,
  });
  const { data: notificationsRes, refetch: refetchNotifications } = useQuery({
    queryKey: ['workflow-notifications'],
    queryFn: () => workflowsAPI.listNotifications(false),
    enabled: activeTab === 'notifications' && canUseWorkflows,
  });
  const { data: usersRes } = useQuery({
    queryKey: ['users', REFERENCE_LIST_LIMIT],
    queryFn: () => usersAPI.list({ limit: REFERENCE_LIST_LIMIT }),
    enabled: isModalOpen,
  });
  const { data: deptRes } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsAPI.list(),
    enabled: isModalOpen,
  });
  const { data: teamsRes } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list(),
    enabled: isModalOpen,
  });
  const { data: employeesRes } = useQuery({
    queryKey: ['ai-employees'],
    queryFn: () => aiEmployeesAPI.list(),
    enabled: isModalOpen,
  });

  const workflows = workflowsRes?.data || [];
  const instances = instancesRes?.data || [];
  const activeWorkflows = activeWorkflowsRes || [];
  const metrics = metricsRes?.data || {};
  const templates = templatesRes?.data || {};
  const notifications = notificationsRes?.data || [];
  const users = usersRes?.data || [];
  const departments = deptRes?.data || [];
  const teams = teamsRes?.data || [];
  const employees = employeesRes?.data || [];

  const invalidateWorkflows = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
  };

  const invalidateInstances = () => {
    queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
  };

  const invalidateMetricsIfActive = () => {
    if (activeTab === 'metrics') {
      queryClient.invalidateQueries({ queryKey: ['workflow-metrics'] });
    }
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
          assignee_id: parseAssigneeId(s.assignee_id),
          position: i,
        })),
      };
      return form.id ? workflowsAPI.update(form.id, payload) : workflowsAPI.create(payload);
    },
    onSuccess: () => { invalidateWorkflows(); setIsModalOpen(false); setForm(emptyForm); setErrorText(''); },
    onError: (err) => setErrorText(getApiErrorMessage(err, 'Unable to save workflow')),
  });

  const startMutation = useMutation({
    mutationFn: () => workflowsAPI.start(startModal.workflowId, startModal.title),
    onSuccess: () => {
      invalidateInstances();
      invalidateMetricsIfActive();
      setStartModal({ open: false, workflowId: null, title: '' });
      setActiveTab('instances');
    },
    onError: (err) => setErrorText(getApiErrorMessage(err, 'Unable to start workflow')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => workflowsAPI.delete(id),
    onSuccess: invalidateWorkflows,
  });

  const disableMutation = useMutation({
    mutationFn: (id) => workflowsAPI.disable(id),
    onSuccess: invalidateWorkflows,
  });

  const activateWorkflow = (id) =>
    workflowsAPI.update(id, { status: 'active' })
      .then(() => invalidateWorkflows())
      .catch((err) => setErrorText(getApiErrorMessage(err, 'Unable to activate workflow')));

  const handleSaveWorkflow = (e) => {
    e.preventDefault();
    if (hasUnassignedApprovalSteps(form.steps)) {
      setErrorText(UNASSIGNED_APPROVAL_MESSAGE);
      return;
    }
    setErrorText('');
    saveMutation.mutate();
  };

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
          assignee_id: normalizeAssigneeId(s.assignee_id),
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
      steps: prev.steps.map((s, i) => {
        if (i !== index) return s;
        if (field === 'assignee_type') {
          return { ...s, assignee_type: value, assignee_id: '' };
        }
        return { ...s, [field]: value };
      }),
    }));
  };

  const assigneeOptions = (type) => {
    if (type === 'user') return users.map((u) => ({ id: u.id, label: formatUserLabel(u) }));
    if (type === 'department') return departments.map((d) => ({ id: d.id, label: d.name }));
    if (type === 'team') return teams.map((t) => ({ id: t.id, label: t.name }));
    if (type === 'ai_employee') return employees.map((e) => ({ id: e.id, label: e.title }));
    return [];
  };

  const tabs = [
    { id: 'instances', label: 'Active & History', icon: History },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'definitions', label: 'Workflow Definitions', icon: Layers },
    { id: 'templates', label: 'Templates', icon: Plus },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  ];

  const visibleTabs = tabs.filter((tab) => {
    if (tab.id === 'metrics' && !canViewOrgMetrics) return false;
    if (tab.id === 'templates' && !canManageWorkflows) return false;
    if (tab.id === 'definitions' && !canManageWorkflows) return false;
    return true;
  });

  const instanceScopeOptions = [
    { id: 'mine', label: 'My Requests' },
    { id: 'pending_approval', label: 'Pending Approvals' },
    { id: 'all_accessible', label: 'All Accessible' },
  ];

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`${appPageTitle} flex items-center gap-2`}>
              <Layers size={32} className="text-[#1A1A14]" />
              Workflow Automation Platform
            </h1>
            <p className={appPageDesc}>Design, assign, and track multi-step approval processes.</p>
          </div>
          {canManageWorkflows && (
          <button
            onClick={() => openBuilder()}
            className={appBtnPrimary}
          >
            <Plus size={18} /> Create Workflow
          </button>
          )}
        </div>

        <div className="flex gap-2 border-b border-[#1A1A14]/10 overflow-x-auto">
          {visibleTabs.map((tab) => {
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
            {canUseWorkflows && activeWorkflows.length > 0 && (
              <div className={`${appGlassCard} space-y-3`}>
                <h2 className={appSectionTitle}>Start a Workflow</h2>
                <p className="text-sm text-[#6A6A60]">
                  Choose an active workflow definition to submit a new request.
                </p>
                <div className="space-y-2">
                  {activeWorkflows.map((wf) => (
                    <div key={wf.id} className="flex items-center justify-between gap-3 p-3 border border-[#1A1A14]/10 rounded-xl">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1A1A14] truncate">{wf.name}</p>
                        <p className="text-xs text-[#6A6A60]">{wf.category} • {wf.step_count} steps</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStartModal({
                          open: true,
                          workflowId: wf.id,
                          title: `${wf.name} - ${new Date().toLocaleDateString()}`,
                        })}
                        className={appBtnPrimary}
                      >
                        <Play size={16} /> Start
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {instanceScopeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInstanceScope(opt.id)}
                  className={instanceScope === opt.id ? appTabActive : appTabInactive}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {instances.length === 0 ? (
              <div className={appEmpty}>
                No workflow instances yet. Activate a workflow definition and start an instance.
              </div>
            ) : (
              instances.map((inst) => {
                const actionStep = getPendingStepForUser(inst, user);
                const currentStep = getCurrentPendingStep(inst);
                const showApprovalIndicators = (
                  instanceScope === 'pending_approval' || Boolean(actionStep)
                ) && inst.status === 'in_progress' && currentStep;

                return (
                <Link
                  key={inst.id}
                  to={`/workflows/instances/${inst.id}`}
                  className={`block ${appGlassCard}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-[#1A1A14]">{inst.title}</h3>
                      <p className="text-xs text-[#6A6A60] mt-1">{inst.workflow_name}</p>
                      {inst.started_by_name && (
                        <p className="text-xs text-[#6A6A60] mt-1">
                          Requested By: <span className="font-medium text-[#1A1A14]">{inst.started_by_name}</span>
                        </p>
                      )}
                      {showApprovalIndicators && (
                        <div className="mt-2 space-y-1">
                          {actionStep && (
                            <span className={`${appBadgeWarning} inline-block`}>Action Required</span>
                          )}
                          <p className="text-xs text-[#6A6A60]">
                            Current step: <span className="font-medium text-[#1A1A14]">{currentStep.name}</span>
                          </p>
                          <p className="text-xs text-[#6A6A60]">
                            Pending approver: <span className="font-medium text-[#1A1A14]">{currentStep.assignee_label || 'Unassigned'}</span>
                          </p>
                          {actionStep && (
                            <p className="text-xs text-[#1A1A14] font-medium">
                              Open instance to Approve or Reject
                            </p>
                          )}
                        </div>
                      )}
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
                );
              })
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className={appEmpty}>No workflow notifications yet.</div>
            ) : (
              notifications.map((note) => (
                <div key={note.id} className={`${appGlassCard} flex items-start justify-between gap-4`}>
                  <div>
                    <p className="font-semibold text-[#1A1A14]">{note.title}</p>
                    <p className="text-sm text-[#6A6A60] mt-1">{note.body}</p>
                    {note.link_entity_type === 'workflow_instance' && note.link_entity_id && (
                      <Link
                        to={`/workflows/instances/${note.link_entity_id}`}
                        className="text-xs text-[#1A1A14] font-semibold mt-2 inline-block hover:underline"
                      >
                        View instance →
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={note.is_read ? appBadgeInactive : appBadgeWarning}>
                      {note.is_read ? 'Read' : 'Unread'}
                    </span>
                    {!note.is_read && (
                      <button
                        type="button"
                        className={appBtnGhost}
                        onClick={async () => {
                          await workflowsAPI.markNotificationRead(note.id);
                          refetchNotifications();
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
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
                    {canManageWorkflows || canUseWorkflows ? (
                    <div className="flex gap-1">
                      {canManageWorkflows && (
                        <button onClick={() => openBuilder(wf)} className={appBtnIcon}><Edit size={16} /></button>
                      )}
                      {canManageWorkflows && wf.status !== 'active' && (
                        <button onClick={() => activateWorkflow(wf.id)} className={`${appBtnIcon} text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50`}><Power size={16} /></button>
                      )}
                      {canUseWorkflows && wf.status === 'active' && (
                        <button onClick={() => setStartModal({ open: true, workflowId: wf.id, title: `${wf.name} - ${new Date().toLocaleDateString()}` })} className={`${appBtnIcon} text-[#1A1A14]`}><Play size={16} /></button>
                      )}
                      {canManageWorkflows && (
                        <button onClick={() => disableMutation.mutate(wf.id)} className={appBtnIcon}><Power size={16} /></button>
                      )}
                      {canManageWorkflows && (
                        <button onClick={() => window.confirm('Delete workflow?') && deleteMutation.mutate(wf.id)} className={appBtnIconDanger}><Trash2 size={16} /></button>
                      )}
                    </div>
                    ) : null}
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

        {canManageWorkflows && isModalOpen && (
          <div className={appModalOverlay}>
            <div className={`${appModal} max-w-2xl flex flex-col !p-0`}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#1A1A14]/10">
                <h2 className={appSectionTitle}>{form.id ? 'Edit Workflow' : 'Workflow Builder'}</h2>
                <button onClick={() => setIsModalOpen(false)} className={appBtnIcon}><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveWorkflow} className="p-6 space-y-4 overflow-y-auto">
                {hasUnassignedApprovalSteps(form.steps) && (
                  <div className={appError}>{UNASSIGNED_APPROVAL_MESSAGE}</div>
                )}
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
                      <div
                        key={index}
                        className={`p-3 border rounded-xl space-y-2 bg-[#1A1A14]/[0.03] ${
                          isApprovalStepUnassigned(step)
                            ? 'border-amber-400/60 bg-amber-50/40'
                            : 'border-[#1A1A14]/10'
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            required
                            placeholder="Step name"
                            value={step.name}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                            className={`${appInputPlain} w-full min-w-0 !py-1.5 text-xs`}
                          />
                          <select
                            value={step.step_type}
                            onChange={(e) => updateStep(index, 'step_type', e.target.value)}
                            className={`${appSelect} w-full min-w-0 !py-1.5 text-xs`}
                          >
                            <option value="approval">Approval</option>
                            <option value="review">Review</option>
                            <option value="ai">AI Step</option>
                            <option value="user">User Step</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={step.assignee_type}
                            onChange={(e) => updateStep(index, 'assignee_type', e.target.value)}
                            className={`${appSelect} w-full min-w-0 !py-1.5 text-xs`}
                          >
                            <option value="user">User</option>
                            <option value="department">Department</option>
                            <option value="team">Team</option>
                            <option value="ai_employee">AI Employee</option>
                          </select>
                          <select
                            value={step.assignee_id}
                            onChange={(e) => updateStep(index, 'assignee_id', e.target.value)}
                            className={`${appSelect} w-full min-w-0 !py-1.5 text-xs`}
                          >
                            <option value="">Select assignee...</option>
                            {assigneeOptions(step.assignee_type).map((o) => (
                              <option key={o.id} value={String(o.id)}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        {isApprovalStepUnassigned(step) && (
                          <p className="text-xs text-amber-800 font-medium">Assignee required for this approval step</p>
                        )}
                        {form.steps.length > 1 && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, steps: form.steps.filter((_, i) => i !== index) })}
                              className="text-red-600 text-xs px-2 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={appBtnGhost}>Cancel</button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending || hasUnassignedApprovalSteps(form.steps)}
                    className={appBtnPrimary}
                  >
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
