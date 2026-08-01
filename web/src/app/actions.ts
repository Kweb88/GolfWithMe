"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

function genCode() {
  let c = "";
  for (let i = 0; i < 5; i++) {
    c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return c;
}

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

export async function createTrip(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  if (!name) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  let code = genCode();
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: existing } = await supabase
      .from("trips")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = genCode();
  }

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      code,
      name,
      location: location || null,
      start_date: startDate || null,
      end_date: endDate || null,
      created_by: user.id,
    })
    .select("id, code")
    .single();

  if (error || !trip) {
    console.error("createTrip failed", error);
    return;
  }

  await supabase.from("trip_members").insert({
    trip_id: trip.id,
    profile_id: user.id,
    name: profile?.name ?? "You",
  });

  await supabase.from("feed_posts").insert({
    trip_id: trip.id,
    author_id: user.id,
    author_name: profile?.name ?? "Someone",
    type: "created",
    text: `${profile?.name ?? "Someone"} started the trip 🏌️`,
  });

  redirect(`/t/${trip.code}`);
}

export async function joinTrip(formData: FormData) {
  const { supabase, user } = await requireUser();

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) return;

  const { data: trip } = await supabase
    .from("trips")
    .select("id, code")
    .eq("code", code)
    .maybeSingle();

  if (!trip) return;

  const { data: alreadyMember } = await supabase
    .from("trip_members")
    .select("id")
    .eq("trip_id", trip.id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!alreadyMember) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    await supabase.from("trip_members").insert({
      trip_id: trip.id,
      profile_id: user.id,
      name: profile?.name ?? "You",
    });

    await supabase.from("feed_posts").insert({
      trip_id: trip.id,
      author_id: user.id,
      author_name: profile?.name ?? "Someone",
      type: "join",
      text: `${profile?.name ?? "Someone"} joined the trip`,
    });
  }

  redirect(`/t/${trip.code}`);
}

export async function addPlayer(tripId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("trip_members").insert({
    trip_id: tripId,
    name,
    venmo: String(formData.get("venmo") ?? "").trim() || null,
    cashapp: String(formData.get("cashapp") ?? "").trim() || null,
    zelle: String(formData.get("zelle") ?? "").trim() || null,
  });
}

export async function deleteTrip(tripId: string) {
  const { supabase, user } = await requireUser();

  const { data: trip } = await supabase.from("trips").select("id, created_by").eq("id", tripId).maybeSingle();
  if (!trip || trip.created_by !== user.id) return;

  // .select("id") after delete lets us tell "actually deleted" apart from
  // "silently blocked by RLS" (a policy-blocked delete matches zero rows and
  // returns no error, it just does nothing) instead of redirecting either way.
  const { data: deleted, error } = await supabase.from("trips").delete().eq("id", tripId).select("id");
  if (error || !deleted || deleted.length === 0) {
    console.error("deleteTrip blocked or failed", error);
    return;
  }

  redirect("/");
}

// Ryder Cup teams live at the trip level (they persist across every round
// of the trip), unlike Scramble's teams which are set per-round.
export async function setTripTeams(tripId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const teamAName = String(formData.get("teamAName") ?? "").trim() || "Team A";
  const teamBName = String(formData.get("teamBName") ?? "").trim() || "Team B";

  const { data: members } = await supabase.from("trip_members").select("id").eq("trip_id", tripId);
  if (!members || members.length < 2) return;

  const hasA = members.some((m) => String(formData.get(`team_${m.id}`) ?? "a") === "a");
  const hasB = members.some((m) => String(formData.get(`team_${m.id}`) ?? "a") === "b");
  if (!hasA || !hasB) return;

  await supabase.from("trips").update({ team_a_name: teamAName, team_b_name: teamBName }).eq("id", tripId);

  await Promise.all(
    members.map((m) => {
      const team = String(formData.get(`team_${m.id}`) ?? "a") === "b" ? "b" : "a";
      return supabase.from("trip_members").update({ team }).eq("id", m.id);
    }),
  );
}

// Matches a typical par-72 routing: a mix of 3s, 4s, and 5s rather than an
// unrealistic flat set of par-4s.
const DEFAULT_PAR = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];

export async function createRound(tripId: string, tripCode: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const courseName = String(formData.get("courseName") ?? "").trim();
  if (!courseName) return;

  const courseId = String(formData.get("courseId") ?? "").trim() || null;
  const courseLocation = String(formData.get("courseLocation") ?? "").trim() || null;
  const roundDate = String(formData.get("roundDate") ?? "").trim() || null;
  const format = String(formData.get("format") ?? "stroke").trim();

  const isMatch = format === "match";
  const isScramble = format === "scramble";
  const isRyder = format === "ryder";

  const skinsBet = !isMatch && !isScramble && !isRyder ? Number(formData.get("skinsBet") ?? 0) || 0 : 0;
  const nassauBet = !isMatch && !isScramble && !isRyder ? Number(formData.get("nassauBet") ?? 0) || 0 : 0;

  const matchPlayerA = isMatch ? String(formData.get("matchPlayerA") ?? "").trim() || null : null;
  const matchPlayerB = isMatch ? String(formData.get("matchPlayerB") ?? "").trim() || null : null;
  if (isMatch && (!matchPlayerA || !matchPlayerB || matchPlayerA === matchPlayerB)) return;

  const { data: members } = await supabase.from("trip_members").select("id, team").eq("trip_id", tripId);

  let teamAName: string | null = null;
  let teamBName: string | null = null;
  const memberTeam = new Map<string, "a" | "b" | null>();
  if (isScramble && members) {
    teamAName = String(formData.get("teamAName") ?? "").trim() || "Team A";
    teamBName = String(formData.get("teamBName") ?? "").trim() || "Team B";
    for (const m of members) {
      const t = String(formData.get(`team_${m.id}`) ?? "a");
      memberTeam.set(m.id, t === "b" ? "b" : "a");
    }
    // A scramble needs at least one player on each side to mean anything.
    const hasA = [...memberTeam.values()].some((t) => t === "a");
    const hasB = [...memberTeam.values()].some((t) => t === "b");
    if (!hasA || !hasB) return;
  }

  let ryderPairs: { a: string; b: string }[] = [];
  if (isRyder && members) {
    const teamAMembers = members.filter((m) => m.team === "a");
    const teamBMembers = members.filter((m) => m.team === "b");
    const pairCount = Math.min(teamAMembers.length, teamBMembers.length);
    if (pairCount < 1) return;
    ryderPairs = Array.from({ length: pairCount }, (_, i) => ({ a: teamAMembers[i].id, b: teamBMembers[i].id }));
  }

  const { data: round, error } = await supabase
    .from("rounds")
    .insert({
      trip_id: tripId,
      course_name: courseName,
      course_id: courseId,
      course_location: courseLocation,
      round_date: roundDate,
      format: isMatch ? "match" : isScramble ? "scramble" : isRyder ? "ryder" : "stroke",
      skins_bet: skinsBet,
      nassau_bet: nassauBet,
      match_player_a: matchPlayerA,
      match_player_b: matchPlayerB,
      team_a_name: teamAName,
      team_b_name: teamBName,
      par: DEFAULT_PAR,
    })
    .select("id")
    .single();

  if (error || !round) {
    console.error("createRound failed", error);
    return;
  }

  if (members && members.length) {
    await supabase.from("round_players").insert(
      members.map((m) => ({
        round_id: round.id,
        member_id: m.id,
        team: isScramble ? (memberTeam.get(m.id) ?? "a") : null,
      })),
    );
  }

  if (ryderPairs.length) {
    await supabase
      .from("round_ryder_pairs")
      .insert(ryderPairs.map((p) => ({ round_id: round.id, member_a: p.a, member_b: p.b })));
  }

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
  await supabase.from("feed_posts").insert({
    trip_id: tripId,
    author_id: user.id,
    author_name: profile?.name ?? "Someone",
    type: "round",
    text: `New round logged: ${courseName}${courseLocation ? ` — ${courseLocation}` : ""}`,
  });

  redirect(`/t/${tripCode}/r/${round.id}`);
}

export async function updateScore(roundId: string, memberId: string, hole: number, strokes: number | null) {
  const { supabase } = await requireUser();

  if (strokes !== null && (!Number.isInteger(strokes) || strokes < 1 || strokes > 20)) return;

  await supabase
    .from("scores")
    .upsert(
      { round_id: roundId, member_id: memberId, hole, strokes, updated_at: new Date().toISOString() },
      { onConflict: "round_id,member_id,hole" },
    );
}

// Scramble: the whole team plays one ball, so a single hole score gets
// written to every teammate's row (each one is a full member of the
// scores table, they just always carry the same value as their team).
export async function updateTeamScore(roundId: string, memberIds: string[], hole: number, strokes: number | null) {
  const { supabase } = await requireUser();

  if (strokes !== null && (!Number.isInteger(strokes) || strokes < 1 || strokes > 20)) return;
  if (!memberIds.length) return;

  await supabase.from("scores").upsert(
    memberIds.map((memberId) => ({
      round_id: roundId,
      member_id: memberId,
      hole,
      strokes,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "round_id,member_id,hole" },
  );
}

export async function createFeedPost(formData: FormData) {
  const { supabase, user } = await requireUser();

  const tripId = String(formData.get("tripId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  if (!tripId || (!text && !photoUrl)) return;

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();

  await supabase.from("feed_posts").insert({
    trip_id: tripId,
    author_id: user.id,
    author_name: profile?.name ?? "Someone",
    type: "post",
    text: text || null,
    photo_url: photoUrl,
  });
}

export async function toggleFeedReaction(postId: string) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("feed_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("feed_reactions").delete().eq("post_id", postId).eq("profile_id", user.id);
  } else {
    await supabase.from("feed_reactions").insert({ post_id: postId, profile_id: user.id });
  }
}

export async function addRoundComment(roundId: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();

  await supabase.from("round_comments").insert({
    round_id: roundId,
    author_id: user.id,
    author_name: profile?.name ?? "Someone",
    text,
  });
}

export async function toggleRoundLike(roundId: string) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("round_likes")
    .select("round_id")
    .eq("round_id", roundId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("round_likes").delete().eq("round_id", roundId).eq("profile_id", user.id);
  } else {
    await supabase.from("round_likes").insert({ round_id: roundId, profile_id: user.id });
  }
}

export async function updateTripVisibility(tripId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const isPublic = formData.get("isPublic") === "on";
  const seekingActive = formData.get("seekingActive") === "on";
  const seekingSpots = Math.min(20, Math.max(1, Number(formData.get("seekingSpots") ?? 1) || 1));
  const seekingNote = String(formData.get("seekingNote") ?? "").trim() || null;

  await supabase
    .from("trips")
    .update({
      is_public: isPublic,
      seeking_active: seekingActive,
      seeking_spots: seekingSpots,
      seeking_note: seekingNote,
    })
    .eq("id", tripId);
}

// One review per (course, author) when it's not tied to a specific round —
// re-submitting updates that same review instead of piling up duplicates.
// round_id is left null here; tying a review to a round actually played is
// a separate, later refinement.
export async function submitCourseReview(courseName: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const rating = Number(formData.get("rating") ?? 0);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
  const review = String(formData.get("review") ?? "").trim() || null;

  const { data: existing } = await supabase
    .from("course_reviews")
    .select("id")
    .eq("course_name", courseName)
    .eq("author_id", user.id)
    .is("round_id", null)
    .maybeSingle();

  if (existing) {
    await supabase.from("course_reviews").update({ rating, review }).eq("id", existing.id);
  } else {
    await supabase.from("course_reviews").insert({ course_name: courseName, author_id: user.id, rating, review });
  }
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const avatarEmoji = String(formData.get("avatarEmoji") ?? "⛳").trim() || "⛳";
  const homeCourse = String(formData.get("homeCourse") ?? "").trim() || null;
  const favoriteFormat = String(formData.get("favoriteFormat") ?? "Stroke Play").trim() || "Stroke Play";
  const bio = String(formData.get("bio") ?? "").trim() || null;

  await supabase
    .from("profiles")
    .update({
      name,
      avatar_emoji: avatarEmoji,
      home_course: homeCourse,
      favorite_format: favoriteFormat,
      bio,
    })
    .eq("id", user.id);
}

export async function updateAvatarUrl(url: string | null) {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
}

// Uses the service-role admin client to actually delete the auth.users row
// (the RLS-scoped client has no permission to do that). That delete cascades
// to the profiles row per the schema, which in turn is set null (not
// restricted) on every trip/comment/post it authored, per migration 0004 —
// so this removes the account without destroying other members' shared
// trip history.
export async function deleteAccount() {
  const { supabase, user } = await requireUser();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteAccount failed", error);
    return;
  }

  await supabase.auth.signOut();
  redirect("/login");
}

// "Download your data": everything authored by or scoped to the current
// user, not a dump of other members' private trip data.
export async function exportMyData() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, home_course, favorite_format, bio, created_at")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase.from("trip_members").select("id, trip_id").eq("profile_id", user.id);
  const tripIds = [...new Set((memberships ?? []).map((m) => m.trip_id))];
  const memberIds = (memberships ?? []).map((m) => m.id);

  const { data: trips } =
    tripIds.length > 0
      ? await supabase.from("trips").select("id, code, name, location, start_date, end_date").in("id", tripIds)
      : { data: [] };
  const tripsById = new Map((trips ?? []).map((t) => [t.id, t]));

  const { data: scores } =
    memberIds.length > 0
      ? await supabase.from("scores").select("round_id, hole, strokes").in("member_id", memberIds)
      : { data: [] };

  const roundIds = [...new Set((scores ?? []).map((s) => s.round_id))];
  const { data: rounds } =
    roundIds.length > 0
      ? await supabase.from("rounds").select("id, trip_id, course_name, round_date, format").in("id", roundIds)
      : { data: [] };
  const roundsById = new Map((rounds ?? []).map((r) => [r.id, r]));

  const { data: feedPosts } = await supabase
    .from("feed_posts")
    .select("trip_id, type, text, photo_url, created_at")
    .eq("author_id", user.id);

  const { data: roundComments } = await supabase
    .from("round_comments")
    .select("round_id, text, created_at")
    .eq("author_id", user.id);

  const { data: courseReviews } = await supabase
    .from("course_reviews")
    .select("course_name, rating, review, created_at")
    .eq("author_id", user.id);

  const scoresByRound = new Map<string, { hole: number; strokes: number | null }[]>();
  for (const s of scores ?? []) {
    if (!scoresByRound.has(s.round_id)) scoresByRound.set(s.round_id, []);
    scoresByRound.get(s.round_id)!.push({ hole: s.hole, strokes: s.strokes });
  }

  return {
    exportedAt: new Date().toISOString(),
    profile,
    trips: (trips ?? []).map((t) => ({
      code: t.code,
      name: t.name,
      location: t.location,
      startDate: t.start_date,
      endDate: t.end_date,
    })),
    rounds: (rounds ?? []).map((r) => ({
      trip: tripsById.get(r.trip_id)?.name ?? null,
      courseName: r.course_name,
      roundDate: r.round_date,
      format: r.format,
      myScores: (scoresByRound.get(r.id) ?? []).slice().sort((a, b) => a.hole - b.hole),
    })),
    feedPosts: (feedPosts ?? []).map((p) => ({
      trip: tripsById.get(p.trip_id)?.name ?? null,
      type: p.type,
      text: p.text,
      photoUrl: p.photo_url,
      createdAt: p.created_at,
    })),
    roundComments: (roundComments ?? []).map((c) => ({
      roundCourse: roundsById.get(c.round_id)?.course_name ?? null,
      text: c.text,
      createdAt: c.created_at,
    })),
    courseReviews: courseReviews ?? [],
  };
}
