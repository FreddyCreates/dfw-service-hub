// ProviderAITools — first-class AI command center for DFW providers.
//
// Consolidates every AI capability into one prominent surface, organized into
// five sections: Listing Tools, Profile Tools, Photo Analysis, Messaging
// Assistant, and Review Response. Each tool card has clear inputs, a
// "Generate with AI" button with loading state, an AI-generated output affordance,
// and action buttons (Copy, Apply, Edit). AI output never auto-saves — the
// provider must review and confirm before applying anything.
//
// Dark portal theme (Workshop OKLCH `.dark` tokens). Fraunces headings,
// General Sans body.

import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
  readFileAsUploadedImage,
  revokePreviewUrl,
} from "@/hooks/useImageUpload";
import {
  useAnalyzeImageDescription,
  useAnalyzeImageSafety,
  useAnalyzeImageWork,
  useGenerateBio,
  useGenerateCompanyDescription,
  useGenerateListingDescription,
  useGenerateMicrosite,
  useGeneratePromotionalContent,
  useGenerateProviderInsights,
  useGenerateReviewDraft,
  useGenerateTitleAndTagline,
  useGetMyProvider,
  useGetThread,
  useListListingsByProvider,
  useListProviderBookings,
  useListReviewsByProvider,
  useRespondToReview,
  useSuggestReply,
  useUpdateListing,
  useUpdateMyProvider,
} from "@/hooks/useQueries";
import {
  type Booking,
  CATEGORY_LABELS,
  type Microsite,
  type ProviderInsights,
  type Review,
  type ServiceCategory,
  type ServiceListing,
  type ServiceListingInput,
  TONE_LABELS,
  type Tone,
} from "@/types";
import type { ExternalBlob } from "@caffeineai/object-storage";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  Camera,
  Check,
  Copy,
  Edit3,
  ImageIcon,
  Loader2,
  type LucideIcon,
  MessageSquare,
  PenLine,
  ShieldAlert,
  Sparkles,
  Star,
  Tag,
  Truck,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Shared helpers ────────────────────────────────────────────────────────

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("Clipboard not available"));
}

const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS) as ServiceCategory[];
const TONE_VALUES = Object.keys(TONE_LABELS) as Tone[];

function principalShort(principal: string): string {
  if (!principal) return "Customer";
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

function formatDate(date: string): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Section header ────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ocid: string;
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  ocid,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-5" data-ocid={ocid}>
      <div className="w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" aria-hidden />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-foreground leading-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground font-body mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── AI output affordance ──────────────────────────────────────────────────
// Wraps generated content with a clear "AI-generated" badge and copy/edit
// actions. AI output never auto-saves — the provider reviews here first.

interface AIBadgeProps {
  ocid: string;
}

function AIBadge({ ocid }: AIBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-body font-semibold uppercase tracking-wide text-accent-foreground ring-1 ring-accent/30"
      data-ocid={ocid}
    >
      <Sparkles className="w-2.5 h-2.5" aria-hidden />
      AI-generated
    </span>
  );
}

interface AIOutputProps {
  ocid: string;
  children: ReactNode;
  onCopy: () => void;
  onEdit?: () => void;
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (v: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  copyOcid: string;
  editOcid?: string;
  editSaveOcid?: string;
  editCancelOcid?: string;
}

function AIOutput({
  ocid,
  children,
  onCopy,
  onEdit,
  isEditing,
  editValue,
  onEditChange,
  onEditSave,
  onEditCancel,
  copyOcid,
  editOcid,
  editSaveOcid,
  editCancelOcid,
}: AIOutputProps) {
  return (
    <div
      className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex flex-col gap-3"
      data-ocid={ocid}
    >
      <div className="flex items-center justify-between gap-2">
        <AIBadge ocid={`${ocid}.badge`} />
        <div className="flex items-center gap-1">
          {onEdit ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onEdit}
              aria-label="Edit before applying"
              data-ocid={editOcid}
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden />
              <span className="sr-only">Edit</span>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCopy}
            aria-label="Copy to clipboard"
            data-ocid={copyOcid}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden />
            <span className="sr-only">Copy</span>
          </Button>
        </div>
      </div>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={editValue ?? ""}
            onChange={(e) => onEditChange?.(e.target.value)}
            rows={6}
            data-ocid={`${ocid}.edit_input`}
            className="bg-background"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onEditSave}
              data-ocid={editSaveOcid}
            >
              <Check className="w-3.5 h-3.5" aria-hidden />
              Save edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEditCancel}
              data-ocid={editCancelOcid}
            >
              <X className="w-3.5 h-3.5" aria-hidden />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed">
          {children}
        </p>
      )}
    </div>
  );
}

// ─── Generate button ───────────────────────────────────────────────────────

interface GenerateButtonProps {
  isPending: boolean;
  disabled: boolean;
  onClick: () => void;
  ocid: string;
  label?: string;
}

function GenerateButton({
  isPending,
  disabled,
  onClick,
  ocid,
  label = "Generate with AI",
}: GenerateButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isPending || disabled}
      data-ocid={ocid}
      className="w-full sm:w-auto"
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Generating…
        </>
      ) : (
        <>
          <Wand2 className="w-4 h-4" aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}

// ─── Selectors ─────────────────────────────────────────────────────────────

interface CategorySelectProps {
  value: ServiceCategory | "";
  onChange: (v: ServiceCategory) => void;
  ocid: string;
  label?: string;
}

function CategorySelect({
  value,
  onChange,
  ocid,
  label = "Category",
}: CategorySelectProps) {
  return (
    <div className="flex flex-col gap-1.5" data-ocid={ocid}>
      <Label className="text-xs font-body text-muted-foreground">{label}</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ServiceCategory)}
      >
        <SelectTrigger className="w-full" data-ocid={`${ocid}.select`}>
          <SelectValue placeholder="Auto-detect" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_VALUES.map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ToneSelectProps {
  value: Tone | "";
  onChange: (v: Tone) => void;
  ocid: string;
  label?: string;
}

function ToneSelect({
  value,
  onChange,
  ocid,
  label = "Tone",
}: ToneSelectProps) {
  return (
    <div className="flex flex-col gap-1.5" data-ocid={ocid}>
      <Label className="text-xs font-body text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Tone)}>
        <SelectTrigger className="w-full" data-ocid={`${ocid}.select`}>
          <SelectValue placeholder="Default" />
        </SelectTrigger>
        <SelectContent>
          {TONE_VALUES.map((t) => (
            <SelectItem key={t} value={t}>
              {TONE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Listing apply selector ────────────────────────────────────────────────

interface ListingApplyProps {
  listings: ServiceListing[];
  value: string;
  onChange: (v: string) => void;
  ocid: string;
}

function ListingApply({ listings, value, onChange, ocid }: ListingApplyProps) {
  if (listings.length === 0) {
    return (
      <p
        className="text-xs font-body text-muted-foreground"
        data-ocid={`${ocid}.no_listings`}
      >
        Create a listing first to apply generated content.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5" data-ocid={ocid}>
      <Label className="text-xs font-body text-muted-foreground">
        Apply to listing
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" data-ocid={`${ocid}.select`}>
          <SelectValue placeholder="Select a listing" />
        </SelectTrigger>
        <SelectContent>
          {listings.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Tool card shell ───────────────────────────────────────────────────────

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ocid: string;
  children: ReactNode;
  className?: string;
}

function ToolCard({
  icon: Icon,
  title,
  description,
  ocid,
  children,
  className,
}: ToolCardProps) {
  return (
    <Card
      className={`py-0 flex flex-col h-full ${className ?? ""}`}
      data-ocid={ocid}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5 text-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-semibold text-foreground leading-tight">
              {title}
            </CardTitle>
            <CardDescription className="font-body mt-0.5">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Listing Tools section ─────────────────────────────────────────────────

interface ListingToolsProps {
  listings: ServiceListing[];
  updateListing: ReturnType<typeof useUpdateListing>;
}

function ListingTools({ listings, updateListing }: ListingToolsProps) {
  const generateDescription = useGenerateListingDescription();
  const generateTitleTagline = useGenerateTitleAndTagline();
  const generatePromo = useGeneratePromotionalContent();

  // Description generator state
  const [bullets, setBullets] = useState("");
  const [descCategory, setDescCategory] = useState<ServiceCategory | "">("");
  const [descTone, setDescTone] = useState<Tone | "">("");
  const [descOutput, setDescOutput] = useState("");
  const [descEditing, setDescEditing] = useState(false);
  const [descEditValue, setDescEditValue] = useState("");
  const [descApplyId, setDescApplyId] = useState("");

  // Title/tagline generator state
  const [keywords, setKeywords] = useState("");
  const [titleCategory, setTitleCategory] = useState<ServiceCategory | "">("");
  const [titleOutput, setTitleOutput] = useState<string[]>([]);
  const [titleApplyId, setTitleApplyId] = useState("");

  // Promo generator state
  const [offer, setOffer] = useState("");
  const [promoCategory, setPromoCategory] = useState<ServiceCategory | "">("");
  const [promoTone, setPromoTone] = useState<Tone | "">("");
  const [promoOutput, setPromoOutput] = useState("");
  const [promoEditing, setPromoEditing] = useState(false);
  const [promoEditValue, setPromoEditValue] = useState("");
  const [promoApplyId, setPromoApplyId] = useState("");

  const handleCopy = (text: string) => {
    copyToClipboard(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const handleGenerateDescription = () => {
    const b = bullets.trim();
    if (!b) {
      toast.error("Add a few bullet points first");
      return;
    }
    generateDescription.mutate(
      {
        bulletPoints: b,
        category: descCategory || null,
        tone: descTone || null,
      },
      {
        onSuccess: (desc) => {
          setDescOutput(desc);
          setDescEditing(false);
          toast.success("Description generated");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : "Could not generate description",
          ),
      },
    );
  };

  const handleGenerateTitles = () => {
    const k = keywords.trim();
    if (!k) {
      toast.error("Add a few keywords first");
      return;
    }
    generateTitleTagline.mutate(
      { keywords: k, category: titleCategory || null },
      {
        onSuccess: (results) => {
          setTitleOutput(results);
          toast.success("Title ideas generated");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not generate titles",
          ),
      },
    );
  };

  const handleGeneratePromo = () => {
    const o = offer.trim();
    if (!o) {
      toast.error("Add offer details first");
      return;
    }
    if (!promoCategory) {
      toast.error("Select a category for promotional content");
      return;
    }
    generatePromo.mutate(
      { offerDetails: o, category: promoCategory, tone: promoTone || null },
      {
        onSuccess: (promo) => {
          setPromoOutput(promo);
          setPromoEditing(false);
          toast.success("Promotional content generated");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not generate promo",
          ),
      },
    );
  };

  const applyDescription = () => {
    const listing = listings.find((l) => l.id === descApplyId);
    if (!listing || !descOutput) return;
    const input: ServiceListingInput = {
      category: listing.category,
      title: listing.title,
      description: descOutput,
      priceCents: listing.priceCents,
      priceUnit: listing.priceUnit,
      photos: listing.photos,
      serviceArea: listing.serviceArea,
      active: listing.active,
    };
    updateListing.mutate(
      { listingId: listing.id, input },
      {
        onSuccess: () =>
          toast.success(`Description applied to "${listing.title}"`),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not apply description",
          ),
      },
    );
  };

  const applyTitle = (title: string) => {
    const listing = listings.find((l) => l.id === titleApplyId);
    if (!listing) return;
    const input: ServiceListingInput = {
      category: listing.category,
      title,
      description: listing.description,
      priceCents: listing.priceCents,
      priceUnit: listing.priceUnit,
      photos: listing.photos,
      serviceArea: listing.serviceArea,
      active: listing.active,
    };
    updateListing.mutate(
      { listingId: listing.id, input },
      {
        onSuccess: () => toast.success("Title applied to listing"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not apply title",
          ),
      },
    );
  };

  const applyPromo = () => {
    const listing = listings.find((l) => l.id === promoApplyId);
    if (!listing || !promoOutput) return;
    const combined = listing.description
      ? `${listing.description}\n\n${promoOutput}`
      : promoOutput;
    const input: ServiceListingInput = {
      category: listing.category,
      title: listing.title,
      description: combined,
      priceCents: listing.priceCents,
      priceUnit: listing.priceUnit,
      photos: listing.photos,
      serviceArea: listing.serviceArea,
      active: listing.active,
    };
    updateListing.mutate(
      { listingId: listing.id, input },
      {
        onSuccess: () => toast.success(`Promo appended to "${listing.title}"`),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not apply promo",
          ),
      },
    );
  };

  return (
    <section data-ocid="provider_ai_tools.listing_section">
      <SectionHeader
        icon={Tag}
        title="Listing Tools"
        description="Generate polished listing copy, catchy titles, and promotional content from your inputs."
        ocid="provider_ai_tools.listing_section.header"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Description generator */}
        <ToolCard
          icon={PenLine}
          title="Listing Description"
          description="Turn bullet points into polished service copy."
          ocid="provider_ai_tools.card.description"
        >
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-body text-muted-foreground">
              Bullet points
            </Label>
            <Textarea
              value={bullets}
              onChange={(e) => setBullets(e.target.value)}
              placeholder={
                "One bullet per line:\n• 26-foot box truck\n• Two-person crew\n• Same-day availability"
              }
              rows={4}
              data-ocid="provider_ai_tools.bullets_input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CategorySelect
              value={descCategory}
              onChange={setDescCategory}
              ocid="provider_ai_tools.description_category"
            />
            <ToneSelect
              value={descTone}
              onChange={setDescTone}
              ocid="provider_ai_tools.description_tone"
            />
          </div>
          <GenerateButton
            isPending={generateDescription.isPending}
            disabled={!bullets.trim()}
            onClick={handleGenerateDescription}
            ocid="provider_ai_tools.generate_description"
          />
          {descOutput ? (
            <div className="flex flex-col gap-3 mt-1 flex-1">
              <AIOutput
                ocid="provider_ai_tools.description_output"
                onCopy={() => handleCopy(descOutput)}
                onEdit={() => {
                  setDescEditValue(descOutput);
                  setDescEditing(true);
                }}
                isEditing={descEditing}
                editValue={descEditValue}
                onEditChange={setDescEditValue}
                onEditSave={() => {
                  setDescOutput(descEditValue);
                  setDescEditing(false);
                  toast.success("Edit saved");
                }}
                onEditCancel={() => setDescEditing(false)}
                copyOcid="provider_ai_tools.description_output.copy"
                editOcid="provider_ai_tools.description_output.edit"
                editSaveOcid="provider_ai_tools.description_output.save"
                editCancelOcid="provider_ai_tools.description_output.cancel"
              >
                {descOutput}
              </AIOutput>
              <div className="flex flex-col gap-2">
                <ListingApply
                  listings={listings}
                  value={descApplyId}
                  onChange={setDescApplyId}
                  ocid="provider_ai_tools.description_apply"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={applyDescription}
                  disabled={!descApplyId || updateListing.isPending}
                  data-ocid="provider_ai_tools.apply_description"
                >
                  <Check className="w-4 h-4" aria-hidden />
                  {updateListing.isPending ? "Applying…" : "Apply to listing"}
                </Button>
              </div>
            </div>
          ) : null}
        </ToolCard>

        {/* Title & tagline generator */}
        <ToolCard
          icon={Tag}
          title="Title & Tagline Ideas"
          description="Generate catchy titles from your keywords."
          ocid="provider_ai_tools.card.titles"
        >
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-body text-muted-foreground">
              Keywords
            </Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. box truck, same-day, Dallas, apartment move"
              data-ocid="provider_ai_tools.keywords_input"
            />
          </div>
          <CategorySelect
            value={titleCategory}
            onChange={setTitleCategory}
            ocid="provider_ai_tools.titles_category"
          />
          <GenerateButton
            isPending={generateTitleTagline.isPending}
            disabled={!keywords.trim()}
            onClick={handleGenerateTitles}
            ocid="provider_ai_tools.generate_titles"
          />
          {titleOutput.length > 0 ? (
            <div className="flex flex-col gap-2 mt-1 flex-1">
              {titleOutput.map((title, i) => (
                <div
                  key={title}
                  className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex items-start justify-between gap-2"
                  data-ocid={`provider_ai_tools.titles_output.${i + 1}`}
                >
                  <p className="text-sm font-body text-foreground flex-1 min-w-0">
                    {title}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(title)}
                    aria-label="Copy to clipboard"
                    data-ocid={`provider_ai_tools.titles_output.copy.${i + 1}`}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden />
                  </Button>
                </div>
              ))}
              <div className="flex flex-col gap-2 mt-1">
                <ListingApply
                  listings={listings}
                  value={titleApplyId}
                  onChange={setTitleApplyId}
                  ocid="provider_ai_tools.titles_apply"
                />
                {titleApplyId ? (
                  <div className="flex flex-col gap-1.5">
                    {titleOutput.slice(0, 3).map((title, i) => (
                      <Button
                        key={title}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => applyTitle(title)}
                        disabled={updateListing.isPending}
                        data-ocid={`provider_ai_tools.apply_title.${i + 1}`}
                      >
                        <Check className="w-4 h-4" aria-hidden />
                        Use "
                        {title.length > 28 ? `${title.slice(0, 28)}…` : title}"
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </ToolCard>

        {/* Promotional content generator */}
        <ToolCard
          icon={Sparkles}
          title="Promotional Content"
          description="Generate promo copy from your offer details."
          ocid="provider_ai_tools.card.promo"
        >
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-body text-muted-foreground">
              Offer details
            </Label>
            <Textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="e.g. 15% off first booking, free in-home estimate, weekend availability"
              rows={4}
              data-ocid="provider_ai_tools.offer_input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CategorySelect
              value={promoCategory}
              onChange={setPromoCategory}
              ocid="provider_ai_tools.promo_category"
            />
            <ToneSelect
              value={promoTone}
              onChange={setPromoTone}
              ocid="provider_ai_tools.promo_tone"
            />
          </div>
          <GenerateButton
            isPending={generatePromo.isPending}
            disabled={!offer.trim() || !promoCategory}
            onClick={handleGeneratePromo}
            ocid="provider_ai_tools.generate_promo"
          />
          {promoOutput ? (
            <div className="flex flex-col gap-3 mt-1 flex-1">
              <AIOutput
                ocid="provider_ai_tools.promo_output"
                onCopy={() => handleCopy(promoOutput)}
                onEdit={() => {
                  setPromoEditValue(promoOutput);
                  setPromoEditing(true);
                }}
                isEditing={promoEditing}
                editValue={promoEditValue}
                onEditChange={setPromoEditValue}
                onEditSave={() => {
                  setPromoOutput(promoEditValue);
                  setPromoEditing(false);
                  toast.success("Edit saved");
                }}
                onEditCancel={() => setPromoEditing(false)}
                copyOcid="provider_ai_tools.promo_output.copy"
                editOcid="provider_ai_tools.promo_output.edit"
                editSaveOcid="provider_ai_tools.promo_output.save"
                editCancelOcid="provider_ai_tools.promo_output.cancel"
              >
                {promoOutput}
              </AIOutput>
              <div className="flex flex-col gap-2">
                <ListingApply
                  listings={listings}
                  value={promoApplyId}
                  onChange={setPromoApplyId}
                  ocid="provider_ai_tools.promo_apply"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={applyPromo}
                  disabled={!promoApplyId || updateListing.isPending}
                  data-ocid="provider_ai_tools.apply_promo"
                >
                  <Check className="w-4 h-4" aria-hidden />
                  {updateListing.isPending ? "Applying…" : "Append to listing"}
                </Button>
              </div>
            </div>
          ) : null}
        </ToolCard>
      </div>
    </section>
  );
}

// ─── Profile Tools section ─────────────────────────────────────────────────

interface ProfileToolsProps {
  providerDescription: string;
  companyName: string;
  serviceCategories: ServiceCategory[];
  serviceAreas: string[];
}

function ProfileTools({
  companyName,
  serviceCategories,
  serviceAreas,
}: ProfileToolsProps) {
  const generateBio = useGenerateBio();
  const generateCompany = useGenerateCompanyDescription();
  const updateProvider = useUpdateMyProvider();

  const [bioInfo, setBioInfo] = useState("");
  const [bioTone, setBioTone] = useState<Tone | "">("");
  const [bioOutput, setBioOutput] = useState("");
  const [bioEditing, setBioEditing] = useState(false);
  const [bioEditValue, setBioEditValue] = useState("");

  const [companyInfo, setCompanyInfo] = useState("");
  const [companyTone, setCompanyTone] = useState<Tone | "">("");
  const [companyOutput, setCompanyOutput] = useState("");
  const [companyEditing, setCompanyEditing] = useState(false);
  const [companyEditValue, setCompanyEditValue] = useState("");

  const handleCopy = (text: string) => {
    copyToClipboard(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const handleGenerateBio = () => {
    const info = bioInfo.trim();
    if (!info) {
      toast.error("Add profile info first");
      return;
    }
    generateBio.mutate(
      { profileInfo: info, tone: bioTone || null },
      {
        onSuccess: (bio) => {
          setBioOutput(bio);
          setBioEditing(false);
          toast.success("Bio generated");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not generate bio",
          ),
      },
    );
  };

  const handleGenerateCompany = () => {
    const info = companyInfo.trim();
    if (!info) {
      toast.error("Add company info first");
      return;
    }
    generateCompany.mutate(
      { companyInfo: info, tone: companyTone || null },
      {
        onSuccess: (desc) => {
          setCompanyOutput(desc);
          setCompanyEditing(false);
          toast.success("Company description generated");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : "Could not generate description",
          ),
      },
    );
  };

  const applyBio = () => {
    if (!bioOutput) return;
    updateProvider.mutate(
      {
        companyName,
        description: bioOutput,
        serviceCategories,
        serviceAreas,
      },
      {
        onSuccess: () => toast.success("Bio applied to your profile"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not apply bio",
          ),
      },
    );
  };

  const applyCompany = () => {
    if (!companyOutput) return;
    updateProvider.mutate(
      {
        companyName,
        description: companyOutput,
        serviceCategories,
        serviceAreas,
      },
      {
        onSuccess: () =>
          toast.success("Company description applied to your profile"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not apply description",
          ),
      },
    );
  };

  return (
    <section data-ocid="provider_ai_tools.profile_section">
      <SectionHeader
        icon={Building2}
        title="Profile Tools"
        description="Craft a compelling personal bio and company description that builds trust with customers."
        ocid="provider_ai_tools.profile_section.header"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ToolCard
          icon={PenLine}
          title="Provider Bio"
          description="Generate a professional bio from your background and experience."
          ocid="provider_ai_tools.card.bio"
        >
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-body text-muted-foreground">
              Profile info
            </Label>
            <Textarea
              value={bioInfo}
              onChange={(e) => setBioInfo(e.target.value)}
              placeholder={
                "e.g. 8 years in logistics, CDL certified, insured, Dallas-based, specializes in apartment moves"
              }
              rows={4}
              data-ocid="provider_ai_tools.bio_input"
            />
          </div>
          <ToneSelect
            value={bioTone}
            onChange={setBioTone}
            ocid="provider_ai_tools.bio_tone"
          />
          <GenerateButton
            isPending={generateBio.isPending}
            disabled={!bioInfo.trim()}
            onClick={handleGenerateBio}
            ocid="provider_ai_tools.generate_bio"
          />
          {bioOutput ? (
            <div className="flex flex-col gap-3 mt-1 flex-1">
              <AIOutput
                ocid="provider_ai_tools.bio_output"
                onCopy={() => handleCopy(bioOutput)}
                onEdit={() => {
                  setBioEditValue(bioOutput);
                  setBioEditing(true);
                }}
                isEditing={bioEditing}
                editValue={bioEditValue}
                onEditChange={setBioEditValue}
                onEditSave={() => {
                  setBioOutput(bioEditValue);
                  setBioEditing(false);
                  toast.success("Edit saved");
                }}
                onEditCancel={() => setBioEditing(false)}
                copyOcid="provider_ai_tools.bio_output.copy"
                editOcid="provider_ai_tools.bio_output.edit"
                editSaveOcid="provider_ai_tools.bio_output.save"
                editCancelOcid="provider_ai_tools.bio_output.cancel"
              >
                {bioOutput}
              </AIOutput>
              <Button
                type="button"
                size="sm"
                onClick={applyBio}
                disabled={updateProvider.isPending}
                data-ocid="provider_ai_tools.apply_bio"
              >
                <Check className="w-4 h-4" aria-hidden />
                {updateProvider.isPending
                  ? "Applying…"
                  : "Apply as profile description"}
              </Button>
            </div>
          ) : null}
        </ToolCard>

        <ToolCard
          icon={Building2}
          title="Company Description"
          description="Generate a company overview that highlights your services and service area."
          ocid="provider_ai_tools.card.company"
        >
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-body text-muted-foreground">
              Company info
            </Label>
            <Textarea
              value={companyInfo}
              onChange={(e) => setCompanyInfo(e.target.value)}
              placeholder={
                "e.g. family-owned moving company, serving DFW since 2015, full-service moves, packing supplies, insured and bonded"
              }
              rows={4}
              data-ocid="provider_ai_tools.company_input"
            />
          </div>
          <ToneSelect
            value={companyTone}
            onChange={setCompanyTone}
            ocid="provider_ai_tools.company_tone"
          />
          <GenerateButton
            isPending={generateCompany.isPending}
            disabled={!companyInfo.trim()}
            onClick={handleGenerateCompany}
            ocid="provider_ai_tools.generate_company"
          />
          {companyOutput ? (
            <div className="flex flex-col gap-3 mt-1 flex-1">
              <AIOutput
                ocid="provider_ai_tools.company_output"
                onCopy={() => handleCopy(companyOutput)}
                onEdit={() => {
                  setCompanyEditValue(companyOutput);
                  setCompanyEditing(true);
                }}
                isEditing={companyEditing}
                editValue={companyEditValue}
                onEditChange={setCompanyEditValue}
                onEditSave={() => {
                  setCompanyOutput(companyEditValue);
                  setCompanyEditing(false);
                  toast.success("Edit saved");
                }}
                onEditCancel={() => setCompanyEditing(false)}
                copyOcid="provider_ai_tools.company_output.copy"
                editOcid="provider_ai_tools.company_output.edit"
                editSaveOcid="provider_ai_tools.company_output.save"
                editCancelOcid="provider_ai_tools.company_output.cancel"
              >
                {companyOutput}
              </AIOutput>
              <Button
                type="button"
                size="sm"
                onClick={applyCompany}
                disabled={updateProvider.isPending}
                data-ocid="provider_ai_tools.apply_company"
              >
                <Check className="w-4 h-4" aria-hidden />
                {updateProvider.isPending
                  ? "Applying…"
                  : "Apply as profile description"}
              </Button>
            </div>
          ) : null}
        </ToolCard>
      </div>
    </section>
  );
}

// ─── Photo Analysis section ────────────────────────────────────────────────

interface AnalysisResult {
  text: string;
  error?: string;
}

function PhotoAnalysis() {
  const analyzeDescription = useAnalyzeImageDescription();
  const analyzeWork = useAnalyzeImageWork();
  const analyzeSafety = useAnalyzeImageSafety();

  const [upload, setUpload] = useState<UploadedImage | null>(null);
  const [results, setResults] = useState<{
    description: AnalysisResult | null;
    work: AnalysisResult | null;
    safety: AnalysisResult | null;
  }>({ description: null, work: null, safety: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke preview URL on unmount or replacement.
  useEffect(() => {
    return () => {
      if (upload) revokePreviewUrl(upload.previewUrl);
    };
  }, [upload]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const uploaded = await readFileAsUploadedImage(file);
    if (!uploaded) {
      toast.error("Could not read that image");
      return;
    }
    if (upload) revokePreviewUrl(upload.previewUrl);
    setUpload(uploaded);
    setResults({ description: null, work: null, safety: null });
  };

  const runAllAnalyses = () => {
    if (!upload) {
      toast.error("Upload a photo first");
      return;
    }
    const blob = upload.blob as ExternalBlob;
    setResults({ description: null, work: null, safety: null });

    analyzeDescription.mutate(blob, {
      onSuccess: (text) => setResults((r) => ({ ...r, description: { text } })),
      onError: (err) =>
        setResults((r) => ({
          ...r,
          description: {
            text: "",
            error:
              err instanceof Error
                ? err.message
                : "Description analysis failed",
          },
        })),
    });
    analyzeWork.mutate(blob, {
      onSuccess: (text) => setResults((r) => ({ ...r, work: { text } })),
      onError: (err) =>
        setResults((r) => ({
          ...r,
          work: {
            text: "",
            error: err instanceof Error ? err.message : "Work analysis failed",
          },
        })),
    });
    analyzeSafety.mutate(blob, {
      onSuccess: (text) => setResults((r) => ({ ...r, safety: { text } })),
      onError: (err) =>
        setResults((r) => ({
          ...r,
          safety: {
            text: "",
            error: err instanceof Error ? err.message : "Safety check failed",
          },
        })),
    });
  };

  const handleCopy = (text: string) => {
    copyToClipboard(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const anyPending =
    analyzeDescription.isPending ||
    analyzeWork.isPending ||
    analyzeSafety.isPending;

  const analysisCards: {
    key: "description" | "work" | "safety";
    icon: LucideIcon;
    title: string;
    ocid: string;
  }[] = [
    {
      key: "description",
      icon: ImageIcon,
      title: "Description",
      ocid: "provider_ai_tools.photo_description",
    },
    {
      key: "work",
      icon: Wrench,
      title: "Work Type",
      ocid: "provider_ai_tools.photo_work",
    },
    {
      key: "safety",
      icon: ShieldAlert,
      title: "Safety Check",
      ocid: "provider_ai_tools.photo_safety",
    },
  ];

  return (
    <section data-ocid="provider_ai_tools.photo_section">
      <SectionHeader
        icon={Camera}
        title="Photo Analysis"
        description="Upload a work photo and run three AI vision analyses — description, work-type classification, and safety check."
        ocid="provider_ai_tools.photo_section.header"
      />
      <Card className="py-0" data-ocid="provider_ai_tools.card.photo">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upload + preview */}
            <div
              className="flex flex-col gap-3"
              data-ocid="provider_ai_tools.photo_upload"
            >
              <Label className="text-xs font-body text-muted-foreground">
                Work photo
              </Label>
              {upload ? (
                <div className="relative rounded-lg overflow-hidden border border-border bg-secondary/40">
                  <img
                    src={upload.previewUrl}
                    alt={`Uploaded work photo: ${upload.filename}`}
                    className="w-full h-48 object-cover"
                    data-ocid="provider_ai_tools.photo_preview"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      revokePreviewUrl(upload.previewUrl);
                      setUpload(null);
                      setResults({
                        description: null,
                        work: null,
                        safety: null,
                      });
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 backdrop-blur text-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove photo"
                    data-ocid="provider_ai_tools.photo_remove"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 h-48 rounded-lg border-2 border-dashed border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/40 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-ocid="provider_ai_tools.photo_dropzone"
                >
                  <ImageIcon
                    className="w-8 h-8 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="text-sm font-body text-muted-foreground">
                    Click to upload a work photo
                  </span>
                  <span className="text-xs font-body text-muted-foreground/70">
                    JPG, PNG, or WebP
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                data-ocid="provider_ai_tools.photo_file_input"
              />
              <GenerateButton
                isPending={anyPending}
                disabled={!upload}
                onClick={runAllAnalyses}
                ocid="provider_ai_tools.analyze_photo"
                label="Analyze photo"
              />
            </div>

            {/* Results */}
            <div
              className="flex flex-col gap-3"
              data-ocid="provider_ai_tools.photo_results"
            >
              {analysisCards.map((card) => {
                const result = results[card.key];
                const isPending =
                  card.key === "description"
                    ? analyzeDescription.isPending
                    : card.key === "work"
                      ? analyzeWork.isPending
                      : analyzeSafety.isPending;
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-2"
                    data-ocid={card.ocid}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-foreground" aria-hidden />
                      <span className="text-xs font-body font-semibold text-foreground">
                        {card.title}
                      </span>
                      {result && !result.error ? (
                        <AIBadge ocid={`${card.ocid}.badge`} />
                      ) : null}
                    </div>
                    {isPending ? (
                      <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
                        <Loader2
                          className="w-3.5 h-3.5 animate-spin"
                          aria-hidden
                        />
                        Analyzing…
                      </div>
                    ) : result?.error ? (
                      <p className="text-xs font-body text-destructive">
                        {result.error}
                      </p>
                    ) : result?.text ? (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-body text-foreground whitespace-pre-wrap flex-1 min-w-0 leading-relaxed">
                          {result.text}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(result.text)}
                          aria-label={`Copy ${card.title}`}
                          data-ocid={`${card.ocid}.copy`}
                          className="h-6 px-1.5 text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <Copy className="w-3 h-3" aria-hidden />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs font-body text-muted-foreground/70">
                        Upload and analyze a photo to see results.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Messaging Assistant section ───────────────────────────────────────────

interface MessagingAssistantProps {
  bookings: Booking[];
}

function MessagingAssistant({ bookings }: MessagingAssistantProps) {
  const suggestReply = useSuggestReply();
  const [bookingId, setBookingId] = useState("");
  const [output, setOutput] = useState("");
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === bookingId) ?? null,
    [bookings, bookingId],
  );

  // Fetch the thread for the selected booking so the AI has conversation context.
  const { data: messages } = useGetThread(selectedBooking?.id ?? null);

  const handleCopy = (text: string) => {
    copyToClipboard(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const handleGenerate = () => {
    if (!selectedBooking) {
      toast.error("Select a booking first");
      return;
    }
    const context = (messages ?? [])
      .slice(-12)
      .map((m) => {
        const sender =
          m.sender.toString() === selectedBooking.customerId.toString()
            ? "Customer"
            : "Provider";
        return `${sender}: ${m.content}`;
      })
      .join("\n");
    suggestReply.mutate(
      {
        bookingId: selectedBooking.id,
        conversationContext: context || null,
      },
      {
        onSuccess: (reply) => {
          setOutput(reply);
          setEditing(false);
          toast.success("Reply draft generated");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not generate reply",
          ),
      },
    );
  };

  return (
    <section data-ocid="provider_ai_tools.messaging_section">
      <SectionHeader
        icon={MessageSquare}
        title="Messaging Assistant"
        description="Select a booking conversation and generate a context-aware reply draft to send your customer."
        ocid="provider_ai_tools.messaging_section.header"
      />
      <Card className="py-0" data-ocid="provider_ai_tools.card.messaging">
        <CardContent className="flex flex-col gap-4 p-5">
          <div
            className="flex flex-col gap-1.5"
            data-ocid="provider_ai_tools.messaging_booking"
          >
            <Label className="text-xs font-body text-muted-foreground">
              Booking conversation
            </Label>
            {bookings.length === 0 ? (
              <p
                className="text-sm font-body text-muted-foreground"
                data-ocid="provider_ai_tools.messaging_no_bookings"
              >
                No bookings yet. Once customers book your services, you can
                generate reply drafts here.
              </p>
            ) : (
              <Select value={bookingId} onValueChange={setBookingId}>
                <SelectTrigger
                  className="w-full"
                  data-ocid="provider_ai_tools.messaging_booking.select"
                >
                  <SelectValue placeholder="Select a booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {CATEGORY_LABELS[b.category]} ·{" "}
                      {formatDate(b.scheduledDate)} ·{" "}
                      {principalShort(b.customerId.toString())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedBooking ? (
            <div
              className="rounded-lg border border-border bg-secondary/30 p-3 text-xs font-body text-muted-foreground"
              data-ocid="provider_ai_tools.messaging_context"
            >
              <span className="font-semibold text-foreground">Context:</span>{" "}
              {CATEGORY_LABELS[selectedBooking.category]} on{" "}
              {formatDate(selectedBooking.scheduledDate)} ·{" "}
              {(messages ?? []).length} message
              {(messages ?? []).length === 1 ? "" : "s"} in thread
            </div>
          ) : null}
          <GenerateButton
            isPending={suggestReply.isPending}
            disabled={!selectedBooking}
            onClick={handleGenerate}
            ocid="provider_ai_tools.generate_reply"
            label="Generate reply draft"
          />
          {output ? (
            <AIOutput
              ocid="provider_ai_tools.reply_output"
              onCopy={() => handleCopy(output)}
              onEdit={() => {
                setEditValue(output);
                setEditing(true);
              }}
              isEditing={editing}
              editValue={editValue}
              onEditChange={setEditValue}
              onEditSave={() => {
                setOutput(editValue);
                setEditing(false);
                toast.success("Edit saved");
              }}
              onEditCancel={() => setEditing(false)}
              copyOcid="provider_ai_tools.reply_output.copy"
              editOcid="provider_ai_tools.reply_output.edit"
              editSaveOcid="provider_ai_tools.reply_output.save"
              editCancelOcid="provider_ai_tools.reply_output.cancel"
            >
              {output}
            </AIOutput>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Review Response section ───────────────────────────────────────────────

interface ReviewResponseProps {
  reviews: Review[];
}

function ReviewResponse({ reviews }: ReviewResponseProps) {
  const generateDraft = useGenerateReviewDraft();
  const respondToReview = useRespondToReview();

  const [reviewId, setReviewId] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [output, setOutput] = useState("");
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const selectedReview = useMemo(
    () => reviews.find((r) => r.id === reviewId) ?? null,
    [reviews, reviewId],
  );

  const handleCopy = (text: string) => {
    copyToClipboard(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const handleGenerate = () => {
    if (!selectedReview) {
      toast.error("Select a review first");
      return;
    }
    generateDraft.mutate(
      {
        bookingId: selectedReview.bookingId,
        rating: selectedReview.rating,
        extraNotes: extraNotes.trim() || null,
      },
      {
        onSuccess: (draft) => {
          setOutput(draft);
          setEditing(false);
          toast.success("Response draft generated");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not generate response",
          ),
      },
    );
  };

  const handleApply = () => {
    if (!selectedReview || !output) return;
    respondToReview.mutate(
      { reviewId: selectedReview.id, response: output },
      {
        onSuccess: () => toast.success("Response posted to review"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not post response",
          ),
      },
    );
  };

  return (
    <section data-ocid="provider_ai_tools.review_section">
      <SectionHeader
        icon={Star}
        title="Review Response"
        description="Select a customer review and generate a thoughtful response draft. Review and edit before posting publicly."
        ocid="provider_ai_tools.review_section.header"
      />
      <Card className="py-0" data-ocid="provider_ai_tools.card.review">
        <CardContent className="flex flex-col gap-4 p-5">
          <div
            className="flex flex-col gap-1.5"
            data-ocid="provider_ai_tools.review_select"
          >
            <Label className="text-xs font-body text-muted-foreground">
              Customer review
            </Label>
            {reviews.length === 0 ? (
              <p
                className="text-sm font-body text-muted-foreground"
                data-ocid="provider_ai_tools.review_no_reviews"
              >
                No reviews yet. Once customers leave reviews, you can generate
                response drafts here.
              </p>
            ) : (
              <Select value={reviewId} onValueChange={setReviewId}>
                <SelectTrigger
                  className="w-full"
                  data-ocid="provider_ai_tools.review_select.select"
                >
                  <SelectValue placeholder="Select a review" />
                </SelectTrigger>
                <SelectContent>
                  {reviews.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.rating}★ · {r.writtenText.slice(0, 40)}
                      {r.writtenText.length > 40 ? "…" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedReview ? (
            <div
              className="rounded-lg border border-border bg-secondary/30 p-3 flex flex-col gap-1.5"
              data-ocid="provider_ai_tools.review_context"
            >
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length star rating where index is the stable identity
                    key={`star-${i}`}
                    className={
                      i < selectedReview.rating
                        ? "w-3.5 h-3.5 fill-accent text-accent"
                        : "w-3.5 h-3.5 text-muted-foreground/40"
                    }
                    aria-hidden
                  />
                ))}
                <span className="text-xs font-body text-muted-foreground ml-1">
                  {formatDate(
                    new Date(Number(selectedReview.createdAt)).toISOString(),
                  )}
                </span>
              </div>
              <p className="text-sm font-body text-foreground whitespace-pre-wrap">
                {selectedReview.writtenText}
              </p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-body text-muted-foreground">
              Extra notes (optional)
            </Label>
            <Textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="e.g. apologize for the delay, mention the refund issued, thank them"
              rows={3}
              data-ocid="provider_ai_tools.review_notes_input"
            />
          </div>
          <GenerateButton
            isPending={generateDraft.isPending}
            disabled={!selectedReview}
            onClick={handleGenerate}
            ocid="provider_ai_tools.generate_review_response"
            label="Generate response draft"
          />
          {output ? (
            <div className="flex flex-col gap-3">
              <AIOutput
                ocid="provider_ai_tools.review_output"
                onCopy={() => handleCopy(output)}
                onEdit={() => {
                  setEditValue(output);
                  setEditing(true);
                }}
                isEditing={editing}
                editValue={editValue}
                onEditChange={setEditValue}
                onEditSave={() => {
                  setOutput(editValue);
                  setEditing(false);
                  toast.success("Edit saved");
                }}
                onEditCancel={() => setEditing(false)}
                copyOcid="provider_ai_tools.review_output.copy"
                editOcid="provider_ai_tools.review_output.edit"
                editSaveOcid="provider_ai_tools.review_output.save"
                editCancelOcid="provider_ai_tools.review_output.cancel"
              >
                {output}
              </AIOutput>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={!selectedReview || respondToReview.isPending}
                data-ocid="provider_ai_tools.apply_review_response"
              >
                <Check className="w-4 h-4" aria-hidden />
                {respondToReview.isPending
                  ? "Posting…"
                  : "Post response to review"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Microsite Generator section ───────────────────────────────────────────

interface MicrositeGeneratorProps {
  providerId: string;
}

function MicrositeGenerator({ providerId }: MicrositeGeneratorProps) {
  const generateMicrosite = useGenerateMicrosite();
  const [output, setOutput] = useState<Microsite | null>(null);

  const handleCopy = (text: string) => {
    copyToClipboard(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const handleGenerate = () => {
    generateMicrosite.mutate(providerId, {
      onSuccess: (microsite) => {
        setOutput(microsite);
        toast.success("Microsite generated");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate microsite",
        ),
    });
  };

  return (
    <section data-ocid="provider_ai_tools.microsite_section">
      <SectionHeader
        icon={Building2}
        title="Microsite Generator"
        description="Generate a one-page marketing microsite — hero, about, and services copy — from your provider profile and listings."
        ocid="provider_ai_tools.microsite_section.header"
      />
      <ToolCard
        icon={Building2}
        title="Marketing Microsite"
        description="Draft a complete microsite from your profile, listings, and service areas."
        ocid="provider_ai_tools.card.microsite"
      >
        <GenerateButton
          isPending={generateMicrosite.isPending}
          disabled={!providerId}
          onClick={handleGenerate}
          ocid="provider_ai_tools.generate_microsite"
          label="Generate microsite"
        />
        {output ? (
          <div className="flex flex-col gap-3 mt-1 flex-1">
            <AIOutput
              ocid="provider_ai_tools.microsite_hero_output"
              onCopy={() => handleCopy(output.heroCopy)}
              copyOcid="provider_ai_tools.microsite_hero_output.copy"
            >
              {`Hero\n\n${output.heroCopy}`}
            </AIOutput>
            <AIOutput
              ocid="provider_ai_tools.microsite_about_output"
              onCopy={() => handleCopy(output.aboutCopy)}
              copyOcid="provider_ai_tools.microsite_about_output.copy"
            >
              {`About\n\n${output.aboutCopy}`}
            </AIOutput>
            <AIOutput
              ocid="provider_ai_tools.microsite_services_output"
              onCopy={() => handleCopy(output.servicesCopy)}
              copyOcid="provider_ai_tools.microsite_services_output.copy"
            >
              {`Services\n\n${output.servicesCopy}`}
            </AIOutput>
            <div
              className="rounded-lg border border-border bg-secondary/30 p-3 text-xs font-body text-muted-foreground"
              data-ocid="provider_ai_tools.microsite_meta"
            >
              <span className="font-semibold text-foreground">Slug:</span>{" "}
              {output.slug} ·{" "}
              <span className="font-semibold text-foreground">Status:</span>{" "}
              {output.published ? "Published" : "Draft"}
            </div>
          </div>
        ) : null}
      </ToolCard>
    </section>
  );
}

// ─── Provider Insights section ─────────────────────────────────────────────

interface ProviderInsightsProps {
  providerId: string;
}

function ProviderInsightsCard({ providerId }: ProviderInsightsProps) {
  const generateInsights = useGenerateProviderInsights();
  const [output, setOutput] = useState<ProviderInsights | null>(null);

  const handleCopy = (text: string) => {
    copyToClipboard(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const handleGenerate = () => {
    generateInsights.mutate(providerId, {
      onSuccess: (insights) => {
        setOutput(insights);
        toast.success("Insights generated");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate insights",
        ),
    });
  };

  return (
    <section data-ocid="provider_ai_tools.insights_section">
      <SectionHeader
        icon={Sparkles}
        title="Provider Insights"
        description="Generate AI-driven insights and actionable recommendations from your bookings, reviews, and listing performance."
        ocid="provider_ai_tools.insights_section.header"
      />
      <ToolCard
        icon={Sparkles}
        title="Performance Insights"
        description="Get a summary of how you're doing and what to improve next."
        ocid="provider_ai_tools.card.insights"
      >
        <GenerateButton
          isPending={generateInsights.isPending}
          disabled={!providerId}
          onClick={handleGenerate}
          ocid="provider_ai_tools.generate_insights"
          label="Generate insights"
        />
        {output ? (
          <div className="flex flex-col gap-3 mt-1 flex-1">
            <AIOutput
              ocid="provider_ai_tools.insights_summary_output"
              onCopy={() => handleCopy(output.insights)}
              copyOcid="provider_ai_tools.insights_summary_output.copy"
            >
              {output.insights}
            </AIOutput>
            {output.recommendations.length > 0 ? (
              <div
                className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex flex-col gap-2"
                data-ocid="provider_ai_tools.insights_recommendations"
              >
                <AIBadge ocid="provider_ai_tools.insights_recommendations.badge" />
                <ul className="flex flex-col gap-2 mt-1">
                  {output.recommendations.map((rec, i) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: AI-generated list, index is the only stable identity
                      key={`rec-${i}`}
                      className="flex items-start gap-2"
                      data-ocid={`provider_ai_tools.insights_recommendations.${i + 1}`}
                    >
                      <Check
                        className="w-3.5 h-3.5 text-accent-foreground mt-0.5 shrink-0"
                        aria-hidden
                      />
                      <span className="text-sm font-body text-foreground flex-1 min-w-0 leading-relaxed">
                        {rec}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(rec)}
                        aria-label="Copy recommendation"
                        data-ocid={`provider_ai_tools.insights_recommendations.copy.${i + 1}`}
                        className="h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </ToolCard>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function ProviderAITools() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: listings } = useListListingsByProvider(providerId);
  const { data: bookings } = useListProviderBookings(providerId);
  const { data: reviews } = useListReviewsByProvider(providerId);
  const updateListing = useUpdateListing();

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.provider_ai_tools"
      >
        <LoadingSpinner fullPage label="Loading AI tools" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_ai_tools"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to use AI tools"
          description="You need to sign in with Internet Identity to access the AI command center for your listings, profile, photos, and customer conversations."
          data-ocid="provider_ai_tools.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_ai_tools"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to unlock the AI command center — listing copy, profile bios, photo analysis, and customer reply drafts."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_ai_tools.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_ai_tools.not_registered"
        />
      </div>
    );
  }

  const myListings = listings ?? [];
  const myBookings = bookings ?? [];
  const myReviews = (reviews ?? []).filter((r) => !r.hidden);

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_ai_tools"
    >
      {/* Hero header — first-class AI surface */}
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_ai_tools.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-md">
              <Sparkles
                className="w-6 h-6 text-primary-foreground"
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground leading-tight">
                  AI Command Center
                </h1>
                <span
                  className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-body font-semibold uppercase tracking-wide text-primary-foreground"
                  data-ocid="provider_ai_tools.badge"
                >
                  AI
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-body max-w-2xl">
                Your single hub for every AI capability — generate listing copy,
                craft your profile, analyze work photos, draft customer replies,
                and respond to reviews. Review every result before applying.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div
        className="container mx-auto px-4 lg:px-6 py-10 flex flex-col gap-12"
        data-ocid="provider_ai_tools.body"
      >
        <ListingTools listings={myListings} updateListing={updateListing} />
        <ProfileTools
          providerDescription={provider.description}
          companyName={provider.companyName}
          serviceCategories={provider.serviceCategories}
          serviceAreas={provider.serviceAreas}
        />
        <PhotoAnalysis />
        <MessagingAssistant bookings={myBookings} />
        <ReviewResponse reviews={myReviews} />
        <MicrositeGenerator providerId={provider.id} />
        <ProviderInsightsCard providerId={provider.id} />
      </div>
    </div>
  );
}
