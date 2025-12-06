import { NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { userId?: string } | null;
    if (!body?.userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Supabase Admin API does not support minting user sessions directly.
    // If you need admin impersonation, use a magic link flow via auth.admin.generateLink.
    return NextResponse.json({ error: "Admin session creation is not supported in Supabase. Use magic links instead." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}