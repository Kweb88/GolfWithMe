-- Deleting a profile (cascaded automatically from auth.users on account
-- deletion) previously hit RESTRICT on every one of these foreign keys,
-- meaning "delete my account" would fail the instant you'd ever created a
-- trip, added yourself to one, or posted anything. Switch to SET NULL so a
-- deleted user's trips/comments/posts survive for the remaining members
-- (author_name/name are already denormalized text, so the content stays
-- readable) — except course_reviews, which cascades away with the account
-- since a review has no meaning once its author is gone.
alter table public.trips
  alter column created_by drop not null,
  drop constraint trips_created_by_fkey,
  add constraint trips_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.trip_members
  drop constraint trip_members_profile_id_fkey,
  add constraint trip_members_profile_id_fkey foreign key (profile_id) references public.profiles(id) on delete set null;

alter table public.round_comments
  drop constraint round_comments_author_id_fkey,
  add constraint round_comments_author_id_fkey foreign key (author_id) references public.profiles(id) on delete set null;

alter table public.feed_posts
  drop constraint feed_posts_author_id_fkey,
  add constraint feed_posts_author_id_fkey foreign key (author_id) references public.profiles(id) on delete set null;

alter table public.course_reviews
  drop constraint course_reviews_author_id_fkey,
  add constraint course_reviews_author_id_fkey foreign key (author_id) references public.profiles(id) on delete cascade;

-- Profile picture storage: one public bucket, each user can only write
-- inside a folder named after their own uid (avatars/<uid>/<file>).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable" on storage.objects
  for select to authenticated, anon using (bucket_id = 'avatars');

drop policy if exists "users can upload their own avatar" on storage.objects;
create policy "users can upload their own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can update their own avatar" on storage.objects;
create policy "users can update their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete their own avatar" on storage.objects;
create policy "users can delete their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
