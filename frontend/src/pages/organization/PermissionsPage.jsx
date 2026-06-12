import React from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../components/layout/MainLayout';
import { permissionsAPI } from '../../api/permissions';
import { Shield } from 'lucide-react';
import { orgPageTitle, orgPageDesc, orgSectionTitle, orgGlassCard, orgEmpty, orgLoading } from './orgStyles';

export default function PermissionsPage({ isSubSection = false }) {
  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsAPI.list(),
  });

  const permissions = permissionsData?.data || [];

  const content = (
    <div className="space-y-5 sm:space-y-6">
      {!isSubSection ? (
        <div>
          <h1 className={orgPageTitle}>Permissions</h1>
          <p className={orgPageDesc}>View system permissions used for Role-Based Access Control (RBAC)</p>
        </div>
      ) : (
        <div>
          <h2 className={orgSectionTitle}>Permissions</h2>
          <p className={orgPageDesc}>View system permissions used for Role-Based Access Control (RBAC)</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className={`col-span-full flex justify-center items-center ${orgLoading}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1A1A14]/20 border-t-[#1A1A14]" />
          </div>
        ) : permissions.length === 0 ? (
          <div className={`col-span-full ${orgEmpty} border border-dashed border-[#1A1A14]/15 rounded-2xl`}>
            No permissions found
          </div>
        ) : (
          permissions.map((perm) => (
            <div key={perm.id} className={`${orgGlassCard} flex gap-3 items-start`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1A1A14] to-[#4B4B42] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(240,245,31,0.2)]">
                <Shield size={16} className="text-[#F1F0E3]" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-bold text-[#1A1A14] truncate">{perm.name}</h3>
                <p className="text-xs text-[#6A6A60] leading-relaxed">{perm.description || 'No description provided'}</p>
                <p className="text-[10px] text-[#6A6A60] mt-2 font-medium">Permission ID: #{perm.id}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (isSubSection) return content;

  return (
    <MainLayout>
      {content}
    </MainLayout>
  );
}
