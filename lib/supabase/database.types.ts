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
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
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
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
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
          {
            foreignKeyName: "products_reviewed_by_fkey";
            columns: ["reviewed_by"];
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
          neighborhood: string | null;
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
          neighborhood?: string | null;
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
      carts: {
        Row: { id: string; user_id: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["carts"]["Insert"]>;
        Relationships: [{ foreignKeyName: "carts_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      cart_items: {
        Row: { id: string; cart_id: string; product_id: string; quantity: number; created_at: string; updated_at: string };
        Insert: { id?: string; cart_id: string; product_id: string; quantity: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["cart_items"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "cart_items_cart_id_fkey"; columns: ["cart_id"]; isOneToOne: false; referencedRelation: "carts"; referencedColumns: ["id"] },
          { foreignKeyName: "cart_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
      orders: {
        Row: {
          id: string; checkout_group_id: string; checkout_attempt_id: string; buyer_id: string; producer_id: string;
          producer_name_snapshot: string; order_number: string; order_status: Database["public"]["Enums"]["order_status"];
          payment_status: Database["public"]["Enums"]["payment_status"]; currency: string; subtotal_minor: number;
          shipping_minor: number; total_minor: number; recipient_name: string; phone: string; city: string; district: string;
          neighborhood: string; address_line: string; postal_code: string | null; delivery_note: string | null;
          shipping_carrier: string | null; tracking_number: string | null; tracking_url: string | null; shipped_at: string | null;
          created_at: string; updated_at: string; paid_at: string | null; expires_at: string | null;
        };
        Insert: {
          id?: string; checkout_group_id: string; checkout_attempt_id: string; buyer_id: string; producer_id: string;
          producer_name_snapshot: string; order_number: string; order_status?: Database["public"]["Enums"]["order_status"];
          payment_status?: Database["public"]["Enums"]["payment_status"]; currency: string; subtotal_minor: number;
          shipping_minor?: number; total_minor: number; recipient_name: string; phone: string; city: string; district: string;
          neighborhood: string; address_line: string; postal_code?: string | null; delivery_note?: string | null;
          shipping_carrier?: string | null; tracking_number?: string | null; tracking_url?: string | null; shipped_at?: string | null;
          created_at?: string; updated_at?: string; paid_at?: string | null; expires_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "orders_buyer_id_fkey"; columns: ["buyer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "orders_producer_id_fkey"; columns: ["producer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      order_items: {
        Row: {
          id: string; order_id: string; product_id: string | null; product_slug_snapshot: string;
          product_title_tr_snapshot: string; product_title_en_snapshot: string; unit_price_minor: number;
          quantity: number; line_total_minor: number; image_path_snapshot: string | null; created_at: string;
        };
        Insert: {
          id?: string; order_id: string; product_id?: string | null; product_slug_snapshot: string;
          product_title_tr_snapshot: string; product_title_en_snapshot: string; unit_price_minor: number;
          quantity: number; line_total_minor: number; image_path_snapshot?: string | null; created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "order_items_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      add_product_to_cart: { Args: { target_product_id: string; input_quantity?: number }; Returns: string };
      clear_cart: { Args: Record<PropertyKey, never>; Returns: number };
      create_awaiting_payment_orders: { Args: { target_address_id: string; checkout_attempt_id: string }; Returns: Json };
      create_user_address: {
        Args: { input_label: string; input_recipient_name: string; input_phone: string; input_city: string; input_district: string; input_neighborhood: string; input_address_line: string; input_postal_code?: string | null; input_delivery_note?: string | null; input_is_default?: boolean };
        Returns: string;
      };
      delete_user_address: { Args: { target_address_id: string }; Returns: boolean };
      get_cart_quantity: { Args: Record<PropertyKey, never>; Returns: number };
      get_cart_snapshot: { Args: Record<PropertyKey, never>; Returns: Json };
      mark_seller_order_preparing: { Args: { target_order_id: string }; Returns: boolean };
      mark_seller_order_shipped: { Args: { target_order_id: string; input_shipping_carrier: string; input_tracking_number: string; input_tracking_url?: string | null }; Returns: boolean };
      remove_cart_item: { Args: { target_cart_item_id: string }; Returns: boolean };
      set_default_user_address: { Args: { target_address_id: string }; Returns: boolean };
      update_cart_item_quantity: { Args: { target_cart_item_id: string; input_quantity: number }; Returns: boolean };
      update_user_address: {
        Args: { target_address_id: string; input_label: string; input_recipient_name: string; input_phone: string; input_city: string; input_district: string; input_neighborhood: string; input_address_line: string; input_postal_code?: string | null; input_delivery_note?: string | null; input_is_default?: boolean };
        Returns: boolean;
      };
      add_seller_product_image: {
        Args: { target_product_id: string; input_storage_path: string; input_alt_tr: string; input_alt_en: string };
        Returns: string | null;
      };
      create_seller_product: {
        Args: {
          input_category_id: string; input_slug: string; input_title_tr: string; input_title_en: string;
          input_description_tr: string; input_description_en: string; input_price_minor: number;
          input_currency: string; input_stock_mode: Database["public"]["Enums"]["stock_mode"];
          input_stock_quantity: number | null; input_preparation_days: number; input_city: string; input_district: string;
        };
        Returns: string;
      };
      delete_seller_product_image: { Args: { target_image_id: string }; Returns: string | null };
      reorder_seller_product_images: { Args: { target_product_id: string; ordered_image_ids: string[] }; Returns: boolean };
      review_producer_application: {
        Args: {
          target_profile_id: string;
          review_action: string;
        };
        Returns: boolean;
      };
      review_product: {
        Args: {
          target_product_id: string;
          review_action: string;
          input_rejection_reason?: string | null;
        };
        Returns: boolean;
      };
      submit_product_for_review: { Args: { target_product_id: string }; Returns: boolean };
      update_seller_product: {
        Args: {
          target_product_id: string; input_category_id: string; input_slug: string; input_title_tr: string; input_title_en: string;
          input_description_tr: string; input_description_en: string; input_price_minor: number;
          input_currency: string; input_stock_mode: Database["public"]["Enums"]["stock_mode"];
          input_stock_quantity: number | null; input_preparation_days: number; input_city: string; input_district: string;
        };
        Returns: boolean;
      };
      update_seller_product_image_alt: {
        Args: { target_image_id: string; input_alt_tr: string; input_alt_en: string };
        Returns: boolean;
      };
    };
    Enums: {
      profile_role: "user" | "buyer" | "producer" | "admin";
      profile_status: "active" | "suspended";
      locale_code: "tr" | "en";
      verification_status: "pending" | "approved" | "rejected";
      category_kind: "food" | "craft";
      product_status: "draft" | "pending" | "approved" | "rejected";
      stock_mode: "in_stock" | "made_to_order" | "unavailable";
      order_status: "awaiting_payment" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled" | "expired";
      payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
