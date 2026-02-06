"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "./actions";
import Link from "next/link";
import { ArrowLeft, KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { Suspense, ReactNode } from "react";

function AuthWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center auth-background overflow-hidden">
      {/* Background orbs */}
      <div className="auth-orb w-[500px] h-[500px] bg-accent-cyan top-[-200px] left-[10%]" />
      <div className="auth-orb w-[400px] h-[400px] bg-accent-purple bottom-[-150px] right-[15%]" />
      <div className="auth-orb w-[300px] h-[300px] bg-accent-blue top-[40%] right-[-100px]" />

      <div className="relative w-full max-w-md mx-4 z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center shadow-lg">
            <span className="text-white text-xl font-bold">D</span>
          </div>
          <span className="text-2xl font-bold gradient-text">DevMetrics</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, action, isPending] = useActionState(resetPasswordAction, null);

  // Invalid token state
  if (!token) {
    return (
      <AuthWrapper>
        <div className="auth-card overflow-hidden">
          <div className="p-6 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-accent-red/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-accent-red" />
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center">
              Invalid Link
            </h1>
            <p className="text-sm text-foreground-muted text-center mt-1">
              This password reset link is invalid or expired
            </p>
          </div>

          <div className="p-6">
            <Link
              href="/login/forgot-password"
              className="w-full auth-button flex items-center justify-center"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  // Success state
  if (state?.success) {
    return (
      <AuthWrapper>
        <div className="auth-card overflow-hidden">
          <div className="p-6 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-accent-green" />
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center">
              Password Reset!
            </h1>
            <p className="text-sm text-foreground-muted text-center mt-1">
              Your password has been updated successfully
            </p>
          </div>

          <div className="p-6">
            <Link
              href="/login"
              className="w-full auth-button flex items-center justify-center"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  // Reset form
  return (
    <AuthWrapper>
      <div className="auth-card overflow-hidden">
        <div className="p-6 pb-4 border-b border-border">
          <div className="w-12 h-12 rounded-full bg-accent-purple/10 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-accent-purple" />
          </div>
          <h1 className="text-xl font-semibold text-foreground text-center">
            Set New Password
          </h1>
          <p className="text-sm text-foreground-muted text-center mt-1">
            Choose a strong password for your account
          </p>
        </div>

        <form action={action}>
          <input type="hidden" name="token" value={token} />
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground-secondary"
              >
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Enter new password"
                className="w-full auth-input"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground-secondary"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                placeholder="Confirm new password"
                className="w-full auth-input"
              />
            </div>

            {state?.error && (
              <div className="text-sm text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2.5">
                {state.error}
              </div>
            )}
          </div>

          <div className="p-6 pt-2 space-y-3">
            <button
              type="submit"
              disabled={isPending}
              className="w-full auth-button flex items-center justify-center"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Resetting...
                </span>
              ) : (
                "Reset Password"
              )}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </AuthWrapper>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center auth-background">
          <div className="flex items-center gap-2 text-foreground-muted">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading...
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
