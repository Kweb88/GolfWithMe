-- Feed post photos: same pattern as the avatars bucket (migration 0004) —
-- one public bucket, each user can only write inside a folder named after
-- their own uid (post-photos/<uid>/<file>). Separate from avatars since a
-- post can carry many photos over time instead of one that gets replaced.
insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

drop policy if exists "post photos are publicly readable" on storage.objects;
create policy "post photos are publicly readable" on storage.objects
  for select to authenticated, anon using (bucket_id = 'post-photos');

drop policy if exists "users can upload their own post photos" on storage.objects;
create policy "users can upload their own post photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete their own post photos" on storage.objects;
create policy "users can delete their own post photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);
