"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "./actions";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, action, isPending] = useActionState(resetPasswordAction, null);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              This password reset link is invalid or missing a token.
            </p>
          </CardContent>
          <CardFooter>
            <Link
              href="/login/forgot-password"
              className="w-full py-2 px-4 bg-accent-cyan text-background font-bold rounded-md hover:bg-accent-cyan/90 transition-colors text-center block"
            >
              Request New Link
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Password Reset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-500 font-medium text-center">
                Your password has been reset successfully!
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Link
              href="/login"
              className="w-full py-2 px-4 bg-accent-cyan text-background font-bold rounded-md hover:bg-accent-cyan/90 transition-colors text-center block"
            >
              Go to Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
        </CardHeader>
        <form action={action}>
          <input type="hidden" name="token" value={token} />
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full p-2 rounded-md border border-border bg-background-secondary"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                className="w-full p-2 rounded-md border border-border bg-background-secondary"
              />
            </div>
            {state?.error && (
              <div className="text-sm text-red-500 font-medium">{state.error}</div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2 px-4 bg-accent-cyan text-background font-bold rounded-md hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Resetting..." : "Reset Password"}
            </button>
            <Link
              href="/login"
              className="text-sm text-accent-cyan hover:underline"
            >
              Back to Login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
