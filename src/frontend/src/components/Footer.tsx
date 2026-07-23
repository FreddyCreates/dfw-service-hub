// Footer — marketplace footer with attribution + category links.

import { CATEGORY_LABELS, type ServiceCategory } from "@/types";
import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";

const categories: ServiceCategory[] = [
  "boxTruck",
  "relocation",
  "trashHaul",
  "moving",
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.hostname : "localhost",
  )}`;

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Truck
                  className="w-5 h-5 text-primary-foreground"
                  aria-hidden
                />
              </div>
              <span className="font-display text-lg font-semibold text-foreground">
                DFW Haul
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-xs">
              The trusted marketplace for box truck, relocation, trash haul, and
              moving services across Dallas-Fort Worth.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">
              Services
            </h3>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat}>
                  <Link
                    to="/search"
                    search={{ category: cat }}
                    className="text-sm text-muted-foreground hover:text-primary font-body transition-smooth"
                  >
                    {CATEGORY_LABELS[cat]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">
              For Providers
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/provider/dashboard"
                  className="text-sm text-muted-foreground hover:text-primary font-body transition-smooth"
                >
                  Provider Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/provider/listings"
                  className="text-sm text-muted-foreground hover:text-primary font-body transition-smooth"
                >
                  Manage Listings
                </Link>
              </li>
              <li>
                <Link
                  to="/provider/bookings"
                  className="text-sm text-muted-foreground hover:text-primary font-body transition-smooth"
                >
                  Bookings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/how-it-works"
                  className="text-sm text-muted-foreground hover:text-primary font-body transition-smooth"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="text-sm text-muted-foreground hover:text-primary font-body transition-smooth"
                >
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground font-body">
            © {currentYear}. Built with love using{" "}
            <a
              href={caffeineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
          <p className="text-xs text-muted-foreground font-body">
            Serving Dallas-Fort Worth, Texas
          </p>
        </div>
      </div>
    </footer>
  );
}
