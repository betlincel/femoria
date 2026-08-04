export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["profile_role"];
          status: Database["public"]["Enums"]["profile_status"];
          display_name: string;
          locale: Database["public"]["Enums"]["locale_code"];
          city: string | null;
          district: string | null;
          neighborhood_public: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Database["public"]["Enums"]["profile_role"];
          status?: Database["public"]["Enums"]["profile_status"];
          display_name: string;
          locale?: Database["public"]["Enums"]["locale_code"];
          city?: string | null;
          district?: string | null;
          neighborhood_public?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      producer_profiles: {
        Row: {
          profile_id: string;
          story_tr: string;
          story_en: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
          delivery_regions: Json;
          approximate_area: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          story_tr?: string;
          story_en?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          delivery_regions?: Json;
          approximate_area?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["producer_profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "producer_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name_tr: string;
          name_en: string;
          kind: Database["public"]["Enums"]["category_kind"];
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name_tr: string;
          name_en: string;
          kind: Database["public"]["Enums"]["category_kind"];
          active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          producer_id: string;
          category_id: string;
          slug: string;
          title_tr: string;
          title_en: string;
          description_tr: string;
          description_en: string;
          price_minor: number;
          currency: string;
          status: Database["public"]["Enums"]["product_status"];
          stock_mode: Database["public"]["Enums"]["stock_mode"];
          stock_quantity: number | null;
          preparation_days: number;
          city: string;
          district: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          producer_id: string;
          category_id: string;
          slug: string;
          title_tr: string;
          title_en: string;
          description_tr: string;
          description_en: string;
          price_minor: number;
          currency?: string;
          status?: Database["public"]["Enums"]["product_status"];
          stock_mode?: Database["public"]["Enums"]["stock_mode"];
          stock_quantity?: number | null;
          preparation_days?: number;
          city: string;
          district: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_producer_id_fkey";
            columns: ["producer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          storage_path: string;
          alt_tr: string;
          alt_en: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          storage_path: string;
          alt_tr: string;
          alt_en: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_images"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: { buyer_id: string; product_id: string; created_at: string };
        Insert: { buyer_id: string; product_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["favorites"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "favorites_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      addresses: {
        Row: {
          id: string;
          profile_id: string;
          label: string;
          recipient_name: string;
          phone: string;
          address_line: string;
          city: string;
          district: string;
          postal_code: string | null;
          delivery_instructions: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          label: string;
          recipient_name: string;
          phone: string;
          address_line: string;
          city: string;
          district: string;
          postal_code?: string | null;
          delivery_instructions?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["addresses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      profile_role: "user" | "buyer" | "producer" | "admin";
      profile_status: "active" | "suspended";
      locale_code: "tr" | "en";
      verification_status: "pending" | "approved" | "rejected";
      category_kind: "food" | "craft";
      product_status: "draft" | "pending" | "approved" | "rejected";
      stock_mode: "in_stock" | "made_to_order" | "unavailable";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
