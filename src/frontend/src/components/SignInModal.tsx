// SignInModal — visible sign-in entry point for the DFW marketplace.
// Shows Google and Email/password options only. Internet Identity is never
// mentioned; it remains the invisible identity layer behind both methods.

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { FcGoogle } from "react-icons/fc";

export interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoogleSignIn: () => void;
  onEmailSignIn: (email: string, password: string) => void;
  isLoggingIn: boolean;
}

export function SignInModal({
  open,
  onOpenChange,
  onGoogleSignIn,
  onEmailSignIn,
  isLoggingIn,
}: SignInModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setEmailError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleGoogle = () => {
    onGoogleSignIn();
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Enter your email to continue.");
      return;
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!emailValid) {
      setEmailError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setEmailError("Enter your password to continue.");
      return;
    }
    setEmailError(null);
    onEmailSignIn(trimmed, password);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-ocid="auth.signin_modal">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Welcome to DFW Haul
          </DialogTitle>
          <DialogDescription>
            Sign in or create your marketplace account to book hauling services
            across the Dallas–Fort Worth area.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          {/* Google */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleGoogle}
            disabled={isLoggingIn}
            data-ocid="auth.signin_google_button"
            className="w-full"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <FcGoogle className="w-5 h-5" aria-hidden />
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-body uppercase tracking-wide text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Email + password */}
          <form
            onSubmit={handleEmailSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                disabled={isLoggingIn}
                aria-invalid={!!emailError}
                data-ocid="auth.signin_email_input"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                data-ocid="auth.signin_password_input"
              />
            </div>

            {emailError ? (
              <p
                role="alert"
                className="text-sm text-destructive"
                data-ocid="auth.signin_error"
              >
                {emailError}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={isLoggingIn}
              data-ocid="auth.signin_email_button"
              className="w-full"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Mail className="w-4 h-4" aria-hidden />
              )}
              Continue with Email
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center font-body">
            New here? Continue with Google or email and we’ll set up your
            customer account automatically.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
