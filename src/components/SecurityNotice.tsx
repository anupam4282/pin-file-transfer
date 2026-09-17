import React from 'react';
import { ShieldCheck, UserX, KeyRound, Flame, Timer, Lock } from 'lucide-react';

export const SecurityNotice: React.FC = () => {
  return (
    <div id="security-features-section" className="w-full max-w-4xl mx-auto mt-16 sm:mt-20">
      <div className="text-center mb-8">
        <span className="text-[11px] font-bold uppercase tracking-widest text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Built For Absolute Privacy
        </span>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-3">
          Zero-Knowledge Architecture
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mt-1">
          No files, filenames, or previews are ever exposed without the exact 6-digit PIN.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3.5">
            <UserX className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">No Accounts Required</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            No sign-ups, no passwords, no email collection, and no tracking cookies.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-3.5">
            <KeyRound className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Salted Cryptographic Hash</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            PINs are hashed using salted scrypt keys. Cleartext PINs are never stored in the database.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-3.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Brute-Force Shield</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Rate limiting and exponential lockouts actively prevent automated PIN guessing attacks.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-3.5">
            <Flame className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 mb-1">Guaranteed Erasure</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Instant manual deletion and background auto-expiry shred stored files completely.
          </p>
        </div>
      </div>
    </div>
  );
};
