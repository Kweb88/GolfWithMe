-- Trips previously had no delete policy at all (create/read/update only).
-- Restricted to the trip's creator, matching the "created_by" ownership
-- rule already used for the pre-membership read/update policies. Every
-- child table (trip_members, rounds, scores, feed_posts, expenses,
-- lodging, ...) already cascades on trip_id, so this one delete removes
-- the whole trip cleanly.
drop policy if exists "trips delete by creator" on public.trips;
create policy "trips delete by creator" on public.trips
  for delete to authenticated using (created_by = auth.uid());
