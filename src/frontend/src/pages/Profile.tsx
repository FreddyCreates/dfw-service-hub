// Profile — user profile page for the DFW marketplace.
// Displays name, email, phone, avatar, role, and an edit form via useUpsertMyUser.
// Shows role-specific portal links (provider dashboard / admin portal).

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useGetMyProvider, useUpsertMyUser } from "@/hooks/useQueries";
import type { MarketplaceRole, UserInput } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AtSign,
  Building2,
  Check,
  Loader2,
  LogIn,
  Phone,
  ShieldCheck,
  Truck,
  User as UserIcon,
  UserPen,
} from "lucide-react";
import { useEffect, useState } from "react";

const ROLE_LABELS: Record<MarketplaceRole, string> = {
  customer: "Customer",
  provider: "Provider",
  admin: "Administrator",
};

const ROLE_ICONS: Record<MarketplaceRole, typeof UserIcon> = {
  customer: UserIcon,
  provider: Truck,
  admin: ShieldCheck,
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfilePage() {
  const {
    user,
    role,
    isAuthenticated,
    isInitializing,
    isLoadingProfile,
    login,
  } = useAuth();
  const { data: myProvider } = useGetMyProvider();
  const upsertMutation = useUpsertMyUser();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Sync form state when the user profile loads or changes.
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setAvatar(user.avatar ?? "");
    }
  }, [user]);

  if (isInitializing || isLoadingProfile) {
    return (
      <div className="bg-background" data-ocid="page.profile">
        <LoadingSpinner fullPage label="Loading your profile" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.profile"
      >
        <EmptyState
          icon={UserIcon}
          title="Sign in to view your profile"
          description="Sign in to manage your account details, role, and marketplace activity."
          action={
            <Button onClick={() => login()} data-ocid="profile.login">
              <LogIn className="w-4 h-4" aria-hidden />
              Sign in
            </Button>
          }
        />
      </div>
    );
  }

  const activeRole = role ?? user.role;
  const RoleIcon = ROLE_ICONS[activeRole];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const input: UserInput = {
      role: activeRole,
      displayName: displayName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      avatar: avatar.trim() || undefined,
    };
    upsertMutation.mutate(input, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const handleCancel = () => {
    setDisplayName(user.displayName);
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setAvatar(user.avatar ?? "");
    setIsEditing(false);
  };

  return (
    <div className="bg-background" data-ocid="page.profile">
      <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col gap-2 mb-8">
            <div className="flex items-center gap-2 text-primary">
              <UserIcon className="w-5 h-5" aria-hidden />
              <span className="text-sm font-body font-medium">Account</span>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
              Your profile
            </h1>
            <p className="text-muted-foreground font-body">
              Manage your account details and role across the DFW marketplace.
            </p>
          </div>

          {/* Profile header */}
          <Card className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="w-20 h-20 rounded-2xl border border-border shrink-0">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.displayName} />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-secondary text-primary font-display text-xl font-semibold">
                  {initials(user.displayName || "DFW User")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl font-semibold text-foreground truncate">
                  {user.displayName || "Unnamed user"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className="font-body gap-1 border-primary/30 bg-primary/10 text-primary"
                  >
                    <RoleIcon className="w-3 h-3" aria-hidden />
                    {ROLE_LABELS[activeRole]}
                  </Badge>
                  {user.principal ? (
                    <span className="text-xs text-muted-foreground font-mono">
                      {user.principal.toString().slice(0, 8)}…
                    </span>
                  ) : null}
                </div>
              </div>
              {!isEditing ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  data-ocid="profile.edit_open"
                >
                  <UserPen className="w-4 h-4" aria-hidden />
                  Edit profile
                </Button>
              ) : null}
            </div>
          </Card>

          {/* Edit form / read-only details */}
          {isEditing ? (
            <Card className="p-6">
              <form
                onSubmit={handleSave}
                className="flex flex-col gap-5"
                data-ocid="profile.edit_form"
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    required
                    data-ocid="profile.name_input"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <AtSign
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-9"
                      data-ocid="profile.email_input"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(214) 555-0123"
                      className="pl-9"
                      data-ocid="profile.phone_input"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input
                    id="avatar"
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://…"
                    data-ocid="profile.avatar_input"
                  />
                  <p className="text-xs text-muted-foreground font-body">
                    Paste a public image URL for your profile picture.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button
                    type="submit"
                    disabled={upsertMutation.isPending || !displayName.trim()}
                    data-ocid="profile.save_button"
                  >
                    {upsertMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="w-4 h-4" aria-hidden />
                    )}
                    Save changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={upsertMutation.isPending}
                    data-ocid="profile.cancel_button"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <dt className="text-xs text-muted-foreground font-body mb-1 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" aria-hidden /> Display name
                  </dt>
                  <dd className="text-sm text-foreground font-body">
                    {user.displayName || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground font-body mb-1 flex items-center gap-1">
                    <AtSign className="w-3 h-3" aria-hidden /> Email
                  </dt>
                  <dd className="text-sm text-foreground font-body">
                    {user.email || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground font-body mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" aria-hidden /> Phone
                  </dt>
                  <dd className="text-sm text-foreground font-body">
                    {user.phone || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground font-body mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" aria-hidden /> Role
                  </dt>
                  <dd className="text-sm text-foreground font-body">
                    {ROLE_LABELS[activeRole]}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          {/* Role-specific portal links */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeRole === "provider" || myProvider ? (
              <Link to="/provider/dashboard">
                <Card className="p-5 hover:shadow-sm hover:border-primary/30 transition-smooth cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-primary" aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">
                        Provider dashboard
                      </h3>
                      <p className="text-sm text-muted-foreground font-body mt-0.5">
                        Manage listings, bookings, and reviews.
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ) : null}
            {activeRole === "admin" ? (
              <Link to="/admin">
                <Card className="p-5 hover:shadow-sm hover:border-primary/30 transition-smooth cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ShieldCheck
                        className="w-5 h-5 text-primary"
                        aria-hidden
                      />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">
                        Admin portal
                      </h3>
                      <p className="text-sm text-muted-foreground font-body mt-0.5">
                        Verify providers, moderate reviews, and oversee
                        bookings.
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ) : null}
            {activeRole === "customer" && !myProvider ? (
              <Link to="/provider/register">
                <Card className="p-5 hover:shadow-sm hover:border-primary/30 transition-smooth cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">
                        Become a provider
                      </h3>
                      <p className="text-sm text-muted-foreground font-body mt-0.5">
                        List your hauling services across DFW.
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
