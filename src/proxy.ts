import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher([
  "/login",
  "/auth(.*)",
  "/privacy",
  "/terms",
  "/offline",
]);

export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (!isPublicPage(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export default proxy;

export const config = {
  // Skip Next.js internals, static assets, service worker, manifest, and icons
  matcher: ["/((?!_next|favicon.ico|sw.js|manifest.webmanifest|icons/).*)"],
};
