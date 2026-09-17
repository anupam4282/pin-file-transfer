import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  X,
  FileCheck,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Share2,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PinInput } from './PinInput';
import { formatBytes, getFileIcon, generateSecurePin } from '../lib/fileUtils';
import { FileMetadata, UploadResponse } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (file: FileMetadata, pin: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [expiryHours, setExpiryHours] = useState<number>(48);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: FileMetadata; pin: string } | null>(null);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setFile(null);
    setPin('');
    setConfirmPin('');
    setError(null);
    setResult(null);
    setIsUploading(false);
    setUploadProgress(0);
    setCopiedPin(false);
    setCopiedLink(false);
    setShowQr(false);
  };

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size exceeds the 100MB maximum limit.');
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleGeneratePin = () => {
    const generated = generateSecurePin();
    setPin(generated);
    setConfirmPin(generated);
    setError(null);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('Please enter a valid 6-digit numeric PIN.');
      return;
    }

    if (pin !== confirmPin) {
      setError('The PIN and confirmation PIN do not match.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pin', pin);
      formData.append('confirmPin', confirmPin);
      formData.append('expiryHours', expiryHours.toString());

      // Progress animation simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 150);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data: UploadResponse = await res.json();

      if (!res.ok || !data.success || !data.file) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult({ file: data.file, pin });
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const copyToClipboard = (text: string, type: 'pin' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'pin') {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2500);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareableUrl = result ? `${currentUrl}/#pin=${result.pin}` : '';
  const qrCodeUrl = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareableUrl)}`
    : '';

  return (
    <div
      id="upload-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-900 overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {result ? 'File Uploaded Successfully' : 'Upload File & Set PIN'}
              </h2>
              <p className="text-xs text-slate-500">
                {result
                  ? 'Save your 6-digit PIN to access this file later'
                  : 'No account needed. Set a 6-digit PIN to access on another device'}
              </p>
            </div>
          </div>

          <button
            id="close-upload-modal-btn"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isUploading}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-6">
          {error && (
            <div
              id="upload-error-alert"
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm"
            >
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <form onSubmit={handleUploadSubmit} className="space-y-6">
              {/* Step 1: File Drop Zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  1. Select File (Up to 100MB)
                </label>

                {!file ? (
                  <div
                    id="file-drop-zone"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
                      ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                          : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20'
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="file-input-element"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                    />
                    <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Upload className="w-7 h-7" />
                    </div>
                    <p className="text-base font-semibold text-slate-800">
                      Drag and drop your file here, or{' '}
                      <span className="text-blue-600 underline decoration-blue-500/50 underline-offset-4">
                        browse
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Supports all formats: documents, archives, videos, photos, code, audio
                    </p>
                  </div>
                ) : (
                  <div
                    id="selected-file-preview"
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-blue-600">
                        {getFileIcon(file.name, file.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(file.size)} • {file.type || 'Binary file'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="remove-selected-file-btn"
                      onClick={() => setFile(null)}
                      disabled={isUploading}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: 6-Digit PIN Creation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    2. Create 6-Digit Access PIN
                  </label>
                  <button
                    type="button"
                    id="generate-random-pin-btn"
                    onClick={handleGeneratePin}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Secure PIN
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <PinInput
                    id="create-pin-input"
                    value={pin}
                    onChange={(val) => {
                      setPin(val);
                      if (error) setError(null);
                    }}
                    disabled={isUploading}
                    autoFocus={Boolean(file)}
                  />
                </div>
              </div>

              {/* Step 3: PIN Confirmation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  3. Confirm 6-Digit PIN
                </label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <PinInput
                    id="confirm-pin-input"
                    value={confirmPin}
                    onChange={(val) => {
                      setConfirmPin(val);
                      if (error) setError(null);
                    }}
                    disabled={isUploading}
                  />
                </div>
                {pin && confirmPin && pin === confirmPin && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 mt-2 font-medium">
                    <Check className="w-3.5 h-3.5" /> PIN matched and verified
                  </p>
                )}
                {confirmPin && pin && confirmPin.length === 6 && pin !== confirmPin && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-600 mt-2 font-medium">
                    <X className="w-3.5 h-3.5" /> PINs do not match
                  </p>
                )}
              </div>

              {/* Expiry Options */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  File Auto-Expiration
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { hours: 24, label: '24 Hours' },
                    { hours: 48, label: '48 Hours' },
                    { hours: 168, label: '7 Days' },
                  ].map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      id={`expiry-opt-${opt.hours}`}
                      onClick={() => setExpiryHours(opt.hours)}
                      disabled={isUploading}
                      className={`
                        py-2.5 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer
                        ${
                          expiryHours === opt.hours
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {opt.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Uploading and encrypting metadata...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-600"
                      initial={{ width: '0%' }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ ease: 'easeOut', duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  id="cancel-upload-btn"
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  disabled={isUploading}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-upload-btn"
                  disabled={isUploading || !file || pin.length !== 6 || confirmPin !== pin}
                  className={`
                    px-6 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm
                    ${
                      isUploading || !file || pin.length !== 6 || confirmPin !== pin
                        ? 'bg-blue-300 text-white cursor-not-allowed shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01]'
                    }
                  `}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Upload File
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Upload Success Confirmation Screen */
            <div id="upload-confirmation-screen" className="space-y-6">
              {/* File Info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl">
                  <FileCheck className="w-8 h-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      Uploaded & Ready
                    </span>
                  </div>
                  <p className="text-base font-bold text-slate-900 truncate mt-1">
                    {result.file.originalName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(result.file.size)} • Uploaded just now
                  </p>
                </div>
              </div>

              {/* 6-Digit PIN Display Card */}
              <div className="p-6 bg-blue-50/50 border-2 border-blue-200 rounded-2xl text-center relative overflow-hidden">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-3">
                  Your 6-Digit Access PIN
                </p>

                <div className="flex items-center justify-center gap-2 sm:gap-3 my-2">
                  {result.pin.split('').map((digit, i) => (
                    <div
                      key={i}
                      className="w-11 h-14 sm:w-14 sm:h-16 flex items-center justify-center font-mono font-bold text-2xl sm:text-3xl text-slate-900 bg-white border-2 border-blue-300 rounded-xl shadow-xs"
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <button
                    type="button"
                    id="copy-pin-btn"
                    onClick={() => copyToClipboard(result.pin, 'pin')}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm
                      ${
                        copiedPin
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]'
                      }
                    `}
                  >
                    {copiedPin ? (
                      <>
                        <Check className="w-4 h-4" />
                        PIN Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy 6-Digit PIN
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="copy-link-btn"
                    onClick={() => copyToClipboard(shareableUrl, 'link')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-blue-600" />
                        Copy Access Link
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="toggle-qr-btn"
                    onClick={() => setShowQr(!showQr)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-slate-500" />
                    {showQr ? 'Hide QR' : 'Show QR'}
                  </button>
                </div>

                {/* QR Code for Mobile device handoff */}
                {showQr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-blue-100 flex flex-col items-center"
                  >
                    <p className="text-xs text-blue-800 mb-2 font-medium">
                      Scan with your phone camera to open file:
                    </p>
                    <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200">
                      <img
                        src={qrCodeUrl}
                        alt="QR code to access file"
                        className="w-36 h-36"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Critical Warning Callout */}
              <div
                id="pin-save-warning"
                className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed"
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-amber-900 block mb-0.5">
                    Save this PIN carefully!
                  </strong>
                  This 6-digit PIN is the <strong>only key</strong> to access, download, or delete this file from any device. We do not store emails or accounts, so lost PINs cannot be recovered.
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  id="upload-another-btn"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Upload Another File
                </button>
                <button
                  type="button"
                  id="access-uploaded-now-btn"
                  onClick={() => {
                    onUploadSuccess(result.file, result.pin);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>View File Card</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
