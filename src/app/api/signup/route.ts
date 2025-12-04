import { NextResponse } from 'next/server';
import { supabaseServer } from '@/integrations/supabase/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
  } | null;

  if (!body || !body.email || !body.password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
  }

  const { email, password, first_name, last_name } = body;

  const { data, error } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: first_name || '',
      last_name: last_name || '',
      role: 'dev',
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user }, { status: 200 });
}