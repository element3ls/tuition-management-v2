import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/env";
import {
  activeOrganizationCookie,
  defaultOrganizationSlug,
  isTenantRoutablePath,
  organizationSlugHeader,
  tenantPath
} from "@/lib/tenancy/constants";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function tenantRewrite(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  if (parts[0] !== "o" || !parts[1]) return null;

  const orgSlug = parts[1];
  const internalPath = `/${parts.slice(2).join("/") || "dashboard"}`;
  const url = request.nextUrl.clone();
  url.pathname = internalPath;

  const headers = new Headers(request.headers);
  headers.set(organizationSlugHeader, orgSlug);
  request.cookies.set(activeOrganizationCookie, orgSlug);

  return { orgSlug, url, headers };
}

function legacyTenantRedirect(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!isTenantRoutablePath(pathname)) return null;

  const orgSlug = request.cookies.get(activeOrganizationCookie)?.value ?? defaultOrganizationSlug;
  const url = request.nextUrl.clone();
  url.pathname = tenantPath(orgSlug, pathname);
  return url;
}

export async function updateSession(request: NextRequest) {
  const rewrite = tenantRewrite(request);
  const redirectUrl = rewrite ? null : legacyTenantRedirect(request);
  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl);
  }

  const responseRequest = rewrite ? { headers: rewrite.headers } : request;
  const createResponse = () =>
    rewrite
      ? NextResponse.rewrite(rewrite.url, { request: responseRequest })
      : NextResponse.next({ request });

  let response = createResponse();
  if (rewrite) {
    response.cookies.set(activeOrganizationCookie, rewrite.orgSlug, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });
  }

  if (!isSupabaseConfigured()) {
    return response;
  }

  const { url, anonKey } = getPublicSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = createResponse();
        if (rewrite) {
          response.cookies.set(activeOrganizationCookie, rewrite.orgSlug, {
            httpOnly: true,
            sameSite: "lax",
            path: "/"
          });
        }
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  await supabase.auth.getUser();
  return response;
}
