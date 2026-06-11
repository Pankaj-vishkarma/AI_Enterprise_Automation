import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { departmentsAPI } from '../../api/departments';
import { Plus, Edit, Search, Power } from 'lucide-react';

const emptyForm = { id: null, name: '', description: '' };

export default function DepartmentsPage({ isSubSection = false }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [errorText, setErrorText] = useState('');

  const { data: deptData, isLoading } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsAPI.list() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['departments'] });
  const saveMutation = useMutation({
    mutationFn: () => form.id
      ? departmentsAPI.update(form.id, { name: form.name, description: form.description || null })
      : departmentsAPI.create({ name: form.name, description: form.description || null }),
    onSuccess: () => { invalidate(); setIsOpen(false); setForm(emptyForm); setErrorText(''); },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Unable to save department'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, active }) => active ? departmentsAPI.enable(id) : departmentsAPI.disable(id),
    onSuccess: invalidate,
  });

  const deptList = deptData?.data || [];
  const filteredDepts = deptList.filter((d) => `${d.name} ${d.description || ''}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const total = filteredDepts.length;
  const totalPages = Math.ceil(total / 10) || 1;
  const departments = filteredDepts.slice((page - 1) * 10, page * 10);

  const openForm = (dept = emptyForm) => {
    setForm({ id: dept.id || null, name: dept.name || '', description: dept.description || '' });
    setErrorText('');
    setIsOpen(true);
  };

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Departments</h1>
        <p className="text-muted-foreground mt-2">Manage organization departments</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={20} />
            <input type="text" placeholder="Search departments..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={20} />
          Add Department
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? <div className="p-8 text-center">Loading...</div> : departments.length === 0 ? <div className="p-8 text-center text-muted-foreground">No departments found</div> : (
          <>
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Description</th>
                  <th className="text-left px-6 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-center px-6 py-3 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id} className="border-b border-border hover:bg-secondary/50">
                    <td className="px-6 py-4 text-foreground font-medium">{dept.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{dept.description || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${dept.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{dept.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openForm(dept)} className="text-primary hover:bg-secondary p-2 rounded-lg" title="Edit department"><Edit size={18} /></button>
                        <button onClick={() => statusMutation.mutate({ id: dept.id, active: !dept.is_active })} className="text-muted-foreground hover:bg-secondary p-2 rounded-lg" title={dept.is_active ? 'Disable department' : 'Enable department'}><Power size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50">Previous</button>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground">{form.id ? 'Edit Department' : 'Add Department'}</h2>
            {errorText && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{errorText}</div>}
            <input required placeholder="Department name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-border rounded-lg bg-input" />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 border border-border rounded-lg bg-input" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border border-border rounded-lg">Cancel</button>
              <button disabled={saveMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">{saveMutation.isPending ? 'Saving...' : 'Save Department'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  if (isSubSection) return content;
  return <MainLayout>{content}</MainLayout>;
}
