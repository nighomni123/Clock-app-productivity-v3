import React, { useState } from 'react';
import { X, User, LogOut, CheckCircle, Smartphone, Lock, ShieldCheck, Key } from 'lucide-react';
import { UserAuth } from '../types';
import { signInWithGoogle, signInAnonymouslyUser, logoutUser } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAuth: UserAuth | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, userAuth }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signInAnonymouslyUser();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Guest sign-in failed.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logoutUser();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-100">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Account & Cross-Device Sync</h2>
            <p className="text-xs text-zinc-400">Manage session state across devices</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {userAuth ? (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Account Type:</span>
                <span className="font-semibold text-zinc-200">
                  {userAuth.isAnonymous ? 'Anonymous Guest' : 'Google Account'}
                </span>
              </div>

              {userAuth.email && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Email:</span>
                  <span className="text-zinc-200 font-mono">{userAuth.email}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Device Sync ID:</span>
                <span className="font-mono text-zinc-400">{userAuth.uid.slice(0, 12)}...</span>
              </div>
            </div>

            {userAuth.isAnonymous && (
              <div className="rounded-2xl border border-indigo-900/40 bg-indigo-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 font-medium">
                  <Smartphone className="h-4 w-4 text-indigo-400" />
                  <span>Continue Session on Different Devices</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  You are currently using an <strong>Anonymous Guest session</strong>. Sign in with Google to preserve all your study sessions, daily tasks, and custom settings across all mobile, tablet, and desktop devices!
                </p>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500 shadow transition disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Upgrade to Google Sign In</span>
                </button>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out Current Session</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <p className="text-zinc-400 leading-relaxed">
              Choose how you want to access your Focus Study Clock:
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-zinc-950 hover:bg-zinc-100 shadow transition disabled:opacity-50"
            >
              <Key className="h-4 w-4 text-zinc-950" />
              <span>Sign In with Google</span>
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className="w-full border-t border-zinc-800" />
              <span className="absolute bg-zinc-900 px-2 text-[10px] text-zinc-500 uppercase">Or</span>
            </div>

            <button
              onClick={handleAnonymousSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <User className="h-4 w-4 text-zinc-400" />
              <span>Continue as Anonymous Guest</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
