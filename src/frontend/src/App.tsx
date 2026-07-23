// App — TanStack Router setup for the DFW marketplace.
// Routes are code-defined (not file-based) so the foundation compiles in one file.
// Page tasks will replace placeholder components with full implementations.

import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminBookings } from "@/pages/AdminBookings";
import { AdminDisputes } from "@/pages/AdminDisputes";
import { AdminDocs } from "@/pages/AdminDocs";
import { AdminPortal } from "@/pages/AdminPortal";
import { AdminProviders } from "@/pages/AdminProviders";
import { AdminReports } from "@/pages/AdminReports";
import { AdminReviews } from "@/pages/AdminReviews";
import { CustomerBookings } from "@/pages/CustomerBookings";
import { CustomerMessages } from "@/pages/CustomerMessages";
import { CustomerRewards } from "@/pages/CustomerRewards";
import { DocDetail } from "@/pages/DocDetail";
import { DocsHub } from "@/pages/DocsHub";
import { Home } from "@/pages/Home";
import { HowItWorks } from "@/pages/HowItWorks";
import { ListingDetail } from "@/pages/ListingDetail";
import { NotFound } from "@/pages/NotFound";
import { ProfilePage } from "@/pages/Profile";
import { ProviderAITools } from "@/pages/ProviderAITools";
import { ProviderAvailability } from "@/pages/ProviderAvailability";
import { ProviderBookings } from "@/pages/ProviderBookings";
import { ProviderBusiness } from "@/pages/ProviderBusiness";
import { ProviderClients } from "@/pages/ProviderClients";
import { ProviderDashboard } from "@/pages/ProviderDashboard";
import { ProviderDetail } from "@/pages/ProviderDetail";
import { ProviderListings } from "@/pages/ProviderListings";
import { ProviderMessages } from "@/pages/ProviderMessages";
import { ProviderMicrosite } from "@/pages/ProviderMicrosite";
import { ProviderMicrositePublic } from "@/pages/ProviderMicrositePublic";
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

// ─── V3 placeholder pages ──────────────────────────────────────────────────
// Minimal heading-only components so the V3 routes are registered and
// reachable. Page tasks will replace these with full implementations.

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

const customerRewardsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer/rewards",
  component: CustomerRewards,
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

const providerMicrositeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/microsite",
  component: ProviderMicrosite,
});

const providerBusinessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/business",
  component: ProviderBusiness,
});

const providerClientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/clients",
  component: ProviderClients,
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

const adminDisputesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/disputes",
  component: AdminDisputes,
});

const adminReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/reports",
  component: AdminReports,
});

const adminDocsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/docs",
  component: AdminDocs,
});

const docsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  component: DocsHub,
});

const docDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/$slug",
  component: DocDetail,
});

const publicMicrositeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/p/$slug",
  component: ProviderMicrositePublic,
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
  customerRewardsRoute,
  providerDashboardRoute,
  providerListingsRoute,
  providerBookingsRoute,
  providerAvailabilityRoute,
  providerMessagesRoute,
  providerAIToolsRoute,
  providerRegisterRoute,
  providerMicrositeRoute,
  providerBusinessRoute,
  providerClientsRoute,
  adminRoute,
  adminProvidersRoute,
  adminBookingsRoute,
  adminReviewsRoute,
  adminDisputesRoute,
  adminReportsRoute,
  adminDocsRoute,
  docsIndexRoute,
  docDetailRoute,
  publicMicrositeRoute,
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
