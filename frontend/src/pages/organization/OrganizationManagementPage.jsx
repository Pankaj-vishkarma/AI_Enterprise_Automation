import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import UsersPage from './UsersPage';
import DepartmentsPage from './DepartmentsPage';
import TeamsPage from './TeamsPage';
import RolesPage from './RolesPage';
import PermissionsPage from './PermissionsPage';
import { Users, Network, Lock, Shield, Sparkles } from 'lucide-react';
import { orgSearchWrap, orgToolbarRow, orgPageShell, orgPageTitle, orgPageDesc, orgCard, orgTabActive, orgTabInactive } from './orgStyles';

export default function OrganizationManagementPage() {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Users', icon: Users, component: UsersPage },
    { id: 'departments', label: 'Departments', icon: Network, component: DepartmentsPage },
    { id: 'teams', label: 'Teams', icon: Network, component: TeamsPage },
    { id: 'roles', label: 'Roles', icon: Lock, component: RolesPage },
    { id: 'permissions', label: 'Permissions', icon: Shield, component: PermissionsPage },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || UsersPage;

  return (
    <MainLayout>
      <div className={orgPageShell}>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-xs w-fit mb-4 bg-white/45 border border-[#1A1A14]/10 backdrop-blur-md">
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#1A1A14] to-[#4B4B42] text-[#F1F0E3] font-medium flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Organization
            </span>
          </div>
          <h1 className={orgPageTitle}>Organization & User Management</h1>
          <p className={orgPageDesc}>
            Configure departments, manage teams, assign user roles, customize permissions, and coordinate system access.
          </p>
        </div>

        <div className="border-b border-[#1A1A14]/10 flex gap-4 sm:gap-6 text-xs uppercase tracking-wider overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? orgTabActive : orgTabInactive}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`${orgCard} p-5 sm:p-6 min-h-[400px]`}>
          <ActiveComponent isSubSection={true} />
        </div>
      </div>
    </MainLayout>
  );
}
