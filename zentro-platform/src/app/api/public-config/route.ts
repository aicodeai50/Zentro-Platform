import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    zentroApiUrl: process.env.NEXT_PUBLIC_ZENTRO_API_URL ?? "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  };

  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
