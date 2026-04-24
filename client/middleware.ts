import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protect all routes under /dashboard (adjust as needed)
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/lobby(.*)", "/session(.*)", "/schedule(.*)", "/sessions(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Clerk's recommended matcher — skips Next.js internals and all static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)).*)",
  ],
};
