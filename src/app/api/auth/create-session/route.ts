import { NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { userId?: string } | null;
  if (!body?.userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const { data, error } = await supabaseServer.auth.admin.createSession({
    user_id: body.userId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const access_token = data.session?.access_token;
  const refresh_token = data.session?.refresh_token;
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Failed to create session tokens" }, { status: 400 });
  }

  return NextResponse.json({ access_token, refresh_token }, { status: 200 });
}