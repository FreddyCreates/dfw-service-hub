// Profile — shared user profile page for the DFW marketplace (customer /
// provider / admin). Displays name, email, phone, avatar, role, and an edit
// form via useUpsertMyUser. Shows role-specific portal links.
//
// Avatar upload uses the useImageUpload hook (ExternalBlob.fromBytes for
// persistence) following the ProviderRegister.tsx logo pattern. Work-portfolio
// photos are uploaded the same way and displayed in a grid with remove/replace
// plus three AI vision analysis buttons per photo (description, work, safety).
// A "Generate Bio with AI" button drafts a bio from profile info.

import { EmptyState } from "@/components/EmptyState";
import { RewardBadge } from "@/components/RewardBadge";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  type UploadedImage,
  revokePreviewUrl,
  useImageUpload,
} from "@/hooks/useImageUpload";
import {
  useAnalyzeImageDescription,
  useAnalyzeImageSafety,
  useAnalyzeImageWork,
  useGenerateBio,
  useGetMyProvider,
  useGetMyReferralCode,
  useGetMyRewards,
  useUpsertMyUser,
} from "@/hooks/useQueries";
import type { MarketplaceRole, RewardProfile, Tone, UserInput } from "@/types";
import { TONE_LABELS } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ExternalBlob } from "@caffeineai/object-storage";
import { Link } from "@tanstack/react-router";
import {
  AtSign,
  Award,
  Building2,
  Check,
  Copy,
  Flame,
  Gift,
  ImagePlus,
  Loader2,
  LogIn,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  User as UserIcon,
  UserPen,
  Wand2,
  X,
} from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

// A work-portfolio photo entry. `url` is the display URL (either a persistent
// direct URL from a saved ExternalBlob, or a transient blob: preview URL for a
// freshly uploaded file). `blob` is the persistent ExternalBlob used for AI
// analysis and for submission to the backend.
interface WorkPhoto {
  url: string;
  blob: ExternalBlob;
  filename: string;
  transient: boolean;
}

// Per-photo AI analysis state. Each of the three analyses tracks its own
// loading, result, and error so they can run independently and regenerate.
interface AnalysisState {
  loading: boolean;
  result: string | null;
}

type AnalysisKind = "description" | "work" | "safety";

const ANALYSIS_META: Record<
  AnalysisKind,
  { label: string; icon: typeof Wand2; ocid: string }
> = {
  description: {
    label: "Analyze with AI",
    icon: Wand2,
    ocid: "profile.work_photo.analyze_description",
  },
  work: {
    label: "Analyze Work",
    icon: Sparkles,
    ocid: "profile.work_photo.analyze_work",
  },
  safety: {
    label: "Safety Check",
    icon: ShieldAlert,
    ocid: "profile.work_photo.analyze_safety",
  },
};

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
  const { data: myRewards, isLoading: rewardsLoading } = useGetMyRewards();
  const { data: referralCode, isLoading: referralLoading } =
    useGetMyReferralCode();
  const upsertMutation = useUpsertMyUser();
  const { identity } = useInternetIdentity();
  const upload = useImageUpload();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  // AI bio tone — defaults to professional. Surfaced as a ToneSelect next to
  // the Generate Bio button so the user can steer the AI's voice.
  const [bioTone, setBioTone] = useState<Tone>("professional");
  // Avatar: either a persistent URL string (existing avatar) or an
  // ExternalBlob produced by ExternalBlob.fromBytes() for a freshly uploaded
  // file. The adapter accepts a URL string via urlToBlob.
  const [avatar, setAvatar] = useState<string | ExternalBlob>("");
  const [avatarPreview, setAvatarPreview] = useState("");
  // Work-portfolio photos. Persisted photos arrive as URL strings from the
  // backend; freshly uploaded photos carry a transient preview URL plus the
  // ExternalBlob for submission.
  const [workPhotos, setWorkPhotos] = useState<WorkPhoto[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const workPhotoInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when the user profile loads or changes.
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setAvatar(user.avatar ?? "");
      setAvatarPreview(user.avatar ?? "");
      setWorkPhotos(
        (user.workPhotos ?? []).map((url) => ({
          url,
          blob: ExternalBlob.fromURL(url),
          filename: url.split("/").pop() ?? "work-photo",
          transient: false,
        })),
      );
    }
  }, [user]);

  if (isInitializing || isLoadingProfile) {
    return (
      <div className="bg-background" data-ocid="page.profile">
        <section className="container mx-auto px-4 lg:px-6 py-10 lg:py-14">
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            <div className="flex flex-col gap-2 mb-8">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <SkeletonCard withMedia={false} className="mb-6" />
            <SkeletonCard withMedia={false} />
          </div>
        </section>
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
          description="Connect with Internet Identity to manage your account details, role, and marketplace activity."
          action={
            <Button onClick={login} data-ocid="profile.login">
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

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await upload(e.target.files);
    if (uploaded.length === 0) {
      toast.error("Please choose a valid image file.");
      return;
    }
    const img = uploaded[0];
    // Revoke any prior transient preview to avoid leaking object URLs.
    if (avatarPreview.startsWith("blob:")) revokePreviewUrl(avatarPreview);
    setAvatar(img.blob);
    setAvatarPreview(img.previewUrl);
    // Reset the input so the same file can be re-selected later.
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview.startsWith("blob:")) revokePreviewUrl(avatarPreview);
    setAvatar("");
    setAvatarPreview("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleWorkPhotosChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const uploaded = await upload(e.target.files);
    if (uploaded.length === 0) {
      toast.error("Please choose valid image files.");
      return;
    }
    const newPhotos: WorkPhoto[] = uploaded.map((img: UploadedImage) => ({
      url: img.previewUrl,
      blob: img.blob,
      filename: img.filename,
      transient: true,
    }));
    setWorkPhotos((prev) => [...prev, ...newPhotos]);
    if (workPhotoInputRef.current) workPhotoInputRef.current.value = "";
  };

  const handleRemoveWorkPhoto = (index: number) => {
    setWorkPhotos((prev) => {
      const removed = prev[index];
      if (removed?.transient && removed.url.startsWith("blob:")) {
        revokePreviewUrl(removed.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleReplaceWorkPhoto = (index: number) => {
    // Trigger a file picker scoped to a single replacement. We use a hidden
    // input per-replace via a one-shot change handler.
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const uploaded = await upload(input.files);
      if (uploaded.length === 0) {
        toast.error("Please choose a valid image file.");
        return;
      }
      const img = uploaded[0];
      setWorkPhotos((prev) => {
        const removed = prev[index];
        if (removed?.transient && removed.url.startsWith("blob:")) {
          revokePreviewUrl(removed.url);
        }
        const next = [...prev];
        next[index] = {
          url: img.previewUrl,
          blob: img.blob,
          filename: img.filename,
          transient: true,
        };
        return next;
      });
    };
    input.click();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // The avatar may be a freshly uploaded ExternalBlob or a persistent URL
    // string. The adapter's urlToBlob handles URL strings; for a freshly
    // uploaded blob we pass its direct URL so the adapter re-wraps it.
    const avatarValue =
      avatar instanceof ExternalBlob ? avatar.getDirectURL() : (avatar ?? "");
    // Work-portfolio photos: pass the ExternalBlob through directly for
    // transient (freshly uploaded) photos so their bytes survive to the
    // backend, instead of round-tripping through getDirectURL → fromURL which
    // may lose the uploaded bytes. Persistent photos stay as URL strings.
    const input: UserInput = {
      role: activeRole,
      displayName: displayName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      avatar: avatarValue.trim() || undefined,
      workPhotos: workPhotos.map((p) => (p.transient ? p.blob : p.url)),
    };
    upsertMutation.mutate(input, {
      onSuccess: () => {
        toast.success("Profile saved.");
        setIsEditing(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to save profile.",
        );
      },
    });
  };

  const handleCancel = () => {
    setDisplayName(user.displayName);
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setAvatar(user.avatar ?? "");
    setAvatarPreview(user.avatar ?? "");
    setWorkPhotos(
      (user.workPhotos ?? []).map((url) => ({
        url,
        blob: ExternalBlob.fromURL(url),
        filename: url.split("/").pop() ?? "work-photo",
        transient: false,
      })),
    );
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
              Manage your account details, work portfolio, and role across the
              DFW marketplace.
            </p>
          </div>

          {/* Rewards wallet + referral code — loyalty/gamification surface */}
          <RewardsWallet
            rewards={myRewards ?? null}
            rewardsLoading={rewardsLoading}
            referralCode={referralCode ?? ""}
            referralLoading={referralLoading}
          />

          {/* Profile header */}
          <Card className="p-6 mb-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="w-20 h-20 rounded-2xl border border-border shrink-0">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt={user.displayName} />
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
                  {identity ? (
                    <span className="text-xs text-muted-foreground font-mono">
                      {identity.toString().slice(0, 8)}…
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
            <Card className="p-6 animate-fade-in-up">
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

                {/* Avatar upload — file picker using useImageUpload */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="avatar">Profile picture</Label>
                  <div className="flex items-center gap-4">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile preview"
                        className="w-16 h-16 rounded-2xl object-cover border border-border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl border border-dashed border-border flex items-center justify-center bg-secondary/40">
                        <UserIcon
                          className="w-6 h-6 text-muted-foreground"
                          aria-hidden
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <input
                        ref={avatarInputRef}
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        data-ocid="profile.avatar_input"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => avatarInputRef.current?.click()}
                          data-ocid="profile.avatar_upload_button"
                        >
                          <Upload className="w-4 h-4" aria-hidden />
                          {avatarPreview ? "Change picture" : "Upload picture"}
                        </Button>
                        {avatarPreview ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            data-ocid="profile.avatar_remove_button"
                          >
                            <X className="w-4 h-4" aria-hidden />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground font-body">
                        Upload a profile picture. It persists across reloads.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bio + Generate Bio with AI */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label htmlFor="bio">About / bio</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={bioTone}
                        onValueChange={(v) => setBioTone(v as Tone)}
                      >
                        <SelectTrigger
                          className="h-8 w-[140px] text-xs"
                          aria-label="AI bio tone"
                          data-ocid="profile.bio_tone"
                        >
                          <SelectValue placeholder="Tone" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {TONE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <GenerateBioButton
                        displayName={displayName}
                        email={email}
                        phone={phone}
                        role={ROLE_LABELS[activeRole]}
                        tone={bioTone}
                        onGenerated={setBio}
                      />
                    </div>
                  </div>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A short bio about you and your work. Use Generate Bio with AI to draft one from your profile info."
                    rows={4}
                    data-ocid="profile.bio_input"
                  />
                  <p className="text-xs text-muted-foreground font-body">
                    Drafted locally from your profile info. Save your profile to
                    keep the rest of your details.
                  </p>
                </div>

                {/* Work-portfolio photos */}
                <WorkPhotoUploader
                  photos={workPhotos}
                  inputRef={workPhotoInputRef}
                  onAdd={handleWorkPhotosChange}
                  onRemove={handleRemoveWorkPhoto}
                  onReplace={handleReplaceWorkPhoto}
                />

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
            <Card className="p-6 animate-fade-in-up">
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

              {/* Saved work-portfolio photos (read-only view) */}
              {(user.workPhotos ?? []).length > 0 ? (
                <div className="mt-6 pt-5 border-t border-border">
                  <h3 className="text-sm font-body font-medium text-foreground mb-3">
                    Work portfolio
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(user.workPhotos ?? []).map((url, i) => (
                      <div
                        key={url}
                        className="aspect-square rounded-lg overflow-hidden border border-border bg-secondary/40"
                        data-ocid={`profile.work_photo.${i + 1}`}
                      >
                        <img
                          src={url}
                          alt={`Work ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          )}

          {/* Role-specific portal links */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
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

// ─── Generate Bio with AI ───────────────────────────────────────────────────

interface GenerateBioButtonProps {
  displayName: string;
  email: string;
  phone: string;
  role: string;
  tone: Tone;
  onGenerated: (bio: string) => void;
}

function GenerateBioButton({
  displayName,
  email,
  phone,
  role,
  tone,
  onGenerated,
}: GenerateBioButtonProps) {
  const generateBio = useGenerateBio();

  const handleGenerate = () => {
    const profileInfo = [
      `Name: ${displayName.trim() || "Unnamed user"}`,
      `Role: ${role}`,
      email.trim() ? `Email: ${email.trim()}` : null,
      phone.trim() ? `Phone: ${phone.trim()}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    generateBio.mutate(
      { profileInfo, tone },
      {
        onSuccess: (result) => {
          onGenerated(result);
          toast.success("Bio drafted. Review and edit before saving.");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to generate bio.",
          );
        },
      },
    );
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleGenerate}
      disabled={generateBio.isPending}
      data-ocid="profile.generate_bio"
    >
      {generateBio.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        <Wand2 className="w-4 h-4" aria-hidden />
      )}
      Generate Bio with AI
    </Button>
  );
}

// ─── Work-portfolio uploader + per-photo AI analysis ───────────────────────

interface WorkPhotoUploaderProps {
  photos: WorkPhoto[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onAdd: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onReplace: (index: number) => void;
}

function WorkPhotoUploader({
  photos,
  inputRef,
  onAdd,
  onRemove,
  onReplace,
}: WorkPhotoUploaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="work-photos">Work-portfolio photos</Label>
        <input
          ref={inputRef}
          id="work-photos"
          type="file"
          accept="image/*"
          multiple
          onChange={onAdd}
          className="hidden"
          data-ocid="profile.work_photos_input"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          data-ocid="profile.work_photos_upload_button"
        >
          <ImagePlus className="w-4 h-4" aria-hidden />
          Add work photos
        </Button>
      </div>
      <p className="text-xs text-muted-foreground font-body">
        Upload job-site or completed-work photos. Each photo can be analyzed
        with AI for a description, work-quality assessment, and safety check.
        Photos persist across reloads.
      </p>

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-8 text-muted-foreground hover:bg-secondary/50 hover:border-primary/40 transition-smooth"
          data-ocid="profile.work_photos_empty"
        >
          <ImagePlus className="w-6 h-6" aria-hidden />
          <span className="text-sm font-body">
            No work photos yet — click to upload
          </span>
        </button>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          data-ocid="profile.work_photos_grid"
        >
          {photos.map((photo, index) => (
            <WorkPhotoCard
              key={`${photo.filename}-${index}`}
              photo={photo}
              index={index}
              onRemove={onRemove}
              onReplace={onReplace}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface WorkPhotoCardProps {
  photo: WorkPhoto;
  index: number;
  onRemove: (index: number) => void;
  onReplace: (index: number) => void;
}

function WorkPhotoCard({
  photo,
  index,
  onRemove,
  onReplace,
}: WorkPhotoCardProps) {
  const analyzeDescription = useAnalyzeImageDescription();
  const analyzeWork = useAnalyzeImageWork();
  const analyzeSafety = useAnalyzeImageSafety();

  const [analyses, setAnalyses] = useState<Record<AnalysisKind, AnalysisState>>(
    {
      description: { loading: false, result: null },
      work: { loading: false, result: null },
      safety: { loading: false, result: null },
    },
  );

  const runAnalysis = (kind: AnalysisKind) => {
    const mutation =
      kind === "description"
        ? analyzeDescription
        : kind === "work"
          ? analyzeWork
          : analyzeSafety;
    setAnalyses((prev) => ({
      ...prev,
      [kind]: { loading: true, result: prev[kind].result },
    }));
    mutation.mutate(photo.blob, {
      onSuccess: (result) => {
        setAnalyses((prev) => ({
          ...prev,
          [kind]: { loading: false, result },
        }));
      },
      onError: (err) => {
        setAnalyses((prev) => ({
          ...prev,
          [kind]: { loading: false, result: prev[kind].result },
        }));
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${ANALYSIS_META[kind].label.toLowerCase()}.`,
        );
      },
    });
  };

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden"
      data-ocid={`profile.work_photo_card.${index + 1}`}
    >
      <div className="relative aspect-video bg-secondary/40">
        <img
          src={photo.url}
          alt={`Work ${index + 1}: ${photo.filename}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            type="button"
            onClick={() => onReplace(index)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-card/90 text-foreground border border-border hover:bg-card shadow-sm"
            aria-label={`Replace work photo ${index + 1}`}
            data-ocid={`profile.work_photo.replace.${index + 1}`}
          >
            <RefreshCw className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-destructive/90 text-destructive-foreground border border-destructive/80 hover:bg-destructive shadow-sm"
            aria-label={`Remove work photo ${index + 1}`}
            data-ocid={`profile.work_photo.remove.${index + 1}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ANALYSIS_META) as AnalysisKind[]).map((kind) => {
            const meta = ANALYSIS_META[kind];
            const Icon = meta.icon;
            const state = analyses[kind];
            return (
              <Button
                key={kind}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => runAnalysis(kind)}
                disabled={state.loading}
                data-ocid={`${meta.ocid}.${index + 1}`}
              >
                {state.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Icon className="w-4 h-4" aria-hidden />
                )}
                {state.result ? "Regenerate" : meta.label}
              </Button>
            );
          })}
        </div>

        {(Object.keys(ANALYSIS_META) as AnalysisKind[]).map((kind) => {
          const state = analyses[kind];
          if (!state.loading && !state.result) return null;
          const meta = ANALYSIS_META[kind];
          return (
            <div
              key={kind}
              className="rounded-md border border-accent/30 bg-accent/5 p-3"
              data-ocid={`${meta.ocid}.result.${index + 1}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <meta.icon className="w-3.5 h-3.5 text-primary" aria-hidden />
                  <span className="text-xs font-body font-semibold text-foreground">
                    {meta.label}
                  </span>
                </div>
                {state.result && !state.loading ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-body font-semibold uppercase tracking-wide text-accent-foreground ring-1 ring-accent/30"
                    data-ocid={`${meta.ocid}.badge.${index + 1}`}
                  >
                    <Sparkles className="w-2.5 h-2.5" aria-hidden />
                    AI-generated
                  </span>
                ) : null}
              </div>
              {state.loading && !state.result ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  Analyzing…
                </div>
              ) : (
                <p className="text-sm font-body text-foreground whitespace-pre-wrap">
                  {state.result}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Rewards wallet + referral code ─────────────────────────────────────────

interface RewardsWalletProps {
  rewards: RewardProfile | null;
  rewardsLoading: boolean;
  referralCode: string;
  referralLoading: boolean;
}

function RewardsWallet({
  rewards,
  rewardsLoading,
  referralCode,
  referralLoading,
}: RewardsWalletProps) {
  if (rewardsLoading) {
    return (
      <div className="mb-6" data-ocid="profile.rewards_wallet.loading_state">
        <SkeletonCard withMedia={false} />
      </div>
    );
  }

  if (!rewards) return null;

  const handleCopyReferral = () => {
    if (!referralCode) return;
    navigator.clipboard
      .writeText(referralCode)
      .then(() => toast.success("Referral code copied."))
      .catch(() => toast.error("Could not copy referral code."));
  };

  return (
    <div
      className="mb-6 flex flex-col gap-4 animate-fade-in-up"
      data-ocid="profile.rewards_wallet"
    >
      <RewardBadge
        tier={rewards.tier}
        points={rewards.points}
        streak={rewards.streak}
      />

      {rewards.badges.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          data-ocid="profile.rewards_badges"
        >
          {rewards.badges.map((badge, i) => (
            <Badge
              // biome-ignore lint/suspicious/noArrayIndexKey: badges are static display-only strings with no stable id; index suffix disambiguates duplicate badge labels.
              key={`${badge}-${i}`}
              variant="outline"
              className="font-body gap-1 border-primary/30 bg-primary/5 text-primary"
            >
              <Award className="w-3 h-3" aria-hidden />
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}

      <Card className="p-5" data-ocid="profile.referral_card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-primary shrink-0">
            <Gift className="w-4 h-4" aria-hidden />
            <span className="text-sm font-body font-medium">
              Your referral code
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <code
              className="flex-1 min-w-0 truncate rounded-md border border-border bg-secondary/40 px-3 py-2 font-mono text-sm text-foreground"
              data-ocid="profile.referral_code"
            >
              {referralLoading ? "Loading…" : referralCode || "—"}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopyReferral}
              disabled={!referralCode || referralLoading}
              data-ocid="profile.referral_copy_button"
            >
              <Copy className="w-4 h-4" aria-hidden />
              Copy
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground font-body flex items-center gap-1">
          <Flame className="w-3 h-3" aria-hidden />
          Share your code — earn rewards when friends book their first job.
        </p>
      </Card>
    </div>
  );
}
