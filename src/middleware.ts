import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

const unprotectedPaths = [
  "/api/public/*", // Example of using a wildcard for paths under /api/public
  "/api/createCloudflow",
  "/api/listWorkflowVersionsByWorkflowID*",
];

function isPublicPath(path: string) {
  // Check if the path matches any unprotected paths
  return unprotectedPaths.some((unprotectedPath) => {
    if (unprotectedPath.endsWith("*")) {
      // If path ends with '*', use startsWith to match any subpath
      const basePath = unprotectedPath.slice(0, -1);
      return path.startsWith(basePath);
    }
    return path === unprotectedPath;
  });
}

function customMiddleware(config: any) {
  if (process.env.ALLOW_GUEST === "true") {
    // Return a function that just passes the request through if the middleware should not be applied
    return function (req: NextRequest, ev: any) {
      return NextResponse.next();
    };
  } else {
    return function (req: NextRequest, ev: any) {
      if (isPublicPath(req.nextUrl.pathname)) {
        // If the path is one of the unprotected ones, skip authentication
        return NextResponse.next();
      }
      //@ts-ignore
      return withAuth(config)(req, ev);
    };
  }
}

export default customMiddleware({
  pages: {
    signIn: "/auth/signin",
  },
});
