import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
} from "lucide-react";

import { AccountLayout } from "../components/account/AccountLayout";
import { useUserDetailsStore } from "../store/useUsersDetails";
import {
  changePassword,
  logoutAllSessions,
  requestEmailChange,
  verifyEmailChange,
  sendEmailVerification,
  verifyEmail,
} from "../api/auth/fetch";
import { useMeQuery } from "../api/auth/query";
import toast from "react-hot-toast";

export function AccountSecurityPage() {
  const navigate = useNavigate();
  const { userDetails, clearUserDetails } = useUserDetailsStore();
  const { data, refetch } = useMeQuery();

  const user = data?.data || userDetails;

  // Change Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  // Email Change state
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeToken, setEmailChangeToken] = useState("");
  const [emailChangeStep, setEmailChangeStep] = useState<"request" | "verify">("request");
  const [requestingEmailChange, setRequestingEmailChange] = useState(false);
  const [verifyingEmailChange, setVerifyingEmailChange] = useState(false);
  const [emailChangeDevToken, setEmailChangeDevToken] = useState<string | null>(null);

  // Email Verification state (for unverified existing email)
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verifyTokenInput, setVerifyTokenInput] = useState("");
  const [verifyingExisting, setVerifyingExisting] = useState(false);

  // Invalidate all sessions state
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  useEffect(() => {
    document.title = "Security & Login | KitabGhar";
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!oldPassword) {
      setPwdError("Please enter your current password");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match");
      return;
    }

    if (oldPassword === newPassword) {
      setPwdError("New password must be different from current password");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await changePassword({
        oldPassword,
        newPassword,
      });

      if (res.isSuccess) {
        setPwdSuccess("Password updated successfully! All other active sessions have been signed out.");
        toast.success("Password changed successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwdError(res.message || "Failed to change password");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to update password";
      setPwdError(msg);
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail.toLowerCase() === user.email.toLowerCase()) {
      toast.error("Please enter a new, different email address");
      return;
    }

    try {
      setRequestingEmailChange(true);
      const res = await requestEmailChange(newEmail);
      toast.success(res.message);
      if (res.verificationToken) {
        setEmailChangeDevToken(res.verificationToken);
        setEmailChangeToken(res.verificationToken);
      }
      setEmailChangeStep("verify");
    } catch (err: any) {
      toast.error(err.message || "Failed to request email change");
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailChangeToken.trim()) {
      toast.error("Please enter verification token");
      return;
    }

    try {
      setVerifyingEmailChange(true);
      const res = await verifyEmailChange(emailChangeToken.trim());
      toast.success(res.message || "Email updated successfully!");
      setNewEmail("");
      setEmailChangeToken("");
      setEmailChangeDevToken(null);
      setEmailChangeStep("request");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify new email");
    } finally {
      setVerifyingEmailChange(false);
    }
  };

  const handleSendEmailVerification = async () => {
    try {
      setSendingVerification(true);
      const res = await sendEmailVerification();
      toast.success(res.message || "Verification code sent to your email!");
      if (res.data?.verificationToken) {
        setVerifyTokenInput(res.data.verificationToken);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification email");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleVerifyCurrentEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyTokenInput.trim()) {
      toast.error("Please enter verification code");
      return;
    }

    try {
      setVerifyingExisting(true);
      const res = await verifyEmail(verifyTokenInput.trim());
      toast.success(res.message || "Email successfully verified!");
      setVerifyTokenInput("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifyingExisting(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    if (!confirm("Are you sure you want to log out of all active sessions and devices?")) {
      return;
    }

    try {
      setLoggingOutAll(true);
      await logoutAllSessions();
      clearUserDetails();
      toast.success("All active sessions have been invalidated.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to log out all sessions");
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <AccountLayout
      title="Security & Login"
      subtitle="Manage your credentials, password security, email verification, and session control."
    >
      <div className="space-y-6">
        {/* Change Password Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Change Password
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a strong, unique password with at least 6 characters.
              </p>
            </div>
          </div>

          {pwdSuccess && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              {pwdSuccess}
            </div>
          )}

          {pwdError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              {pwdError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Re-type new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Email Verification & Email Change Workflows */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Email Address & Verification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current email: <span className="font-semibold text-slate-700 dark:text-slate-200">{user.email}</span>
              </p>
            </div>
          </div>

          {/* Current Verification Status */}
          {!user.isEmailVerified ? (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Your email is not verified yet
                </div>
                <button
                  type="button"
                  onClick={handleSendEmailVerification}
                  disabled={sendingVerification}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-xl shadow transition"
                >
                  {sendingVerification ? "Sending..." : "Send Verification Token"}
                </button>
              </div>

              {verifyTokenInput && (
                <form onSubmit={handleVerifyCurrentEmail} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    value={verifyTokenInput}
                    onChange={(e) => setVerifyTokenInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={verifyingExisting}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
                  >
                    {verifyingExisting ? "Verifying..." : "Verify"}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Your primary email address is verified and active.
            </div>
          )}

          {/* Secure Email Change Form */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
              Request Email Change
            </h4>

            {emailChangeStep === "request" ? (
              <form onSubmit={handleRequestEmailChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="new.email@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={requestingEmailChange}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {requestingEmailChange ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> Sending Code...
                    </>
                  ) : (
                    "Send Verification Code to New Email"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailChange} className="space-y-4 max-w-md">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-800 dark:text-indigo-300">
                  A verification code has been dispatched to <strong>{newEmail}</strong>.
                  {emailChangeDevToken && (
                    <div className="mt-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      Code: {emailChangeDevToken}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Paste verification token"
                    value={emailChangeToken}
                    onChange={(e) => setEmailChangeToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={verifyingEmailChange}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    {verifyingEmailChange ? "Confirming..." : "Confirm & Update Email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailChangeStep("request")}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Sessions & Privacy Controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Active Sessions & Device Security
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage where your account is signed in and invalidate suspicious activity.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            If you ever suspect unauthorized access or logged in on a public device, you can immediately invalidate all other active browser sessions.
          </p>

          <button
            type="button"
            onClick={handleLogoutAllSessions}
            disabled={loggingOutAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition disabled:opacity-50"
          >
            {loggingOutAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Invalidating...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" /> Sign Out From All Other Devices
              </>
            )}
          </button>
        </div>
      </div>
    </AccountLayout>
  );
}
