// ProviderMicrosite — microsite editor for verified DFW providers.
// AI generation via useGenerateMicrosite, section editing (hero, about,
// services, gallery, reviews), block reordering, cover image upload, accent
// color picker, publish toggle via usePublishMicrosite, and live preview.
// Persists edits through useUpsertMyMicrosite.

import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGenerateMicrosite,
  useGetMicrosite,
  useGetMyProvider,
  useListReviewsByProvider,
  usePublishMicrosite,
  useUpsertMyMicrosite,
} from "@/hooks/useQueries";
import type { Microsite, MicrositeInput } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  Globe,
  GripVertical,
  ImageIcon,
  Loader2,
  Palette,
  Sparkles,
  Star,
  Truck,
  Wand2,
} from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Block definitions ──────────────────────────────────────────────────────

interface BlockDef {
  key: string;
  label: string;
}

const ALL_BLOCKS: BlockDef[] = [
  { key: "hero", label: "Hero" },
  { key: "about", label: "About" },
  { key: "services", label: "Services" },
  { key: "gallery", label: "Gallery" },
  { key: "reviews", label: "Reviews" },
];

const ACCENT_PRESETS = [
  { name: "Ink", value: "#1f2937" },
  { name: "Trust", value: "#2563eb" },
  { name: "Verified", value: "#16a34a" },
  { name: "Warm", value: "#ea580c" },
  { name: "Plum", value: "#7c3aed" },
];

const EMPTY_MICROSITE: MicrositeInput = {
  slug: "",
  heroCopy: "",
  aboutCopy: "",
  servicesCopy: "",
  blockOrder: ALL_BLOCKS.map((b) => b.key),
  accentColor: ACCENT_PRESETS[0].value,
  coverImage: "",
  published: false,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

// ─── Block editor ───────────────────────────────────────────────────────────

interface BlockEditorProps {
  blockKey: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  ocid: string;
  placeholder: string;
}

function BlockEditor({
  blockKey,
  label,
  value,
  onChange,
  ocid,
  placeholder,
}: BlockEditorProps) {
  return (
    <div className="flex flex-col gap-2" data-ocid={ocid}>
      <Label className="text-xs font-body text-muted-foreground">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={blockKey === "hero" ? 3 : 5}
        data-ocid={`${ocid}.input`}
      />
    </div>
  );
}

// ─── Live preview ───────────────────────────────────────────────────────────

interface PreviewProps {
  microsite: MicrositeInput;
  companyName: string;
  rating: { average: number; count: number } | null;
  recentReviewText?: string;
}

function MicrositePreview({
  microsite,
  companyName,
  rating,
  recentReviewText,
}: PreviewProps) {
  const accent = microsite.accentColor || ACCENT_PRESETS[0].value;
  return (
    <div
      className="rounded-xl border border-border overflow-hidden bg-card shadow-subtle"
      data-ocid="provider_microsite.preview"
    >
      {/* Cover */}
      <div className="h-32 w-full relative" style={{ backgroundColor: accent }}>
        {microsite.coverImage ? (
          <img
            src={microsite.coverImage}
            alt="Microsite cover"
            className="w-full h-full object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${accent}33 100%)`,
          }}
          aria-hidden
        />
      </div>

      <div className="p-5 flex flex-col gap-5">
        {microsite.blockOrder.includes("hero") ? (
          <section data-ocid="provider_microsite.preview.hero">
            <h2
              className="font-display text-2xl font-bold text-foreground leading-tight"
              style={{ color: accent }}
            >
              {companyName || "Your business name"}
            </h2>
            <p className="text-sm font-body text-muted-foreground mt-1 whitespace-pre-wrap">
              {microsite.heroCopy || "Your hero copy will appear here."}
            </p>
          </section>
        ) : null}

        {microsite.blockOrder.includes("about") ? (
          <section data-ocid="provider_microsite.preview.about">
            <h3
              className="font-display text-sm font-semibold uppercase tracking-wide mb-1"
              style={{ color: accent }}
            >
              About
            </h3>
            <p className="text-sm font-body text-foreground whitespace-pre-wrap">
              {microsite.aboutCopy || "Tell customers about your business."}
            </p>
          </section>
        ) : null}

        {microsite.blockOrder.includes("services") ? (
          <section data-ocid="provider_microsite.preview.services">
            <h3
              className="font-display text-sm font-semibold uppercase tracking-wide mb-1"
              style={{ color: accent }}
            >
              Services
            </h3>
            <p className="text-sm font-body text-foreground whitespace-pre-wrap">
              {microsite.servicesCopy ||
                "Describe the services you offer across DFW."}
            </p>
          </section>
        ) : null}

        {microsite.blockOrder.includes("gallery") ? (
          <section data-ocid="provider_microsite.preview.gallery">
            <h3
              className="font-display text-sm font-semibold uppercase tracking-wide mb-2"
              style={{ color: accent }}
            >
              Gallery
            </h3>
            {microsite.coverImage ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder gallery tiles have no stable identity; index is the only available key.
                    key={i}
                    className="aspect-square rounded-md bg-secondary overflow-hidden"
                  >
                    <img
                      src={microsite.coverImage}
                      alt={`Gallery ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder gallery tiles have no stable identity; index is the only available key.
                    key={i}
                    className="aspect-square rounded-md bg-secondary flex items-center justify-center"
                  >
                    <ImageIcon
                      className="w-5 h-5 text-muted-foreground/50"
                      aria-hidden
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {microsite.blockOrder.includes("reviews") ? (
          <section data-ocid="provider_microsite.preview.reviews">
            <h3
              className="font-display text-sm font-semibold uppercase tracking-wide mb-2"
              style={{ color: accent }}
            >
              Reviews
            </h3>
            {rating && rating.count > 0 ? (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      // biome-ignore lint/suspicious/noArrayIndexKey: star rating slots are positional by design; index maps to a fixed star position.
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(rating.average)
                          ? "text-accent fill-accent"
                          : "text-muted-foreground/40"
                      }`}
                      aria-hidden
                    />
                  ))}
                </div>
                <span className="text-xs font-body text-muted-foreground">
                  {rating.average.toFixed(1)} · {rating.count} review
                  {rating.count === 1 ? "" : "s"}
                </span>
              </div>
            ) : null}
            <p className="text-sm font-body text-foreground italic">
              {recentReviewText
                ? `"${recentReviewText.slice(0, 160)}${recentReviewText.length > 160 ? "…" : ""}"`
                : "Customer reviews will appear here once your bookings are reviewed."}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function ProviderMicrosite() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: reviews } = useListReviewsByProvider(providerId);

  // We don't have a "get my microsite" hook; use the slug-based lookup once we
  // know the provider. For now, generate-or-edit flow drives the editor.
  const generateMicrosite = useGenerateMicrosite();
  const upsertMicrosite = useUpsertMyMicrosite();
  const publishMicrosite = usePublishMicrosite();

  const [form, setForm] = useState<MicrositeInput>(EMPTY_MICROSITE);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  // Prefill from provider company name as a slug seed.
  useEffect(() => {
    if (provider && !form.slug) {
      setForm((prev) => ({
        ...prev,
        slug: slugify(provider.companyName),
      }));
    }
  }, [provider, form.slug]);

  const rating = useMemo(() => {
    if (!provider) return null;
    const count = Number(provider.ratingCount);
    if (count === 0) return { average: 0, count: 0 };
    return { average: Number(provider.ratingSum) / count, count };
  }, [provider]);

  const recentReviewText = useMemo(() => {
    const visible = (reviews ?? []).filter((r) => !r.hidden);
    return visible[0]?.writtenText;
  }, [reviews]);

  const handleGenerate = () => {
    if (!providerId) return;
    generateMicrosite.mutate(providerId, {
      onSuccess: (data: Microsite) => {
        setExistingId(data.id);
        setForm({
          slug: data.slug,
          heroCopy: data.heroCopy,
          aboutCopy: data.aboutCopy,
          servicesCopy: data.servicesCopy,
          blockOrder: data.blockOrder.length
            ? data.blockOrder
            : EMPTY_MICROSITE.blockOrder,
          accentColor: data.accentColor ?? EMPTY_MICROSITE.accentColor,
          coverImage: data.coverImage ?? "",
          published: data.published,
        });
        if (data.coverImage) setCoverPreview(data.coverImage);
        toast.success("Microsite draft generated");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate microsite",
        ),
    });
  };

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    // Convert the uploaded file to a data URL string. The adapter
    // toBackendMicrositeInput handles string|undefined → Uint8Array|undefined
    // via dataUrlToBytes, so we store the data URL directly in form.coverImage.
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setCoverPreview(dataUrl);
      setForm((prev) => ({ ...prev, coverImage: dataUrl }));
    };
    reader.onerror = () => toast.error("Could not read that image");
    reader.readAsDataURL(file);
  };

  const moveBlock = (key: string, dir: -1 | 1) => {
    setForm((prev) => {
      const order = [...prev.blockOrder];
      const idx = order.indexOf(key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= order.length) return prev;
      [order[idx], order[next]] = [order[next], order[idx]];
      return { ...prev, blockOrder: order };
    });
  };

  const handleSave = () => {
    if (!form.slug.trim()) {
      toast.error("Slug is required");
      return;
    }
    if (!form.heroCopy.trim()) {
      toast.error("Hero copy is required");
      return;
    }
    const cover = form.coverImage || "";
    const input: MicrositeInput = {
      ...form,
      slug: slugify(form.slug),
      coverImage: cover || undefined,
    };
    upsertMicrosite.mutate(input, {
      onSuccess: (data) => {
        setExistingId(data.id);
        setForm((prev) => ({
          ...prev,
          slug: data.slug,
          coverImage: data.coverImage ?? "",
          published: data.published,
        }));
        toast.success("Microsite saved");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not save microsite",
        ),
    });
  };

  const handlePublishToggle = (published: boolean) => {
    if (!existingId) {
      toast.error("Save your microsite before publishing");
      return;
    }
    publishMicrosite.mutate(
      { micrositeId: existingId, published },
      {
        onSuccess: () => {
          setForm((prev) => ({ ...prev, published }));
          toast.success(
            published ? "Microsite published" : "Microsite unpublished",
          );
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : "Could not update publish state",
          ),
      },
    );
  };

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12 max-w-6xl"
        data-ocid="page.provider_microsite"
      >
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_microsite"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to edit your microsite"
          description="You need to sign in with Internet Identity to build and publish your provider microsite."
          data-ocid="provider_microsite.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_microsite"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to build a public microsite that customers can browse."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_microsite.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_microsite.not_registered"
        />
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_microsite"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_microsite.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1 flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" aria-hidden />
              Microsite
            </h1>
            <p className="text-sm text-muted-foreground font-body">
              Build a public page for {provider.companyName} with AI-generated
              copy, custom accent, and live preview.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generateMicrosite.isPending}
            data-ocid="provider_microsite.generate_button"
          >
            {generateMicrosite.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" aria-hidden />
                Generate with AI
              </>
            )}
          </Button>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8 max-w-6xl"
        data-ocid="provider_microsite.body"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div
            className="flex flex-col gap-6 animate-fade-in-up"
            data-ocid="provider_microsite.editor"
          >
            {/* Slug + accent + cover */}
            <Card className="py-0" data-ocid="provider_microsite.basics_card">
              <CardHeader>
                <CardTitle className="font-display text-base font-semibold text-foreground">
                  Basics
                </CardTitle>
                <CardDescription className="font-body">
                  Public slug, accent color, and cover image.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="microsite-slug"
                    data-ocid="provider_microsite.slug_label"
                  >
                    Public slug
                  </Label>
                  <Input
                    id="microsite-slug"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="your-business"
                    data-ocid="provider_microsite.slug_input"
                  />
                  <p className="text-xs font-body text-muted-foreground">
                    Live URL: /m/{slugify(form.slug) || "your-business"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label data-ocid="provider_microsite.accent_label">
                    Accent color
                  </Label>
                  <div
                    className="flex flex-wrap items-center gap-2"
                    data-ocid="provider_microsite.accent_picker"
                  >
                    {ACCENT_PRESETS.map((preset) => {
                      const active = form.accentColor === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              accentColor: preset.value,
                            }))
                          }
                          className={`w-8 h-8 rounded-full border-2 transition-smooth flex items-center justify-center ${
                            active
                              ? "border-foreground"
                              : "border-transparent hover:border-border"
                          }`}
                          style={{ backgroundColor: preset.value }}
                          aria-label={`${preset.name} accent`}
                          data-ocid={`provider_microsite.accent.${preset.name.toLowerCase()}`}
                        >
                          {active ? (
                            <Check className="w-4 h-4 text-white" aria-hidden />
                          ) : null}
                        </button>
                      );
                    })}
                    <Input
                      type="color"
                      value={form.accentColor}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          accentColor: e.target.value,
                        }))
                      }
                      className="w-10 h-8 p-0.5 cursor-pointer"
                      aria-label="Custom accent color"
                      data-ocid="provider_microsite.accent_custom"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label data-ocid="provider_microsite.cover_label">
                    Cover image
                  </Label>
                  <div className="flex items-center gap-3">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-24 h-16 rounded-md object-cover border border-border"
                      />
                    ) : null}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="max-w-xs"
                      data-ocid="provider_microsite.cover_input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Block reordering + section editors */}
            <Card className="py-0" data-ocid="provider_microsite.sections_card">
              <CardHeader>
                <CardTitle className="font-display text-base font-semibold text-foreground">
                  Sections
                </CardTitle>
                <CardDescription className="font-body">
                  Reorder blocks and edit each section's copy.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {form.blockOrder.map((key, i) => {
                  const def = ALL_BLOCKS.find((b) => b.key === key);
                  if (!def) return null;
                  const value =
                    key === "hero"
                      ? form.heroCopy
                      : key === "about"
                        ? form.aboutCopy
                        : key === "services"
                          ? form.servicesCopy
                          : "";
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-border p-3 flex flex-col gap-3"
                      data-ocid={`provider_microsite.section.${key}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical
                            className="w-4 h-4 text-muted-foreground shrink-0"
                            aria-hidden
                          />
                          <span className="font-body font-medium text-foreground text-sm">
                            {def.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveBlock(key, -1)}
                            disabled={i === 0}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Move ${def.label} up`}
                            data-ocid={`provider_microsite.move_up.${key}`}
                          >
                            <ArrowUp className="w-4 h-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(key, 1)}
                            disabled={i === form.blockOrder.length - 1}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Move ${def.label} down`}
                            data-ocid={`provider_microsite.move_down.${key}`}
                          >
                            <ArrowDown className="w-4 h-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                      {key === "gallery" || key === "reviews" ? (
                        <p className="text-xs font-body text-muted-foreground">
                          {key === "gallery"
                            ? "Gallery uses your cover image as a placeholder. Upload listing photos to populate it."
                            : "Reviews are pulled automatically from your verified customer reviews."}
                        </p>
                      ) : (
                        <BlockEditor
                          blockKey={key}
                          label={`${def.label} copy`}
                          value={value}
                          onChange={(v) =>
                            setForm((prev) => ({
                              ...prev,
                              ...(key === "hero"
                                ? { heroCopy: v }
                                : key === "about"
                                  ? { aboutCopy: v }
                                  : { servicesCopy: v }),
                            }))
                          }
                          ocid={`provider_microsite.${key}`}
                          placeholder={
                            key === "hero"
                              ? "e.g. Same-day box truck and moving services across DFW."
                              : key === "about"
                                ? "Tell customers about your team, experience, and what makes you reliable."
                                : "List the services you offer, with pricing and what's included."
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Publish + save */}
            <Card className="py-0" data-ocid="provider_microsite.publish_card">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                  <div className="min-w-0">
                    <Label
                      htmlFor="publish-toggle"
                      className="font-body font-medium"
                      data-ocid="provider_microsite.publish_label"
                    >
                      Published
                    </Label>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      Unpublished microsites are only visible to you.
                    </p>
                  </div>
                  <Switch
                    id="publish-toggle"
                    checked={form.published}
                    onCheckedChange={handlePublishToggle}
                    disabled={publishMicrosite.isPending || !existingId}
                    data-ocid="provider_microsite.publish_switch"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={upsertMicrosite.isPending}
                  data-ocid="provider_microsite.save_button"
                >
                  {upsertMicrosite.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" aria-hidden />
                      Save microsite
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Live preview */}
          <div
            className="flex flex-col gap-3 animate-fade-in-up stagger-2"
            data-ocid="provider_microsite.preview_panel"
          >
            <div className="flex items-center gap-2 text-sm font-body font-semibold text-foreground">
              <Eye className="w-4 h-4 text-primary" aria-hidden />
              Live preview
            </div>
            <MicrositePreview
              microsite={form}
              companyName={provider.companyName}
              rating={rating}
              recentReviewText={recentReviewText}
            />
            {generateMicrosite.isPending ? (
              <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5" aria-hidden />
                AI is drafting your microsite copy…
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
