// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import {
  Cloud,
  LogOut,
  ArrowRight,
  Loader2,
  RefreshCw,
  Trash2,
  RotateCcw,
  Download,
  Share2,
  HardDrive,
  CheckSquare,
  Square,
  Clock,
  Layers,
  Sparkles,
  X,
  Mail,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getAuthToken,
  setAuthToken,
  getStoredUser,
  setStoredUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  fetchUserGallery,
  fetchTrashGallery,
  moveToTrash,
  batchMoveToTrash,
  restoreMedia,
  batchRestoreMedia,
  permanentlyDeleteMedia,
  emptyTrash,
  fetchStorageUsage,
  createShareLink,
  getDownloadUrl,
} from './api_client';
import UploadForm from './components/UploadForm';
import GalleryGrid from './components/GalleryGrid';
import MediaModal from './components/MediaModal';
import PublicShareView from './components/PublicShareView';
import Blur from './components/Blur';
import ConfirmModal from './components/ConfirmModal';
import './App.css';

export default function App() {
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(getStoredUser());

  // authMode: 'login' | 'register' | 'forgot' | 'reset'
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Helper to switch auth forms while wiping credentials to prevent cross-form persistence
  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setEmail('');
    setPassword('');
    setFullName('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setAuthError('');
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // Gallery, Trash & Storage state
  const [galleryTab, setGalleryTab] = useState('active'); // 'active' | 'trash'
  const [items, setItems] = useState([]);
  const [trashItems, setTrashItems] = useState([]);
  const [storageUsage, setStorageUsage] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isTrashEmptying, setIsTrashEmptying] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Public Share params
  const shareParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('share') : null;
  const [publicAuthModal, setPublicAuthModal] = useState(null);

  const previewParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('preview') : null;
  const isPreview = Boolean(previewParam);

  const sampleItems = [
    {
      media_id: 'media_sample_01',
      title: 'Alpine Glacier Lake',
      thumbnail_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
      full_image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80',
      status: 'done',
      width: 1920,
      height: 1080,
      aspect_ratio: '16:9',
      file_size_bytes: 3840220,
      format: 'WEBP',
      raw_s3_key: 'uploads/2026/alpine_glacier.webp',
      created_at: '2026-10-19T14:30:00Z',
      exif: { Make: 'Sony', Model: 'ILCE-7RM4', Lens: 'FE 24-70mm F2.8 GM', ISO: 100, FNumber: 'f/4.0', ShutterSpeedValue: '1/250s' }
    },
    {
      media_id: 'media_sample_02',
      title: 'San Francisco Sunset',
      thumbnail_url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&auto=format&fit=crop&q=80',
      full_image_url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&auto=format&fit=crop&q=80',
      status: 'done',
      width: 2560,
      height: 1440,
      aspect_ratio: '16:9',
      file_size_bytes: 5210900,
      format: 'WEBP',
      raw_s3_key: 'uploads/2026/sf_golden_gate.webp',
      created_at: '2026-10-19T15:10:00Z',
      exif: { Make: 'Canon', Model: 'EOS R5', Lens: 'RF 24-105mm F4L IS USM', ISO: 200, FNumber: 'f/5.6', ShutterSpeedValue: '1/500s' }
    },
    {
      media_id: 'media_sample_03',
      title: 'Neon Tokyo Street',
      thumbnail_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
      full_image_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1600&auto=format&fit=crop&q=80',
      status: 'pending',
      width: 1080,
      height: 1350,
      aspect_ratio: '4:5',
      file_size_bytes: 2840000,
      format: 'JPEG',
      raw_s3_key: 'uploads/2026/tokyo_shinjuku.jpg',
      created_at: '2026-10-19T16:05:00Z'
    }
  ];

  const [selectedMedia, setSelectedMedia] = useState(() => (previewParam === 'modal' ? sampleItems[0] : null));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const effectiveToken = token || (isPreview ? 'preview-token' : null);
  const effectiveUser = user || (isPreview ? { full_name: 'Elena Vance', email: 'elena@auradrive.io' } : null);
  const displayedItems = isPreview && items.length === 0 ? sampleItems : items;

  // Load Active Gallery
  const loadGallery = useCallback(async (showToast = false) => {
    if (isPreview) return;
    if (!token) return;
    try {
      if (showToast) setIsRefreshing(true);
      const data = await fetchUserGallery();
      setItems(data);
      if (showToast) toast.success("Gallery refreshed");
    } catch (err) {
      console.error('Gallery sync error:', err);
      if (showToast) toast.error("Failed to sync gallery");
    } finally {
      setIsRefreshing(false);
    }
  }, [token, isPreview]);

  // Load Trash Gallery
  const loadTrash = useCallback(async () => {
    if (isPreview || !token) return;
    try {
      const data = await fetchTrashGallery();
      setTrashItems(data);
    } catch (err) {
      console.error('Trash fetch error:', err);
    }
  }, [token, isPreview]);

  // Load Storage Usage
  const loadUsage = useCallback(async () => {
    if (isPreview || !token) return;
    try {
      const data = await fetchStorageUsage();
      setStorageUsage(data);
    } catch (err) {
      console.error('Storage usage error:', err);
    }
  }, [token, isPreview]);

  useEffect(() => {
    if (token && !isPreview) {
      loadGallery();
      loadTrash();
      loadUsage();
      const interval = setInterval(() => {
        loadGallery(false);
        loadTrash();
        loadUsage();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [token, isPreview, loadGallery, loadTrash, loadUsage]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auth Submit Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (authMode === 'register') {
      if (!fullName.trim()) {
        setAuthError('Please enter your full name.');
        return;
      }
      if (password.length < 8 || password.length > 10) {
        setAuthError('Password must be between 8 and 10 characters long.');
        toast.error('Password must be between 8 and 10 characters long.');
        return;
      }
    }

    setIsAuthenticating(true);

    try {
      let res;
      if (authMode === 'register') {
        res = await registerUser(email, password, fullName);
        toast.success("Account created successfully!");
      } else {
        res = await loginUser(email, password);
        toast.success("Signed in successfully!");
      }

      setAuthToken(res.access_token);
      setStoredUser(res.user);
      setToken(res.access_token);
      setUser(res.user);
      if (publicAuthModal) {
        setPublicAuthModal(null);
      }
    } catch (err) {
      const msg = err.message || 'Authentication failed.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setAuthError('Please enter your email address.');
      return;
    }
    setAuthError('');
    setIsAuthenticating(true);

    try {
      const res = await requestPasswordReset(email);
      if (res?.dev_code) {
        toast.info(`🔑 Verification Code: ${res.dev_code}`, { duration: 15000 });
        setResetCode(res.dev_code);
      } else {
        toast.success('Verification code sent to your email!');
      }
      setAuthMode('reset');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCountdown(60);
    } catch (err) {
      const msg = err.message || 'Failed to send verification code.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0 || isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError('');
    try {
      const res = await requestPasswordReset(email);
      if (res?.dev_code) {
        toast.info(`🔑 Verification Code: ${res.dev_code}`, { duration: 15000 });
        setResetCode(res.dev_code);
      } else {
        toast.success('New verification code sent to your email!');
      }
      setCountdown(60);
    } catch (err) {
      const msg = err.message || 'Failed to resend code.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetCode || resetCode.length !== 6) {
      setAuthError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 10) {
      setAuthError('New password must be between 8 and 10 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthError('');
    setIsAuthenticating(true);

    try {
      const res = await resetPassword(email, resetCode, newPassword);
      toast.success(res.message || 'Password reset successfully! Please sign in.');
      switchAuthMode('login');
    } catch (err) {
      const msg = err.message || 'Failed to reset password.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setStoredUser(null);
    setToken(null);
    setUser(null);
    setItems([]);
    setTrashItems([]);
    setStorageUsage(null);
    setSelectedIds([]);
    setSelectedMedia(null);
    toast.info("Signed out of AuraDrive");
  };

  // --- DOWNLOAD ACTIONS ---
  const handleDownloadSingle = async (item) => {
    try {
      toast.info(`Preparing download for "${item.title || 'image'}"...`);
      const { download_url, filename } = await getDownloadUrl(item.media_id || item.id);
      const res = await fetch(download_url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || `${item.title || 'photo'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download complete!');
    } catch {
      window.open(item.full_image_url || item.thumbnail_url, '_blank');
    }
  };

  const handleBatchDownload = async () => {
    const activeList = galleryTab === 'active' ? displayedItems : trashItems;
    const selected = activeList.filter((i) => selectedIds.includes(i.media_id || i.id));
    if (selected.length === 0) return;

    toast.info(`Downloading ${selected.length} photos...`);
    let successCount = 0;
    for (let i = 0; i < selected.length; i++) {
      const it = selected[i];
      try {
        const { download_url, filename } = await getDownloadUrl(it.media_id || it.id);
        const res = await fetch(download_url);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || `${it.title || 'photo'}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        successCount++;
        if (i < selected.length - 1) {
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        window.open(it.full_image_url, '_blank');
      }
    }
    toast.success(`Downloaded ${successCount} photos successfully.`);
    setSelectedIds([]);
  };

  // --- RECYCLE BIN / TRASH ACTIONS ---
  const handleTrashSingle = (item) => {
    setConfirmDialog({
      title: 'Move Photo to Recycle Bin?',
      description: `"${item.title || 'This photo'}" will be moved to the Recycle Bin and kept for 7 days before permanent removal.`,
      confirmText: 'Move to Trash',
      variant: 'danger',
      icon: Trash2,
      onConfirm: async () => {
        try {
          await moveToTrash(item.media_id || item.id);
          toast.success(`"${item.title || 'Photo'}" moved to Recycle Bin (Kept for 7 days).`);
          loadGallery(false);
          loadTrash();
          loadUsage();
        } catch (err) {
          toast.error(err.message || 'Failed to move to recycle bin.');
        }
      },
    });
  };

  const handleBatchTrash = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      title: `Move ${selectedIds.length} Photos to Recycle Bin?`,
      description: `Selected photos will be moved to the Recycle Bin and kept for 7 days before permanent removal.`,
      confirmText: 'Move to Trash',
      variant: 'danger',
      icon: Trash2,
      onConfirm: async () => {
        try {
          await batchMoveToTrash(selectedIds);
          toast.success(`Moved ${selectedIds.length} photos to Recycle Bin.`);
          setSelectedIds([]);
          loadGallery(false);
          loadTrash();
          loadUsage();
        } catch (err) {
          toast.error(err.message || 'Failed to move photos to recycle bin.');
        }
      },
    });
  };

  const handleRestoreSingle = async (item) => {
    try {
      await restoreMedia(item.media_id || item.id);
      toast.success(`"${item.title || 'Photo'}" restored to library.`);
      loadGallery(false);
      loadTrash();
      loadUsage();
    } catch (err) {
      toast.error(err.message || 'Failed to restore photo.');
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      await batchRestoreMedia(selectedIds);
      toast.success(`Restored ${selectedIds.length} photos to library.`);
      setSelectedIds([]);
      loadGallery(false);
      loadTrash();
      loadUsage();
    } catch (err) {
      toast.error(err.message || 'Failed to restore photos.');
    }
  };

  const handlePermanentDeleteSingle = (item) => {
    setConfirmDialog({
      title: 'Permanently Delete Photo?',
      description: `Are you sure you want to permanently delete "${item.title || 'this photo'}" from your cloud storage? This action cannot be undone.`,
      confirmText: 'Delete Forever',
      variant: 'danger',
      icon: Trash2,
      onConfirm: async () => {
        try {
          await permanentlyDeleteMedia(item.media_id || item.id);
          toast.success(`"${item.title || 'Photo'}" permanently deleted.`);
          loadTrash();
          loadUsage();
        } catch (err) {
          toast.error(err.message || 'Failed to delete photo.');
        }
      },
    });
  };

  const handleEmptyTrash = () => {
    setConfirmDialog({
      title: 'Empty Recycle Bin?',
      description: 'Are you sure you want to permanently delete all items in the Recycle Bin? This action cannot be undone.',
      confirmText: 'Empty Bin',
      variant: 'danger',
      icon: Trash2,
      onConfirm: async () => {
        try {
          setIsTrashEmptying(true);
          const res = await emptyTrash();
          toast.success(res.message || 'Recycle Bin emptied.');
          setSelectedIds([]);
          loadTrash();
          loadUsage();
        } catch (err) {
          toast.error(err.message || 'Failed to empty recycle bin.');
        } finally {
          setIsTrashEmptying(false);
        }
      },
    });
  };

  const handleShareSingle = async (item) => {
    try {
      const res = await createShareLink(item.media_id || item.id);
      const fullUrl = `${window.location.origin}/?share=${res.share_id}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Public share link copied to clipboard!');
    } catch (err) {
      toast.error(err.message || 'Failed to create share link.');
    }
  };

  // Selection toggle
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const activeList = galleryTab === 'active' ? displayedItems : trashItems;
    setSelectedIds(activeList.map((i) => i.media_id || i.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // 1. PUBLIC SHARE VIEW (Accessed via /?share=<shareId>)
  if (shareParam) {
    return (
      <>
        <Toaster position="top-right" theme="light" closeButton toastOptions={{ duration: 4000 }} />
        <PublicShareView
          shareId={shareParam}
          onOpenAuth={(mode) => {
            switchAuthMode(mode || 'login');
            setPublicAuthModal(mode || 'login');
          }}
        />

        {/* Modal for Unauthenticated Viewer to Sign In / Register directly from Shared View */}
        <AnimatePresence>
          {publicAuthModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto"
              onClick={() => setPublicAuthModal(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg rounded-3xl bg-[rgba(249,249,249,0.96)] backdrop-blur-2xl shadow-2xl border-2 border-white p-6 sm:p-10 my-auto"
              >
                <button
                  type="button"
                  onClick={() => setPublicAuthModal(null)}
                  className="absolute top-5 right-5 rounded-2xl p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 text-white shadow-md">
                    <Cloud className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-gray-800">
                      {authMode === 'register' ? (
                        <>
                          Create{' '}
                          <span className="bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 bg-clip-text text-transparent">
                            Account
                          </span>
                        </>
                      ) : (
                        <>
                          Welcome to{' '}
                          <span className="bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 bg-clip-text text-transparent">
                            AuraDrive
                          </span>
                        </>
                      )}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">
                      {authMode === 'register'
                        ? 'Sign up to upload and share your own photos'
                        : 'Sign in to access your personal cloud drive'}
                    </p>
                  </div>
                </div>

                {authError && (
                  <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-center text-sm font-bold text-red-600">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                          <UserIcon className="h-5 w-5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Your full name"
                          required
                          className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-4 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        required
                        className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-4 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Password
                      </label>
                      {authMode === 'register' && (
                        <span className={`text-[11px] font-bold ${password.length >= 8 && password.length <= 10 ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {password.length}/10 chars
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={authMode === 'register' ? '8–10 characters' : 'Enter password'}
                        required
                        minLength={authMode === 'register' ? 8 : undefined}
                        maxLength={authMode === 'register' ? 10 : undefined}
                        className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-11 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {authMode === 'register' && (
                      <p className="text-[11px] font-semibold text-gray-500 mt-1">
                        Must be between <strong>8 and 10 characters</strong> (any characters allowed).
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:to-pink-600 text-white font-extrabold text-base shadow-xl hover:shadow-2xl transition-all cursor-pointer disabled:opacity-60 mt-2"
                  >
                    {isAuthenticating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{authMode === 'register' ? 'Create Account' : 'Sign In'}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <div className="pt-3 text-center text-sm font-medium text-gray-600">
                    {authMode === 'register' ? (
                      <>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => switchAuthMode('login')}
                          className="font-bold text-pink-600 hover:underline cursor-pointer"
                        >
                          Sign In
                        </button>
                      </>
                    ) : (
                      <>
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => switchAuthMode('register')}
                          className="font-bold text-pink-600 hover:underline cursor-pointer"
                        >
                          Create Account
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // 2. UNAUTHENTICATED LOGIN / REGISTER / RESET VIEW (template/upform Design System)
  if (!effectiveToken) {
    return (
      <div className="min-h-screen bg-[#f0e7db] text-gray-800 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
        <Toaster position="top-right" theme="light" closeButton toastOptions={{ duration: 4000 }} />

        {/* Ambient Chromatic SVG Blur Orbs */}
        <Blur
          className="fixed top-[-40px] left-[-40px] pointer-events-none z-0"
          style={{ filter: 'blur(70px)', transform: 'scale(1.8)', opacity: 0.85 }}
        />
        <Blur
          className="fixed bottom-[-60px] right-[-60px] pointer-events-none z-0"
          style={{ filter: 'blur(80px)', transform: 'scale(1.5)', opacity: 0.7 }}
        />

        <div className="relative z-10 w-full max-w-lg my-auto">
          {/* Brand Card */}
          <div className="rounded-3xl bg-[rgba(249,249,249,0.92)] backdrop-blur-2xl shadow-2xl border-2 border-white p-6 sm:p-10">
            {/* Header Brand */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 text-white shadow-lg mb-4">
                <Cloud className="h-8 w-8" />
              </div>

              {authMode === 'forgot' && (
                <>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
                    Reset your{' '}
                    <span className="bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 bg-clip-text text-transparent">
                      Password
                    </span>
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 font-medium">
                    Enter your email address to receive a 6-digit verification code
                  </p>
                </>
              )}

              {authMode === 'reset' && (
                <>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
                    Create New{' '}
                    <span className="bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 bg-clip-text text-transparent">
                      Password
                    </span>
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 font-medium">
                    Enter the code sent to <strong className="text-gray-900">{email}</strong> and set your new password
                  </p>
                </>
              )}

              {authMode === 'login' && (
                <>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
                    Welcome to{' '}
                    <span className="bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 bg-clip-text text-transparent">
                      AuraDrive
                    </span>
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 font-medium">
                    Sign in to access your personal photo library and cloud drive
                  </p>
                </>
              )}

              {authMode === 'register' && (
                <>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
                    Create your{' '}
                    <span className="bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 bg-clip-text text-transparent">
                      Account
                    </span>
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 font-medium">
                    Start storing and sharing your photos safely in the cloud
                  </p>
                </>
              )}
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-6 rounded-2xl bg-red-50 border border-red-200/90 p-4 text-center text-sm font-bold text-red-600 shadow-sm">
                {authError}
              </div>
            )}

            {/* FORGOT PASSWORD FORM */}
            {authMode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-4 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:to-pink-600 text-white font-extrabold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchAuthMode('login')}
                    className="text-sm font-bold text-gray-600 hover:text-pink-600 transition-colors cursor-pointer"
                  >
                    Remember your password? <span className="text-pink-600 underline">Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* RESET PASSWORD FORM */}
            {authMode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="123456"
                      required
                      maxLength={6}
                      className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-4 py-3.5 text-xl font-bold tracking-widest text-center border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner font-mono"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-gray-700">
                      New Password
                    </label>
                    <span className={`text-xs font-bold ${newPassword.length >= 8 && newPassword.length <= 10 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {newPassword.length}/10 chars
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="8–10 characters"
                      required
                      minLength={8}
                      maxLength={10}
                      className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-12 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mt-1">
                    ℹ️ Must be between <strong>8 and 10 characters</strong> (any characters allowed).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      required
                      minLength={8}
                      maxLength={10}
                      className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-12 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  {countdown > 0 ? (
                    <span className="text-xs sm:text-sm font-semibold text-gray-500">
                      Resend code in {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isAuthenticating}
                      onClick={handleResendCode}
                      className="text-xs sm:text-sm font-bold text-pink-600 hover:text-pink-700 underline cursor-pointer"
                    >
                      Didn't receive code? Resend
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:to-pink-600 text-white font-extrabold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchAuthMode('login')}
                    className="text-sm font-bold text-gray-600 hover:text-pink-600 transition-colors cursor-pointer"
                  >
                    Cancel &amp; Return to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* LOGIN OR REGISTER FORM */}
            {(authMode === 'login' || authMode === 'register') && (
              <form onSubmit={handleAuth} className="space-y-5">
                {authMode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Alex Johnson"
                        required
                        className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-4 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-4 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-gray-700">
                      Password
                    </label>
                    {authMode === 'register' && (
                      <span className={`text-xs font-bold ${password.length >= 8 && password.length <= 10 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {password.length}/10 chars
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={authMode === 'register' ? '8–10 characters' : 'Enter your password'}
                      required
                      minLength={authMode === 'register' ? 8 : undefined}
                      maxLength={authMode === 'register' ? 10 : undefined}
                      className="w-full rounded-2xl bg-gray-100/90 text-gray-800 placeholder-gray-400 pl-11 pr-12 py-3.5 text-base font-medium border-2 border-transparent focus:border-pink-400 focus:bg-white focus:outline-none transition-all shadow-inner"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {authMode === 'register' && (
                    <p className="text-xs font-semibold text-gray-500 mt-1">
                      ℹ️ Must be between <strong>8 and 10 characters</strong> (any characters allowed).
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded-md accent-pink-500 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-gray-600">
                      {authMode === 'register' ? 'Remember this device' : 'Remember me'}
                    </span>
                  </label>

                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchAuthMode('forgot')}
                      className="text-xs sm:text-sm font-bold text-pink-600 hover:text-pink-700 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:to-pink-600 text-white font-extrabold text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{authMode === 'register' ? 'Create Free Account' : 'Sign In to AuraDrive'}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-3 border-t border-gray-200">
                  {authMode === 'register' ? (
                    <button
                      type="button"
                      onClick={() => switchAuthMode('login')}
                      className="text-sm font-medium text-gray-600 cursor-pointer"
                    >
                      Already have an account?{' '}
                      <span className="font-extrabold text-pink-600 hover:underline">Sign In</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchAuthMode('register')}
                      className="text-sm font-medium text-gray-600 cursor-pointer"
                    >
                      Don't have an account?{' '}
                      <span className="font-extrabold text-pink-600 hover:underline">Create Free Account</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. AUTHENTICATED DASHBOARD VIEW (template/upform Design System)
  const activeMediaList = galleryTab === 'active' ? displayedItems : trashItems;

  return (
    <div className="min-h-screen bg-[#f0e7db] text-gray-800 flex flex-col font-sans relative overflow-x-hidden">
      <Toaster position="top-right" theme="light" closeButton toastOptions={{ duration: 4000 }} />

      {/* Signature template/upform Chromatic Blur Orbs */}
      <Blur
        className="fixed top-[-40px] left-[-40px] pointer-events-none z-0"
        style={{ filter: 'blur(70px)', transform: 'scale(1.8)', opacity: 0.85 }}
      />
      <Blur
        className="fixed bottom-[-60px] right-[-60px] pointer-events-none z-0"
        style={{ filter: 'blur(80px)', transform: 'scale(1.5)', opacity: 0.7 }}
      />

      {/* Top Header (template/upform styled & enlarged) */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/60 shadow-sm">
        <div className="mx-auto flex h-24 sm:h-28 max-w-7xl items-center justify-between px-6 sm:px-10">
          {/* Logo */}
          <div
            onClick={() => setGalleryTab('active')}
            className="flex cursor-pointer items-center gap-3.5 sm:gap-4.5 select-none"
          >
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 text-white shadow-lg shrink-0">
              <Cloud className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-800">
                AuraDrive
              </span>
              <span className="ml-3 px-3.5 py-1 rounded-full text-sm font-bold bg-pink-100 text-pink-700 border border-pink-200/60 hidden sm:inline-block shadow-xs">
                Cloud Drive
              </span>
            </div>
          </div>

          {/* Nav Actions / Metrics */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Storage Usage Widget */}
            {storageUsage && (
              <div
                className="hidden sm:inline-flex items-center gap-3.5 rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white/90 px-5 py-3 text-gray-700 shadow-md"
                title={`${storageUsage.total_formatted} used of ${storageUsage.quota_formatted}`}
              >
                <HardDrive className="h-6 w-6 text-pink-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-extrabold text-gray-800 leading-none">
                    {storageUsage.total_formatted}{' '}
                    <span className="text-gray-500 font-medium text-xs sm:text-sm">
                      / {storageUsage.quota_formatted}
                    </span>
                  </span>
                  <div className="h-2.5 sm:h-3 w-36 sm:w-48 bg-gray-200 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-pink-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(3, storageUsage.used_percentage))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Operational Status Dot */}
            <div className="inline-flex items-center gap-2.5 sm:gap-3 rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white/90 px-4 sm:px-5 py-3 text-sm sm:text-base font-bold text-gray-700 shadow-md">
              <span className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-100 shrink-0" />
              <span className="hidden md:inline">All Backed Up</span>
            </div>

            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-base sm:text-lg font-bold text-gray-700 hidden lg:inline truncate max-w-[180px]">
                {effectiveUser?.full_name || effectiveUser?.email || 'User'}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out of AuraDrive"
                className="cursor-pointer inline-flex items-center gap-2.5 rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white/90 hover:bg-gray-100 px-4.5 sm:px-6 py-3 text-base sm:text-lg font-bold text-gray-700 hover:text-red-600 transition-all shadow-md active:scale-98"
              >
                <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-7xl w-full flex-1 px-4 py-8 sm:px-10 sm:py-12 flex flex-col">
        {/* Upload Ingestion Section (Only in active view) */}
        {galleryTab === 'active' && (
          <UploadForm
            onUploadSuccess={() => {
              loadGallery(false);
              loadUsage();
            }}
          />
        )}

        {/* Gallery / Recycle Bin Section */}
        <section className="flex-1 flex flex-col">
          {/* Section Toolbar with Heading and Segmented Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pb-6">
            <div>
              <span className="text-sm font-extrabold uppercase tracking-wider text-pink-700 bg-pink-100/90 px-4 py-1.5 rounded-full inline-block mb-3 border border-pink-200/60 shadow-xs">
                Photo Library
              </span>
              <div className="flex items-center gap-3.5 flex-wrap">
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900">
                  {galleryTab === 'active' ? 'Your Photo Gallery' : 'Recycle Bin'}
                </h2>
                <span className="px-4 py-1.5 rounded-full text-base sm:text-lg font-black bg-pink-100 text-pink-700 shadow-xs border border-pink-200/60">
                  {activeMediaList.length} {activeMediaList.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="mt-2.5 text-base sm:text-lg text-gray-600 max-w-2xl font-bold leading-relaxed">
                {galleryTab === 'active'
                  ? 'View high-resolution photos, copy instant share links, or download your photos.'
                  : 'Photos in the recycle bin stay for 7 days before being permanently deleted. You can restore them anytime.'}
              </p>
            </div>

            {/* Segmented Tab Switcher (template/upform styled & enlarged) */}
            <div className="inline-flex items-center rounded-2xl bg-white/90 backdrop-blur-md p-2 border-2 border-white shadow-lg gap-2 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setGalleryTab('active');
                  setSelectedIds([]);
                }}
                className={`cursor-pointer inline-flex items-center gap-2.5 rounded-xl px-5 sm:px-6 py-3.5 text-base sm:text-lg font-black transition-all ${
                  galleryTab === 'active'
                    ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Layers className="w-5 h-5 stroke-[2.5]" />
                <span>Photos ({displayedItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGalleryTab('trash');
                  setSelectedIds([]);
                  loadTrash();
                }}
                className={`cursor-pointer inline-flex items-center gap-2.5 rounded-xl px-5 sm:px-6 py-3.5 text-base sm:text-lg font-black transition-all ${
                  galleryTab === 'trash'
                    ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
                <span>Recycle Bin ({trashItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loadGallery(true);
                  loadTrash();
                  loadUsage();
                }}
                disabled={isRefreshing}
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-white hover:bg-gray-50 px-4 sm:px-5 py-3.5 text-base sm:text-lg font-extrabold text-gray-700 border border-gray-200 shadow-xs transition-all"
                title="Refresh library"
              >
                <RefreshCw className={`w-5 h-5 stroke-[2.5] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* 7-Day Auto-Clear Warning Banner in Recycle Bin */}
          {galleryTab === 'trash' && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-amber-50/95 backdrop-blur-md border-2 border-amber-200/90 p-5 sm:p-6 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-200/80 text-amber-800 shadow-xs">
                  <Clock className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-base sm:text-lg font-extrabold text-amber-900 leading-snug">
                  Photos stay here for <strong>7 days</strong> before permanent deletion. You can restore them anytime.
                </span>
              </div>

              {trashItems.length > 0 && (
                <button
                  type="button"
                  disabled={isTrashEmptying}
                  onClick={handleEmptyTrash}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-red-500 hover:bg-red-600 px-6 py-3.5 text-base sm:text-lg font-black text-white shadow-md transition-all shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>{isTrashEmptying ? 'Emptying...' : 'Empty Recycle Bin'}</span>
                </button>
              )}
            </div>
          )}

          {/* Multi-Select Batch Actions Toolbar */}
          {activeMediaList.length > 0 && (
            <div className="mt-6 flex items-center justify-between flex-wrap gap-4 rounded-3xl bg-white/95 backdrop-blur-xl p-5 sm:px-7 shadow-xl border-2 border-white">
              <div className="flex items-center gap-3">
                {selectedIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="cursor-pointer inline-flex items-center gap-2.5 text-lg sm:text-xl font-black text-gray-800 hover:text-pink-600 transition-colors"
                  >
                    <CheckSquare className="w-6 h-6 text-pink-500 stroke-[2.5]" />
                    <span>{selectedIds.length} of {activeMediaList.length} selected</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="cursor-pointer inline-flex items-center gap-2.5 text-lg sm:text-xl font-black text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <Square className="w-6 h-6 text-gray-400 stroke-[2.5]" />
                    <span>Select All</span>
                  </button>
                )}
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Multiple Download Button */}
                  <button
                    type="button"
                    onClick={handleBatchDownload}
                    className="cursor-pointer inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-400 via-pink-500 to-rose-400 hover:from-red-500 hover:to-pink-600 px-6 py-3.5 text-base sm:text-lg font-black text-white shadow-lg transition-all"
                    title="Download selected photos"
                  >
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    <span>Download ({selectedIds.length})</span>
                  </button>

                  {/* Move to Recycle Bin (Active View) */}
                  {galleryTab === 'active' ? (
                    <button
                      type="button"
                      onClick={handleBatchTrash}
                      className="cursor-pointer inline-flex items-center gap-2.5 rounded-2xl bg-red-100 hover:bg-red-200 px-6 py-3.5 text-base sm:text-lg font-black text-red-600 transition-all shadow-sm"
                      title="Move selected photos to Recycle Bin"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Move to Trash ({selectedIds.length})</span>
                    </button>
                  ) : (
                    <>
                      {/* Restore Selected (Trash View) */}
                      <button
                        type="button"
                        onClick={handleBatchRestore}
                        className="cursor-pointer inline-flex items-center gap-2.5 rounded-2xl bg-emerald-100 hover:bg-emerald-200 px-6 py-3.5 text-base sm:text-lg font-black text-emerald-700 transition-all shadow-sm"
                        title="Restore selected photos"
                      >
                        <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                        <span>Restore ({selectedIds.length})</span>
                      </button>

                      {/* Permanent Delete Selected */}
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDialog({
                            title: `Permanently Delete ${selectedIds.length} Photos?`,
                            description: `Are you sure you want to permanently delete ${selectedIds.length} photos from your cloud storage? This action cannot be undone.`,
                            confirmText: 'Delete Forever',
                            variant: 'danger',
                            icon: Trash2,
                            onConfirm: async () => {
                              try {
                                for (const id of selectedIds) {
                                  await permanentlyDeleteMedia(id);
                                }
                                toast.success(`Deleted ${selectedIds.length} photos permanently.`);
                                setSelectedIds([]);
                                loadTrash();
                                loadUsage();
                              } catch (err) {
                                toast.error(err.message || 'Failed to delete photos.');
                              }
                            },
                          });
                        }}
                        className="cursor-pointer inline-flex items-center gap-2.5 rounded-2xl bg-red-100 hover:bg-red-200 px-6 py-3.5 text-base sm:text-lg font-black text-red-600 transition-all shadow-sm"
                        title="Permanently delete selected photos"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>Delete Forever ({selectedIds.length})</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="cursor-pointer inline-flex items-center rounded-2xl bg-gray-100 hover:bg-gray-200 px-5 py-3.5 text-base font-extrabold text-gray-700 transition-all shadow-sm"
                  >
                    Deselect
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Gallery / Trash Grid display */}
          <GalleryGrid
            items={activeMediaList}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectMedia={(item) => setSelectedMedia(item)}
            onDownloadSingle={handleDownloadSingle}
            onTrashSingle={handleTrashSingle}
            onRestoreSingle={handleRestoreSingle}
            onPermanentDeleteSingle={handlePermanentDeleteSingle}
            onShareSingle={handleShareSingle}
            isTrashView={galleryTab === 'trash'}
          />
        </section>
      </main>

      {/* Footer (Enlarged & Prominent) */}
      <footer className="relative z-10 border-t border-white/80 bg-white/80 backdrop-blur-md py-7 mt-auto shadow-xs">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-base sm:text-lg font-bold text-gray-600">
          <div>&copy; {new Date().getFullYear()} AuraDrive. Fast, Private Cloud Photo Storage.</div>
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/90 border border-gray-200/80 shadow-xs text-sm sm:text-base font-extrabold text-gray-700">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-xs animate-pulse" />
            <span>Private &amp; Secure Cloud</span>
          </div>
        </div>
      </footer>

      {/* Modal Inspector with AnimatePresence */}
      <AnimatePresence>
        {selectedMedia && (
          <MediaModal
            item={selectedMedia}
            onClose={() => setSelectedMedia(null)}
            onDownload={handleDownloadSingle}
            onTrash={handleTrashSingle}
            onRestore={handleRestoreSingle}
            onPermanentDelete={handlePermanentDeleteSingle}
            isTrashView={galleryTab === 'trash'}
          />
        )}
      </AnimatePresence>

      {/* In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        description={confirmDialog?.description}
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        variant={confirmDialog?.variant}
        icon={confirmDialog?.icon}
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
}
