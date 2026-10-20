// frontend/src/components/PublicShareView.jsx
import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Download,
  Calendar,
  Layers,
  FileText,
  Maximize,
  HardDrive,
  ExternalLink,
  Loader2,
  Lock,
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { fetchPublicShare } from '../api_client';
import { toast } from 'sonner';
import Blur from './Blur';

export default function PublicShareView({ shareId, onOpenAuth }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchPublicShare(shareId);
        setData(res);
      } catch (err) {
        setError(err.message || 'This shared photo is no longer available.');
      } finally {
        setLoading(false);
      }
    }
    if (shareId) {
      load();
    }
  }, [shareId]);

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '—';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleDownload = async () => {
    if (!data?.download_url && !data?.full_image_url) {
      toast.error('Download link unavailable.');
      return;
    }
    const targetUrl = data.download_url || data.full_image_url;
    try {
      toast.info('Downloading photo...');
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = data.original_filename || `${data.title || 'auradrive_photo'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download complete!');
    } catch {
      window.open(targetUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0e7db] text-gray-800">
        <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
        <p className="text-base font-bold text-gray-600">Loading shared photo...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0e7db] text-gray-800 p-6 relative overflow-hidden">
        <Blur
          className="fixed top-[-40px] left-[-40px] pointer-events-none z-0"
          style={{ filter: 'blur(70px)', transform: 'scale(1.8)', opacity: 0.85 }}
        />
        <div className="relative z-10 max-w-lg w-full rounded-3xl bg-white/90 backdrop-blur-xl p-8 sm:p-10 text-center shadow-2xl border-2 border-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-100 to-pink-100 text-pink-600 mx-auto mb-5 shadow-sm">
            <Cloud className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800">Photo Unavailable</h2>
          <p className="mt-2 text-base text-gray-600 leading-relaxed font-medium">
            {error || 'This link may have expired or the photo was removed by its owner.'}
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={() => (window.location.href = '/')}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-red-400 to-pink-500 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              Go to AuraDrive
            </button>
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="py-3 px-6 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-base transition-all shadow-sm cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0e7db] text-gray-800 flex flex-col relative overflow-x-hidden font-sans">
      {/* Signature template/upform Blur Component */}
      <Blur
        className="fixed top-[-40px] left-[-40px] pointer-events-none z-0"
        style={{ filter: 'blur(70px)', transform: 'scale(1.8)', opacity: 0.85 }}
      />
      <Blur
        className="fixed bottom-[-60px] right-[-60px] pointer-events-none z-0"
        style={{ filter: 'blur(80px)', transform: 'scale(1.5)', opacity: 0.7 }}
      />

      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60 shadow-sm">
        <div className="mx-auto flex h-24 sm:h-28 max-w-6xl items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-3.5 sm:gap-4.5">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 text-white shadow-lg shrink-0">
              <Cloud className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-800">
                AuraDrive
              </span>
              <span className="ml-3 px-3.5 py-1 rounded-full text-sm font-bold bg-pink-100 text-pink-700 border border-pink-200/60 hidden sm:inline-block shadow-xs">
                Public Share
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-base sm:text-lg font-semibold text-gray-600 hidden md:inline mr-2">
              Shared by <strong className="text-gray-900">{data.owner_name}</strong>
            </span>
            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="cursor-pointer inline-flex items-center gap-2.5 rounded-2xl sm:rounded-3xl bg-white/90 hover:bg-gray-100 px-5 py-3 text-base sm:text-lg font-bold text-gray-700 border border-gray-200/90 shadow-md transition-all active:scale-98"
            >
              <Lock className="w-5 h-5 text-gray-500" />
              <span>Sign in</span>
            </button>
            <button
              onClick={() => onOpenAuth && onOpenAuth('register')}
              className="cursor-pointer inline-flex items-center gap-2.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 px-6 py-3 text-base sm:text-lg font-extrabold text-white shadow-md hover:shadow-lg transition-all active:scale-98"
            >
              <UserPlus className="w-5 h-5" />
              <span>Create Free Account</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Showcase */}
      <main className="relative z-10 mx-auto max-w-6xl w-full flex-1 px-4 py-8 sm:px-10 sm:py-12">
        <div className="overflow-hidden rounded-3xl bg-[rgba(250,250,250,0.92)] backdrop-blur-xl shadow-2xl border-2 border-white p-6 sm:p-10">
          {/* Top Bar with Title and Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-3 py-1 rounded-full">
                Shared Photo
              </span>
              <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold text-gray-800 tracking-tight">
                {data.title}
              </h1>
              <p className="mt-1 text-sm font-semibold text-gray-500">
                Original file: {data.original_filename || 'photo.jpg'}
              </p>
            </div>

            <button
              onClick={handleDownload}
              className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:to-pink-600 px-6 py-4 text-base sm:text-lg font-extrabold text-white shadow-xl hover:shadow-2xl transition-all"
            >
              <Download className="w-5 h-5" />
              <span>Download Photo</span>
            </button>
          </div>

          {/* Large High-Res Image Display */}
          <div className="my-8 flex items-center justify-center rounded-2xl bg-gray-100/80 p-4 sm:p-8 border border-gray-200">
            <img
              src={data.full_image_url || data.thumbnail_url}
              alt={data.title}
              className="max-h-[640px] w-auto max-w-full rounded-2xl border-2 border-white object-contain shadow-2xl"
            />
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white/80 border border-gray-200 shadow-sm">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Dimensions</span>
              <span className="text-base sm:text-lg font-extrabold text-gray-800 mt-1 block">
                {data.width && data.height ? `${data.width} × ${data.height} px` : '—'}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">File Size</span>
              <span className="text-base sm:text-lg font-extrabold text-gray-800 mt-1 block">
                {formatBytes(data.file_size_bytes)}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Format</span>
              <span className="text-base sm:text-lg font-extrabold text-gray-800 mt-1 block">
                {(data.format || 'JPG').replace(/^image\//i, '').toUpperCase()}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Shared Date</span>
              <span className="text-base sm:text-lg font-extrabold text-gray-800 mt-1 block">
                {data.created_at ? new Date(data.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </span>
            </div>
          </div>

          {/* Promo Footer Callout */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-red-50 via-pink-50 to-rose-50 border border-pink-200">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-gray-800">
                Save and share your photos with AuraDrive
              </h3>
              <p className="mt-1 text-sm sm:text-base font-medium text-gray-600 max-w-xl">
                Get 5 GB free private cloud storage with instant high-quality backups, photo details, and easy sharing.
              </p>
            </div>
            <button
              onClick={() => onOpenAuth && onOpenAuth('register')}
              className="cursor-pointer inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 px-6 py-4 text-base font-extrabold text-white shadow-xl hover:shadow-2xl transition-all shrink-0"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/60 bg-white/70 py-6 mt-auto">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-semibold text-gray-500">
          <div>&copy; {new Date().getFullYear()} AuraDrive. Private Cloud Photo Storage.</div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Private &amp; Secure Cloud</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
