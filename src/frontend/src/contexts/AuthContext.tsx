// AuthContext — visible auth surface for the DFW marketplace.
//
// The platform has no email/password login API. Internet Identity remains the
// invisible identity layer (configured in main.tsx). This context exposes the
// same AuthState shape the rest of the app already consumes, but routes the
// visible sign-in through Google (`login({ provider: 'google' })`) or email
// (plain `login()` with the email captured for profile pre-fill). It also owns
// the SignInModal visibility state so Layout and any page can trigger it.

import { useGetMyUser } from "@/hooks/useQueries";
import { useUpsertMyUser } from "@/hooks/useQueries";
import type { MarketplaceRole, User, UserInput } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Loader2 } from "lucide-react";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SignInMethod = "google" | "email";

export interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  /**
   * Polymorphic login. With no argument (or "google") it triggers Google OAuth.
   * With "email" it triggers a plain II login; the email/password are captured
   * by the SignInModal and passed to {@link signInWithEmail} so the profile can
   * be pre-filled after the II-backed identity resolves.
   */
  login: (method?: SignInMethod) => void;
  /** Google OAuth sign-in. */
  signInWithGoogle: () => void;
  /**
   * Email sign-in. The platform has no password auth, so this performs a plain
   * II login() and stores the email for profile pre-fill once authenticated.
   */
  signInWithEmail: (email: string, password: string) => void;
  logout: () => void;
  user: User | null;
  role: MarketplaceRole | null;
  isLoadingProfile: boolean;
  /** SignInModal visibility. */
  isSignInModalOpen: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isInitializing, isLoggingIn, login, clear, isAuthenticated } =
    useInternetIdentity();
  const { data: user, isLoading: isLoadingProfile } = useGetMyUser();
  const upsertMyUser = useUpsertMyUser();

  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  // Email captured from the SignInModal for profile pre-fill after the
  // II-backed login completes. The password is intentionally not stored —
  // the platform has no password auth.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const closeSignInModal = useCallback(() => {
    setIsSignInModalOpen(false);
  }, []);

  const openSignInModal = useCallback(() => {
    setIsSignInModalOpen(true);
  }, []);

  const signInWithGoogle = useCallback(() => {
    setPendingEmail(null);
    login({ provider: "google" });
  }, [login]);

  const signInWithEmail = useCallback(
    (email: string, _password: string) => {
      setPendingEmail(email);
      // Plain II login — the platform has no email/password auth API. The
      // email is used to pre-fill the user profile once authenticated.
      login();
    },
    [login],
  );

  const loginPolymorphic = useCallback(
    (method: SignInMethod = "google") => {
      if (method === "google") {
        signInWithGoogle();
      } else {
        // Email method requires the email/password captured by the modal;
        // open the modal so the user can provide them.
        openSignInModal();
      }
    },
    [signInWithGoogle, openSignInModal],
  );

  const logout = useCallback(() => {
    setPendingEmail(null);
    clear();
  }, [clear]);

  // Pre-fill the user profile with the captured email once authenticated.
  // Runs only when we have a pending email, the user is authenticated, and
  // the profile query has resolved (user may be null for a brand-new account).
  const userEmail = user?.email ?? null;
  const upsertIsPending = upsertMyUser.isPending;
  useEffect(() => {
    if (!isAuthenticated || !pendingEmail || upsertIsPending) return;
    if (userEmail === pendingEmail) return; // already set
    // Only pre-fill if the profile has no email yet, or it differs.
    const input: UserInput = {
      displayName: user?.displayName ?? pendingEmail.split("@")[0],
      email: pendingEmail,
      role: user?.role ?? "customer",
      // Preserve any existing profile fields the backend already holds.
      // The backend upsert merges provided fields, so we only send what we
      // intend to set; the existing record keeps its other fields.
    };
    void upsertMyUser.mutateAsync(input).then(() => {
      setPendingEmail(null);
    });
    // We intentionally do not throw on failure — the user is still
    // authenticated; the email pre-fill is a best-effort enhancement.
  }, [
    isAuthenticated,
    pendingEmail,
    userEmail,
    upsertIsPending,
    upsertMyUser,
    user?.displayName,
    user?.role,
  ]);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated,
      isInitializing,
      isLoggingIn,
      login: loginPolymorphic,
      signInWithGoogle,
      signInWithEmail,
      logout,
      user: user ?? null,
      role: user?.role ?? null,
      isLoadingProfile,
      isSignInModalOpen,
      openSignInModal,
      closeSignInModal,
    }),
    [
      isAuthenticated,
      isInitializing,
      isLoggingIn,
      loginPolymorphic,
      signInWithGoogle,
      signInWithEmail,
      logout,
      user,
      isLoadingProfile,
      isSignInModalOpen,
      openSignInModal,
      closeSignInModal,
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
