
alter function public.set_updated_at() set search_path = public;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
