"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "./actions";
import Link from "next/link";
import { ArrowLeft, Mail, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(forgotPasswordAction, null);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (state?.resetLink) {
      await navigator.clipboard.writeText(state.resetLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

        {/* Card */}
        <div className="auth-card overflow-hidden">
          <div className="p-6 pb-4 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-accent-cyan" />
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center">
              Reset Password
            </h1>
            <p className="text-sm text-foreground-muted text-center mt-1">
              Enter your email to receive a reset link
            </p>
          </div>

          <form action={action}>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground-secondary"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  className="w-full auth-input"
                />
              </div>

              {state?.error && (
                <div className="text-sm text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2.5">
                  {state.error}
                </div>
              )}

              {state?.success && (
                <div className="bg-accent-green/10 border border-accent-green/20 rounded-lg p-4">
                  <p className="text-sm text-accent-green font-medium mb-2">
                    Reset link generated!
                  </p>
                  <p className="text-xs text-foreground-muted mb-3">
                    Copy this link and open it in your browser:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2.5 bg-background rounded-lg text-xs text-foreground-secondary break-all border border-border">
                      {state.resetLink}
                    </code>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="p-2.5 rounded-lg bg-background border border-border hover:bg-background-tertiary transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-accent-green" />
                      ) : (
                        <Copy className="w-4 h-4 text-foreground-muted" />
                      )}
                    </button>
                  </div>
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
                    Generating link...
                  </span>
                ) : (
                  "Generate Reset Link"
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
      </div>
    </div>
  );
}
