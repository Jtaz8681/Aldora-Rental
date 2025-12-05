-- 04_functions.sql
-- Functions ported from your current project context.

-- list_profiles_for_admin
CREATE OR REPLACE FUNCTION public.list_profiles_for_admin()
RETURNS SETOF profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT p.*
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND me.role IN ('manager', 'owner', 'dev')
  ) OR p.id = auth.uid();
$function$;

-- list_profiles_with_email
CREATE OR REPLACE FUNCTION public.list_profiles_with_email()
RETURNS TABLE(id uuid, first_name text, last_name text, role text, updated_at timestamp with time zone, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT p.id, p.first_name, p.last_name, p.role, p.updated_at, u.email
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id;
$function$;

-- handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT COUNT(*) FROM public.profiles) = 0 THEN
    INSERT INTO public.profiles (id, first_name, last_name, role, updated_at)
    VALUES (
      new.id,
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      'owner',
      NOW()
    );
  ELSE
    INSERT INTO public.profiles (id, first_name, last_name, role, updated_at)
    VALUES (
      new.id,
      new.raw_user_meta_data ->> 'first_name',
      new.raw_user_meta_data ->> 'last_name',
      'staff',
      NOW()
    );
  END IF;

  RETURN new;
END;
$function$;

-- increment_customer_balance
CREATE OR REPLACE FUNCTION public.increment_customer_balance(p_user_id uuid, p_customer_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.customers
  SET balance_due = COALESCE(balance_due, 0) + COALESCE(p_amount, 0),
      updated_at = NOW()
  WHERE id = p_customer_id;
END;
$function$;

-- get_my_role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid();
$function$;