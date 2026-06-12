import React from 'react';
import {
  appBtnPrimary, appBtnGhost, appInputPlain, appCard, appCardPadding,
  appModalOverlay, appModal, appLabel, appBadgeActive, appBadgeWarning,
  appBadgeError, appBadgeInfo, appBadgeInactive,
} from '../../styles/appStyles';

export function Button({ children, variant = 'primary', size = 'md', disabled = false, className = '', ...props }) {
  const variants = {
    primary: appBtnPrimary,
    secondary: appBtnGhost,
    destructive: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-red-600 text-white hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-[#1A1A14] hover:bg-[#1A1A14]/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: '',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div>
      {label && <label className={appLabel}>{label}</label>}
      <input className={`${appInputPlain} ${className}`} {...props} />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`${appCard} ${appCardPadding} ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: appBadgeInactive,
    success: appBadgeActive,
    warning: appBadgeWarning,
    error: appBadgeError,
    info: appBadgeInfo,
  };

  return (
    <span className={`inline-block ${variants[variant]}`}>
      {children}
    </span>
  );
}

export function Modal({ isOpen, onClose, title, children, className = '' }) {
  if (!isOpen) return null;

  return (
    <div className={appModalOverlay} onClick={onClose}>
      <div className={`${appModal} max-w-md ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1A14]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[#6A6A60] hover:text-[#1A1A14] text-xl leading-none p-1 rounded-lg hover:bg-[#1A1A14]/5 transition"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
