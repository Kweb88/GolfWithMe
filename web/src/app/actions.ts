"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  await supabase.from("trips").delete().eq("id", tripId);
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
  const { supabase } = await requireUser();

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
