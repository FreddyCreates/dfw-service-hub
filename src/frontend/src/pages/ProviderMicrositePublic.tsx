// ProviderMicrositePublic — public-facing provider microsite at /p/$slug.
// Renders sections in the order defined by microsite.blockOrder. Each section
// fades in on mount via .animate-fade-in-up. Uses light customer theme tokens.

import { EmptyState } from "@/components/EmptyState";
import { ReviewCard } from "@/components/ReviewCard";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { StarRating } from "@/components/StarRating";
import { TrustBadge } from "@/components/TrustBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGenerateReviewSummary,
  useGetMicrositeBySlug,
  useGetProvider,
  useGetTrustScore,
  useGetUser,
  useGetVerification,
  useListListingsByProvider,
  useListReviewsByProvider,
} from "@/hooks/useQueries";
import {
  CATEGORY_SHORT,
  type Microsite,
  PRICE_UNIT_LABELS,
  type PriceUnit,
  type ReviewSummary,
  type ServiceListing,
} from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  ImageIcon,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// Section keys that may appear in microsite.blockOrder.
type SectionKey =
  | "hero"
  | "services"
  | "gallery"
  | "reviews"
  | "about"
  | "contact";

const SECTION_LABELS: Record<SectionKey, string> = {
  hero: "Welcome",
  services: "Services",
  gallery: "Work Gallery",
  reviews: "Reviews",
  about: "About",
  contact: "Book a Service",
};

function formatPrice(cents: bigint): string {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function averageRating(ratingSum: bigint, ratingCount: bigint): number {
  const count = Number(ratingCount);
  if (count === 0) return 0;
  return Number(ratingSum) / count;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Resolve an accent color to a CSS value. Falls back to the primary token when
// the microsite doesn't define one. Exposed as an inline CSS var so hero/CTA
// surfaces can reference it without a Tailwind class.
function resolveAccent(accentColor?: string): string {
  return accentColor?.trim() ? accentColor.trim() : "var(--primary)";
}

export function ProviderMicrositePublic() {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const navigate = useNavigate();

  const {
    data: microsite,
    isLoading: micrositeLoading,
    error: micrositeError,
  } = useGetMicrositeBySlug(slug ?? null);

  const providerId = microsite?.providerId ?? null;

  const { data: provider } = useGetProvider(providerId);
  const { data: trustScore } = useGetTrustScore(providerId);
  const { data: verification } = useGetVerification(providerId);
  const { data: listings, isLoading: listingsLoading } =
    useListListingsByProvider(providerId);
  const { data: reviews, isLoading: reviewsLoading } =
    useListReviewsByProvider(providerId);
  const { data: owner } = useGetUser(provider?.ownerPrincipal ?? null);

  const generateSummary = useGenerateReviewSummary();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  // Reset cached AI summary when the provider changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: providerId is intentionally the only trigger — summary must reset whenever the provider changes, regardless of other state.
  useEffect(() => {
    setSummary(null);
  }, [providerId]);

  // Auto-generate the AI review summary once reviews are loaded.
  useEffect(() => {
    if (!providerId || summary || generateSummary.isPending) return;
    if ((reviews ?? []).length === 0) return;
    generateSummary.mutate(providerId, {
      onSuccess: setSummary,
      onError: () => {
        /* Summary is optional enrichment; surface nothing on failure. */
      },
    });
  }, [providerId, reviews, summary, generateSummary]);

  const sortedListings = useMemo(() => {
    const list = [...(listings ?? [])].filter((l) => l.active);
    list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return list;
  }, [listings]);

  const sortedReviews = useMemo(() => {
    const list = [...(reviews ?? [])].filter((r) => !r.hidden);
    list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
    return list;
  }, [reviews]);

  const workPhotos = useMemo(() => owner?.workPhotos ?? [], [owner]);

  if (micrositeLoading) {
    return (
      <div
        className="bg-background min-h-screen"
        data-ocid="page.microsite_public"
      >
        <div className="container mx-auto px-4 lg:px-6 py-10 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <SkeletonText lines={2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (micrositeError || !microsite || !microsite.published) {
    return (
      <div
        className="container mx-auto px-4 lg:px-6 py-16"
        data-ocid="page.microsite_public"
      >
        <EmptyState
          icon={ImageIcon}
          title="Microsite not available"
          description="This provider's website is not published or could not be found. Browse other providers on the marketplace."
          action={
            <Button
              onClick={() => navigate({ to: "/search" })}
              data-ocid="microsite_public.browse_button"
            >
              Browse providers
            </Button>
          }
        />
      </div>
    );
  }

  const accent = resolveAccent(microsite.accentColor);
  const accentVar = { "--microsite-accent": accent } as React.CSSProperties;

  const rating = provider
    ? averageRating(provider.ratingSum, provider.ratingCount)
    : 0;
  const reviewCount = provider ? Number(provider.ratingCount) : 0;

  // Determine section order; fall back to a sensible default if blockOrder is
  // empty or missing.
  const blockOrder = (microsite.blockOrder ?? []).filter((b) =>
    Object.prototype.hasOwnProperty.call(SECTION_LABELS, b),
  );
  const orderedSections: SectionKey[] =
    blockOrder.length > 0
      ? (blockOrder as SectionKey[])
      : ([
          "hero",
          "services",
          "gallery",
          "reviews",
          "about",
          "contact",
        ] as SectionKey[]);

  const handleBook = () => {
    if (!provider) return;
    void navigate({
      to: "/providers/$providerId",
      params: { providerId: provider.id },
    });
  };

  const handleGenerateSummary = () => {
    if (!providerId) return;
    generateSummary.mutate(providerId, {
      onSuccess: (data) => {
        setSummary(data);
        toast.success("AI review summary generated.");
      },
      onError: () => toast.error("Could not generate the review summary."),
    });
  };

  return (
    <div
      className="bg-background min-h-screen"
      style={accentVar}
      data-ocid="page.microsite_public"
    >
      {orderedSections.map((key) => {
        switch (key) {
          case "hero":
            return (
              <HeroSection
                key={key}
                microsite={microsite}
                providerName={provider?.companyName ?? "Provider"}
                providerLogo={provider?.logo}
                rating={rating}
                reviewCount={reviewCount}
                accent={accent}
                onBook={handleBook}
              />
            );
          case "services":
            return (
              <ServicesSection
                key={key}
                microsite={microsite}
                listings={sortedListings}
                loading={listingsLoading}
                onBook={handleBook}
              />
            );
          case "gallery":
            return <GallerySection key={key} photos={workPhotos} />;
          case "reviews":
            return (
              <ReviewsSection
                key={key}
                reviews={sortedReviews}
                loading={reviewsLoading}
                rating={rating}
                reviewCount={reviewCount}
                summary={summary}
                summaryLoading={generateSummary.isPending}
                onRegenerate={handleGenerateSummary}
              />
            );
          case "about":
            return <AboutSection key={key} microsite={microsite} />;
          case "contact":
            return (
              <ContactSection
                key={key}
                providerId={provider?.id ?? null}
                onBook={handleBook}
              />
            );
          default:
            return null;
        }
      })}

      {/* Trust badge — surfaced prominently after the ordered sections. */}
      <section
        className="container mx-auto px-4 lg:px-6 pb-16 animate-fade-in-up"
        data-ocid="microsite_public.trust"
      >
        <TrustBadge
          trustScore={trustScore ?? null}
          verificationTiers={verification ?? null}
        />
      </section>
    </div>
  );
}

// ─── Sections ──────────────────────────────────────────────────────────────

interface HeroProps {
  microsite: Microsite;
  providerName: string;
  providerLogo?: string;
  rating: number;
  reviewCount: number;
  accent: string;
  onBook: () => void;
}

function HeroSection({
  microsite,
  providerName,
  providerLogo,
  rating,
  reviewCount,
  accent,
  onBook,
}: HeroProps) {
  return (
    <section
      className="relative overflow-hidden animate-fade-in-up"
      data-ocid="microsite_public.hero"
    >
      {/* Cover image with accent overlay */}
      {microsite.coverImage ? (
        <div className="absolute inset-0">
          <img
            src={microsite.coverImage}
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${accent}cc 0%, ${accent}99 100%)`,
            }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
          }}
        />
      )}

      <div className="relative container mx-auto px-4 lg:px-6 py-16 lg:py-24">
        <div className="max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl border-2 border-white/40 shrink-0 bg-card">
              {providerLogo ? (
                <AvatarImage src={providerLogo} alt={providerName} />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-card text-foreground font-display text-xl font-semibold">
                {initials(providerName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-body text-white/80 uppercase tracking-widest">
                DFW Service Hub
              </p>
              <h1 className="font-display text-3xl lg:text-5xl font-semibold text-white leading-tight">
                {providerName}
              </h1>
            </div>
          </div>

          {microsite.heroCopy ? (
            <p className="text-lg lg:text-xl font-body text-white/95 leading-relaxed max-w-2xl">
              {microsite.heroCopy}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            {reviewCount > 0 ? (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
                <StarRating value={rating} size="sm" />
                <span className="text-sm font-body font-medium text-white">
                  {rating.toFixed(1)} ({reviewCount})
                </span>
              </div>
            ) : null}
            <Button
              onClick={onBook}
              size="lg"
              className="bg-white text-foreground hover:bg-white/90"
              data-ocid="microsite_public.hero_book_button"
            >
              <CalendarDays className="w-4 h-4" aria-hidden />
              Book a service
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ServicesProps {
  microsite: Microsite;
  listings: ServiceListing[];
  loading: boolean;
  onBook: () => void;
}

function ServicesSection({
  microsite,
  listings,
  loading,
  onBook,
}: ServicesProps) {
  return (
    <section
      className="container mx-auto px-4 lg:px-6 py-14 animate-fade-in-up"
      data-ocid="microsite_public.services"
    >
      <div className="mb-8">
        <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
          {SECTION_LABELS.services}
        </h2>
        {microsite.servicesCopy ? (
          <p className="mt-2 text-base text-muted-foreground font-body max-w-2xl leading-relaxed">
            {microsite.servicesCopy}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No services listed yet"
          description="This provider hasn't published any active services. Reach out to discuss your needs."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing, i) => (
            <Card
              key={listing.id}
              className="py-0 flex flex-col animate-card-hover-lift"
              data-ocid={`microsite_public.service.${i + 1}`}
            >
              <CardContent className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-foreground leading-tight">
                    {listing.title}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="font-body text-xs shrink-0"
                  >
                    {CATEGORY_SHORT[listing.category]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-3">
                  {listing.description}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                  <MapPin className="w-3.5 h-3.5" aria-hidden />
                  {listing.serviceArea}
                </div>
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex flex-col">
                    <span className="font-display text-lg font-semibold text-foreground">
                      {formatPrice(listing.priceCents)}
                    </span>
                    <span className="text-xs text-muted-foreground font-body">
                      per{" "}
                      {PRICE_UNIT_LABELS[listing.priceUnit as PriceUnit] ??
                        listing.priceUnit}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={onBook}
                    data-ocid={`microsite_public.service_book.${i + 1}`}
                  >
                    Book
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function GallerySection({ photos }: { photos: string[] }) {
  return (
    <section
      className="bg-secondary/40 animate-fade-in-up"
      data-ocid="microsite_public.gallery"
    >
      <div className="container mx-auto px-4 lg:px-6 py-14">
        <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-8">
          {SECTION_LABELS.gallery}
        </h2>
        {photos.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No work photos yet"
            description="This provider hasn't added portfolio photos. Book a service to see their work firsthand."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: photo URLs may repeat across portfolio entries; index disambiguates duplicate src values.
                key={`${photo}-${i}`}
                className="aspect-square rounded-xl overflow-hidden border border-border bg-card shadow-subtle animate-card-hover-lift"
                data-ocid={`microsite_public.gallery.photo.${i + 1}`}
              >
                <img
                  src={photo}
                  alt={`Work sample ${i + 1} from this provider`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-smooth hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface ReviewsProps {
  reviews: ReturnType<typeof Array.prototype.slice> & { id: string }[];
  loading: boolean;
  rating: number;
  reviewCount: number;
  summary: ReviewSummary | null;
  summaryLoading: boolean;
  onRegenerate: () => void;
}

function ReviewsSection({
  reviews,
  loading,
  rating,
  reviewCount,
  summary,
  summaryLoading,
  onRegenerate,
}: ReviewsProps) {
  return (
    <section
      className="container mx-auto px-4 lg:px-6 py-14 animate-fade-in-up"
      data-ocid="microsite_public.reviews"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
            {SECTION_LABELS.reviews}
          </h2>
          {reviewCount > 0 ? (
            <div className="mt-2 flex items-center gap-2">
              <StarRating
                value={rating}
                size="md"
                showValue
                count={reviewCount}
              />
            </div>
          ) : null}
        </div>
        {reviews.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={summaryLoading}
            data-ocid="microsite_public.summary_button"
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            {summaryLoading ? "Summarizing…" : "AI summary"}
          </Button>
        ) : null}
      </div>

      {/* AI review summary — first-class enrichment surface */}
      {summary ? (
        <Card
          className="py-0 mb-8 border-primary/20 bg-primary/5"
          data-ocid="microsite_public.summary"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">
                  AI Review Summary
                </h3>
                <p className="text-xs text-muted-foreground font-body">
                  Sentiment: {summary.sentiment}
                </p>
              </div>
            </div>
            <p className="text-sm text-foreground font-body leading-relaxed">
              {summary.summary}
            </p>
            {summary.themes.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.themes.map((theme, i) => (
                  <Badge
                    // biome-ignore lint/suspicious/noArrayIndexKey: themes are display-only, order is stable from backend
                    key={i}
                    variant="secondary"
                    className="font-body text-xs"
                  >
                    {theme}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard withMedia={false} />
          <SkeletonCard withMedia={false} />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Be the first to book and review this provider."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reviews.map((review, i) => (
            <ReviewCard
              key={review.id}
              review={review}
              index={i}
              customerName="Customer"
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AboutSection({ microsite }: { microsite: Microsite }) {
  if (!microsite.aboutCopy) return null;
  return (
    <section
      className="bg-secondary/40 animate-fade-in-up"
      data-ocid="microsite_public.about"
    >
      <div className="container mx-auto px-4 lg:px-6 py-14 max-w-3xl">
        <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-6">
          {SECTION_LABELS.about}
        </h2>
        <div className="prose prose-sm max-w-none">
          <p className="text-base lg:text-lg text-foreground font-body leading-relaxed whitespace-pre-line">
            {microsite.aboutCopy}
          </p>
        </div>
      </div>
    </section>
  );
}

function ContactSection({
  providerId,
  onBook,
}: {
  providerId: string | null;
  onBook: () => void;
}) {
  return (
    <section
      className="container mx-auto px-4 lg:px-6 py-14 animate-fade-in-up"
      data-ocid="microsite_public.contact"
    >
      <Card className="py-0 overflow-hidden border-primary/20">
        <CardContent className="p-8 lg:p-10 text-center">
          <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
            {SECTION_LABELS.contact}
          </h2>
          <p className="mt-3 text-base text-muted-foreground font-body max-w-xl mx-auto leading-relaxed">
            Ready to get started? Book a service directly with this provider and
            choose a time that works for you.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={onBook}
              disabled={!providerId}
              data-ocid="microsite_public.contact_book_button"
            >
              <CalendarDays className="w-4 h-4" aria-hidden />
              Book a service
            </Button>
            {providerId ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => onBook()}
                data-ocid="microsite_public.contact_profile_link"
              >
                View full profile
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
