// HowItWorks — standalone explainer page for the DFW marketplace.
// Covers both customer and provider flows with step-by-step guides, the
// embedded trust & governance protocols (4 verification tiers, trust scores,
// dispute flow, SLA indicators, community governance), and FAQs.

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardList,
  Clock,
  Gavel,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Truck,
  Users,
} from "lucide-react";

const customerSteps = [
  {
    icon: Search,
    title: "1. Search & compare",
    description:
      "Browse verified providers across Dallas-Fort Worth. Filter by service category — box truck, relocation, trash haul, or moving — plus service area, trust score, and price.",
  },
  {
    icon: CalendarCheck,
    title: "2. Request a booking",
    description:
      "Send a booking request to your chosen provider with your job details, address, and preferred date. SLA indicators show typical response and completion windows.",
  },
  {
    icon: MessageSquare,
    title: "3. Coordinate & message",
    description:
      "Chat with your provider through the platform to finalize details, ask questions, and share updates before and during the service.",
  },
  {
    icon: Star,
    title: "4. Review your service",
    description:
      "After the job is complete, leave a rating and review. Your feedback feeds the provider's trust score and helps the DFW community find trusted pros.",
  },
];

const providerSteps = [
  {
    icon: ClipboardList,
    title: "1. Register your business",
    description:
      "Sign up as a provider and submit your company name, service categories, and the DFW areas you serve. Our admin team reviews every application before listing.",
  },
  {
    icon: BadgeCheck,
    title: "2. Climb the verification ladder",
    description:
      "Earn verified status across four tiers — Identity, Business License, Insurance, and Background Check. Each tier you clear raises your trust score.",
  },
  {
    icon: Package,
    title: "3. Create listings",
    description:
      "Add service listings with pricing, photos, and descriptions for each category you offer. Set availability so customers can book the right time slot.",
  },
  {
    icon: LayoutDashboard,
    title: "4. Manage bookings",
    description:
      "Accept or decline incoming requests, message customers, update booking status, and respond to reviews — all from your provider dashboard.",
  },
];

// The four verification tiers that make up the credibility ladder. Each tier
// maps to a token in the trust palette so the visual examples on this page
// match the badges rendered on provider profiles.
const verificationTiers = [
  {
    name: "Identity",
    description: "Government ID confirmed against the provider principal.",
    token:
      "border-trust-checked/40 bg-trust-checked/10 text-trust-checked-foreground",
  },
  {
    name: "Business License",
    description: "Texas business registration verified with the state.",
    token:
      "border-trust-bound/40 bg-trust-bound/10 text-trust-bound-foreground",
  },
  {
    name: "Insurance",
    description: "Active liability and cargo insurance on file.",
    token:
      "border-trust-verified/40 bg-trust-verified/10 text-trust-verified-foreground",
  },
  {
    name: "Background Check",
    description: "Annual background screening cleared for every crew member.",
    token:
      "border-trust-checked/40 bg-trust-checked/10 text-trust-checked-foreground",
  },
];

// The embedded protocols that hold the marketplace to a higher standard.
const protocols = [
  {
    icon: ShieldCheck,
    title: "Trust scores",
    description:
      "Every provider carries a composite 0–100 trust score built from verification, reviews, responsiveness, longevity, and dispute history. The score updates as the provider earns trust across the platform.",
    accent: "var(--trust-verified)",
  },
  {
    icon: Timer,
    title: "SLA indicators",
    description:
      "Each listing shows typical response and completion windows so you know what to expect before you book. Providers who consistently meet their SLAs lift their trust score.",
    accent: "var(--trust-bound)",
  },
  {
    icon: Scale,
    title: "Dispute flow",
    description:
      "If a job goes sideways, open a dispute right from the booking. Providers respond, AI triage suggests a fair resolution, and admins can escalate or resolve — all tracked on the booking.",
    accent: "var(--trust-pending)",
  },
  {
    icon: Gavel,
    title: "Community governance",
    description:
      "Anyone can report a provider, listing, or review. Admins review every report, hide reviews that violate standards, and keep the marketplace accountable to the DFW community.",
    accent: "var(--trust-checked)",
  },
];

const faqs = [
  {
    q: "How are providers verified?",
    a: "Providers climb a four-tier verification ladder: Identity, Business License, Insurance, and Background Check. Each tier is reviewed by our admin team and reflected in the provider's trust score, which you can see on every profile.",
  },
  {
    q: "What is a trust score?",
    a: "A composite 0–100 score built from verification status, review quality, responsiveness, longevity on the platform, and dispute history. It updates continuously as the provider earns trust, so you can compare providers at a glance.",
  },
  {
    q: "What are SLA indicators?",
    a: "Each listing shows typical response and completion windows — for example, 'Responds within 2 hours' or 'Most jobs completed same-day.' Providers who consistently meet their SLAs lift their trust score.",
  },
  {
    q: "What if I have an issue with a booking?",
    a: "Open a dispute directly from the booking page. The provider responds, our AI triage suggests a fair resolution, and admins can escalate or resolve the case. Every step is tracked on the booking for full transparency.",
  },
  {
    q: "How does payment work?",
    a: "For the MVP, payments are handled off-platform directly between you and the provider. DFW Haul handles discovery, booking, messaging, trust, and dispute resolution — you agree on payment terms with your provider.",
  },
  {
    q: "What areas does DFW Haul cover?",
    a: "We cover the full Dallas-Fort Worth metroplex, including Dallas, Fort Worth, Arlington, Plano, Irving, Garland, Frisco, McKinney, and surrounding communities.",
  },
  {
    q: "How do I become a provider?",
    a: 'Click "Become a provider" on your profile, fill out your business details, and submit for admin review. Once approved, you can create listings, climb the verification ladder, and start receiving booking requests across DFW.',
  },
  {
    q: "Can I offer multiple service categories?",
    a: "Yes. Providers can list services across box truck, relocation, trash haul, and moving categories. Add a separate listing for each service you offer with its own pricing and details.",
  },
];

export function HowItWorks() {
  return (
    <div className="bg-background" data-ocid="page.how_it_works">
      <section className="container mx-auto px-4 lg:px-6 py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14 animate-fade-in-up">
          <div className="flex items-center justify-center gap-2 text-primary mb-4">
            <Truck className="w-5 h-5" aria-hidden />
            <span className="text-sm font-body font-medium uppercase tracking-wide">
              How it works
            </span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground mb-4">
            Hauling made simple across DFW
          </h1>
          <p className="text-lg text-muted-foreground font-body leading-relaxed">
            The trusted marketplace for hauling services across Dallas-Fort
            Worth. Whether you need a job done or you're a pro looking for work,
            here's how it works.
          </p>
        </div>

        {/* Customer flow */}
        <div className="mb-20">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" aria-hidden />
            <h2 className="font-display text-2xl font-semibold text-foreground">
              For customers
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {customerSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className={`flex flex-col p-6 rounded-xl bg-card border border-border animate-card-hover-lift animate-fade-in-up stagger-${i + 1}`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" aria-hidden />
                  </div>
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
          <div className="mt-8 text-center">
            <Link to="/search">
              <Button size="lg" data-ocid="how_it_works.customer.browse">
                <Search className="w-4 h-4" aria-hidden />
                Find a provider
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>

        {/* Provider flow */}
        <div className="mb-20">
          <div className="flex items-center gap-2 mb-6">
            <Truck className="w-5 h-5 text-primary" aria-hidden />
            <h2 className="font-display text-2xl font-semibold text-foreground">
              For providers
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {providerSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className={`flex flex-col p-6 rounded-xl bg-card border border-border animate-card-hover-lift animate-fade-in-up stagger-${i + 1}`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" aria-hidden />
                  </div>
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
          <div className="mt-8 text-center">
            <Link to="/provider/register">
              <Button size="lg" data-ocid="how_it_works.provider.register">
                <ClipboardList className="w-4 h-4" aria-hidden />
                Become a provider
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>

        {/* Verification ladder */}
        <div className="mb-20">
          <div className="flex items-center gap-2 mb-3">
            <BadgeCheck className="w-5 h-5 text-primary" aria-hidden />
            <h2 className="font-display text-2xl font-semibold text-foreground">
              The four-tier verification ladder
            </h2>
          </div>
          <p className="text-muted-foreground font-body leading-relaxed max-w-3xl mb-8">
            Providers earn trust by clearing four independent verification
            tiers. Each tier is reviewed by our admin team and reflected in the
            provider's trust score — so you always know exactly what's been
            checked.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {verificationTiers.map((tier, i) => (
              <div
                key={tier.name}
                className={`flex flex-col gap-3 p-5 rounded-xl bg-card border border-border animate-fade-in-up stagger-${i + 1}`}
                data-ocid={`how_it_works.tier.${i + 1}`}
              >
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-body font-medium w-fit ${tier.token}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                  {tier.name}
                </span>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  {tier.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Embedded protocols */}
        <div className="mb-20">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-primary" aria-hidden />
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Embedded protocols
            </h2>
          </div>
          <p className="text-muted-foreground font-body leading-relaxed max-w-3xl mb-8">
            DFW Haul is more than a marketplace — it's a community held to a
            higher standard. Trust scores, SLA indicators, a structured dispute
            flow, and community governance are built into every booking.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {protocols.map((protocol, i) => {
              const Icon = protocol.icon;
              return (
                <Card
                  key={protocol.title}
                  className={`p-6 bg-card border border-border animate-card-hover-lift animate-fade-in-up stagger-${i + 1}`}
                  data-ocid={`how_it_works.protocol.${i + 1}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${protocol.accent}1a` }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: protocol.accent }}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">
                        {protocol.title}
                      </h3>
                      <p className="text-sm text-muted-foreground font-body leading-relaxed">
                        {protocol.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Trust badge example */}
        <div className="mb-20">
          <Card className="p-8 lg:p-10 bg-card border border-border overflow-hidden relative">
            <div
              className="absolute inset-0 opacity-[0.04] gradient-trust pointer-events-none"
              aria-hidden
            />
            <div className="relative flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-primary" aria-hidden />
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    Trust you can see
                  </h2>
                </div>
                <p className="text-muted-foreground font-body leading-relaxed max-w-2xl mb-6">
                  Every provider profile surfaces a trust gauge and verification
                  tier pills front and center. You don't have to guess whether a
                  pro is vetted — the badges tell you exactly what's been
                  checked and how the community rates them.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-trust-verified/40 bg-trust-verified/15 text-trust-verified-foreground px-2.5 py-1 text-xs font-body font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                    Identity · Verified
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-trust-bound/40 bg-trust-bound/15 text-trust-bound-foreground px-2.5 py-1 text-xs font-body font-medium">
                    <BadgeCheck className="w-3.5 h-3.5" aria-hidden />
                    Business License · Verified
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-trust-checked/40 bg-trust-checked/15 text-trust-checked-foreground px-2.5 py-1 text-xs font-body font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                    Insurance · Verified
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-trust-pending/40 bg-trust-pending/15 text-trust-pending-foreground px-2.5 py-1 text-xs font-body font-medium">
                    <Clock className="w-3.5 h-3.5" aria-hidden />
                    Background Check · Pending
                  </span>
                </div>
              </div>
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background p-6 shrink-0"
                data-ocid="how_it_works.trust_gauge_example"
              >
                <div
                  className="relative flex items-center justify-center"
                  style={{ width: 120, height: 120 }}
                  role="img"
                  aria-label="Example trust score: 87 out of 100"
                >
                  {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative gauge, parent has role=img with aria-label */}
                  <svg
                    width={120}
                    height={120}
                    viewBox="0 0 120 120"
                    className="-rotate-90"
                    aria-hidden
                  >
                    <circle
                      cx={60}
                      cy={60}
                      r={52}
                      fill="none"
                      stroke="var(--muted)"
                      strokeWidth={10}
                    />
                    <circle
                      cx={60}
                      cy={60}
                      r={52}
                      fill="none"
                      stroke="var(--trust-verified)"
                      strokeWidth={10}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={
                        2 * Math.PI * 52 - (87 / 100) * 2 * Math.PI * 52
                      }
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl font-semibold text-foreground leading-none">
                      87
                    </span>
                    <span className="font-body text-xs text-muted-foreground mt-1">
                      / 100
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground font-body text-center">
                  Composite trust score
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <LifeBuoy className="w-5 h-5 text-primary" aria-hidden />
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={faq.q}
                className="rounded-xl bg-card border border-border p-5 animate-fade-in-up"
                data-ocid={`how_it_works.faq.${i + 1}`}
              >
                <h3 className="font-body font-semibold text-foreground mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <Link to="/search">
            <Button size="lg" data-ocid="how_it_works.browse">
              <Sparkles className="w-4 h-4" aria-hidden />
              Browse verified providers
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
