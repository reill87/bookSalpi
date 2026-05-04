// Hand-written placeholder for Supabase generated types.
// Replace with `supabase gen types typescript --project-id <id>` output once a
// Supabase project exists. Mirrors supabase/migrations/0001_init.sql.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookStatus = "pending" | "analyzing" | "done" | "failed";
export type PickStatus = "wishlist" | "reading" | "read";
export type JobStatus = "success" | "failed";

export interface SimilarBook {
  title: string;
  author?: string;
  diff: string;
}

export interface ReadingCost {
  pages?: number;
  difficulty?: "입문" | "중급" | "심화";
  translation?: string;
  est_hours?: number;
}

export interface RawSource {
  type: "naver_blog" | "aladin_review" | "kyobo_review" | "blog" | "other";
  url: string;
  summary: string;
}

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          isbn: string | null;
          title: string;
          author: string | null;
          publisher: string | null;
          published_date: string | null;
          cover_url: string | null;
          description: string | null;
          toc: string | null;
          source_url: string | null;
          category: string | null;
          status: BookStatus;
          added_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          isbn?: string | null;
          title: string;
          author?: string | null;
          publisher?: string | null;
          published_date?: string | null;
          cover_url?: string | null;
          description?: string | null;
          toc?: string | null;
          source_url?: string | null;
          category?: string | null;
          status?: BookStatus;
          added_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["books"]["Insert"]>;
      };
      analyses: {
        Row: {
          id: string;
          book_id: string;
          target_reader: string | null;
          similar_books: SimilarBook[] | null;
          weaknesses: string | null;
          reading_cost: ReadingCost | null;
          raw_sources: RawSource[] | null;
          model_version: string;
          prompt_version: string;
          generated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          target_reader?: string | null;
          similar_books?: SimilarBook[] | null;
          weaknesses?: string | null;
          reading_cost?: ReadingCost | null;
          raw_sources?: RawSource[] | null;
          model_version: string;
          prompt_version: string;
          generated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analyses"]["Insert"]>;
      };
      user_picks: {
        Row: {
          user_id: string;
          book_id: string;
          status: PickStatus;
          personal_note: string | null;
          added_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          book_id: string;
          status: PickStatus;
          personal_note?: string | null;
          added_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_picks"]["Insert"]>;
      };
      analysis_jobs: {
        Row: {
          id: string;
          book_id: string;
          started_at: string;
          finished_at: string | null;
          status: JobStatus | null;
          error_log: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          started_at?: string;
          finished_at?: string | null;
          status?: JobStatus | null;
          error_log?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["analysis_jobs"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
