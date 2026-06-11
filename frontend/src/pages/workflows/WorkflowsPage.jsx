import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { operationsAPI } from '../../api/operations';
import { Layers, Plus, CheckCircle2, Clock, AlertCircle, X, ChevronRight, UserPlus, Play } from 'lucide-react';

const INITIAL_WORKFLOWS = [
  {
    id: 1,
    name: "Employee Onboarding - Sophia Chen",
    type: "Onboarding",
    progress: 66,
    status: "Active",
    steps: [
      { name: "HR Document Verification", assignee: "Emma (HR)", status: "Approved" },
      { name: "IT Hardware Provisioning", assignee: "Support Team", status: "Approved" },
      { name: "Manager Introduction & SOPs", assignee: "David (Manager)", status: "Pending" }
    ]
  },
  {
    id: 2,
    name: "Annual Leave Request - Alice Smith",
    type: "Leave Approval",
    progress: 33,
    status: "Active",
    steps: [
      { name: "Manager Sign-off", assignee: "David (Manager)", status: "Approved" },
      { name: "HR Leave Record Log", assignee: "Emma (HR)", status: "Pending" },
      { name: "Finance payroll Check", assignee: "Finance Team", status: "Upcoming" }
    ]
  },
  {
    id: 3,
    name: "Customer Refund - Order #1809",
    type: "Refund Processing",
    progress: 100,
    status: "Completed",
    steps: [
      { name: "Support Ticket Verification", assignee: "Alex (Support)", status: "Approved" },
      { name: "Refund Release Auth", assignee: "Finance Team", status: "Approved" },
      { name: "Notification to Customer", assignee: "Auto-Mailer", status: "Approved" }
    ]
  }
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState(INITIAL_WORKFLOWS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Onboarding');
  const [step1, setStep1] = useState('Step 1: HR Review');
  const [step2, setStep2] = useState('Step 2: Manager Sign-off');
  const [step3, setStep3] = useState('Step 3: Finance Release');

  useEffect(() => {
    operationsAPI.list('workflows').then(({ data }) => {
      if (data.length) setWorkflows(data.map(item => ({ id: item.id, name: item.title, status: item.status, ...item.data })));
    }).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const workflowData = {
      type, progress: 0,
      steps: [
        { name: step1, assignee: "Emma (HR)", status: "Pending" },
        { name: step2, assignee: "Manager Team", status: "Upcoming" },
        { name: step3, assignee: "Finance Team", status: "Upcoming" }
      ]
    };
    const { data: saved } = await operationsAPI.create('workflows', { title: name, status: "Active", data: workflowData });
    const newWf = { id: saved.id, name: saved.title, status: saved.status, ...saved.data };

    setWorkflows([newWf, ...workflows]);
    setIsModalOpen(false);

    // Reset
    setName('');
    setStep1('Step 1: HR Review');
    setStep2('Step 2: Manager Sign-off');
    setStep3('Step 3: Finance Release');
  };

  const handleApproveStep = (wfId, stepIndex) => {
    setWorkflows(prevWfs => prevWfs.map(wf => {
      if (wf.id !== wfId) return wf;

      const updatedSteps = wf.steps.map((st, idx) => {
        if (idx === stepIndex) {
          return { ...st, status: "Approved" };
        }
        if (idx === stepIndex + 1 && st.status === "Upcoming") {
          return { ...st, status: "Pending" };
        }
        return st;
      });

      const approvedCount = updatedSteps.filter(s => s.status === "Approved").length;
      const progress = Math.round((approvedCount / updatedSteps.length) * 100);
      const status = progress === 100 ? "Completed" : wf.status;

      const updated = {
        ...wf,
        steps: updatedSteps,
        progress,
        status
      };
      operationsAPI.update('workflows', wfId, { status, data: { steps: updatedSteps, progress } }).catch(() => {});
      return updated;
    }));
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Layers size={32} className="text-primary" />
              Workflow Automation Platform
            </h1>
            <p className="text-muted-foreground mt-1">Design and track automated multi-stage approval processes and business tasks.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition cursor-pointer font-medium text-sm"
          >
            <Plus size={18} />
            Create Workflow
          </button>
        </div>

        {/* Workflows List */}
        <div className="space-y-6">
          {workflows.map((wf) => (
            <div key={wf.id} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{wf.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Type: <span className="text-primary font-semibold">{wf.type}</span></p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Workflow Progress</p>
                    <p className="text-sm font-bold text-foreground">{wf.progress}% Completed</p>
                  </div>
                  <div className="w-24 bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${wf.progress}%` }}></div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    wf.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {wf.status === 'Completed' ? 'Completed' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Horizontal steps flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {wf.steps.map((st, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-secondary/30 border border-border rounded-lg relative">
                    <div className="flex-shrink-0 mt-0.5">
                      {st.status === 'Approved' && <CheckCircle2 className="text-green-600" size={18} />}
                      {st.status === 'Pending' && <Clock className="text-primary animate-pulse" size={18} />}
                      {st.status === 'Upcoming' && <div className="w-[18px] h-[18px] rounded-full border-2 border-muted bg-transparent" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-xs font-semibold ${
                        st.status === 'Approved' ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}>{st.name}</p>
                      <p className="text-[10px] text-muted-foreground">Assignee: {st.assignee}</p>
                    </div>
                    
                    {/* Approve trigger button */}
                    {st.status === 'Pending' && (
                      <button
                        onClick={() => handleApproveStep(wf.id, index)}
                        className="bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition flex items-center gap-0.5"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Create Workflow Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-secondary">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UserPlus size={20} className="text-primary" />
                  Create Workflow
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Workflow Process Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Leave Approval - Bob Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Workflow Category</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="Onboarding">Employee Onboarding</option>
                    <option value="Leave Approval">Leave Approval</option>
                    <option value="Refund Processing">Refund Processing</option>
                    <option value="Vendor Approval">Vendor Approval</option>
                    <option value="Document Review">Document Review</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">Define Approval Pipeline Steps</label>
                  
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-1">Stage 1 Step Title</span>
                    <input
                      type="text"
                      required
                      value={step1}
                      onChange={(e) => setStep1(e.target.value)}
                      className="w-full px-4 py-1.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-1">Stage 2 Step Title</span>
                    <input
                      type="text"
                      required
                      value={step2}
                      onChange={(e) => setStep2(e.target.value)}
                      className="w-full px-4 py-1.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-1">Stage 3 Step Title</span>
                    <input
                      type="text"
                      required
                      value={step3}
                      onChange={(e) => setStep3(e.target.value)}
                      className="w-full px-4 py-1.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                    />
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
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-1.5 cursor-pointer text-sm font-semibold"
                  >
                    <Play size={14} />
                    Deploy Workflow
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
