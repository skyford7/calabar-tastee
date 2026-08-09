import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fnwlnevaqxbabnvmxdtq.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2xuZXZhcXhiYWJudm14ZHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODYyMTksImV4cCI6MjA5NjE2MjIxOX0.ODpjh8_Qb3k4lymsFTu6AApiWwPg0ZZLbykbpI_NGnw';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: string;
  image_path: string;
  category: string;
  is_popular: boolean;
  is_best_seller: boolean;
  is_spicy: boolean;
  is_preorder: boolean;
  dietary: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OpeningHours = {
  id: number;
  day: string;
  day_label: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export type Feedback = {
  id: number;
  name: string;
  phone: string | null;
  email: string;
  comment: string;
  status: string;
  created_at: string;
};

export type ActivityLog = {
  id: number;
  action: string;
  user_email: string | null;
  details: string | null;
  created_at: string;
};
