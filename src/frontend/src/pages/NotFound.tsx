// NotFound — 404 page for unmatched routes with DFW Haul marketplace branding.

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Compass, Truck } from "lucide-react";

export function NotFound() {
  return (
    <div
      className="bg-background min-h-[70vh] flex items-center"
      data-ocid="page.not_found"
    >
      <section className="container mx-auto px-4 lg:px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6 text-primary">
            <Truck className="w-6 h-6" aria-hidden />
            <span className="font-display text-lg font-semibold tracking-tight">
              DFW Haul
            </span>
          </div>

          <EmptyState
            icon={Compass}
            title="This page took a wrong turn"
            description="The page you're looking for doesn't exist or has moved. Let's get you back on the road across Dallas-Fort Worth."
            data-ocid="not_found.empty_state"
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link to="/">
                  <Button size="lg" data-ocid="not_found.home">
                    Back to home
                  </Button>
                </Link>
                <Link to="/search">
                  <Button
                    size="lg"
                    variant="outline"
                    data-ocid="not_found.search"
                  >
                    Browse providers
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button
                    size="lg"
                    variant="ghost"
                    data-ocid="not_found.how_it_works"
                  >
                    How it works
                  </Button>
                </Link>
              </div>
            }
          />

          <p className="mt-10 font-mono text-5xl font-semibold text-muted-foreground/40 select-none">
            404
          </p>
        </div>
      </section>
    </div>
  );
}
