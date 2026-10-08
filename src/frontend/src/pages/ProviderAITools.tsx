// ProviderAITools — standalone AI content generation page for providers.
// Three generator cards: listing description (bullet points Textarea),
// title/tagline (keywords Input), promotional content (offer details Textarea).
// Each card generates content, displays it, and offers copy-to-clipboard and
// apply-to-listing actions.

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
  useGenerateListingDescription,
  useGeneratePromotionalContent,
  useGenerateTitleAndTagline,
  useGetMyProvider,
  useListListingsByProvider,
  useUpdateListing,
} from "@/hooks/useQueries";
import type { ServiceListing, ServiceListingInput } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Sparkles,
  Tag,
  Truck,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("Clipboard not available"));
}

interface GeneratorCardProps {
  icon: typeof Sparkles;
  title: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputType?: "text" | "textarea";
  isPending: boolean;
  value: string;
  onValueChange: (v: string) => void;
  onGenerate: () => void;
  generated: string | string[];
  onCopy: (text: string) => void;
  applyActions?: React.ReactNode;
  generateOcid: string;
  inputOcid: string;
  outputOcid: string;
  index: number;
}

function GeneratorCard({
  icon: Icon,
  title,
  description,
  inputLabel,
  inputPlaceholder,
  inputType = "textarea",
  isPending,
  value,
  onValueChange,
  onGenerate,
  generated,
  onCopy,
  applyActions,
  generateOcid,
  inputOcid,
  outputOcid,
  index,
}: GeneratorCardProps) {
  const hasOutput = Array.isArray(generated)
    ? generated.length > 0
    : !!generated;

  return (
    <Card
      className="py-0 flex flex-col h-full"
      data-ocid={`provider_ai_tools.card.${index + 1}`}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div>
            <CardTitle className="font-display text-base">{title}</CardTitle>
            <CardDescription className="font-body">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="flex flex-col gap-2">
          <Label data-ocid={`${outputOcid}.label`}>{inputLabel}</Label>
          {inputType === "textarea" ? (
            <Textarea
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={inputPlaceholder}
              rows={4}
              data-ocid={inputOcid}
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={inputPlaceholder}
              data-ocid={inputOcid}
            />
          )}
        </div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isPending || !value.trim()}
          data-ocid={generateOcid}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Generating…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" aria-hidden />
              Generate
            </>
          )}
        </Button>

        {hasOutput ? (
          <div
            className="flex flex-col gap-2 mt-1 flex-1"
            data-ocid={outputOcid}
          >
            {Array.isArray(generated) ? (
              generated.map((item, i) => (
                <div
                  key={item}
                  className="rounded-lg border border-border bg-secondary/40 p-3"
                  data-ocid={`${outputOcid}.${i + 1}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-body text-foreground flex-1 min-w-0">
                      {item}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onCopy(item)}
                        aria-label="Copy to clipboard"
                        data-ocid={`${outputOcid}.copy.${i + 1}`}
                      >
                        <Copy className="w-3.5 h-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-border bg-secondary/40 p-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-body text-foreground whitespace-pre-wrap flex-1 min-w-0">
                    {generated}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onCopy(generated)}
                    aria-label="Copy to clipboard"
                    data-ocid={`${outputOcid}.copy`}
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            )}
            {applyActions}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ProviderAITools() {
  const { isAuthenticated, isInitializing } = useAuth();
  const { data: provider, isLoading: providerLoading } = useGetMyProvider();
  const providerId = provider?.id ?? null;
  const { data: listings } = useListListingsByProvider(providerId);
  const updateListing = useUpdateListing();

  const generateDescription = useGenerateListingDescription();
  const generateTitleTagline = useGenerateTitleAndTagline();
  const generatePromo = useGeneratePromotionalContent();

  const [bulletPoints, setBulletPoints] = useState("");
  const [keywords, setKeywords] = useState("");
  const [offerDetails, setOfferDetails] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [generatedPromo, setGeneratedPromo] = useState("");
  const [applyListingId, setApplyListingId] = useState<string>("");

  const myListing = useMemo(
    () => (listings ?? []).find((l) => l.id === applyListingId) ?? null,
    [listings, applyListingId],
  );

  const handleCopy = (text: string) => {
    copyToClipboard(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Could not copy to clipboard"));
  };

  const handleGenerateDescription = () => {
    const bullets = bulletPoints.trim();
    if (!bullets) {
      toast.error("Add a few bullet points first");
      return;
    }
    generateDescription.mutate(bullets, {
      onSuccess: (desc) => {
        setGeneratedDescription(desc);
        toast.success("Description generated");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate description",
        ),
    });
  };

  const handleGenerateTitles = () => {
    const kw = keywords.trim();
    if (!kw) {
      toast.error("Add a few keywords first");
      return;
    }
    generateTitleTagline.mutate(kw, {
      onSuccess: (results) => {
        setGeneratedTitles(results);
        toast.success("Title ideas generated");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate titles",
        ),
    });
  };

  const handleGeneratePromo = () => {
    const details = offerDetails.trim();
    if (!details) {
      toast.error("Add offer details first");
      return;
    }
    generatePromo.mutate(details, {
      onSuccess: (promo) => {
        setGeneratedPromo(promo);
        toast.success("Promotional content generated");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not generate promo",
        ),
    });
  };

  const applyDescriptionToListing = () => {
    if (!myListing || !generatedDescription) return;
    const input: ServiceListingInput = {
      category: myListing.category,
      title: myListing.title,
      description: generatedDescription,
      priceCents: myListing.priceCents,
      priceUnit: myListing.priceUnit,
      photos: myListing.photos,
      serviceArea: myListing.serviceArea,
      active: myListing.active,
    };
    updateListing.mutate(
      { listingId: myListing.id, input },
      {
        onSuccess: () =>
          toast.success(`Description applied to "${myListing.title}"`),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not apply description",
          ),
      },
    );
  };

  const applyTitleToListing = (title: string) => {
    if (!myListing) return;
    const input: ServiceListingInput = {
      category: myListing.category,
      title,
      description: myListing.description,
      priceCents: myListing.priceCents,
      priceUnit: myListing.priceUnit,
      photos: myListing.photos,
      serviceArea: myListing.serviceArea,
      active: myListing.active,
    };
    updateListing.mutate(
      { listingId: myListing.id, input },
      {
        onSuccess: () => toast.success("Title applied to listing"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not apply title",
          ),
      },
    );
  };

  const applyPromoToListing = () => {
    if (!myListing || !generatedPromo) return;
    const combined = myListing.description
      ? `${myListing.description}\n\n${generatedPromo}`
      : generatedPromo;
    const input: ServiceListingInput = {
      category: myListing.category,
      title: myListing.title,
      description: combined,
      priceCents: myListing.priceCents,
      priceUnit: myListing.priceUnit,
      photos: myListing.photos,
      serviceArea: myListing.serviceArea,
      active: myListing.active,
    };
    updateListing.mutate(
      { listingId: myListing.id, input },
      {
        onSuccess: () =>
          toast.success(`Promo appended to "${myListing.title}"`),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not apply promo",
          ),
      },
    );
  };

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
          description="You need to sign in to generate listing copy and promotions."
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
          description="Register your business to start using AI tools for your listings."
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
  const applySelector = (extraOcid: string) =>
    myListings.length > 0 ? (
      <div className="flex flex-col gap-2" data-ocid={extraOcid}>
        <Label
          className="text-xs font-body text-muted-foreground"
          data-ocid={`${extraOcid}.label`}
        >
          Apply to listing
        </Label>
        <div className="flex items-center gap-2">
          <Select
            value={applyListingId}
            onValueChange={(v) => setApplyListingId(v)}
          >
            <SelectTrigger className="flex-1" data-ocid={`${extraOcid}.select`}>
              <SelectValue placeholder="Select a listing" />
            </SelectTrigger>
            <SelectContent>
              {myListings.map((listing: ServiceListing) => (
                <SelectItem key={listing.id} value={listing.id}>
                  {listing.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    ) : (
      <p
        className="text-xs font-body text-muted-foreground"
        data-ocid={`${extraOcid}.no_listings`}
      >
        Create a listing first to apply generated content.
      </p>
    );

  return (
    <div
      className="bg-background min-h-screen"
      data-ocid="page.provider_ai_tools"
    >
      <section
        className="bg-card border-b border-border"
        data-ocid="provider_ai_tools.header"
      >
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="w-6 h-6 text-primary" aria-hidden />
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
              AI content tools
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Generate compelling listing descriptions, title ideas, and
            promotional content. Copy results or apply them directly to your
            listings.
          </p>
        </div>
      </section>

      <section
        className="container mx-auto px-4 lg:px-6 py-8"
        data-ocid="provider_ai_tools.cards"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GeneratorCard
            index={0}
            icon={Sparkles}
            title="Listing description"
            description="Turn bullet points into polished service copy."
            inputLabel="Bullet points"
            inputPlaceholder={
              "One bullet per line:\n• 26-foot box truck\n• Two-person crew\n• Same-day availability"
            }
            inputType="textarea"
            isPending={generateDescription.isPending}
            value={bulletPoints}
            onValueChange={setBulletPoints}
            onGenerate={handleGenerateDescription}
            generated={generatedDescription}
            onCopy={handleCopy}
            generateOcid="provider_ai_tools.generate_description"
            inputOcid="provider_ai_tools.bullets_input"
            outputOcid="provider_ai_tools.description_output"
            applyActions={
              generatedDescription ? (
                <div className="flex flex-col gap-2 mt-2">
                  {applySelector("provider_ai_tools.description_apply")}
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyDescriptionToListing}
                    disabled={!myListing || updateListing.isPending}
                    data-ocid="provider_ai_tools.apply_description"
                  >
                    <Check className="w-4 h-4" aria-hidden />
                    {updateListing.isPending ? "Applying…" : "Apply to listing"}
                  </Button>
                </div>
              ) : null
            }
          />

          <GeneratorCard
            index={1}
            icon={Tag}
            title="Title & tagline ideas"
            description="Generate catchy titles from your keywords."
            inputLabel="Keywords"
            inputPlaceholder="e.g. box truck, same-day, Dallas, apartment move"
            inputType="text"
            isPending={generateTitleTagline.isPending}
            value={keywords}
            onValueChange={setKeywords}
            onGenerate={handleGenerateTitles}
            generated={generatedTitles}
            onCopy={handleCopy}
            generateOcid="provider_ai_tools.generate_titles"
            inputOcid="provider_ai_tools.keywords_input"
            outputOcid="provider_ai_tools.titles_output"
            applyActions={
              generatedTitles.length > 0 ? (
                <div className="flex flex-col gap-2 mt-2">
                  {applySelector("provider_ai_tools.titles_apply")}
                  {myListing ? (
                    <div className="flex flex-col gap-1.5">
                      {generatedTitles.slice(0, 3).map((title, i) => (
                        <Button
                          key={title}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => applyTitleToListing(title)}
                          disabled={updateListing.isPending}
                          data-ocid={`provider_ai_tools.apply_title.${i + 1}`}
                        >
                          <Check className="w-4 h-4" aria-hidden />
                          Use "
                          {title.length > 28 ? `${title.slice(0, 28)}…` : title}
                          "
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null
            }
          />

          <GeneratorCard
            index={2}
            icon={Sparkles}
            title="Promotional content"
            description="Generate promo copy from your offer details."
            inputLabel="Offer details"
            inputPlaceholder="e.g. 15% off first booking, free in-home estimate, weekend availability"
            inputType="textarea"
            isPending={generatePromo.isPending}
            value={offerDetails}
            onValueChange={setOfferDetails}
            onGenerate={handleGeneratePromo}
            generated={generatedPromo}
            onCopy={handleCopy}
            generateOcid="provider_ai_tools.generate_promo"
            inputOcid="provider_ai_tools.offer_input"
            outputOcid="provider_ai_tools.promo_output"
            applyActions={
              generatedPromo ? (
                <div className="flex flex-col gap-2 mt-2">
                  {applySelector("provider_ai_tools.promo_apply")}
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyPromoToListing}
                    disabled={!myListing || updateListing.isPending}
                    data-ocid="provider_ai_tools.apply_promo"
                  >
                    <Check className="w-4 h-4" aria-hidden />
                    {updateListing.isPending
                      ? "Applying…"
                      : "Append to listing"}
                  </Button>
                </div>
              ) : null
            }
          />
        </div>
      </section>
    </div>
  );
}
