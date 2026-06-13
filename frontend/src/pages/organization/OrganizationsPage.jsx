import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { organizationsAPI } from '../../api/organizations';
import { Building2, Edit, Loader } from 'lucide-react';
import {
  appPageShell, appPageTitle, appPageDesc, appGlassCard, appBtnGhost, appBtnPrimary,
  appInputPlain, appSelect, appModalOverlay, appModal, appLabel, appEmpty,
} from '../../styles/appStyles';

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', status: 'active' });

  const { data, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => organizationsAPI.list(),
  });
  const organizations = data?.data || [];

  const saveMutation = useMutation({
    mutationFn: () => organizationsAPI.update(editing.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setEditing(null);
    },
  });

  const openEdit = (org) => {
    setEditing(org);
    setForm({ name: org.name, status: org.status || 'active' });
  };

  return (
    <MainLayout>
      <div className={appPageShell}>
        <h1 className={`${appPageTitle} flex items-center gap-2`}>
          <Building2 size={28} /> Organizations
        </h1>
        <p className={appPageDesc}>Manage tenant organizations across the platform.</p>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader className="animate-spin" /></div>
        ) : organizations.length === 0 ? (
          <div className={appEmpty}>No organizations found.</div>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div key={org.id} className={`${appGlassCard} flex items-center justify-between gap-4`}>
                <div>
                  <p className="font-semibold text-[#1A1A14]">{org.name}</p>
                  <p className="text-xs text-[#6A6A60]">
                    ID {org.id} · Status: {org.status}
                  </p>
                </div>
                <button type="button" className={appBtnGhost} onClick={() => openEdit(org)}>
                  <Edit size={14} /> Edit
                </button>
              </div>
            ))}
          </div>
        )}
        {editing && (
          <div className={appModalOverlay}>
            <div className={appModal}>
              <h2 className="text-lg font-bold mb-4">Edit Organization</h2>
              <div className="space-y-3">
                <div>
                  <label className={appLabel}>Name</label>
                  <input
                    className={appInputPlain}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={appLabel}>Status</label>
                  <select
                    className={appSelect}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className={appBtnGhost} onClick={() => setEditing(null)}>Cancel</button>
                <button type="button" className={appBtnPrimary} onClick={() => saveMutation.mutate()}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
