"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, Mail, Lock, User as UserIcon, Info, Check, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { ApiError, fetchPasswordPolicy, type PasswordPolicyDto } from "@/lib/api";
import { validatePassword } from "@/lib/utils/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Mode = "signin" | "signup";

export function SignInModal() {
  const open = useAuthStore((s) => s.signInOpen);
  const setOpen = useAuthStore((s) => s.setSignInOpen);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<Mode>("signin");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [policy, setPolicy] = useState<PasswordPolicyDto | null>(null);

  // Fetch the config-driven password policy from the backend (no hardcoded
  // requirements in the UI).
  useEffect(() => {
    fetchPasswordPolicy()
      .then(setPolicy)
      .catch(() => setPolicy(null));
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    clearError();
    setFieldErrors([]);
  };

  // Live password checklist (Create Account mode), labels from the backend.
  const passwordCheck = useMemo(() => {
    if (mode !== "signup" || !policy) return null;
    return validatePassword(password, policy);
  }, [mode, policy, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors([]);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp({ email, password, firstName: firstName || undefined });
      }
    } catch (err) {
      // Prefer field-level details from the backend (e.g. password policy).
      if (err instanceof ApiError && err.details?.length) {
        const passwordIssues = err.details.filter(
          (d) => d.path === "password" || d.path.endsWith(".password"),
        );
        if (passwordIssues.length > 0) {
          setFieldErrors(passwordIssues.map((d) => d.message));
        }
      }
      // error is surfaced from the store (generic) as a fallback
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="size-4 text-primary" />
            {mode === "signin" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signin"
              ? "Sign in to manage your orders, collection, and rewards."
              : "Join the collector community and manage your collection, orders, and rewards."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <div
          className="flex w-fit items-center gap-1 rounded-full border border-border bg-elevated p-0.5"
          role="tablist"
          aria-label="Auth mode"
        >
          {(
            [
              { key: "signin", label: "Sign In" },
              { key: "signup", label: "Create Account" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => switchMode(t.key)}
              role="tab"
              aria-selected={mode === t.key}
              className={cn(
                "h-7 rounded-full px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                mode === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-name">Name</Label>
              <div className="relative">
                <UserIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ash Ketchum"
                  className="pl-9"
                  autoComplete="name"
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trainer@vault.io"
                className="pl-9"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="auth-password">Password</Label>
              {mode === "signup" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
                      aria-label="Password requirements"
                    >
                      <Info className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground shadow-elevated"
                    >
                      {policy?.requirements?.length
                        ? policy.requirements.map((r) => r.label).join(" · ")
                        : "Please choose a strong password."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors([]);
                }}
                placeholder="••••••••"
                className={cn(
                  "pl-9",
                  mode === "signup" &&
                    password.length > 0 &&
                    passwordCheck &&
                    !passwordCheck.ok &&
                    "border-destructive/60 focus-visible:ring-destructive/40",
                )}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
              />
            </div>
            {/* Live password requirements checklist (Create Account mode) */}
            {mode === "signup" && passwordCheck && (
              <ul className="mt-1 flex flex-col gap-1">
                {passwordCheck.requirements.map((req) => (
                  <li
                    key={req.key}
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      req.met
                        ? "text-muted-foreground line-through decoration-muted/40"
                        : "text-foreground",
                    )}
                  >
                    {req.met ? (
                      <Check className="size-3.5 shrink-0 text-success" />
                    ) : (
                      <X className="size-3.5 shrink-0 text-destructive" />
                    )}
                    {req.label}
                  </li>
                ))}
              </ul>
            )}
            {/* Specific backend validation messages (after a failed submit) */}
            {fieldErrors.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1" role="alert">
                {fieldErrors.map((msg, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-xs text-destructive"
                  >
                    <X className="mt-0.5 size-3.5 shrink-0" />
                    {msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && fieldErrors.length === 0 && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
