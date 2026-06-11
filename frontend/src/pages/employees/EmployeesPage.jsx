import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { aiEmployeesAPI } from '../../api/aiEmployees';
import { departmentsAPI } from '../../api/departments';
import { knowledgeAPI } from '../../api/knowledge';
import { Plus, Bot, UserCheck, Settings, X, Loader } from 'lucide-react';

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
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errorText, setErrorText] = useState('');

  const { data: employeesRes, isLoading } = useQuery({
    queryKey: ['ai-employees'],
    queryFn: () => aiEmployeesAPI.list(),
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
    const preset = config.presets?.[emptyForm.role] || {};
    setForm({
      ...emptyForm,
      model: config.models?.[0] || 'llama-3.3-70b-versatile',
      instructions: preset.instructions || '',
      tools: preset.default_tools || [],
    });
    setErrorText('');
    setIsModalOpen(true);
  };

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
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Bot size={32} className="text-primary" />
              AI Employee Studio
            </h1>
            <p className="text-muted-foreground mt-1">
              Deploy specialized AI agents for department-specific support across your organization.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition cursor-pointer font-medium"
          >
            <Plus size={20} />
            Hire AI Employee
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader className="animate-spin text-primary" size={32} />
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Bot size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No AI employees yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              Hire your first virtual team member to automate HR, support, sales, research, or documentation tasks.
            </p>
            <button
              onClick={openCreate}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-medium"
            >
              Hire AI Employee
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((emp) => (
              <Link
                key={emp.id}
                to={`/employees/${emp.id}`}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border ${emp.color}`}>
                      {emp.name.charAt(0)}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        emp.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          emp.status === 'Active' ? 'bg-green-600 animate-pulse' : 'bg-yellow-500'
                        }`}
                      />
                      {emp.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">{emp.name}</h3>
                    <p className="text-sm font-medium text-primary">
                      {emp.role} • {emp.department || 'No department'}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 leading-relaxed line-clamp-3">
                    {emp.instructions}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(emp.tools || []).map((tool) => (
                      <span
                        key={tool}
                        className="bg-secondary text-secondary-foreground text-xs px-2.5 py-0.5 rounded-lg border border-border"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Settings size={12} />
                    {emp.model || 'default model'}
                  </span>
                  <span className="text-primary font-semibold">View Details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-secondary">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UserCheck size={20} className="text-primary" />
                  Hire AI Employee
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition cursor-pointer"
                >
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
                {errorText && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {errorText}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Agent Name</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Emma - HR Assistant"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Employee Type</label>
                    <select
                      value={form.role}
                      onChange={(e) => onRoleChange(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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
                    <label className="block text-sm font-medium text-foreground mb-2">Department</label>
                    <select
                      value={form.department_id}
                      onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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
                    <label className="block text-sm font-medium text-foreground mb-2">LLM Model (Groq)</label>
                    <select
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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
                  <label className="block text-sm font-medium text-foreground mb-2">Instructions</label>
                  <textarea
                    required
                    rows={4}
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tools</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(config.tools || []).map((tool) => (
                      <label
                        key={tool}
                        className="flex items-center gap-2 p-2 border border-border hover:bg-secondary/40 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.tools.includes(tool)}
                          onChange={() => toggleTool(tool)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">{tool}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Knowledge Documents (optional — empty = all org knowledge)
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                    {documents.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No documents uploaded yet.</p>
                    ) : (
                      documents.map((doc) => (
                        <label key={doc.id} className="flex items-center gap-2 p-1.5 hover:bg-secondary/40 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.knowledge_document_ids.includes(doc.id)}
                            onChange={() => toggleDocument(doc.id)}
                            className="rounded text-primary"
                          />
                          <span className="text-sm text-foreground">{doc.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-secondary text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-semibold disabled:opacity-50"
                  >
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
