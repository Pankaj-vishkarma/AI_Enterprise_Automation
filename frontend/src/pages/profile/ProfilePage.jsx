import React, { useEffect, useState } from 'react';
import {
  User, Mail, Building2, Shield, Users, Briefcase, Calendar, Clock, AtSign,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { authAPI } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizeAuthUser } from '../../utils/authUser';
import {
  appPageShell, appPageTitle, appPageDesc, appGlassCard, appGrid,
  appBadgeActive, appBadgeInactive, appLoading,
} from '../../styles/appStyles';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProfileField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-[#1A1A14]/5 border border-[#1A1A14]/10 flex items-center justify-center">
        <Icon size={16} className="text-[#6A6A60]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6A6A60]">{label}</p>
        <p className="text-sm sm:text-base font-medium text-[#1A1A14] mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data } = await authAPI.getProfile();
        if (!cancelled) {
          setProfile(normalizeAuthUser(data));
          toast.success('Profile loaded successfully.');
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, 'Failed to load profile.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBadge = profile?.is_active ? appBadgeActive : appBadgeInactive;
  const statusLabel = profile?.is_active ? 'Active' : 'Inactive';

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div>
          <h1 className={appPageTitle}>My Profile</h1>
          <p className={appPageDesc}>View your account details and organization membership.</p>
        </div>

        {loading ? (
          <div className={appLoading}>Loading profile...</div>
        ) : !profile ? (
          <div className={appGlassCard}>
            <p className="text-sm text-[#6A6A60] text-center py-8">
              Unable to load profile. Please try refreshing the page.
            </p>
          </div>
        ) : (
          <div className={`${appGrid} grid-cols-1 lg:grid-cols-3`}>
            <div className={`lg:col-span-1 ${appGlassCard} flex flex-col items-center text-center`}>
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#1A1A14] to-[#4B4B42] flex items-center justify-center text-[#F1F0E3] font-bold text-2xl sm:text-3xl shadow-[0_0_20px_rgba(240,245,31,0.2)]">
                {profile.firstName?.[0]}
                {profile.lastName?.[0] || profile.firstName?.[1] || ''}
              </div>
              <h2 className="mt-4 text-lg sm:text-xl font-bold text-[#1A1A14] break-words w-full">
                {profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim()}
              </h2>
              <p className="text-sm text-[#6A6A60] mt-1 break-all w-full">{profile.email}</p>
              <span className={`${statusBadge} mt-4`}>{statusLabel}</span>
              {profile.role && (
                <span className="mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1A1A14]/5 text-[#1A1A14] border border-[#1A1A14]/10">
                  {profile.role}
                </span>
              )}
            </div>

            <div className={`lg:col-span-2 ${appGlassCard}`}>
              <h3 className="text-lg font-bold text-[#1A1A14] mb-5">Account Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <ProfileField icon={User} label="Full Name" value={profile.fullName} />
                <ProfileField icon={Mail} label="Email" value={profile.email} />
                <ProfileField icon={AtSign} label="Username" value={profile.username || 'Not set'} />
                <ProfileField icon={Shield} label="Role" value={profile.role} />
                <ProfileField icon={Building2} label="Organization" value={profile.organizationName} />
                <ProfileField icon={Briefcase} label="Department" value={profile.department} />
                <ProfileField icon={Users} label="Team" value={profile.team} />
                <ProfileField icon={Calendar} label="Account Created" value={formatDate(profile.createdAt)} />
                <ProfileField icon={Clock} label="Last Login" value={formatDate(profile.lastLogin)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
