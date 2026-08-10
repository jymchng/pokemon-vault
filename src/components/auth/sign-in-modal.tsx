"use client";

import { useState } from "react";
import { LogIn, Mail, Lock, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Mode = "signin" | "signup" | "forgot";

export function SignInModal() {
  const open = useAuthStore((s) => s.signInOpen);
  const setOpen = useAuthStore((s) => s.setSignInOpen);
  const signIn = useAuthStore((s) => s.signIn);

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin" || mode === "signup") {
      signIn({
        name: name || "Demo Trainer",
        email: email || "trainer@vault.io",
        level: 7,
        xp: 1680,
      });
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="size-4 text-primary" />
            {mode === "signin" && "Sign In"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signin" && "Welcome back to Pokémon Vault."}
            {mode === "signup" && "Join the collector community."}
            {mode === "forgot" && "We'll email you a reset link."}
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
              onClick={() => setMode(t.key)}
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trainer@vault.io"
                className="pl-9"
                autoComplete="email"
              />
            </div>
          </div>
          {mode !== "forgot" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-password">Password</Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                />
              </div>
            </div>
          )}
          <Button type="submit" className="w-full">
            {mode === "signin" && "Sign In"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Send Reset Link"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs">
          {mode !== "forgot" ? (
            <button
              onClick={() => setMode("forgot")}
              className="text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
            >
              Forgot password?
            </button>
          ) : (
            <button
              onClick={() => setMode("signin")}
              className="text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
            >
              Back to sign in
            </button>
          )}
          <span className="text-muted-foreground">Demo — no real auth</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
