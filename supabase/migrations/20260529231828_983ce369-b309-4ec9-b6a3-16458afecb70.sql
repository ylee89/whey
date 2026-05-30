
create or replace function public.are_friends(_a uuid, _b uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return false; end if;
  if auth.uid() <> _a and auth.uid() <> _b then return false; end if;
  return exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = _a and addressee_id = _b)
        or (requester_id = _b and addressee_id = _a))
  );
end;
$$;
