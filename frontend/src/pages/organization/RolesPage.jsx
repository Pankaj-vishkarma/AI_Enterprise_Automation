import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { rolesAPI } from '../../api/roles';
import { permissionsAPI } from '../../api/permissions';
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
  orgPageTitle, orgPageDesc, orgSectionTitle, orgInputPlain,
  orgBtnPrimary, orgBtnGhost, orgBtnIconPrimary, orgBtnIconDanger,
  orgGlassCard, orgBadgePerm, orgModalOverlay, orgModal, orgError,
  orgEmpty, orgLoading,
} from './orgStyles';

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
    <div className="space-y-5 sm:space-y-6">
      {!isSubSection ? (
        <div>
          <h1 className={orgPageTitle}>Roles & Permissions</h1>
          <p className={orgPageDesc}>Manage user roles and permission assignments</p>
        </div>
      ) : (
        <div>
          <h2 className={orgSectionTitle}>Roles & Permissions</h2>
          <p className={orgPageDesc}>Manage user roles and permission assignments</p>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={() => openForm()} className={orgBtnPrimary}>
          <Plus size={18} />
          Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {isLoading ? (
          <div className={`col-span-full ${orgLoading}`}>Loading...</div>
        ) : roles.length === 0 ? (
          <div className={`col-span-full ${orgEmpty}`}>No roles found</div>
        ) : (
          roles.map((role) => (
            <div key={role.id} className={orgGlassCard}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[#1A1A14] truncate">{role.name}</h3>
                  <p className="text-sm text-[#6A6A60] mt-1">{role.permissions?.length || 0} permissions assigned</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => openForm(role)} className={orgBtnIconPrimary} title="Edit role">
                    <Edit size={18} />
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(role.id)} className={orgBtnIconDanger} title="Delete role">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#6A6A60] mb-2 uppercase tracking-wider">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {(role.permissions || []).map((perm) => (
                    <span key={perm.id} className={orgBadgePerm}>{perm.name}</span>
                  ))}
                  {!role.permissions?.length && <span className="text-xs text-[#6A6A60]">No permissions assigned</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div className={orgModalOverlay}>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className={`${orgModal} max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <h2 className={orgSectionTitle}>{form.id ? 'Edit Role' : 'Add Role'}</h2>
            {errorText && <div className={orgError}>{errorText}</div>}
            <input required placeholder="Role name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={orgInputPlain} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto border border-[#1A1A14]/10 rounded-xl p-3 bg-white/30">
              {permissions.map((permission) => (
                <label key={permission.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#1A1A14]/5 cursor-pointer transition-colors">
                  <input type="checkbox" checked={form.permission_ids.includes(permission.id)} onChange={() => togglePermission(permission.id)} className="mt-1 accent-[#1A1A14]" />
                  <span>
                    <span className="block text-sm font-semibold text-[#1A1A14]">{permission.name}</span>
                    <span className="block text-xs text-[#6A6A60]">{permission.description || 'No description'}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className={orgBtnGhost}>Cancel</button>
              <button type="submit" disabled={saveMutation.isPending} className={orgBtnPrimary}>{saveMutation.isPending ? 'Saving...' : 'Save Role'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  if (isSubSection) return content;
  return <MainLayout>{content}</MainLayout>;
}
