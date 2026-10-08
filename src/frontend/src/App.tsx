// App — TanStack Router setup for the DFW marketplace.
// Routes are code-defined (not file-based) so the foundation compiles in one file.
// Page tasks will replace placeholder components with full implementations.

import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminBookings } from "@/pages/AdminBookings";
import { AdminPortal } from "@/pages/AdminPortal";
import { AdminProviders } from "@/pages/AdminProviders";
import { AdminReviews } from "@/pages/AdminReviews";
import { CustomerBookings } from "@/pages/CustomerBookings";
import { CustomerMessages } from "@/pages/CustomerMessages";
import { Home } from "@/pages/Home";
import { HowItWorks } from "@/pages/HowItWorks";
import { ListingDetail } from "@/pages/ListingDetail";
import { NotFound } from "@/pages/NotFound";
import { ProfilePage } from "@/pages/Profile";
import { ProviderAITools } from "@/pages/ProviderAITools";
import { ProviderAvailability } from "@/pages/ProviderAvailability";
import { ProviderBookings } from "@/pages/ProviderBookings";
import { ProviderDashboard } from "@/pages/ProviderDashboard";
import { ProviderDetail } from "@/pages/ProviderDetail";
import { ProviderListings } from "@/pages/ProviderListings";
import { ProviderMessages } from "@/pages/ProviderMessages";
import { ProviderRegister } from "@/pages/ProviderRegister";
import { SearchPage } from "@/pages/Search";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

// Search params type for /search route
interface SearchSearchParams {
  category?: string;
  serviceArea?: string;
  keyword?: string;
  minRating?: string;
  maxPrice?: string;
  sort?: string;
}

const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  validateSearch: (search: Record<string, unknown>): SearchSearchParams => ({
    category: typeof search.category === "string" ? search.category : undefined,
    serviceArea:
      typeof search.serviceArea === "string" ? search.serviceArea : undefined,
    keyword: typeof search.keyword === "string" ? search.keyword : undefined,
    minRating:
      typeof search.minRating === "string" ? search.minRating : undefined,
    maxPrice: typeof search.maxPrice === "string" ? search.maxPrice : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
  }),
  component: SearchPage,
});

const providerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/providers/$providerId",
  component: ProviderDetail,
});

const listingDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/listings/$listingId",
  component: ListingDetail,
});

const customerBookingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer/bookings",
  component: CustomerBookings,
});

const customerMessagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer/messages",
  component: CustomerMessages,
});

const providerDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/dashboard",
  component: ProviderDashboard,
});

const providerListingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/listings",
  component: ProviderListings,
});

const providerBookingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/bookings",
  component: ProviderBookings,
});

const providerAvailabilityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/availability",
  component: ProviderAvailability,
});

const providerMessagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/messages",
  component: ProviderMessages,
});

const providerAIToolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/ai-tools",
  component: ProviderAITools,
});

const providerRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/register",
  component: ProviderRegister,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPortal,
});

const adminProvidersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/providers",
  component: AdminProviders,
});

const adminBookingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/bookings",
  component: AdminBookings,
});

const adminReviewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/reviews",
  component: AdminReviews,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const howItWorksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/how-it-works",
  component: HowItWorks,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: NotFound,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  providerDetailRoute,
  listingDetailRoute,
  customerBookingsRoute,
  customerMessagesRoute,
  providerDashboardRoute,
  providerListingsRoute,
  providerBookingsRoute,
  providerAvailabilityRoute,
  providerMessagesRoute,
  providerAIToolsRoute,
  providerRegisterRoute,
  adminRoute,
  adminProvidersRoute,
  adminBookingsRoute,
  adminReviewsRoute,
  profileRoute,
  howItWorksRoute,
  notFoundRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}

// Re-export Outlet for Layout (consumed inside rootRoute component)
export { Outlet };
