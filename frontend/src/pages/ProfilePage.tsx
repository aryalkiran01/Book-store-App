import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  MapPin,
  Calendar,
  Shield,
  ShoppingBag,
  Heart,
  Star,
  BookOpen,
  Edit3,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Save,
  Check,
} from "lucide-react";

import { AccountLayout } from "../components/account/AccountLayout";
import { useUserDetailsStore } from "../store/useUsersDetails";
import {
  useMeQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
} from "../api/auth/query";
import { checkUsernameAvailability } from "../api/auth/fetch";
import toast from "react-hot-toast";

export function ProfilePage() {
  const { userDetails } = useUserDetailsStore();
  const { data, isLoading, isError, refetch } = useMeQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const removeAvatarMutation = useRemoveAvatarMutation();

  const user = data?.data || userDetails;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    displayName: "",
    bio: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    province: "",
    country: "Nepal",
  });

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Personal Profile | KitabGhar";
  }, []);

  // Sync form data when user profile loads
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        displayName: user.displayName || "",
        bio: user.bio || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.location?.city || "",
        district: user.location?.district || "",
        province: user.location?.province || "",
        country: user.location?.country || "Nepal",
      });
    }
  }, [user]);

  // Debounced username availability checker
  useEffect(() => {
    if (!isEditing) return;

    const trimmed = formData.username.trim();
    if (!trimmed || trimmed === user.username) {
      setUsernameStatus({ checking: false });
      return;
    }

    if (trimmed.length < 3) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Username must be at least 3 characters",
      });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Only alphanumeric characters, underscores, and hyphens",
      });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(trimmed);
        setUsernameStatus({
          checking: false,
          available: res.data.available,
          message: res.message,
        });
      } catch {
        setUsernameStatus({ checking: false });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.username, isEditing, user.username]);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      toast.error("Please upload a valid JPEG, PNG, or WEBP image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size cannot exceed 5MB.");
      return;
    }

    setSelectedAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatarFile) return;
    try {
      await uploadAvatarMutation.mutateAsync(selectedAvatarFile);
      toast.success("Profile photo updated successfully!");
      setSelectedAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile photo");
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;
    try {
      await removeAvatarMutation.mutateAsync();
      toast.success("Profile photo removed.");
      setAvatarPreview(null);
      setSelectedAvatarFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove avatar");
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usernameStatus.available === false) {
      toast.error("Please choose an available username");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        username: formData.username.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        location: {
          city: formData.city.trim(),
          district: formData.district.trim(),
          province: formData.province.trim(),
          country: formData.country.trim(),
        },
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const formattedLocation = [
    user.location?.city,
    user.location?.district,
    user.location?.province,
    user.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const memberSinceFormatted = user.memberSince || user.createdAt
    ? new Date(user.memberSince || user.createdAt!).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "September 2026";

  if (isLoading) {
    return (
      <AccountLayout title="Personal Profile" subtitle="Manage your account details">
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Loading your profile details...
          </p>
        </div>
      </AccountLayout>
    );
  }

  if (isError) {
    return (
      <AccountLayout title="Personal Profile">
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-3xl">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">
            Failed to load profile details
          </h3>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md"
          >
            Retry
          </button>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout
      title="Personal Profile"
      subtitle="View, edit, and update your personal details, avatar, and contact preferences"
    >
      <div className="space-y-6">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="relative group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-indigo-500 shadow-xl"
                  />
                ) : user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.displayName || user.username}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-xl">
                    {(user.displayName || user.username || "R").charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-2xl shadow-lg ring-2 ring-white dark:ring-slate-900 transition focus:outline-none"
                  title="Change photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileSelect}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              {/* Avatar actions if pending preview or exists */}
              {selectedAvatarFile ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={uploadAvatarMutation.isPending}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 shadow transition"
                  >
                    {uploadAvatarMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Save Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              ) : user.avatar ? (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={removeAvatarMutation.isPending}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove Photo
                </button>
              ) : null}
            </div>

            {/* Profile Info & Header summary */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    @{user.username}
                  </p>
                </div>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/20 transition self-center sm:self-auto"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                )}
              </div>

              {user.bio && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                  "{user.bio}"
                </p>
              )}

              {/* Meta information tags */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <span>{user.email}</span>
                </div>
                {formattedLocation && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>{formattedLocation}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>Member since {memberSinceFormatted}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {user.isEmailVerified ? "Verified Account" : "Active Member"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Orders
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {user.statistics?.orders ?? 0}
            </div>
            <span className="text-[11px] text-slate-400">Completed & placed</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Reviews
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {user.statistics?.reviews ?? 0}
            </div>
            <span className="text-[11px] text-slate-400">Shared community opinions</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Wishlist
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400">
                <Heart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {user.statistics?.wishlist ?? 0}
            </div>
            <span className="text-[11px] text-slate-400">Saved for later</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Books Bought
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {user.statistics?.booksPurchased ?? 0}
            </div>
            <span className="text-[11px] text-slate-400">Total copies purchased</span>
          </div>
        </div>

        {/* Personal Information & Edit Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Personal Details" : "Personal Information"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEditing
                  ? "Update your profile details below. Changes reflect across the application immediately."
                  : "Your registered details, contact info, and delivery location defaults."}
              </p>
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cancel editing"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Username & Display Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition bg-white dark:bg-slate-800 ${
                        usernameStatus.available === false
                          ? "border-rose-500 text-rose-600"
                          : usernameStatus.available === true
                          ? "border-emerald-500 text-emerald-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      }`}
                    />
                    {usernameStatus.checking && (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin absolute right-3 top-3" />
                    )}
                    {usernameStatus.available === true && !usernameStatus.checking && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
                    )}
                  </div>
                  {usernameStatus.message && (
                    <p
                      className={`text-[11px] mt-1 font-medium ${
                        usernameStatus.available
                          ? "text-emerald-600"
                          : "text-rose-500"
                      }`}
                    >
                      {usernameStatus.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kiran Aryal"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Email (Readonly info) & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address <span className="text-[10px] font-normal text-slate-400">(Change via Security page)</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+977 98XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  About Me / Bio
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="Tell fellow readers a bit about your favorite book genres or hobbies..."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition resize-none"
                />
              </div>

              {/* Structured Location */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                  Location & Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kathmandu"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kathmandu"
                      value={formData.district}
                      onChange={(e) =>
                        setFormData({ ...formData, district: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Province
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bagmati"
                      value={formData.province}
                      onChange={(e) =>
                        setFormData({ ...formData, province: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="Nepal"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Street / Local Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Baneshwor, Marg 4"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* View Details */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Username
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    @{user.username}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Full Name
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Not specified"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Email Address
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 flex items-center justify-between">
                    <span>{user.email}</span>
                    {user.isEmailVerified && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Phone Number
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {user.phone || "No phone added yet"}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {formattedLocation || "Nepal (Default)"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Street / Address
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {user.address || "No street address configured"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Account Status
                  </span>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Active Customer Account
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Member Since
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {memberSinceFormatted}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
