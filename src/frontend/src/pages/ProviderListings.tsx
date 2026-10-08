// ProviderListings — manage a provider's service listings.
// Lists listings from useListListingsByProvider(providerId), create/edit/delete
// via useCreateListing/useUpdateListing/useDeleteListing, plus an AI generation
// tools section with three generators and an apply-to-form button.

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateListing,
  useDeleteListing,
  useGenerateListingDescription,
  useGeneratePromotionalContent,
  useGenerateTitleAndTagline,
  useGetMyProvider,
  useListListingsByProvider,
  useUpdateListing,
} from "@/hooks/useQueries";
import {
  CATEGORY_LABELS,
  PRICE_UNIT_LABELS,
  type PriceUnit,
  type ServiceCategory,
  type ServiceListing,
  type ServiceListingInput,
} from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Truck,
  Wand2,
} from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const ALL_CATEGORIES: ServiceCategory[] = [
  "boxTruck",
  "relocation",
  "trashHaul",
  "moving",
];

const PRICE_UNITS: PriceUnit[] = ["hour", "job", "day", "load"];

const DFW_AREAS = [
  "Dallas",
  "Fort Worth",
  "Arlington",
  "Plano",
  "Irving",
  "Garland",
  "Frisco",
  "McKinney",
  "Denton",
  "Richardson",
];

interface ListingFormState {
  category: ServiceCategory;
  title: string;
  description: string;
  priceDollars: string;
  priceUnit: PriceUnit;
  serviceArea: string;
  photos: string[];
  active: boolean;
}

const EMPTY_FORM: ListingFormState = {
  category: "boxTruck",
  title: "",
  description: "",
  priceDollars: "",
  priceUnit: "job",
  serviceArea: "Dallas",
  photos: [],
  active: true,
};

function dollarsToCents(dollars: string): bigint {
  const trimmed = dollars.trim();
  if (!trimmed) return 0n;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return 0n;
  return BigInt(Math.round(num * 100));
}

function centsToDollars(cents: bigint): string {
  const num = Number(cents) / 100;
  return Number.isInteger(num) ? String(num) : String(num);
}

function formFromListing(listing: ServiceListing): ListingFormState {
  return {
    category: listing.category,
    title: listing.title,
    description: listing.description,
    priceDollars: centsToDollars(listing.priceCents),
    priceUnit: listing.priceUnit,
    serviceArea: listing.serviceArea,
    photos: [...listing.photos],
    active: listing.active,
  };
}

function formToInput(form: ListingFormState): ServiceListingInput {
  return {
    category: form.category,
    title: form.title.trim(),
    description: form.description.trim(),
    priceCents: dollarsToCents(form.priceDollars),
    priceUnit: form.priceUnit,
    photos: form.photos,
    serviceArea: form.serviceArea,
    active: form.active,
  };
}

export function ProviderListings() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: listings, isLoading: listingsLoading } =
    useListListingsByProvider(providerId);
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ListingFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ServiceListing | null>(null);

  const isApproved = provider?.verificationStatus === "approved";

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (listing: ServiceListing) => {
    setEditingId(listing.id);
    setForm(formFromListing(listing));
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (dollarsToCents(form.priceDollars) <= 0n) {
      toast.error("Enter a price greater than zero");
      return;
    }
    const input = formToInput(form);
    if (editingId) {
      updateListing.mutate(
        { listingId: editingId, input },
        {
          onSuccess: () => {
            toast.success("Listing updated");
            setDialogOpen(false);
          },
          onError: (err) =>
            toast.error(
              err instanceof Error ? err.message : "Could not update listing",
            ),
        },
      );
    } else {
      createListing.mutate(input, {
        onSuccess: () => {
          toast.success("Listing created");
          setDialogOpen(false);
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not create listing",
          ),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteListing.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Listing deleted");
        setDeleteTarget(null);
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not delete listing",
        ),
    });
  };

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.provider_listings"
      >
        <LoadingSpinner fullPage label="Loading listings" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_listings"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to manage listings"
          description="You need to sign in to create and edit service listings."
          data-ocid="provider_listings.signin_required"
        />
      </div>
    );
  }

  if (!provider) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_listings"
      >
        <EmptyState
          icon={Truck}
          title="Become a provider"
          description="Register your business to start creating service listings across DFW."
          action={
            <Link to="/provider/register">
              <Button data-ocid="provider_listings.register">
                Register as provider
              </Button>
            </Link>
          }
          data-ocid="provider_listings.not_registered"
        />
      </div>
    );
  }

  const allListings = listings ?? [];
  const isSubmitting = createListing.isPending || updateListing.isPending;

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_listings"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_listings.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-1">
              My listings
            </h1>
            <p className="text-sm text-muted-foreground font-body">
              Create and manage the services you offer across the DFW metroplex.
            </p>
          </div>
          <Button
            onClick={openCreate}
            disabled={!isApproved}
            data-ocid="provider_listings.create_button"
          >
            <Plus className="w-4 h-4" aria-hidden />
            New listing
          </Button>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8"
        data-ocid="provider_listings.list"
      >
        {!isApproved ? (
          <EmptyState
            icon={AlertCircle}
            title="Verification required"
            description="Once an admin approves your provider profile, you can create listings here."
            action={
              <Link to="/provider/dashboard">
                <Button
                  variant="outline"
                  data-ocid="provider_listings.dashboard"
                >
                  Go to dashboard
                </Button>
              </Link>
            }
            data-ocid="provider_listings.not_approved"
          />
        ) : listingsLoading ? (
          <LoadingSpinner label="Loading listings" />
        ) : allListings.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No listings yet"
            description="Create your first service listing to start receiving booking requests from DFW customers."
            action={
              <Button
                onClick={openCreate}
                data-ocid="provider_listings.empty_create"
              >
                <Plus className="w-4 h-4" aria-hidden />
                Create listing
              </Button>
            }
            data-ocid="provider_listings.empty_state"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allListings.map((listing, i) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                index={i}
                onEdit={() => openEdit(listing)}
                onDelete={() => setDeleteTarget(listing)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit listing" : "Create listing"}
            </DialogTitle>
            <DialogDescription>
              Fill out the details below. Use the AI tools to generate
              compelling copy.
            </DialogDescription>
          </DialogHeader>
          <ListingForm
            form={form}
            onFormChange={setForm}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            editingId={editingId}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete listing?</DialogTitle>
            <DialogDescription>
              This permanently removes "{deleteTarget?.title}" from the
              marketplace. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteListing.isPending}
              data-ocid="provider_listings.delete_cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteListing.isPending}
              data-ocid="provider_listings.delete_confirm"
            >
              {deleteListing.isPending ? "Deleting…" : "Delete listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ListingCardProps {
  listing: ServiceListing;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function ListingCard({ listing, index, onEdit, onDelete }: ListingCardProps) {
  const price = Number(listing.priceCents) / 100;
  const priceLabel = `$${price.toFixed(2)} / ${PRICE_UNIT_LABELS[listing.priceUnit]}`;
  return (
    <Card
      className="py-0 flex flex-col"
      data-ocid={`provider_listings.item.${index + 1}`}
    >
      {listing.photos[0] ? (
        <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-secondary">
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-semibold text-foreground leading-tight truncate">
              {listing.title}
            </CardTitle>
            <CardDescription className="font-body mt-0.5">
              {CATEGORY_LABELS[listing.category]} · {listing.serviceArea}
            </CardDescription>
          </div>
          <span
            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-body font-medium ${
              listing.active
                ? "bg-success/10 text-success-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {listing.active ? "Active" : "Inactive"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        <p className="text-sm text-muted-foreground font-body line-clamp-3 flex-1">
          {listing.description}
        </p>
        <p className="text-base font-display font-semibold text-foreground">
          {priceLabel}
        </p>
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            data-ocid={`provider_listings.edit.${index + 1}`}
          >
            <Pencil className="w-4 h-4" aria-hidden />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
            data-ocid={`provider_listings.delete.${index + 1}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ListingFormProps {
  form: ListingFormState;
  onFormChange: (form: ListingFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  editingId: string | null;
}

function ListingForm({
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
  editingId,
}: ListingFormProps) {
  const [photoUrl, setPhotoUrl] = useState("");
  const [aiBulletPoints, setAiBulletPoints] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiOfferDetails, setAiOfferDetails] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [generatedTitleTagline, setGeneratedTitleTagline] = useState<string[]>(
    [],
  );
  const [generatedPromo, setGeneratedPromo] = useState("");

  const generateDescription = useGenerateListingDescription();
  const generateTitleTagline = useGenerateTitleAndTagline();
  const generatePromo = useGeneratePromotionalContent();

  const onPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onFormChange({ ...form, photos: [...form.photos, url] });
    }
  };

  const addPhotoUrl = () => {
    const trimmed = photoUrl.trim();
    if (trimmed && !form.photos.includes(trimmed)) {
      onFormChange({ ...form, photos: [...form.photos, trimmed] });
      setPhotoUrl("");
    }
  };

  const removePhoto = (url: string) => {
    onFormChange({ ...form, photos: form.photos.filter((p) => p !== url) });
  };

  const handleGenerateDescription = () => {
    const bullets = aiBulletPoints.trim();
    if (!bullets) {
      toast.error("Add a few bullet points first");
      return;
    }
    generateDescription.mutate(bullets, {
      onSuccess: (desc) => setGeneratedDescription(desc),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate description",
        ),
    });
  };

  const handleGenerateTitleTagline = () => {
    const keywords = aiKeywords.trim();
    if (!keywords) {
      toast.error("Add a few keywords first");
      return;
    }
    generateTitleTagline.mutate(keywords, {
      onSuccess: (results) => setGeneratedTitleTagline(results),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate titles",
        ),
    });
  };

  const handleGeneratePromo = () => {
    const details = aiOfferDetails.trim();
    if (!details) {
      toast.error("Add offer details first");
      return;
    }
    generatePromo.mutate(details, {
      onSuccess: (promo) => setGeneratedPromo(promo),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate promo",
        ),
    });
  };

  const applyDescription = () => {
    if (!generatedDescription) return;
    onFormChange({ ...form, description: generatedDescription });
    toast.success("Description applied to form");
  };

  const applyTitle = (title: string) => {
    onFormChange({ ...form, title });
    toast.success("Title applied to form");
  };

  const applyPromo = () => {
    if (!generatedPromo) return;
    const combined = form.description
      ? `${form.description}\n\n${generatedPromo}`
      : generatedPromo;
    onFormChange({ ...form, description: combined });
    toast.success("Promotional content appended to description");
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6"
      data-ocid="provider_listings.form"
    >
      {/* Title */}
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="listing-title"
          data-ocid="provider_listings.title_label"
        >
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="listing-title"
          value={form.title}
          onChange={(e) => onFormChange({ ...form, title: e.target.value })}
          placeholder="e.g. Same-Day Box Truck Haul in Dallas"
          required
          data-ocid="provider_listings.title_input"
        />
      </div>

      {/* Category + price unit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="listing-category"
            data-ocid="provider_listings.category_label"
          >
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.category}
            onValueChange={(v) =>
              onFormChange({ ...form, category: v as ServiceCategory })
            }
          >
            <SelectTrigger
              id="listing-category"
              className="w-full"
              data-ocid="provider_listings.category_select"
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="listing-price-unit"
            data-ocid="provider_listings.price_unit_label"
          >
            Price unit
          </Label>
          <Select
            value={form.priceUnit}
            onValueChange={(v) =>
              onFormChange({ ...form, priceUnit: v as PriceUnit })
            }
          >
            <SelectTrigger
              id="listing-price-unit"
              className="w-full"
              data-ocid="provider_listings.price_unit_select"
            >
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  per {PRICE_UNIT_LABELS[unit]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Price + service area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="listing-price"
            data-ocid="provider_listings.price_label"
          >
            Price (USD) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="listing-price"
            type="number"
            min="0"
            step="0.01"
            value={form.priceDollars}
            onChange={(e) =>
              onFormChange({ ...form, priceDollars: e.target.value })
            }
            placeholder="e.g. 120"
            required
            data-ocid="provider_listings.price_input"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="listing-area"
            data-ocid="provider_listings.area_label"
          >
            Service area <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.serviceArea}
            onValueChange={(v) => onFormChange({ ...form, serviceArea: v })}
          >
            <SelectTrigger
              id="listing-area"
              className="w-full"
              data-ocid="provider_listings.area_select"
            >
              <SelectValue placeholder="Select area" />
            </SelectTrigger>
            <SelectContent>
              {DFW_AREAS.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="listing-description"
          data-ocid="provider_listings.description_label"
        >
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="listing-description"
          value={form.description}
          onChange={(e) =>
            onFormChange({ ...form, description: e.target.value })
          }
          placeholder="Describe the service, what's included, and why customers should choose you."
          rows={5}
          required
          data-ocid="provider_listings.description_input"
        />
      </div>

      {/* Photos */}
      <div className="flex flex-col gap-2">
        <Label data-ocid="provider_listings.photos_label">Photos</Label>
        <div className="flex items-center gap-2">
          <Input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Paste an image URL"
            data-ocid="provider_listings.photo_url_input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPhotoUrl();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addPhotoUrl}
            data-ocid="provider_listings.add_photo_button"
          >
            Add
          </Button>
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={onPhotoChange}
          className="max-w-xs"
          data-ocid="provider_listings.photo_file_input"
        />
        {form.photos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
            {form.photos.map((url, i) => (
              <div
                key={url}
                className="relative aspect-square rounded-lg overflow-hidden border border-border"
                data-ocid={`provider_listings.photo.${i + 1}`}
              >
                <img
                  src={url}
                  alt={`Listing ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 text-destructive flex items-center justify-center hover:bg-background"
                  aria-label={`Remove photo ${i + 1}`}
                  data-ocid={`provider_listings.remove_photo.${i + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label
            htmlFor="listing-active"
            className="font-body font-medium"
            data-ocid="provider_listings.active_label"
          >
            Active
          </Label>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            Inactive listings are hidden from search results.
          </p>
        </div>
        <Switch
          id="listing-active"
          checked={form.active}
          onCheckedChange={(checked) =>
            onFormChange({ ...form, active: checked })
          }
          data-ocid="provider_listings.active_switch"
        />
      </div>

      {/* AI tools section */}
      <div
        className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-4"
        data-ocid="provider_listings.ai_section"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden />
          <h3 className="font-display text-sm font-semibold text-foreground">
            AI content tools
          </h3>
        </div>

        {/* Description generator */}
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="ai-bullets"
            data-ocid="provider_listings.ai_bullets_label"
          >
            Generate description from bullet points
          </Label>
          <Textarea
            id="ai-bullets"
            value={aiBulletPoints}
            onChange={(e) => setAiBulletPoints(e.target.value)}
            placeholder="One bullet per line: what's included, equipment, crew size, etc."
            rows={3}
            data-ocid="provider_listings.ai_bullets_input"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleGenerateDescription}
              disabled={generateDescription.isPending}
              data-ocid="provider_listings.ai_generate_description"
            >
              {generateDescription.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="w-4 h-4" aria-hidden />
              )}
              Generate
            </Button>
            {generatedDescription ? (
              <Button
                type="button"
                size="sm"
                onClick={applyDescription}
                data-ocid="provider_listings.ai_apply_description"
              >
                <Check className="w-4 h-4" aria-hidden />
                Apply to form
              </Button>
            ) : null}
          </div>
          {generatedDescription ? (
            <div className="rounded-lg border border-border bg-card p-3 mt-1">
              <p className="text-sm font-body text-foreground whitespace-pre-wrap">
                {generatedDescription}
              </p>
            </div>
          ) : null}
        </div>

        {/* Title/tagline generator */}
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="ai-keywords"
            data-ocid="provider_listings.ai_keywords_label"
          >
            Generate title ideas from keywords
          </Label>
          <Input
            id="ai-keywords"
            value={aiKeywords}
            onChange={(e) => setAiKeywords(e.target.value)}
            placeholder="e.g. box truck, same-day, Dallas, apartment move"
            data-ocid="provider_listings.ai_keywords_input"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGenerateTitleTagline}
            disabled={generateTitleTagline.isPending}
            data-ocid="provider_listings.ai_generate_titles"
          >
            {generateTitleTagline.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="w-4 h-4" aria-hidden />
            )}
            Generate
          </Button>
          {generatedTitleTagline.length > 0 ? (
            <div className="flex flex-col gap-2 mt-1">
              {generatedTitleTagline.map((title, i) => (
                <div
                  key={title}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5"
                  data-ocid={`provider_listings.ai_title.${i + 1}`}
                >
                  <p className="text-sm font-body text-foreground truncate min-w-0">
                    {title}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => applyTitle(title)}
                    data-ocid={`provider_listings.ai_apply_title.${i + 1}`}
                  >
                    Use
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Promotional content generator */}
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="ai-offer"
            data-ocid="provider_listings.ai_offer_label"
          >
            Generate promotional content from offer details
          </Label>
          <Textarea
            id="ai-offer"
            value={aiOfferDetails}
            onChange={(e) => setAiOfferDetails(e.target.value)}
            placeholder="e.g. 15% off first booking, free in-home estimate, weekend availability"
            rows={2}
            data-ocid="provider_listings.ai_offer_input"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleGeneratePromo}
              disabled={generatePromo.isPending}
              data-ocid="provider_listings.ai_generate_promo"
            >
              {generatePromo.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="w-4 h-4" aria-hidden />
              )}
              Generate
            </Button>
            {generatedPromo ? (
              <Button
                type="button"
                size="sm"
                onClick={applyPromo}
                data-ocid="provider_listings.ai_apply_promo"
              >
                <Check className="w-4 h-4" aria-hidden />
                Append to description
              </Button>
            ) : null}
          </div>
          {generatedPromo ? (
            <div className="rounded-lg border border-border bg-card p-3 mt-1">
              <p className="text-sm font-body text-foreground whitespace-pre-wrap">
                {generatedPromo}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-ocid="provider_listings.submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              {editingId ? "Saving…" : "Creating…"}
            </>
          ) : editingId ? (
            "Save listing"
          ) : (
            "Create listing"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
