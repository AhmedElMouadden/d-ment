import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, env, isDemoEnabled, isSupabaseConfigured } from "../env";

/** Rafraîchit la session Supabase et protège /app (vérification optimiste). */
export async function updateSession(request: NextRequest) {
  const inDemo = isDemoEnabled() && request.cookies.get(DEMO_COOKIE)?.value === "1";
  const isAppRoute = request.nextUrl.pathname.startsWith("/app");

  if (!isSupabaseConfigured()) {
    if (isAppRoute && !inDemo) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (isAppRoute && !data?.claims && !inDemo) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return response;
}
