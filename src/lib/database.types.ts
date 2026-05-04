// Hand-written placeholder for Supabase generated types.
// Replace with `supabase gen types typescript --project-id <id> --schema chaeksalpi`
// once the schema is applied. Mirrors supabase/migrations/0001_init.sql.
//
// 모든 책살피 테이블은 `chaeksalpi` schema 아래에 있으므로 Database 타입의 키도
// `chaeksalpi`로 노출합니다. createClient<Database, 'chaeksalpi'>로 사용.

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

export interface ChapterNote {
  read: boolean;
  note?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export type Book = Database["chaeksalpi"]["Tables"]["books"]["Row"];
export type Analysis = Database["chaeksalpi"]["Tables"]["analyses"]["Row"];
export type UserPick = Database["chaeksalpi"]["Tables"]["user_picks"]["Row"];

export type Database = {
  chaeksalpi: {
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
          added_context: string | null;
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
          added_context?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["chaeksalpi"]["Tables"]["books"]["Insert"]>;
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
        Update: Partial<Database["chaeksalpi"]["Tables"]["analyses"]["Insert"]>;
      };
      user_picks: {
        Row: {
          user_id: string;
          book_id: string;
          status: PickStatus;
          personal_note: string | null;
          note_before: string | null;
          note_after: string | null;
          chapter_notes: Record<string, ChapterNote>;
          added_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          book_id: string;
          status: PickStatus;
          personal_note?: string | null;
          note_before?: string | null;
          note_after?: string | null;
          chapter_notes?: Record<string, ChapterNote>;
          added_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["chaeksalpi"]["Tables"]["user_picks"]["Insert"]
        >;
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
          Database["chaeksalpi"]["Tables"]["analysis_jobs"]["Insert"]
        >;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
