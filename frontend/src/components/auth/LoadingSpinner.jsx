import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F1F0E3]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1A1A14]/10 border-t-[#1A1A14]" />
    </div>
  );
}
