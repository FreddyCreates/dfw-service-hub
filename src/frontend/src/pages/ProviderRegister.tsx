// ProviderRegister — onboarding form for new DFW marketplace providers.
// Collects company info, service categories, service areas, and logo, then
// submits via useRegisterProvider. Shows verification status after submit.

import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGenerateCompanyDescription,
  useGetMyProvider,
  useRegisterProvider,
  useUpdateMyProvider,
} from "@/hooks/useQueries";
import {
  CATEGORY_LABELS,
  type ProviderInput,
  type ServiceCategory,
  VERIFICATION_LABELS,
  type VerificationStatus,
} from "@/types";
import { ExternalBlob } from "@caffeineai/object-storage";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BadgeCheck,
  Clock,
  Loader2,
  Wand2,
  XCircle,
} from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const ALL_CATEGORIES: ServiceCategory[] = [
  "boxTruck",
  "relocation",
  "trashHaul",
  "moving",
];

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

const STATUS_META: Record<
  VerificationStatus,
  { icon: typeof BadgeCheck; tone: string }
> = {
  pending: { icon: Clock, tone: "text-warning-foreground" },
  approved: { icon: BadgeCheck, tone: "text-success-foreground" },
  rejected: { icon: XCircle, tone: "text-destructive" },
  suspended: { icon: AlertCircle, tone: "text-destructive" },
};

export function ProviderRegister() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: existingProvider, isLoading: providerLoading } =
    useGetMyProvider();
  const registerMutation = useRegisterProvider();
  const updateMutation = useUpdateMyProvider();

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  // `logo` holds the value passed to ProviderInput.logo — either a persistent
  // URL string (existing logo) or an ExternalBlob produced by
  // ExternalBlob.fromBytes() for a freshly uploaded file.
  const [logo, setLogo] = useState<string | ExternalBlob>("");
  // `previewUrl` is a transient object URL used only for the <img> preview.
  const [previewUrl, setPreviewUrl] = useState("");
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [customArea, setCustomArea] = useState("");

  // If a provider already exists, prefill the form for editing.
  useEffect(() => {
    if (existingProvider) {
      setCompanyName(existingProvider.companyName);
      setDescription(existingProvider.description);
      setLogo(existingProvider.logo ?? "");
      setPreviewUrl(existingProvider.logo ?? "");
      setCategories(existingProvider.serviceCategories);
      setAreas(existingProvider.serviceAreas);
    }
  }, [existingProvider]);

  if (isInitializing || providerLoading) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16 max-w-3xl"
        data-ocid="page.provider_register"
      >
        <SkeletonCard withMedia={false} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12"
        data-ocid="page.provider_register"
      >
        <EmptyState
          icon={AlertCircle}
          title="Sign in to become a provider"
          description="You need to sign in with Internet Identity before registering as a service provider on the DFW marketplace."
          data-ocid="provider_register.signin_required"
        />
      </div>
    );
  }

  // Show verification status banner if already registered.
  if (existingProvider) {
    const status = existingProvider.verificationStatus;
    const StatusIcon = STATUS_META[status].icon;
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-12 max-w-3xl"
        data-ocid="page.provider_register"
      >
        <Card className="py-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <StatusIcon
                  className={`w-5 h-5 ${STATUS_META[status].tone}`}
                  aria-hidden
                />
              </div>
              <div>
                <CardTitle className="font-display">
                  {existingProvider.companyName}
                </CardTitle>
                <CardDescription className="font-body">
                  Verification status:{" "}
                  <span className={`font-medium ${STATUS_META[status].tone}`}>
                    {VERIFICATION_LABELS[status]}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {existingProvider.verificationNote ? (
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-xs font-body font-semibold text-muted-foreground mb-1">
                  Admin note
                </p>
                <p className="text-sm font-body text-foreground">
                  {existingProvider.verificationNote}
                </p>
              </div>
            ) : null}
            <p className="text-sm font-body text-muted-foreground">
              {status === "pending"
                ? "Your application is under review. You'll be able to create listings once approved."
                : status === "approved"
                  ? "You're verified. You can create listings and receive bookings."
                  : status === "rejected"
                    ? "Your application was rejected. Review the admin note and update your details."
                    : "Your provider account is suspended. Contact support for assistance."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/provider/dashboard">
                <Button data-ocid="provider_register.dashboard">
                  Go to dashboard
                </Button>
              </Link>
              {status === "approved" ? (
                <Link to="/provider/listings">
                  <Button
                    variant="outline"
                    data-ocid="provider_register.listings"
                  >
                    Manage listings
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Edit form below status banner */}
        <div className="mt-8">
          <ProviderForm
            companyName={companyName}
            description={description}
            previewUrl={previewUrl}
            categories={categories}
            areas={areas}
            customArea={customArea}
            isSubmitting={
              registerMutation.isPending || updateMutation.isPending
            }
            onCompanyName={setCompanyName}
            onDescription={setDescription}
            onLogo={setLogo}
            onPreviewUrl={setPreviewUrl}
            onCategories={setCategories}
            onAreas={setAreas}
            onCustomArea={setCustomArea}
            onSubmit={() => handleSubmit(updateMutation.mutateAsync)}
            submitLabel="Update provider profile"
          />
        </div>
      </div>
    );
  }

  async function handleSubmit(
    mutate: (input: ProviderInput) => Promise<unknown>,
  ) {
    if (!companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (categories.length === 0) {
      toast.error("Select at least one service category");
      return;
    }
    if (areas.length === 0) {
      toast.error("Add at least one service area");
      return;
    }
    try {
      await mutate({
        companyName: companyName.trim(),
        description: description.trim() || undefined,
        logo: logo || undefined,
        serviceCategories: categories,
        serviceAreas: areas,
      });
      toast.success("Provider profile submitted for verification");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to register provider",
      );
    }
  }

  return (
    <div
      className="container mx-auto px-4 lg:px-6 py-12 max-w-3xl"
      data-ocid="page.provider_register"
    >
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Become a provider
        </h1>
        <p className="mt-2 text-muted-foreground font-body">
          Join the DFW marketplace and offer box truck, relocation, trash haul,
          and moving services across the Dallas-Fort Worth metroplex.
        </p>
      </header>

      <ProviderForm
        companyName={companyName}
        description={description}
        previewUrl={previewUrl}
        categories={categories}
        areas={areas}
        customArea={customArea}
        isSubmitting={registerMutation.isPending || updateMutation.isPending}
        onCompanyName={setCompanyName}
        onDescription={setDescription}
        onLogo={setLogo}
        onPreviewUrl={setPreviewUrl}
        onCategories={setCategories}
        onAreas={setAreas}
        onCustomArea={setCustomArea}
        onSubmit={() => handleSubmit(registerMutation.mutateAsync)}
        submitLabel="Submit for verification"
      />
    </div>
  );
}

interface ProviderFormProps {
  companyName: string;
  description: string;
  previewUrl: string;
  categories: ServiceCategory[];
  areas: string[];
  customArea: string;
  isSubmitting: boolean;
  onCompanyName: (v: string) => void;
  onDescription: (v: string) => void;
  onLogo: (v: string | ExternalBlob) => void;
  onPreviewUrl: (v: string) => void;
  onCategories: (v: ServiceCategory[]) => void;
  onAreas: (v: string[]) => void;
  onCustomArea: (v: string) => void;
  onSubmit: () => void;
  submitLabel: string;
}

function ProviderForm({
  companyName,
  description,
  previewUrl,
  categories,
  areas,
  customArea,
  isSubmitting,
  onCompanyName,
  onDescription,
  onLogo,
  onPreviewUrl,
  onCategories,
  onAreas,
  onCustomArea,
  onSubmit,
  submitLabel,
}: ProviderFormProps) {
  const generateDescription = useGenerateCompanyDescription();

  const handleGenerateDescription = async () => {
    // Build a concise context string from the form's current selections so
    // the backend can draft a relevant company description.
    const categoryNames = categories
      .map((c) => CATEGORY_LABELS[c])
      .filter(Boolean)
      .join(", ");
    const areaNames = areas.join(", ");
    const parts: string[] = [];
    if (companyName.trim()) parts.push(`Company name: ${companyName.trim()}`);
    if (categoryNames) parts.push(`Services: ${categoryNames}`);
    if (areaNames) parts.push(`Service areas: ${areaNames}`);
    if (parts.length === 0) {
      toast.error("Add a company name, services, or areas before generating.");
      return;
    }
    try {
      const generated = await generateDescription.mutateAsync({
        companyInfo: parts.join("\n"),
      });
      if (generated) {
        onDescription(generated);
        toast.success(
          "Company description drafted — review and edit as needed.",
        );
      } else {
        toast.error("AI returned an empty description. Try again.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to generate company description",
      );
    }
  };

  const toggleCategory = (cat: ServiceCategory) => {
    onCategories(
      categories.includes(cat)
        ? categories.filter((c) => c !== cat)
        : [...categories, cat],
    );
  };

  const toggleArea = (area: string) => {
    onAreas(
      areas.includes(area) ? areas.filter((a) => a !== area) : [...areas, area],
    );
  };

  const addCustomArea = () => {
    const trimmed = customArea.trim();
    if (trimmed && !areas.includes(trimmed)) {
      onAreas([...areas, trimmed]);
      onCustomArea("");
    }
  };

  const onLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Read the file as an ArrayBuffer, then create a persistent ExternalBlob
    // that the backend adapter uploads to object storage on submit. A separate
    // object URL is kept for the <img> preview only.
    const buf = await file.arrayBuffer();
    const blob = ExternalBlob.fromBytes(
      new Uint8Array(buf),
      file.type,
      file.name,
    );
    onLogo(blob);
    onPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <Card className="py-0 animate-fade-in-up">
      <CardContent className="flex flex-col gap-6 p-6">
        {/* Company name */}
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="company-name"
            data-ocid="provider_register.company_name_label"
          >
            Company name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(e) => onCompanyName(e.target.value)}
            placeholder="e.g. Metro Movers DFW"
            data-ocid="provider_register.company_name_input"
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="description"
              data-ocid="provider_register.description_label"
            >
              Description
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleGenerateDescription}
              disabled={generateDescription.isPending}
              data-ocid="provider_register.ai_generate_description"
              className="text-accent-foreground border-accent/40 hover:bg-accent/10"
            >
              {generateDescription.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="w-4 h-4" aria-hidden />
              )}
              Generate with AI
            </Button>
          </div>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            placeholder="Tell customers about your services, experience, and what makes you reliable."
            rows={4}
            data-ocid="provider_register.description_input"
          />
          {generateDescription.isPending ? (
            <p
              className="text-xs font-body text-muted-foreground"
              data-ocid="provider_register.ai_generating_state"
            >
              Drafting a description from your company name, services, and
              areas…
            </p>
          ) : null}
        </div>

        {/* Logo */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="logo" data-ocid="provider_register.logo_label">
            Company logo
          </Label>
          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Company logo preview"
                className="w-16 h-16 rounded-lg object-cover border border-border"
              />
            ) : null}
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={onLogoChange}
              data-ocid="provider_register.logo_input"
              className="max-w-xs"
            />
          </div>
        </div>

        {/* Service categories */}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-body font-medium text-foreground mb-1">
            Service categories <span className="text-destructive">*</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_CATEGORIES.map((cat) => {
              const checked = categories.includes(cat);
              return (
                <label
                  key={cat}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/50 transition-smooth"
                  data-ocid={`provider_register.category.${cat}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat)}
                    className="sr-only"
                    data-ocid={`provider_register.category_checkbox.${cat}`}
                  />
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleCategory(cat)}
                    aria-hidden
                    tabIndex={-1}
                  />
                  <span className="text-sm font-body text-foreground">
                    {CATEGORY_LABELS[cat]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Service areas */}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-body font-medium text-foreground mb-1">
            Service areas <span className="text-destructive">*</span>
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DFW_AREAS.map((area) => {
              const checked = areas.includes(area);
              return (
                <label
                  key={area}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-secondary/50 transition-smooth"
                  data-ocid={`provider_register.area.${area}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArea(area)}
                    className="sr-only"
                    data-ocid={`provider_register.area_checkbox.${area}`}
                  />
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleArea(area)}
                    aria-hidden
                    tabIndex={-1}
                  />
                  <span className="text-sm font-body text-foreground">
                    {area}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={customArea}
              onChange={(e) => onCustomArea(e.target.value)}
              placeholder="Add another DFW city"
              data-ocid="provider_register.custom_area_input"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomArea();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCustomArea}
              data-ocid="provider_register.add_area_button"
            >
              Add
            </Button>
          </div>
          {areas.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {areas
                .filter((a) => !DFW_AREAS.includes(a))
                .map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-body font-medium"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => onAreas(areas.filter((a) => a !== area))}
                      className="text-primary/70 hover:text-primary"
                      aria-label={`Remove ${area}`}
                      data-ocid={`provider_register.remove_area.${area}`}
                    >
                      <XCircle className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
            </div>
          ) : null}
        </fieldset>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          data-ocid="provider_register.submit_button"
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Submitting
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
