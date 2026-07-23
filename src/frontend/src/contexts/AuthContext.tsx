// AuthContext — role detection for the DFW marketplace.
// Wraps Internet Identity + the user's marketplace profile to expose a single
// `role` value that Layout and route guards consume.

import { useGetMyUser } from "@/hooks/useQueries";
import type { MarketplaceRole, User } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Loader2 } from "lucide-react";
import { type ReactNode, createContext, useContext, useMemo } from "react";

export interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  login: () => void;
  logout: () => void;
  user: User | null;
  role: MarketplaceRole | null;
  isLoadingProfile: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    identity,
    isInitializing,
    isLoggingIn,
    login,
    clear,
    isAuthenticated,
  } = useInternetIdentity();
  const { data: user, isLoading: isLoadingProfile } = useGetMyUser();

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated,
      isInitializing,
      isLoggingIn,
      login,
      logout: clear,
      user: user ?? null,
      role: user?.role ?? null,
      isLoadingProfile,
    }),
    [
      isAuthenticated,
      isInitializing,
      isLoggingIn,
      login,
      clear,
      user,
      isLoadingProfile,
    ],
  );

  // Block rendering until II has finished initializing so role-based routing
  // doesn't flash the unauthenticated state on reload.
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2
          className="w-8 h-8 animate-spin text-primary"
          aria-label="Loading"
        />
      </div>
    );
  }

  // Only fetch the user profile once II has resolved an identity.
  void identity;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
