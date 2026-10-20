// frontend/src/components/MediaModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  X,
  ExternalLink,
  HardDrive,
  FileText,
  Calendar,
  Layers,
  Database,
  Camera,
  CheckCircle2,
  Clock,
  Ratio,
  Maximize,
  Download,
  Trash2,
  Share2,
  RotateCcw,
  Check,
} from 'lucide-react';
import { createShareLink } from '../api_client';
import ConfirmModal from './ConfirmModal';

export default function MediaModal({
  item,
  onClose,
  onTrash,
  onRestore,
  onPermanentDelete,
  onDownload,
  isTrashView = false,
}) {
  if (!item) return null;

  const [isSharing, setIsSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const displayUrl = item.full_image_url || item.thumbnail_url || item.url;
  const isDone = item.status === 'done';

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '—';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getFormat = (fmt) => {
    if (!fmt) return 'JPG';
    const clean = fmt.replace(/^image\//i, '').toUpperCase();
    return clean === 'JPEG' ? 'JPG' : clean;
  };

  const formatFullDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return String(dateStr);
    }
  };

  const metadataList = [
    { label: 'Photo ID', val: item.media_id || item.id, icon: Layers },
    { label: 'Backup Status', val: isDone ? 'Saved' : 'Saving...', icon: isDone ? CheckCircle2 : Clock },
    { label: 'Dimensions', val: item.width && item.height ? `${item.width} × ${item.height} px` : null, icon: Maximize },
    { label: 'Aspect Ratio', val: item.aspect_ratio || null, icon: Ratio },
    { label: 'File Size', val: formatBytes(item.file_size_bytes), icon: HardDrive },
    { label: 'File Type', val: getFormat(item.media_format || item.format), icon: FileText },
    { label: 'Cloud Folder', val: item.raw_s3_key ? (item.raw_s3_key.includes('/') ? item.raw_s3_key.split('/').slice(0, -1).join('/') || 'Root' : 'Root') : 'Photos', icon: Database },
    ...(item.days_remaining != null
      ? [{ label: 'Auto-Delete In', val: `${item.days_remaining} day(s)`, icon: Clock }]
      : []),
    {
      label: 'Date & Time Added',
      val: formatFullDateTime(item.created_at),
      icon: Calendar,
      fullWidth: true,
    },
  ];

  const handleShareClick = async () => {
    try {
      setIsSharing(true);
      const res = await createShareLink(item.media_id || item.id);
      const fullUrl = `${window.location.origin}/?share=${res.share_id}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      toast.success('Public share link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      toast.error(err.message || 'Failed to create share link.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl rounded-3xl bg-[rgba(252,250,248,0.96)] backdrop-blur-2xl shadow-2xl border-2 border-white flex flex-col my-auto transition-all overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-gray-200/80 px-5 sm:px-7 py-4 bg-white/75">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-3 py-1 rounded-full">
                Photo Details
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 mt-1 truncate max-w-md sm:max-w-xl">
                {item.title || 'Untitled Photo'}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="cursor-pointer rounded-2xl p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors border border-gray-200 bg-white shadow-xs"
              title="Close details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body - Dynamic Height, Perfectly Contained */}
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Image Canvas */}
            <div className="lg:col-span-7 bg-gray-100/70 p-4 sm:p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-200 min-h-[260px] min-w-0 overflow-hidden">
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt={item.title || 'Photo'}
                  className="max-h-[340px] sm:max-h-[420px] w-auto max-w-full rounded-2xl border-2 border-white object-contain shadow-lg"
                />
              ) : (
                <div className="text-sm font-bold text-gray-500">
                  Loading photo...
                </div>
              )}
            </div>

            {/* Details & Action Panel */}
            <div className="lg:col-span-5 p-5 sm:p-7 flex flex-col justify-between gap-5 bg-white/80 min-w-0 overflow-hidden">
              {/* Top Row: Status */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800 animate-pulse'
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isDone ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{isDone ? 'Saved to Cloud' : 'Saving Photo...'}</span>
                </span>

                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {getFormat(item.media_format || item.format)}
                </span>
              </div>

              {/* Action Buttons (2-Row Balanced Layout: Zero Boundary Overflow) */}
              <div className="flex flex-col gap-2.5 w-full">
                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => onDownload && onDownload(item)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:to-pink-600 text-white font-extrabold text-sm sm:text-base shadow-md hover:shadow-lg transition-all cursor-pointer"
                  title="Download photo"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Photo</span>
                </button>

                {/* Secondary Actions (Share + Trash / Restore + Delete) */}
                {!isTrashView ? (
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      type="button"
                      disabled={isSharing}
                      onClick={handleShareClick}
                      className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs sm:text-sm transition-all shadow-2xs cursor-pointer min-w-0"
                      title="Copy public share link"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Share2 className="w-4 h-4 text-pink-500 shrink-0" />}
                      <span className="truncate">{copiedLink ? 'Copied' : 'Share Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmAction({
                          title: 'Move Photo to Recycle Bin?',
                          description: `"${item.title || 'This photo'}" will be moved to the Recycle Bin. It will be kept for 7 days before being permanently removed.`,
                          confirmText: 'Move to Trash',
                          variant: 'danger',
                          icon: Trash2,
                          onConfirm: () => {
                            onTrash && onTrash(item);
                            onClose();
                          },
                        });
                      }}
                      className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-red-200/60 min-w-0"
                      title="Move to Recycle Bin"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">Move to Trash</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        onRestore && onRestore(item);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-xs sm:text-sm transition-all cursor-pointer min-w-0"
                      title="Restore photo"
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span className="truncate">Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmAction({
                          title: 'Permanently Delete Photo?',
                          description: `Permanently delete "${item.title || 'this photo'}" from your cloud storage? This action cannot be undone.`,
                          confirmText: 'Delete Forever',
                          variant: 'danger',
                          icon: Trash2,
                          onConfirm: () => {
                            onPermanentDelete && onPermanentDelete(item);
                            onClose();
                          },
                        });
                      }}
                      className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-red-100 hover:bg-red-200 text-red-600 font-bold text-xs sm:text-sm transition-all cursor-pointer min-w-0"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">Delete Forever</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Specification Grid (Adaptive & Full Date & Time) */}
              <div className="grid grid-cols-2 gap-2.5">
                {metadataList.map(
                  (row, i) =>
                    row.val && (
                      <div
                        key={i}
                        className={`p-3 rounded-2xl bg-gray-50/90 border border-gray-200/80 flex flex-col shadow-xs ${
                          row.fullWidth ? 'col-span-2' : ''
                        }`}
                      >
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                          <row.icon className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                          <span>{row.label}</span>
                        </span>
                        <span
                          className="mt-1 text-xs sm:text-sm font-extrabold text-gray-800 break-words whitespace-normal"
                        >
                          {row.val}
                        </span>
                      </div>
                    )
                )}
              </div>

              {/* EXIF Camera Info Block (If available) */}
              {item.exif && Object.keys(item.exif).length > 0 && (
                <div className="rounded-2xl border border-gray-200/90 bg-gray-50/80 p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600 flex items-center gap-1.5 mb-2">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera &amp; Shooting Details</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(item.exif)
                      .slice(0, 6)
                      .map(([k, v], idx) => (
                        <div key={idx} className="bg-white/80 p-2 rounded-xl border border-gray-200/60">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block truncate">{k}</span>
                          <span className="text-xs font-bold text-gray-700 block truncate" title={String(v)}>
                            {String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Open Full-Size Link */}
              {displayUrl && (
                <a
                  href={displayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white border border-gray-200 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-xs"
                >
                  <span>Open Full-Size Photo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmAction)}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmText={confirmAction?.confirmText}
        variant={confirmAction?.variant}
        icon={confirmAction?.icon}
        onConfirm={confirmAction?.onConfirm}
        onClose={() => setConfirmAction(null)}
      />
    </>
  );
}
