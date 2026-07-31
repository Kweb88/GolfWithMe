// Hand-written to match supabase/migrations/0001_init.sql. Once the project
// is live, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
// and re-apply any manual edits below.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoundFormat = "stroke" | "match" | "skins" | "nassau" | "scramble" | "ryder";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_emoji: string;
          avatar_url: string | null;
          home_course: string | null;
          favorite_format: string;
          bio: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          avatar_emoji?: string;
          avatar_url?: string | null;
          home_course?: string | null;
          favorite_format?: string;
          bio?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          region: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          code: string;
          name: string;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          is_public: boolean;
          seeking_active: boolean;
          seeking_spots: number;
          seeking_note: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_public?: boolean;
          seeking_active?: boolean;
          seeking_spots?: number;
          seeking_note?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trips"]["Insert"]>;
        Relationships: [];
      };
      trip_members: {
        Row: {
          id: string;
          trip_id: string;
          profile_id: string | null;
          name: string;
          venmo: string | null;
          cashapp: string | null;
          zelle: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          profile_id?: string | null;
          name: string;
          venmo?: string | null;
          cashapp?: string | null;
          zelle?: string | null;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trip_members"]["Insert"]>;
        Relationships: [];
      };
      rounds: {
        Row: {
          id: string;
          trip_id: string;
          course_name: string;
          course_id: string | null;
          course_location: string | null;
          round_date: string | null;
          format: RoundFormat;
          skins_bet: number;
          nassau_bet: number;
          par: number[];
          match_player_a: string | null;
          match_player_b: string | null;
          team_a_name: string | null;
          team_b_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          course_name: string;
          course_id?: string | null;
          course_location?: string | null;
          round_date?: string | null;
          format: RoundFormat;
          skins_bet?: number;
          nassau_bet?: number;
          par?: number[];
          match_player_a?: string | null;
          match_player_b?: string | null;
          team_a_name?: string | null;
          team_b_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rounds"]["Insert"]>;
        Relationships: [];
      };
      round_players: {
        Row: { round_id: string; member_id: string; team: "a" | "b" | null };
        Insert: { round_id: string; member_id: string; team?: "a" | "b" | null };
        Update: Partial<Database["public"]["Tables"]["round_players"]["Insert"]>;
        Relationships: [];
      };
      round_ryder_pairs: {
        Row: { id: string; round_id: string; member_a: string; member_b: string };
        Insert: { id?: string; round_id: string; member_a: string; member_b: string };
        Update: Partial<Database["public"]["Tables"]["round_ryder_pairs"]["Insert"]>;
        Relationships: [];
      };
      scores: {
        Row: {
          round_id: string;
          member_id: string;
          hole: number;
          strokes: number | null;
          updated_at: string;
        };
        Insert: {
          round_id: string;
          member_id: string;
          hole: number;
          strokes?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scores"]["Insert"]>;
        Relationships: [];
      };
      round_comments: {
        Row: {
          id: string;
          round_id: string;
          author_id: string | null;
          author_name: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          author_id?: string | null;
          author_name: string;
          text: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["round_comments"]["Insert"]>;
        Relationships: [];
      };
      round_likes: {
        Row: { round_id: string; profile_id: string };
        Insert: { round_id: string; profile_id: string };
        Update: Partial<Database["public"]["Tables"]["round_likes"]["Insert"]>;
        Relationships: [];
      };
      feed_posts: {
        Row: {
          id: string;
          trip_id: string;
          author_id: string | null;
          author_name: string;
          type: string;
          text: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          author_id?: string | null;
          author_name: string;
          type?: string;
          text?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_posts"]["Insert"]>;
        Relationships: [];
      };
      feed_reactions: {
        Row: { post_id: string; profile_id: string; created_at: string };
        Insert: { post_id: string; profile_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["feed_reactions"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          description: string;
          amount: number;
          paid_by: string;
          split_among: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          description: string;
          amount: number;
          paid_by: string;
          split_among?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      lodging: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          address: string | null;
          checkin: string | null;
          checkout: string | null;
          cost: number | null;
          confirmation: string | null;
          paid_by: string | null;
          split_among: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name: string;
          address?: string | null;
          checkin?: string | null;
          checkout?: string | null;
          cost?: number | null;
          confirmation?: string | null;
          paid_by?: string | null;
          split_among?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lodging"]["Insert"]>;
        Relationships: [];
      };
      course_reviews: {
        Row: {
          id: string;
          course_name: string;
          round_id: string | null;
          author_id: string;
          rating: number;
          review: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_name: string;
          round_id?: string | null;
          author_id: string;
          rating: number;
          review?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_reviews"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
