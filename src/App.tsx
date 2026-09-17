import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Search,
  KeyRound,
  Shield,
  FileCheck,
  AlertCircle,
  Clock,
  Lock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Smartphone,
  Laptop
} from 'lucide-react';
import { Header } from './components/Header';
import { PinInput } from './components/PinInput';
import { UploadModal } from './components/UploadModal';
import { FileCard } from './components/FileCard';
import { SecurityNotice } from './components/SecurityNotice';
import { FileMetadata, AccessResponse } from './types';
const API_URL = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [searchPin, setSearchPin] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [accessedFile, setAccessedFile] = useState<FileMetadata | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Parse PIN from URL hash on load (e.g. #pin=123456) for quick mobile QR handoffs
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('pin=')) {
        const pinMatch = hash.match(/pin=(\d{6})/);
        if (pinMatch && pinMatch[1]) {
          setSearchPin(pinMatch[1]);
          // Auto search
          handleAccessWithPin(pinMatch[1]);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleAccessWithPin = async (pinToSearch: string) => {
    if (lockoutRemaining > 0) return;

    if (!pinToSearch || pinToSearch.length !== 6 || !/^\d{6}$/.test(pinToSearch)) {
      setErrorMessage('Please enter a complete 6-digit numeric PIN.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';

const res = await fetch(`${API_URL}/api/files/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToSearch })
      });

      const data: AccessResponse = await res.json();

      if (res.status === 429) {
        // Rate limited
        const lockoutSec = data.lockedUntil ? Math.ceil((data.lockedUntil - Date.now()) / 1000) : 60;
        setLockoutRemaining(Math.max(lockoutSec, 5));
        setErrorMessage(data.error || 'Too many attempts. Temporary lockout activated.');
        setIsSearching(false);
        return;
      }

      if (!res.ok || !data.success || !data.file) {
        setErrorMessage(data.error || 'Invalid PIN or file not found.');
        setAccessedFile(null);
        setAccessToken(undefined);
        setIsSearching(false);
        return;
      }

      // Successful PIN authentication!
      setAccessedFile(data.file);
      setAccessToken(data.accessToken);
      setErrorMessage(null);
      setIsSearching(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to verify PIN. Please check your connection.');
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAccessWithPin(searchPin);
  };

  const handleUploadSuccess = (file: FileMetadata, pin: string) => {
    setSearchPin(pin);
    setAccessedFile(file);
    showToast(`File "${file.originalName}" is ready with PIN ${pin}!`);
  };

  const handleDeleteSuccess = () => {
    setAccessedFile(null);
    setAccessToken(undefined);
    setSearchPin('');
    showToast('File permanently deleted from storage.');
  };

  const handleClearAccess = () => {
    setAccessedFile(null);
    setAccessToken(undefined);
    setSearchPin('');
    setErrorMessage(null);
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header onOpenUpload={() => setIsUploadModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-10 sm:py-16 max-w-5xl mx-auto w-full">
        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 z-50 px-5 py-3 rounded-2xl bg-blue-600 text-white font-medium text-xs sm:text-sm shadow-xl flex items-center gap-2.5 border border-blue-500"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Switching: File Card or PIN Search & Upload Hub */}
        <AnimatePresence mode="wait">
          {accessedFile ? (
            /* Active File Result View (Visible ONLY when correct PIN is entered) */
            <FileCard
              key="file-card-view"
              file={accessedFile}
              pin={searchPin}
              accessToken={accessToken}
              onDeleteSuccess={handleDeleteSuccess}
              onClear={handleClearAccess}
            />
          ) : (
            /* Main Hub: Zero-knowledge landing page */
            <motion.div
              key="main-hub-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center"
            >
              {/* Hero Section */}
              <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-5 shadow-xs">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>No login • No signup • 100% Anonymous</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-[1.15]">
                  Share Files Across Devices
                </h1>

                <p className="mt-4 text-base sm:text-lg text-slate-500 leading-relaxed max-w-xl mx-auto">
                  Upload a file, create a 6-digit PIN, and access it instantly on another device.
                </p>
              </div>

              {/* Primary Interaction Container */}
              <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative">
                {/* 1. Prominent PIN Search Bar */}
                <div className="mb-8">
                  <div className="text-center mb-5">
                    <label
                      htmlFor="main-pin-search-input"
                      className="block text-sm font-bold text-slate-900 tracking-tight"
                    >
                      Enter 6-digit PIN to access your file
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      Files remain strictly confidential until the matching PIN is provided
                    </p>
                  </div>

                  <form onSubmit={handleSearchSubmit} className="space-y-5">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <PinInput
                        id="main-pin-search-input"
                        value={searchPin}
                        onChange={(val) => {
                          setSearchPin(val);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        onComplete={(completedPin) => {
                          handleAccessWithPin(completedPin);
                        }}
                        disabled={isSearching || lockoutRemaining > 0}
                        error={Boolean(errorMessage)}
                        autoFocus
                      />
                    </div>

                    {/* Error / Lockout Alert */}
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        id="search-error-alert"
                        className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span>{errorMessage}</span>
                          {lockoutRemaining > 0 && (
                            <span className="block font-mono text-xs font-bold text-rose-800 mt-1">
                              Retry permitted in {lockoutRemaining}s
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      id="access-file-submit-btn"
                      disabled={isSearching || searchPin.length !== 6 || lockoutRemaining > 0}
                      className={`
                        w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm
                        ${
                          isSearching || searchPin.length !== 6 || lockoutRemaining > 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01]'
                        }
                      `}
                    >
                      {isSearching ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying 6-Digit PIN...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Search / Access File</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Divider */}
                <div className="relative my-8 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <span className="relative px-4 text-xs uppercase tracking-wider font-semibold text-slate-400 bg-white">
                    or send a file
                  </span>
                </div>

                {/* 2. Upload Action CTA */}
                <div className="text-center">
                  <button
                    type="button"
                    id="main-upload-trigger-btn"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
                  >
                    <div className="p-1 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span>Upload File</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <p className="text-[11px] text-slate-500 mt-2.5">
                    Fast drag & drop • Supports any file type up to 100MB
                  </p>
                </div>
              </div>

              {/* Cross-Device Demonstration Pill */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
                  <Laptop className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-700 font-medium">Upload on Computer</span>
                </div>
                <span className="text-slate-400">→</span>
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-700 font-medium">Share 6-Digit PIN</span>
                </div>
                <span className="text-slate-400">→</span>
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-700 font-medium">Download on Phone</span>
                </div>
              </div>

              {/* Security Badges & Privacy Architecture */}
              <SecurityNotice />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Upload File Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} PIN File Transfer. No account or email collected.</p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Service Online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
