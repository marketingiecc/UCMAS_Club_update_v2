// Minimal Supabase Database types for this frontend.
// - Keeps the app compiling even when generated types are not vendored.
// - Uses permissive `any` rows so `.from('table')` works for all tables.
//
// If you want strict typing, replace this file with the generated output from:
// `supabase gen types typescript --project-id ... --schema public`
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericTable = {
  Row: Record<string, any>;
  Insert: Record<string, any>;
  Update: Record<string, any>;
  Relationships: any[];
};

export type Database = {
  public: {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericTable>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
    CompositeTypes: Record<string, any>;
  };
};

