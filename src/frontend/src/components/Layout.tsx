// Layout — responsive role-based shell wrapping every marketplace route.
// Header navigation adapts to the authenticated user's role (customer/provider/admin).

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useGetMyUser } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import type { MarketplaceRole } from "@/types";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  Truck,
  User as UserIcon,
  X,
} from "lucide-react";
import { useState } from "react";
import { Footer } from "./Footer";
import { SignInModal } from "./SignInModal";

interface NavItem {
  label: string;
  to: string;
  icon: typeof Truck;
  ocid: string;
}

const customerNav: NavItem[] = [
  { label: "Browse", to: "/search", icon: Truck, ocid: "nav.browse" },
  {
    label: "My Bookings",
    to: "/customer/bookings",
    icon: Package,
    ocid: "nav.my_bookings",
  },
  {
    label: "Messages",
    to: "/customer/messages",
    icon: UserIcon,
    ocid: "nav.messages",
  },
];

const providerNav: NavItem[] = [
  {
    label: "Dashboard",
    to: "/provider/dashboard",
    icon: LayoutDashboard,
    ocid: "nav.dashboard",
  },
  {
    label: "Listings",
    to: "/provider/listings",
    icon: Package,
    ocid: "nav.listings",
  },
  {
    label: "Bookings",
    to: "/provider/bookings",
    icon: Truck,
    ocid: "nav.provider_bookings",
  },
];

const adminNav: NavItem[] = [
  {
    label: "Admin",
    to: "/admin",
    icon: ShieldCheck,
    ocid: "nav.admin",
  },
];

function navForRole(role: MarketplaceRole | null): NavItem[] {
  if (role === "provider") return providerNav;
  if (role === "admin") return adminNav;
  return customerNav;
}

export function Layout() {
  const {
    isAuthenticated,
    isLoggingIn,
    logout,
    openSignInModal,
    closeSignInModal,
    isSignInModalOpen,
    signInWithGoogle,
    signInWithEmail,
  } = useAuth();
  const { data: user } = useGetMyUser();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role ?? null;
  const navItems = navForRole(role);

  const handleLogin = () => {
    openSignInModal();
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link
              to="/"
              data-ocid="nav.home"
              className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Truck
                  className="w-5 h-5 text-primary-foreground"
                  aria-hidden
                />
              </div>
              <span className="font-display text-lg font-semibold text-foreground">
                DFW Haul
              </span>
            </Link>

            {/* Desktop nav */}
            {isAuthenticated ? (
              <nav
                className="hidden md:flex items-center gap-1"
                aria-label="Primary"
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      data-ocid={item.ocid}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-body font-medium transition-smooth",
                        isActive(item.to)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            {/* Auth actions */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    data-ocid="nav.profile"
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-body font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth"
                  >
                    <UserIcon className="w-4 h-4" aria-hidden />
                    <span className="max-w-[10rem] truncate">
                      {user?.displayName ?? "Profile"}
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    data-ocid="nav.logout"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="w-4 h-4" aria-hidden />
                    Sign out
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  data-ocid="nav.login"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      Connecting
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-md text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              data-ocid="nav.menu_toggle"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" aria-hidden />
              ) : (
                <Menu className="w-5 h-5" aria-hidden />
              )}
            </button>
          </div>

          {/* Mobile nav */}
          {mobileOpen && isAuthenticated ? (
            <nav
              className="md:hidden pb-4 pt-2 border-t border-border"
              aria-label="Mobile"
            >
              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      data-ocid={item.ocid}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-body font-medium transition-smooth",
                        isActive(item.to)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  data-ocid="nav.profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-body font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth"
                >
                  <UserIcon className="w-4 h-4" aria-hidden />
                  {user?.displayName ?? "Profile"}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  data-ocid="nav.logout"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-body font-medium text-muted-foreground hover:text-destructive hover:bg-secondary transition-smooth text-left"
                >
                  <LogOut className="w-4 h-4" aria-hidden />
                  Sign out
                </button>
              </div>
            </nav>
          ) : null}

          {mobileOpen && !isAuthenticated ? (
            <div className="md:hidden pb-4 pt-2 border-t border-border">
              <Button
                size="sm"
                onClick={handleLogin}
                disabled={isLoggingIn}
                data-ocid="nav.login"
                className="w-full"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Connecting
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex-1 bg-background">
        <Outlet />
      </main>

      <Footer />

      <SignInModal
        open={isSignInModalOpen}
        onOpenChange={(next) => {
          if (!next) closeSignInModal();
        }}
        onGoogleSignIn={signInWithGoogle}
        onEmailSignIn={signInWithEmail}
        isLoggingIn={isLoggingIn}
      />
    </div>
  );
}
