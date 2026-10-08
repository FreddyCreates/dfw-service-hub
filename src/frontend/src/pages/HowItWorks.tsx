// HowItWorks — standalone explainer page for the DFW marketplace.
// Covers both customer and provider flows with step-by-step guides and FAQs.

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Package,
  Search,
  ShieldCheck,
  Star,
  Truck,
  Users,
} from "lucide-react";

const customerSteps = [
  {
    icon: Search,
    title: "1. Search & compare",
    description:
      "Browse verified providers across Dallas-Fort Worth. Filter by service category — box truck, relocation, trash haul, or moving — plus service area, rating, and price.",
  },
  {
    icon: CalendarCheck,
    title: "2. Request a booking",
    description:
      "Send a booking request to your chosen provider with your job details, address, and preferred date. Message directly to confirm timing and scope.",
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
      "After the job is complete, leave a rating and review to help the DFW community find trusted pros and help providers grow their reputation.",
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
    title: "2. Get verified",
    description:
      "Once approved, you'll receive a verified badge on your profile. Customers can trust that you've passed our admin review process.",
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

const faqs = [
  {
    q: "How are providers verified?",
    a: "Every provider submits their business details during registration. Our admin team reviews and approves each provider before they can list services. You'll see a verified badge on approved profiles.",
  },
  {
    q: "How does payment work?",
    a: "For the MVP, payments are handled off-platform directly between you and the provider. DFW Haul handles discovery, booking, and messaging — you agree on payment terms with your provider.",
  },
  {
    q: "What areas does DFW Haul cover?",
    a: "We cover the full Dallas-Fort Worth metroplex, including Dallas, Fort Worth, Arlington, Plano, Irving, Garland, Frisco, McKinney, and surrounding communities.",
  },
  {
    q: "What if I have an issue with a booking?",
    a: "Message your provider directly through the platform. If you can't resolve an issue, our admin team can review the booking and any associated reviews through the moderation system.",
  },
  {
    q: "How do I become a provider?",
    a: 'Click "Become a provider" on your profile, fill out your business details, and submit for admin review. Once approved, you can create listings and start receiving booking requests across DFW.',
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
        <div className="text-center max-w-2xl mx-auto mb-14">
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
            {customerSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="flex flex-col p-6 rounded-xl bg-card border border-border"
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
            {providerSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="flex flex-col p-6 rounded-xl bg-card border border-border"
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

        {/* Trust & governance */}
        <div className="mb-20">
          <Card className="p-8 lg:p-10 bg-card border border-border">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" aria-hidden />
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Built on trust & governance
              </h2>
            </div>
            <p className="text-muted-foreground font-body leading-relaxed max-w-3xl">
              DFW Haul is more than a marketplace — it's a community held to a
              higher standard. Every provider is admin-verified before listing.
              Reviews keep providers accountable. And our admin team moderates
              disputes to keep the platform safe for everyone across the
              Dallas-Fort Worth metroplex.
            </p>
          </Card>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6 text-center">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl bg-card border border-border p-5"
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
              <Users className="w-4 h-4" aria-hidden />
              Browse providers
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
