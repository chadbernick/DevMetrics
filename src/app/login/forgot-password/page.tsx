"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "./actions";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(forgotPasswordAction, null);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your email address and we&apos;ll generate a password reset link.
            </p>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                className="w-full p-2 rounded-md border border-border bg-background-secondary"
              />
            </div>
            {state?.error && (
              <div className="text-sm text-red-500 font-medium">{state.error}</div>
            )}
            {state?.success && (
              <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-500 font-medium mb-2">Reset link generated!</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Copy this link and open it in your browser:
                </p>
                <code className="block p-2 bg-background rounded text-xs break-all">
                  {state.resetLink}
                </code>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2 px-4 bg-accent-cyan text-background font-bold rounded-md hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Generating..." : "Generate Reset Link"}
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
