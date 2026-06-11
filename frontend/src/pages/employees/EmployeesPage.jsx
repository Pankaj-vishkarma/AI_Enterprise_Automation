import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { operationsAPI } from '../../api/operations';
import { Plus, Bot, UserCheck, MessageSquare, Briefcase, Settings, X, PlusCircle, CheckCircle2 } from 'lucide-react';

const DEFAULT_EMPLOYEES = [
  {
    id: 1,
    name: "Emma - HR Assistant",
    role: "HR Assistant",
    department: "Human Resources",
    model: "Claude 3.5 Sonnet",
    status: "Active",
    instructions: "Help employees with leave policies, reimbursement, benefits information, and company procedures.",
    tools: ["File Reader", "Database Access"],
    color: "bg-blue-100 text-blue-700 border-blue-200"
  },
  {
    id: 2,
    name: "Alex - Support Assistant",
    role: "Support Assistant",
    department: "Customer Support",
    model: "GPT-4o",
    status: "Active",
    instructions: "Resolve customer inquiries, provide detailed product guidance, and assist in troubleshooting issues.",
    tools: ["Web Search", "Database Access", "File Reader"],
    color: "bg-green-100 text-green-700 border-green-200"
  },
  {
    id: 3,
    name: "Sarah - Sales Assistant",
    role: "Sales Assistant",
    department: "Sales",
    model: "Llama-3-70b",
    status: "Idle",
    instructions: "Provide product recommendations, qualify inbound leads, and deliver accurate pricing details.",
    tools: ["Web Search", "CRM Connector"],
    color: "bg-purple-100 text-purple-700 border-purple-200"
  },
  {
    id: 4,
    name: "David - Research Assistant",
    role: "Research Assistant",
    department: "Engineering",
    model: "Claude 3.5 Sonnet",
    status: "Active",
    instructions: "Perform thorough market research, analyze industry trends, and monitor competitor activities.",
    tools: ["Web Search", "File Reader", "Code Interpreter"],
    color: "bg-amber-100 text-amber-700 border-amber-200"
  },
  {
    id: 5,
    name: "Liam - Documentation Assistant",
    role: "Documentation Assistant",
    department: "Operations",
    model: "GPT-4o-mini",
    status: "Active",
    instructions: "Generate internal documentation, draft SOPs, write policy revisions, and organize guides.",
    tools: ["File Reader", "Doc Generator"],
    color: "bg-pink-100 text-pink-700 border-pink-200"
  }
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState(DEFAULT_EMPLOYEES);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Assistant');
  const [department, setDepartment] = useState('Human Resources');
  const [model, setModel] = useState('Claude 3.5 Sonnet');
  const [instructions, setInstructions] = useState('');
  const [selectedTools, setSelectedTools] = useState([]);

  const toolsList = ["Web Search", "File Reader", "Code Interpreter", "Database Access", "CRM Connector", "Doc Generator"];

  useEffect(() => {
    operationsAPI.list('ai-employees').then(({ data }) => {
      if (data.length) setEmployees(data.map(item => ({ id: item.id, name: item.title, status: item.status, ...item.data })));
    }).catch(() => {});
  }, []);

  const handleToolToggle = (tool) => {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter(t => t !== tool));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { data: saved } = await operationsAPI.create('ai-employees', {
      title: name,
      status: "Active",
      data: { role, department, model, instructions, tools: selectedTools, color: "bg-indigo-100 text-indigo-700 border-indigo-200" }
    });
    const newEmp = { id: saved.id, name: saved.title, status: saved.status, ...saved.data };
    setEmployees([...employees, newEmp]);
    setIsModalOpen(false);

    // Reset
    setName('');
    setRole('Assistant');
    setInstructions('');
    setSelectedTools([]);
  };

  const runEmployee = async (employee) => {
    const task = window.prompt(`Assign a task to ${employee.name}`);
    if (!task?.trim()) return;
    const { data } = await operationsAPI.runAIEmployee(employee.id, task);
    window.alert(data.output);
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
            <p className="text-muted-foreground mt-1">Deploy specialized AI agents to automate business operations, support customers, and generate files.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition cursor-pointer font-medium"
          >
            <Plus size={20} />
            Hire AI Employee
          </button>
        </div>

        {/* AI Employees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition relative flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border ${emp.color}`}>
                    {emp.name.charAt(0)}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    emp.status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-green-600 animate-pulse' : 'bg-yellow-500'}`} />
                    {emp.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">{emp.name}</h3>
                  <p className="text-sm font-medium text-primary">{emp.role} • {emp.department}</p>
                </div>

                <p className="text-sm text-muted-foreground mt-4 leading-relaxed line-clamp-3">
                  {emp.instructions}
                </p>

                {/* Capabilities */}
                <div className="mt-4">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {emp.tools.map((tool, index) => (
                      <span key={index} className="bg-secondary text-secondary-foreground text-xs px-2.5 py-0.5 rounded-lg border border-border">
                        {tool}
                      </span>
                    ))}
                    {emp.tools.length === 0 && (
                      <span className="text-xs text-muted-foreground">No custom tools enabled</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Settings size={12} />
                  Model: {emp.model}
                </span>
                <button onClick={() => runEmployee(emp)} className="text-primary font-semibold hover:underline">
                  Assign Task
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Hire AI Employee Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
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

              <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">AI Agent Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Emma - Sales Assistant"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Select Core Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="HR Assistant">HR Assistant</option>
                      <option value="Support Assistant">Support Assistant</option>
                      <option value="Sales Assistant">Sales Assistant</option>
                      <option value="Research Assistant">Research Assistant</option>
                      <option value="Documentation Assistant">Documentation Assistant</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="Human Resources">Human Resources</option>
                      <option value="Customer Support">Customer Support</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Brain Model (LLM)</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (Recommended)</option>
                      <option value="GPT-4o">GPT-4o (High Performance)</option>
                      <option value="Llama-3-70b">Llama-3-70b (Open Source)</option>
                      <option value="GPT-4o-mini">GPT-4o-mini (Cost Efficient)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Core Responsibilities & System Prompts</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide specific instructions for this employee's tasks, target responses, and limitations..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Equip Capabilities / Tools</label>
                  <div className="grid grid-cols-2 gap-2">
                    {toolsList.map(tool => (
                      <label key={tool} className="flex items-center gap-2 p-2 border border-border hover:bg-secondary/40 rounded-lg cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          checked={selectedTools.includes(tool)}
                          onChange={() => handleToolToggle(tool)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">{tool}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition cursor-pointer text-foreground text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2 cursor-pointer text-sm font-semibold"
                  >
                    Deploy Agent
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
