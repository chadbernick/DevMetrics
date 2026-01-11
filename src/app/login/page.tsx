"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, null);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login to DevMetrics</CardTitle>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
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
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full p-2 rounded-md border border-border bg-background-secondary"
              />
            </div>
            {state?.error && (
              <div className="text-sm text-red-500 font-medium">{state.error}</div>
            )}
          </CardContent>
          <CardFooter>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2 px-4 bg-accent-cyan text-background font-bold rounded-md hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Logging in..." : "Login"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
