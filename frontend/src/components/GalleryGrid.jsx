// frontend/src/components/GalleryGrid.jsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  Loader2,
  ArrowUpRight,
  Download,
  Trash2,
  Share2,
  RotateCcw,
  Check,
  Clock,
} from 'lucide-react';

export default function GalleryGrid({
  items = [],
  selectedIds = [],
  onToggleSelect,
  onSelectMedia,
  onDownloadSingle,
  onTrashSingle,
  onRestoreSingle,
  onPermanentDeleteSingle,
  onShareSingle,
  isTrashView = false,
}) {
  const selectedSet = new Set(selectedIds);

  const getFormatLabel = (fmt) => {
    if (!fmt) return 'PHOTO';
    const clean = fmt.replace(/^image\//i, '').toUpperCase();
    if (clean === 'JPEG') return 'JPG';
    return clean;
  };

  if (!items || items.length === 0) {
    return (
      <div className="my-10 rounded-3xl border-2 border-dashed border-gray-300 bg-white/70 backdrop-blur-md p-12 sm:p-16 text-center shadow-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-red-100 to-pink-100 text-pink-600 mx-auto mb-5 shadow-sm">
          <FolderOpen className="w-10 h-10" />
        </div>
        <h4 className="text-2xl sm:text-3xl font-black text-gray-800">
          {isTrashView ? 'Recycle Bin is Empty' : 'No Photos Yet'}
        </h4>
        <p className="mt-3 text-base sm:text-lg text-gray-600 max-w-lg mx-auto font-semibold leading-relaxed">
          {isTrashView
            ? 'Photos moved to the recycle bin will remain here for 7 days before being permanently deleted.'
            : 'Photos you upload will automatically appear here in your library.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item, index) => {
        const itemId = item.media_id || item.id;
        const itemUrl = item.thumbnail_url || item.url || item.full_image_url;
        const isDone = item.status === 'done';
        const isSelected = selectedSet.has(itemId);

        return (
          <motion.div
            key={itemId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.25) }}
            onClick={() => onSelectMedia && onSelectMedia(item)}
            className={`group relative flex flex-col overflow-hidden rounded-3xl bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-xl hover:shadow-2xl border-2 transition-all duration-200 cursor-pointer hover:-translate-y-1.5 ${
              isSelected
                ? 'border-pink-500 ring-4 ring-pink-400/30 shadow-pink-200'
                : 'border-white/90 hover:border-pink-300'
            }`}
          >
            {/* Top Bar for Card with status badge and format */}
            <div className="flex items-center justify-between pb-3.5">
              <span className="px-3.5 py-1.5 rounded-2xl bg-gray-100/90 text-gray-800 font-black text-sm uppercase tracking-wider border border-gray-200/60 shadow-xs">
                {getFormatLabel(item.media_format || item.format)}
              </span>

              {!isTrashView ? (
                <span
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-extrabold ${
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
                  <span>{isDone ? 'Saved' : 'Saving...'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-extrabold bg-amber-100 text-amber-800">
                  <Clock className="w-4 h-4" />
                  <span>
                    {item.days_remaining != null ? `${item.days_remaining}d left` : '7d left'}
                  </span>
                </span>
              )}
            </div>

            {/* Thumbnail Canvas */}
            <div className="relative aspect-[16/11] overflow-hidden rounded-2xl bg-gray-100 shadow-inner">
              {/* Checkbox on top-left (Larger, prominent) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect && onToggleSelect(itemId, e);
                }}
                className={`absolute top-3 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-2xl border-2 transition-all shadow-md cursor-pointer ${
                  isSelected
                    ? 'border-pink-500 bg-pink-500 text-white'
                    : 'border-white bg-white/90 text-transparent hover:border-pink-400'
                }`}
                title={isSelected ? 'Deselect photo' : 'Select photo'}
              >
                <Check className="h-5 w-5 stroke-[3]" />
              </div>

              {/* Main Image or Loader */}
              {itemUrl ? (
                <img
                  src={itemUrl}
                  alt={item.title || 'Photo thumbnail'}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="h-7 w-7 animate-spin text-pink-500" />
                  <span className="text-sm font-bold">Loading photo preview...</span>
                </div>
              )}

              {/* Hover Quick Action Buttons (Larger, comfortable touch targets) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-md p-2 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {/* Download */}
                <button
                  type="button"
                  title="Download photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadSingle && onDownloadSingle(item);
                  }}
                  className="cursor-pointer rounded-xl p-2.5 text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-red-400 hover:to-pink-500 transition-all shadow-xs"
                >
                  <Download className="h-5 w-5" />
                </button>

                {/* Share Link (active only) */}
                {!isTrashView && (
                  <button
                    type="button"
                    title="Share photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareSingle && onShareSingle(item);
                    }}
                    className="cursor-pointer rounded-xl p-2.5 text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-500 transition-all shadow-xs"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                )}

                {/* Recycle / Restore / Delete forever */}
                {!isTrashView ? (
                  <button
                    type="button"
                    title="Move to Recycle Bin"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrashSingle && onTrashSingle(item);
                    }}
                    className="cursor-pointer rounded-xl p-2.5 text-gray-600 hover:text-white hover:bg-red-500 transition-all shadow-xs"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      title="Restore photo"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreSingle && onRestoreSingle(item);
                      }}
                      className="cursor-pointer rounded-xl p-2.5 text-gray-600 hover:text-white hover:bg-emerald-500 transition-all shadow-xs"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      title="Delete permanently"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPermanentDeleteSingle && onPermanentDeleteSingle(item);
                      }}
                      className="cursor-pointer rounded-xl p-2.5 text-gray-600 hover:text-white hover:bg-red-600 transition-all shadow-xs"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Card Body & Footer */}
            <div className="flex flex-col gap-1.5 pt-3">
              <h4
                className="text-base sm:text-lg font-bold text-gray-800 truncate group-hover:text-pink-600 transition-colors tracking-tight"
                title={item.title}
              >
                {item.title || 'Untitled Photo'}
              </h4>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs sm:text-sm font-semibold text-gray-500">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </span>

                <div className="flex items-center gap-2">
                  {item.width && item.height && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 shadow-2xs">
                      {item.width}×{item.height}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-bold text-pink-600 group-hover:underline">
                    <span>View Photo</span>
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.2]" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
