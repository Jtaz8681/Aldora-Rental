import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PUBLIC_URL || "";
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.ANON_KEY || "";

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return NextResponse.json({ error: "Supabase env missing (URL or anon key)" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
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
}