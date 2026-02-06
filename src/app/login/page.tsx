"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import Link from "next/link";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, null);

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
            <h1 className="text-xl font-semibold text-foreground text-center">
              Welcome back
            </h1>
            <p className="text-sm text-foreground-muted text-center mt-1">
              Sign in to your account
            </p>
          </div>

          <form action={action}>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground-secondary"
                >
                  Email
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground-secondary"
                  >
                    Password
                  </label>
                  <Link
                    href="/login/forgot-password"
                    className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full auth-input"
                />
              </div>

              {state?.error && (
                <div className="text-sm text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2.5">
                  {state.error}
                </div>
              )}
            </div>

            <div className="p-6 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full auth-button flex items-center justify-center"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
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
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-foreground-muted mt-6">
          Developer productivity metrics powered by AI
        </p>
      </div>
    </div>
  );
}
