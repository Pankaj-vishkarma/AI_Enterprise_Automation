import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { organizationsAPI } from '../../api/organizations';
import { Building2, Edit, Loader, Search } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  appPageShell, appPageTitle, appPageDesc, appGlassCard, appBtnGhost, appBtnPrimary,
  appInputPlain, appSelect, appModalOverlay, appModal, appLabel, appEmpty,
} from '../../styles/appStyles';
import {
  orgInputWithIcon, orgSelect, orgPagination, orgLoading,
} from './orgStyles';

const ORG_TOOLBAR_GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0';

const PAGE_SIZE = 10;

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', status: 'active' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['organizations', page, searchTerm, statusFilter],
    queryFn: () => organizationsAPI.list(queryParams),
  });
  const organizations = data?.data || [];
  const hasNextPage = organizations.length === PAGE_SIZE;

  const saveMutation = useMutation({
    mutationFn: () => organizationsAPI.update(editing.id, form),
    onSuccess: (response) => {
      queryClient.setQueryData(['organizations', page, searchTerm, statusFilter], (current) => {
        if (!current?.data) {
          return current;
        }
        return {
          ...current,
          data: current.data.map((org) => (
            org.id === editing.id ? { ...org, ...response.data } : org
          )),
        };
      });
      setEditing(null);
      toast.success('Organization updated successfully.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Unable to update organization.'));
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

        <div className={ORG_TOOLBAR_GRID}>
          <div className="relative w-full min-w-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#6A6A60]"
              size={18}
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className={`${orgInputWithIcon} w-full min-w-0`}
              aria-label="Search organizations"
            />
          </div>
          <select
            className={`${orgSelect} w-full min-w-0`}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </select>
        </div>

        {isLoading ? (
          <div className={orgLoading}>Loading...</div>
        ) : organizations.length === 0 ? (
          <div className={appEmpty}>No organizations found.</div>
        ) : (
          <>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-sm text-[#6A6A60]">Page {page}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className={orgPagination}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                  className={orgPagination}
                >
                  Next
                </button>
              </div>
            </div>
          </>
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
                <button
                  type="button"
                  className={appBtnPrimary}
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? <Loader className="animate-spin" size={16} /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
