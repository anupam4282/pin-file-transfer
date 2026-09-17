import React, { useState } from 'react';
import { Shield, Lock, Info, HelpCircle, X, CheckCircle2, Sparkles, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onOpenUpload: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenUpload }) => {
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);

  return (
    <header className="w-full border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
                PIN File Transfer
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                Zero-Account
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Anonymous, cross-device file sharing
            </p>
          </div>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            id="how-it-works-btn"
            onClick={() => setShowHowItWorks(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">How it works</span>
          </button>

          <button
            type="button"
            id="header-upload-btn"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* How it Works Modal */}
      <AnimatePresence>
        {showHowItWorks && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowHowItWorks(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-slate-900 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">How PIN Transfer Works</h3>
                </div>
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-3.5 text-xs sm:text-sm text-slate-600">
                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-0.5">Upload & Set a 6-Digit PIN</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Select your file from your laptop or phone. Set a custom or auto-generated 6-digit numeric PIN.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-0.5">Access on Any Other Device</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Open this site on your second device, enter the exact 6-digit PIN, and press Access. No file list is ever displayed publicly.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-0.5">Download & Delete</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Download the original file instantly. Once finished, delete it permanently or let it automatically expire.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
