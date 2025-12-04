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

    const { data: sessionData, error: sessErr } = await supabaseServer.auth.admin.createSession({
      user_id: user.id,
    });
    if (sessErr) {
      return NextResponse.json({ error: `Create session failed: ${sessErr.message}` }, { status: 400 });
    }

    const access_token = sessionData.session?.access_token;
    const refresh_token = sessionData.session?.refresh_token;
    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "Missing session tokens" }, { status: 400 });
    }

    return NextResponse.json({ access_token, refresh_token }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}