import React, { useEffect, useState } from 'react';
import {
  User, Mail, Building2, Shield, Users, Briefcase, Calendar, Clock, AtSign, Lock, Save,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { authAPI } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizeAuthUser } from '../../utils/authUser';
import { validatePassword } from '../../utils/validators';
import {
  appPageShell, appPageTitle, appPageDesc, appGlassCard, appGrid,
  appSectionTitle, appBadgeActive, appBadgeInactive, appBadgeInfo, appEmpty, appBtnPrimary,
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
        <p className="text-sm font-medium text-[#1A1A14] mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.getProfile();
      const normalized = normalizeAuthUser(data);
      setProfile(normalized);
      setFirstName(normalized.firstName || '');
      setLastName(normalized.lastName || '');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load profile.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error('First name is required.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
      });
      setProfile(normalizeAuthUser(data));
      setEditing(false);
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!validatePassword(newPassword)) {
      setPasswordError('Password must be at least 8 characters with uppercase, lowercase, and numbers.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully. Please sign in again if prompted.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to change password.'));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = profile?.is_active ? appBadgeActive : appBadgeInactive;
  const statusLabel = profile?.is_active ? 'Active' : 'Inactive';

  return (
    <MainLayout>
      <div className={appPageShell}>
        <div className="min-w-0">
          <h1 className={`${appPageTitle} flex items-center gap-2`}>
            <User size={32} className="text-[#1A1A14] shrink-0" />
            My Profile
          </h1>
          <p className={appPageDesc}>
            View and update your account details.
          </p>
        </div>

        {loading ? (
          <div className={appEmpty}>Loading profile...</div>
        ) : !profile ? (
          <div className={appEmpty}>Unable to load profile. Please try refreshing the page.</div>
        ) : (
          <div className={`${appGrid} grid-cols-1 lg:grid-cols-3 gap-6`}>
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
                <span className={`${appBadgeInfo} mt-2`}>{profile.role}</span>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className={appGlassCard}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={appSectionTitle}>Account Information</h2>
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-sm font-medium text-[#1A1A14] hover:underline"
                    >
                      Edit profile
                    </button>
                  )}
                </div>

                {editing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#6A6A60] mb-1">First name</label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full rounded-xl border border-[#1A1A14]/15 px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6A6A60] mb-1">Last name</label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full rounded-xl border border-[#1A1A14]/15 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className={appBtnPrimary}>
                        <Save size={16} /> {saving ? 'Saving...' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setFirstName(profile.firstName || '');
                          setLastName(profile.lastName || '');
                        }}
                        className="px-4 py-2 text-sm rounded-xl border border-[#1A1A14]/15"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className={`${appGrid} grid-cols-1 sm:grid-cols-2`}>
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
                )}
              </div>

              <div className={appGlassCard}>
                <h2 className={`${appSectionTitle} mb-4 flex items-center gap-2`}>
                  <Lock size={18} /> Change Password
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-medium text-[#6A6A60] mb-1">Current password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#1A1A14]/15 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6A6A60] mb-1">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#1A1A14]/15 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6A6A60] mb-1">Confirm new password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-[#1A1A14]/15 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  {passwordError && <p className="text-red-600 text-sm">{passwordError}</p>}
                  <button type="submit" disabled={saving} className={appBtnPrimary}>
                    {saving ? 'Updating...' : 'Update password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
