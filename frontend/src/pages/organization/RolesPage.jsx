import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { rolesAPI } from '../../api/roles';
import { permissionsAPI } from '../../api/permissions';
import { Plus, Edit, Trash2 } from 'lucide-react';

const emptyForm = { id: null, name: '', permission_ids: [] };

export default function RolesPage({ isSubSection = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [errorText, setErrorText] = useState('');

  const { data: rolesData, isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => rolesAPI.list() });
  const { data: permissionsData } = useQuery({ queryKey: ['permissions'], queryFn: () => permissionsAPI.list() });
  const roles = rolesData?.data || [];
  const permissions = permissionsData?.data || [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles'] });

  const saveMutation = useMutation({
    mutationFn: () => form.id
      ? rolesAPI.update(form.id, { name: form.name, permission_ids: form.permission_ids })
      : rolesAPI.create({ name: form.name, permission_ids: form.permission_ids }),
    onSuccess: () => { invalidate(); setIsOpen(false); setForm(emptyForm); setErrorText(''); },
    onError: (err) => setErrorText(err.response?.data?.detail || 'Unable to save role'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => rolesAPI.delete(id),
    onSuccess: invalidate,
    onError: (err) => alert(err.response?.data?.detail || 'Unable to delete role'),
  });

  const openForm = (role = null) => {
    setForm(role ? {
      id: role.id,
      name: role.name,
      permission_ids: (role.permissions || []).map((p) => p.id),
    } : emptyForm);
    setErrorText('');
    setIsOpen(true);
  };
  const togglePermission = (id) => {
    setForm((current) => ({
      ...current,
      permission_ids: current.permission_ids.includes(id)
        ? current.permission_ids.filter((permissionId) => permissionId !== id)
        : [...current.permission_ids, id],
    }));
  };

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Roles & Permissions</h1>
        <p className="text-muted-foreground mt-2">Manage user roles and permission assignments</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => openForm()} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
          <Plus size={20} />
          Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">Loading...</div>
        ) : roles.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">No roles found</div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{role.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{role.permissions?.length || 0} permissions assigned</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openForm(role)} className="text-primary hover:bg-secondary p-2 rounded-lg" title="Edit role">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(role.id)} className="text-destructive hover:bg-red-50 p-2 rounded-lg" title="Delete role">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {(role.permissions || []).map((perm) => (
                    <span key={perm.id} className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full">{perm.name}</span>
                  ))}
                  {!role.permissions?.length && <span className="text-xs text-muted-foreground">No permissions assigned</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground">{form.id ? 'Edit Role' : 'Add Role'}</h2>
            {errorText && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{errorText}</div>}
            <input required placeholder="Role name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-border rounded-lg bg-input" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto border border-border rounded-lg p-3">
              {permissions.map((permission) => (
                <label key={permission.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/60 cursor-pointer">
                  <input type="checkbox" checked={form.permission_ids.includes(permission.id)} onChange={() => togglePermission(permission.id)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{permission.name}</span>
                    <span className="block text-xs text-muted-foreground">{permission.description || 'No description'}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border border-border rounded-lg">Cancel</button>
              <button disabled={saveMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">{saveMutation.isPending ? 'Saving...' : 'Save Role'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  if (isSubSection) return content;
  return <MainLayout>{content}</MainLayout>;
}
