begin;

-- A producer application must start from the authenticated user's own active
-- profile while preserving the existing buyer role until a separate admin review.
drop policy if exists producer_profiles_insert_own_pending on public.producer_profiles;

create policy producer_profiles_insert_own_pending
on public.producer_profiles for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and verification_status = 'pending'
  and approved_at is null
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role = 'buyer'
  )
);

commit;
