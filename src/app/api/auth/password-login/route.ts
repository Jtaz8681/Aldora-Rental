import { NextResponse } from "next/server";
import { supabaseServer } from "@/integrations/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      return NextResponse.json({ error: `Password login failed: ${error.message}` }, { status: 401 });
    }

    const access_token = data.session?.access_token;
    const refresh_token = data.session?.refresh_token;

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "Missing session tokens" }, { status: 400 });
    }

    return NextResponse.json({ access_token, refresh_token }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}