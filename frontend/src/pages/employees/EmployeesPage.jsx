import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { aiEmployeesAPI } from '../../api/aiEmployees';
import { departmentsAPI } from '../../api/departments';
import { knowledgeAPI } from '../../api/knowledge';
import { Plus, Bot, UserCheck, Settings, X, Loader } from 'lucide-react';
import { useRbac } from '../../hooks/useRbac';
import { PERMISSIONS } from '../../utils/rbac';
import { appPageShell, appToolbarRow, appGrid, appPageTitle, appPageDesc, appSectionTitle, appGlassCard, appBtnPrimary, appBtnGhost, appBtnIcon, appModalOverlay, appModal, appError, appEmpty, appLoading, appInputPlain, appSelect, appLabel, appBadgeActive, appBadgeWarning, appBadgeInfo } from '../../styles/appStyles';

const ROLE_COLORS = {
  'HR Assistant': 'bg-blue-100 text-blue-700 border-blue-200',
  'Support Assistant': 'bg-green-100 text-green-700 border-green-200',
  'Sales Assistant': 'bg-purple-100 text-purple-700 border-purple-200',
  'Research Assistant': 'bg-amber-100 text-amber-700 border-amber-200',
  'Documentation Assistant': 'bg-pink-100 text-pink-700 border-pink-200',
};

const emptyForm = {
  title: '',
  role: 'HR Assistant',
  department_id: '',
  model: '',
  instructions: '',
  tools: [],
  knowledge_document_ids: [],
};

function mapEmployee(item) {
  return {
    id: item.id,
    name: item.title,
    status: item.status,
    color: ROLE_COLORS[item.data?.role] || 'bg-indigo-100 text-indigo-700 border-indigo-200',
    ...item.data,
  };
}

export default function EmployeesPage() {
  const { hasPermission } = useRbac();
  const canManageEmployees = hasPermission(PERMISSIONS.AI_EMPLOYEE_MANAGE);
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errorText, setErrorText] = useState('');

  const { data: employeesRes, isLoading } = useQuery({
    queryKey: ['ai-employees'],
    queryFn: () => aiEmployeesAPI.list(),
  });
  const { data: configRes, isLoading: isConfigLoading } = useQuery({
    queryKey: ['ai-employees-config'],
    queryFn: () => aiEmployeesAPI.getConfig(),
    enabled: isModalOpen,
  });
  const { data: deptRes, isLoading: isDeptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsAPI.list(),
    enabled: isModalOpen,
  });
  const { data: docsRes, isLoading: isDocsLoading } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: () => knowledgeAPI.listDocuments(),
    enabled: isModalOpen,
  });

  const employees = (employeesRes?.data || []).map(mapEmployee);
  const config = configRes?.data || {};
  const departments = deptRes?.data || [];
  const documents = docsRes?.data || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ai-employees'] });

  const createMutation = useMutation({
    mutationFn: () =>
      aiEmployeesAPI.create({
        title: form.title,
        status: 'Active',
        data: {
          role: form.role,
          department_id: form.department_id ? Number(form.department_id) : null,
          model: form.model || config.models?.[0] || 'llama-3.3-70b-versatile',
          instructions: form.instructions,
          tools: form.tools,
          knowledge_document_ids: form.knowledge_document_ids.map(Number),
        },
      }),
    onSuccess: () => {
      invalidate();
      setIsModalOpen(false);
      setForm(emptyForm);
      setErrorText('');
    },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Unable to create AI employee'),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setErrorText('');
    setIsModalOpen(true);
  };

  React.useEffect(() => {
    if (!isModalOpen || !config.models?.length) return;
    const preset = config.presets?.[emptyForm.role] || {};
    setForm((prev) => ({
      ...prev,
      model: prev.model || config.models[0] || 'llama-3.3-70b-versatile',
      instructions: prev.instructions || preset.instructions || '',
      tools: prev.tools.length ? prev.tools : preset.default_tools || [],
    }));
  }, [isModalOpen, config.models, config.presets]);

  const onRoleChange = (role) => {
    const preset = config.presets?.[role] || {};
    setForm((prev) => ({
      ...prev,
      role,
      instructions: preset.instructions || prev.instructions,
      tools: preset.default_tools || prev.tools,
    }));
  };

  const toggleTool = (tool) => {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter((t) => t !== tool)
        : [...prev.tools, tool],
    }));
  };

  const toggleDocument = (docId) => {
    setForm((prev) => ({
      ...prev,
      knowledge_document_ids: prev.knowledge_document_ids.includes(docId)
        ? prev.knowledge_document_ids.filter((id) => id !== docId)
        : [...prev.knowledge_document_ids, docId],
    }));
  };

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div className={`${appToolbarRow} sm:items-start`}>
          <div>
            <h1 className={`${appPageTitle} flex items-center gap-2`}>
              <Bot size={32} className="text-[#1A1A14]" />
              AI Employee Studio
            </h1>
            <p className={appPageDesc}>
              Deploy specialized AI agents for department-specific support across your organization.
            </p>
          </div>
          {canManageEmployees && (
            <button onClick={openCreate} className={appBtnPrimary}>
              <Plus size={20} />
              Hire AI Employee
            </button>
          )}
        </div>

        {isLoading ? (
          <div className={appLoading}>
            <Loader className="animate-spin text-[#1A1A14] mx-auto" size={32} />
          </div>
        ) : employees.length === 0 ? (
          <div className={`${appGlassCard} ${appEmpty}`}>
            <Bot size={48} className="mx-auto text-[#6A6A60] mb-4" />
            <h3 className="text-lg font-semibold text-[#1A1A14]">No AI employees yet</h3>
            <p className="text-[#6A6A60] mt-2 mb-6">
              Hire your first virtual team member to automate HR, support, sales, research, or documentation tasks.
            </p>
            {canManageEmployees && (
              <button onClick={openCreate} className={appBtnPrimary}>
                Hire AI Employee
              </button>
            )}
          </div>
        ) : (
          <div className={`${appGrid} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`}>
            {employees.map((emp) => (
              <Link
                key={emp.id}
                to={`/employees/${emp.id}`}
                className={`${appGlassCard} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border ${emp.color}`}>
                      {emp.name.charAt(0)}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        emp.status === 'Active' ? appBadgeActive : appBadgeWarning
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          emp.status === 'Active' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      {emp.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[#1A1A14]">{emp.name}</h3>
                    <p className="text-sm font-medium text-[#1A1A14]">
                      {emp.role} • {emp.department || 'No department'}
                    </p>
                  </div>
                  <p className="text-sm text-[#6A6A60] mt-4 leading-relaxed line-clamp-3">
                    {emp.instructions}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(emp.tools || []).map((tool) => (
                      <span key={tool} className={appBadgeInfo}>
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1A1A14]/10 flex justify-between items-center text-xs text-[#6A6A60]">
                  <span className="flex items-center gap-1">
                    <Settings size={12} />
                    {emp.model || 'default model'}
                  </span>
                  <span className="text-[#1A1A14] font-semibold">View Details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {canManageEmployees && isModalOpen && (
          <div className={appModalOverlay}>
            <div className={`${appModal} max-w-2xl !p-0 flex flex-col max-h-[90vh] overflow-hidden`}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-[#1A1A14]/10 bg-[#1A1A14]/[0.04]">
                <h2 className={`${appSectionTitle} flex items-center gap-2`}>
                  <UserCheck size={20} className="text-[#1A1A14]" />
                  Hire AI Employee
                </h2>
                <button onClick={() => setIsModalOpen(false)} className={appBtnIcon}>
                  <X size={20} />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="p-6 space-y-4 overflow-y-auto flex-1"
              >
                {errorText && <div className={appError}>{errorText}</div>}
                {(isConfigLoading || isDeptLoading || isDocsLoading) && (
                  <div className="flex justify-center py-6">
                    <Loader className="animate-spin text-[#1A1A14]" size={28} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={appLabel}>Agent Name</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Emma - HR Assistant"
                      className={appInputPlain}
                    />
                  </div>
                  <div>
                    <label className={appLabel}>Employee Type</label>
                    <select
                      value={form.role}
                      onChange={(e) => onRoleChange(e.target.value)}
                      className={appSelect}
                    >
                      {(config.employee_types || []).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={appLabel}>Department</label>
                    <select
                      value={form.department_id}
                      onChange={(e) => setForm({ ...form, department_id: e.target.value })}
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
                    <label className={appLabel}>LLM Model (Groq)</label>
                    <select
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
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
                    required
                    rows={4}
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    className={`${appInputPlain} resize-none`}
                  />
                </div>
                <div>
                  <label className={appLabel}>Tools</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(config.tools || []).map((tool) => (
                      <label
                        key={tool}
                        className="flex items-center gap-2 p-2 border border-[#1A1A14]/10 hover:bg-[#1A1A14]/[0.03] rounded-xl cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.tools.includes(tool)}
                          onChange={() => toggleTool(tool)}
                          className="rounded text-[#1A1A14] focus:ring-[#1A1A14]/20"
                        />
                        <span className="text-sm text-[#1A1A14]">{tool}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={appLabel}>
                    Knowledge Documents (optional — empty = all org knowledge)
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-[#1A1A14]/10 rounded-xl p-2 space-y-1">
                    {documents.length === 0 ? (
                      <p className="text-xs text-[#6A6A60] p-2">No documents uploaded yet.</p>
                    ) : (
                      documents.map((doc) => (
                        <label key={doc.id} className="flex items-center gap-2 p-1.5 hover:bg-[#1A1A14]/[0.03] rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.knowledge_document_ids.includes(doc.id)}
                            onChange={() => toggleDocument(doc.id)}
                            className="rounded text-[#1A1A14]"
                          />
                          <span className="text-sm text-[#1A1A14]">{doc.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-[#1A1A14]/10">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={appBtnGhost}>
                    Cancel
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className={appBtnPrimary}>
                    {createMutation.isPending ? 'Deploying...' : 'Deploy Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
