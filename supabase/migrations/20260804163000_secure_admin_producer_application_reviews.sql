begin;

-- Admins may read every application, but direct table-wide admin writes are
-- replaced by the narrow review_producer_application RPC below.
drop policy if exists producer_profiles_admin_all on public.producer_profiles;
drop policy if exists producer_profiles_admin_read on public.producer_profiles;

create policy producer_profiles_admin_read
on public.producer_profiles for select to authenticated
using ((select private.is_admin()));

-- These columns must never become directly writable through the authenticated
-- table API. Applicant-editable story/region column grants remain unchanged.
revoke update (profile_id, verification_status, approved_at, created_at, updated_at)
on public.producer_profiles from authenticated;

create or replace function public.review_producer_application(
  target_profile_id uuid,
  review_action text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
      and profile.status = 'active'
  ) then
    raise insufficient_privilege using message = 'Active administrator access is required.';
  end if;

  if target_profile_id is null or review_action not in ('approve', 'reject') then
    raise invalid_parameter_value using message = 'Invalid producer application review request.';
  end if;

  update public.producer_profiles application
  set
    verification_status = case
      when review_action = 'approve' then 'approved'::public.verification_status
      else 'rejected'::public.verification_status
    end,
    approved_at = case when review_action = 'approve' then now() else null end,
    updated_at = now()
  where application.profile_id = target_profile_id
    and application.verification_status = 'pending';

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.review_producer_application(uuid, text)
from public, anon, authenticated;
grant execute on function public.review_producer_application(uuid, text)
to authenticated;

commit;

-- Verification queries (run manually after applying this migration):
-- select policyname, cmd, qual, with_check from pg_policies
-- where schemaname = 'public' and tablename = 'producer_profiles'
-- order by policyname;
-- select grantee, privilege_type, column_name from information_schema.column_privileges
-- where table_schema = 'public' and table_name = 'producer_profiles'
-- order by grantee, privilege_type, column_name;
-- select routine_name, security_type from information_schema.routines
-- where routine_schema = 'public' and routine_name = 'review_producer_application';
-- select has_function_privilege('authenticated',
--   'public.review_producer_application(uuid, text)', 'EXECUTE');

-- Rollback note: restore producer_profiles_admin_all only if broad direct admin
-- writes are intentionally required, then revoke EXECUTE and drop the RPC in a
-- new forward migration. No application or profile data needs to be rewritten.
