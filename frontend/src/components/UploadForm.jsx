// frontend/src/components/UploadForm.jsx
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  UploadCloud,
  Loader2,
  X,
  ArrowRight,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { uploadMedia } from '../api_client.js';

export default function UploadForm({ onUploadSuccess }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15 MB limit.");
      return;
    }

    setFile(selectedFile);
    if (!title.trim()) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
    }
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleClearSelection = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !title.trim()) {
      toast.error('Please enter a photo title and choose an image.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Uploading your photo to your cloud drive...');

    try {
      const data = await uploadMedia(file, title.trim());
      toast.success('Photo uploaded and backed up successfully!', { id: toastId });
      setTitle('');
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onUploadSuccess) onUploadSuccess(data);
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Main Upload Box styled after template/upform */}
        <div className="relative overflow-hidden rounded-3xl bg-[rgba(249,249,249,0.88)] backdrop-blur-xl p-6 sm:p-12 shadow-2xl border border-white/80">
          {/* Subtle warm glow highlights */}
          <div
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-red-300 to-pink-400 opacity-20 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-yellow-300 to-orange-400 opacity-20 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          {/* User-Friendly Header */}
          <div className="relative z-10 mb-8 sm:mb-10 text-center sm:text-left">
            <span className="inline-block px-3.5 py-1 mb-3 rounded-full bg-pink-100 text-pink-700 font-bold text-xs sm:text-sm tracking-wide uppercase">
              Add New Photos
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-800 leading-[1.15]">
              Upload{' '}
              <span className="bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 bg-clip-text text-transparent">
                &amp; Save
              </span>{' '}
              Your Photos
            </h2>
            <p className="mt-3 text-base sm:text-lg text-gray-600 font-medium max-w-2xl">
              Back up high-resolution photos with fast automatic optimization and crystal-clear quality on all your devices.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
            {/* Photo Title */}
            <div>
              <label className="block text-base sm:text-lg font-bold text-gray-700 mb-2">
                Photo Title or Caption
              </label>
              <input
                type="text"
                placeholder="e.g. Summer Vacation, Sunset at the Beach, Family Birthday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 px-5 py-4 text-base sm:text-lg font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
              />
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelection(e.target.files[0])}
              accept="image/jpeg,image/png,image/webp,image/tiff"
              className="hidden"
            />

            {/* Choose Image Button (template/upform style) */}
            <div>
              <label className="block text-base sm:text-lg font-bold text-gray-700 mb-2">
                Choose Image File
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gray-200/90 hover:bg-gray-300 text-gray-700 hover:text-gray-900 font-bold text-base sm:text-lg transition-all shadow-sm active:scale-[0.99] cursor-pointer"
              >
                <ImageIcon className="w-6 h-6 text-pink-500" />
                <span>{file ? file.name : 'Select Photo from Device'}</span>
              </button>
            </div>

            {/* Drag & Drop Preview Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
                isDragging
                  ? 'border-pink-500 bg-pink-50/60'
                  : 'border-gray-300 hover:border-pink-400 bg-white/50 hover:bg-white/80'
              }`}
            >
              {previewUrl ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={previewUrl}
                      alt="Selected preview"
                      className="h-20 w-20 rounded-2xl border-2 border-white object-cover shadow-md"
                    />
                    <div className="text-left">
                      <p className="text-base sm:text-lg font-bold text-gray-800 truncate max-w-xs sm:max-w-md">
                        {file?.name}
                      </p>
                      <p className="text-sm font-semibold text-gray-500 mt-1">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="cursor-pointer rounded-xl p-2.5 text-gray-500 hover:bg-gray-200 hover:text-red-600 transition-colors bg-white shadow-sm border border-gray-200"
                    title="Change selected photo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-100 to-pink-100 text-pink-600 shadow-sm mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-gray-800">
                    Or drag and drop your photo here
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Supports JPG, PNG, WebP, TIFF (up to 15 MB)
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading || !file}
              className="w-full flex items-center justify-center gap-3 py-4 sm:py-5 px-8 rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:via-pink-600 hover:to-rose-500 text-white font-extrabold text-lg sm:text-xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Uploading your photo...</span>
                </>
              ) : (
                <>
                  <span>Upload Photo</span>
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Real-World User Benefits (De-technified & Enlarged) */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="flex items-center gap-4 p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-md border-2 border-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-100 to-pink-100 text-red-600 shadow-xs">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-gray-800">Fast Cloud Backup</h4>
              <p className="mt-1 text-sm sm:text-base font-semibold text-gray-600 leading-snug">Instant upload to your secure cloud drive</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-md border-2 border-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-100 text-pink-600 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-gray-800">High Quality Photos</h4>
              <p className="mt-1 text-sm sm:text-base font-semibold text-gray-600 leading-snug">Crystal-clear preview on phones &amp; computers</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 sm:p-6 rounded-3xl bg-white/90 backdrop-blur-md border-2 border-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-100 to-yellow-100 text-amber-700 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-gray-800">Private &amp; Safe</h4>
              <p className="mt-1 text-sm sm:text-base font-semibold text-gray-600 leading-snug">Encrypted so only you can access your photos</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
