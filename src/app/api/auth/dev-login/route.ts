import { NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { email?: string } | null;
    if (!body?.email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // List users (admin) and find by email
    const { data: users, error: listErr } = await supabaseServer.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      return NextResponse.json({ error: `List users failed: ${listErr.message}` }, { status: 400 });
    }

    const emailLower = body.email.toLowerCase();
    const user = (users?.users || []).find(u => (u.email || "").toLowerCase() === emailLower);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Supabase Admin API does not support minting user sessions directly.
    // For dev login, use password login or generate a magic link via auth.admin.generateLink.
    return NextResponse.json({ error: "Admin session creation is not supported. Use password login or magic links." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}