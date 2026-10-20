// frontend/src/components/ConfirmModal.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  icon: Icon = Trash2,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-3xl bg-[rgba(252,250,248,0.96)] backdrop-blur-2xl shadow-2xl border-2 border-white p-6 sm:p-8 text-center my-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 rounded-2xl p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Badge */}
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm ${
              isDanger
                ? 'bg-gradient-to-tr from-red-100 to-rose-100 text-rose-600'
                : isWarning
                ? 'bg-gradient-to-tr from-amber-100 to-yellow-100 text-amber-700'
                : 'bg-gradient-to-tr from-pink-100 to-red-100 text-pink-600'
            }`}
          >
            <Icon className="h-8 w-8 stroke-[2.2]" />
          </div>

          {/* Heading */}
          <h3 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="mt-2.5 text-sm sm:text-base text-gray-600 font-medium leading-relaxed max-w-sm mx-auto">
              {description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-base transition-all cursor-pointer"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirm && onConfirm();
                onClose();
              }}
              className={`w-full sm:flex-1 py-3.5 px-5 rounded-2xl text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                isDanger
                  ? 'bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 hover:from-red-600 hover:to-rose-600'
                  : isWarning
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600'
                  : 'bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:to-pink-600'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
