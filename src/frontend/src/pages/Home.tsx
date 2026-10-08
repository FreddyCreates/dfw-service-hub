// Home — DFW marketplace landing page.
// Hero search, category grid, top providers, how-it-works.

import { CategoryCard } from "@/components/CategoryCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ServiceProviderCard } from "@/components/ServiceProviderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  useListListingsByCategory,
  useListProviders,
} from "@/hooks/useQueries";
import { CATEGORY_LABELS, type ServiceCategory } from "@/types";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";

const categories: ServiceCategory[] = [
  "boxTruck",
  "relocation",
  "trashHaul",
  "moving",
];

const howItWorksSteps = [
  {
    icon: Search,
    title: "Search & Compare",
    description:
      "Browse verified providers across DFW. Filter by category, service area, rating, and price.",
  },
  {
    icon: Truck,
    title: "Book Your Service",
    description:
      "Request a booking with your chosen provider. Message directly to confirm details and timing.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & Reviewed",
    description:
      "Every provider is admin-verified. Leave a review after your service to help the community.",
  },
];

export function Home() {
  const { isAuthenticated, isLoggingIn, openSignInModal } = useAuth();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [area, setArea] = useState("");

  const { data: providers, isLoading: isLoadingProviders } = useListProviders();

  const topProviders = (providers ?? [])
    .filter((p) => p.verificationStatus === "approved")
    .sort((a, b) => {
      const aRating =
        Number(a.ratingCount) > 0
          ? Number(a.ratingSum) / Number(a.ratingCount)
          : 0;
      const bRating =
        Number(b.ratingCount) > 0
          ? Number(b.ratingSum) / Number(b.ratingCount)
          : 0;
      return bRating - aRating;
    })
    .slice(0, 6);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: "/search",
      search: {
        keyword: keyword || undefined,
        serviceArea: area || undefined,
      },
    });
  };

  return (
    <div className="bg-background">
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-border"
        data-ocid="section.hero"
      >
        <div className="absolute inset-0">
          <img
            src="/assets/generated/hero-marketplace.dim_1600x900.jpg"
            alt="Professional moving crew loading a box truck on a sunny Dallas-Fort Worth street"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        </div>

        <div className="relative container mx-auto px-4 lg:px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-body font-medium text-primary mb-5">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              Dallas-Fort Worth Marketplace
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground leading-[1.1] tracking-tight mb-5">
              Haul anything,
              <br />
              <span className="text-primary">anywhere in DFW.</span>
            </h1>
            <p className="text-lg text-muted-foreground font-body leading-relaxed mb-8 max-w-xl">
              Connect with verified box truck, relocation, trash haul, and
              moving professionals. Compare prices, book online, and pay off-
              platform — all in one trusted marketplace.
            </p>

            {/* Search bar */}
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-3 max-w-xl"
              data-ocid="hero.search_form"
            >
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="text"
                  placeholder="What do you need hauled?"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-10 h-12 bg-card border-border"
                  aria-label="Search keyword"
                  data-ocid="hero.search_input"
                />
              </div>
              <div className="relative sm:w-44">
                <MapPin
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="text"
                  placeholder="DFW area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="pl-10 h-12 bg-card border-border"
                  aria-label="Service area"
                  data-ocid="hero.area_input"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 px-8"
                data-ocid="hero.search_button"
              >
                <Search className="w-4 h-4" aria-hidden />
                Search
              </Button>
            </form>

            {!isAuthenticated ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={openSignInModal}
                  disabled={isLoggingIn}
                  className="bg-card/80 backdrop-blur"
                  data-ocid="hero.signin_button"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      Connecting
                    </>
                  ) : (
                    "Sign in to book"
                  )}
                </Button>
                <Link
                  to="/how-it-works"
                  className="text-sm font-body text-muted-foreground hover:text-primary transition-smooth"
                >
                  How it works →
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section
        className="container mx-auto px-4 lg:px-6 py-16 lg:py-20"
        data-ocid="section.categories"
      >
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-2">
              Browse by service
            </h2>
            <p className="text-muted-foreground font-body">
              Four categories covering every hauling need across DFW.
            </p>
          </div>
          <Link
            to="/search"
            className="hidden sm:flex items-center gap-1 text-sm font-body font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <CategoryCard key={cat} category={cat} index={i} />
          ))}
        </div>
      </section>

      {/* Top providers */}
      <section
        className="bg-secondary/30 border-y border-border"
        data-ocid="section.top_providers"
      >
        <div className="container mx-auto px-4 lg:px-6 py-16 lg:py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-2">
                Top-rated providers
              </h2>
              <p className="text-muted-foreground font-body">
                Verified professionals trusted by the DFW community.
              </p>
            </div>
            <Link
              to="/search"
              className="hidden sm:flex items-center gap-1 text-sm font-body font-medium text-primary hover:underline"
            >
              View all
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>

          {isLoadingProviders ? (
            <LoadingSpinner label="Loading providers" />
          ) : topProviders.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No providers yet"
              description="Be the first to join the DFW Haul marketplace as a service provider."
              action={
                <Link to="/provider/register">
                  <Button data-ocid="top_providers.register_button">
                    Become a provider
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topProviders.map((provider, i) => (
                <ServiceProviderCard
                  key={provider.id}
                  provider={provider}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section
        className="container mx-auto px-4 lg:px-6 py-16 lg:py-20"
        data-ocid="section.how_it_works"
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground mb-3">
            How DFW Haul works
          </h2>
          <p className="text-muted-foreground font-body">
            From search to service in three simple steps.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {howItWorksSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border"
                data-ocid={`how_it_works.step.${i + 1}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-primary" aria-hidden />
                </div>
                <span className="absolute top-4 right-5 font-display text-3xl font-bold text-border">
                  {i + 1}
                </span>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section
        className="bg-primary text-primary-foreground"
        data-ocid="section.cta"
      >
        <div className="container mx-auto px-4 lg:px-6 py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-center lg:text-left">
              <h2 className="font-display text-2xl lg:text-3xl font-semibold mb-3">
                Ready to grow your hauling business?
              </h2>
              <p className="text-primary-foreground/80 font-body leading-relaxed">
                Join DFW Haul as a provider. List your services, reach customers
                across Dallas-Fort Worth, and manage bookings in one place.
              </p>
            </div>
            <Link to="/provider/register">
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shrink-0"
                data-ocid="cta.register_button"
              >
                Become a provider
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
