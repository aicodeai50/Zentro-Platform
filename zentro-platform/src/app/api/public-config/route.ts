import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    zentroApiUrl: process.env.NEXT_PUBLIC_ZENTRO_API_URL ?? "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  });
}
