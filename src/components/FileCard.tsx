import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Trash2,
  Calendar,
  HardDrive,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileCheck
} from 'lucide-react';
import { FileMetadata } from '../types';
import { formatBytes, formatDate, formatTimeRemaining, getFileIcon } from '../lib/fileUtils';

interface FileCardProps {
  file: FileMetadata;
  pin: string;
  accessToken?: string;
  onDeleteSuccess: () => void;
  onClear: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  pin,
  accessToken,
  onDeleteSuccess,
  onClear
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const downloadUrl = `/api/files/${file.id}/download?token=${encodeURIComponent(accessToken || '')}&pin=${encodeURIComponent(pin)}`;

  const handleDownload = () => {
    setIsDownloading(true);
    // Create an invisible anchor tag to trigger download with original filename
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 1500);
  };

  const handleDeletePermanent = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ pin, token: accessToken })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete file');
      }

      setShowDeleteConfirm(false);
      onDeleteSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Deletion failed. Please try again.');
      setIsDeleting(false);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const isImage = file.mimeType.startsWith('image/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isVideo = file.mimeType.startsWith('video/');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        id="file-result-card"
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
      >
        {/* Top bar with back button & verified badge */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
          <button
            type="button"
            id="back-to-search-btn"
            onClick={onClear}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Search Another PIN</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PIN Verified
            </span>
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 text-slate-800 text-xs font-mono">
              <span className="text-slate-500">PIN:</span>
              <strong className="text-blue-700 font-bold">{pin}</strong>
              <button
                type="button"
                onClick={copyPin}
                className="ml-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Copy PIN"
              >
                {copiedPin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main File Details Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-200/80 mb-6">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shrink-0 shadow-xs text-blue-600">
            {getFileIcon(file.originalName, file.mimeType)}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              id="file-name-heading"
              className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight break-all"
            >
              {file.originalName}
            </h3>
            <div className="flex flex-wrap items-center gap-2.5 mt-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                {file.mimeType || 'Binary Data'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {formatBytes(file.size)}
              </span>
              {file.downloadCount !== undefined && file.downloadCount > 0 && (
                <span className="text-xs text-slate-500">
                  • {file.downloadCount} {file.downloadCount === 1 ? 'download' : 'downloads'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-500">Uploaded On</p>
              <p className="text-slate-800 font-medium">{formatDate(file.uploadedAt)}</p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-500">Availability Status</p>
              <p className="text-emerald-700 font-medium">
                Active ({formatTimeRemaining(file.expiresAt)})
              </p>
            </div>
          </div>
        </div>

        {/* Media Preview (if applicable) */}
        {(isImage || isAudio || isVideo) && (
          <div className="mb-6">
            <button
              type="button"
              id="toggle-media-preview-btn"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors mb-3 cursor-pointer"
            >
              {previewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewOpen ? 'Hide Quick Preview' : 'Show In-Browser Preview'}
            </button>

            {previewOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden"
              >
                {isImage && (
                  <img
                    src={downloadUrl}
                    alt={file.originalName}
                    className="max-h-80 max-w-full rounded-lg object-contain shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                )}
                {isAudio && (
                  <audio controls className="w-full">
                    <source src={downloadUrl} type={file.mimeType} />
                    Your browser does not support the audio element.
                  </audio>
                )}
                {isVideo && (
                  <video controls className="max-h-80 max-w-full rounded-lg">
                    <source src={downloadUrl} type={file.mimeType} />
                    Your browser does not support the video element.
                  </video>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            id="download-file-btn"
            onClick={handleDownload}
            disabled={isDownloading || isDeleting}
            className="w-full sm:flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer hover:scale-[1.01]"
          >
            <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Starting Download...' : 'Download Original File'}</span>
          </button>

          <button
            type="button"
            id="delete-file-prompt-btn"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="w-full sm:w-auto py-3 px-5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete File</span>
          </button>
        </div>

        {/* Permanent Delete Confirmation Dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
              onClick={(e) => {
                if (e.target === e.currentTarget && !isDeleting) {
                  setShowDeleteConfirm(false);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-slate-900"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <h4 className="text-lg font-bold text-slate-900 mb-2">
                  Permanently Delete File?
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Are you sure you want to permanently delete this file? This action cannot be undone.
                  <span className="block mt-2 text-slate-500 text-xs">
                    The file and its 6-digit PIN access will be completely eradicated immediately.
                  </span>
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    id="cancel-delete-btn"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-4 py-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="confirm-permanent-delete-btn"
                    onClick={handleDeletePermanent}
                    disabled={isDeleting}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <span>Deleting...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Yes, Delete Permanently</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
