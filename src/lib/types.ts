export type AppRole = "dba" | "admin" | "staff";
export type ShiftStatus = "draft" | "published";
export type FeedbackStatus = "new" | "read" | "archived";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserRole = { user_id: string; role: AppRole };

export type TeamMember = Profile & { role: AppRole | null };

export type DirectoryEntry = {
  id: string;
  full_name: string;
  job_title: string | null;
  role: AppRole;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type MenuItem = {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number; // numeric → number via select cast below
  image_url: string | null;
  dietary: string | null;
  is_available: boolean;
  is_popular: boolean;
  is_best_seller: boolean;
  is_spicy: boolean;
  is_preorder: boolean;
  sort_order: number;
  updated_at: string;
};

export type Shift = {
  id: number;
  staff_id: string;
  shift_date: string; // YYYY-MM-DD (Europe/London)
  start_time: string; // HH:MM:SS (Europe/London wall clock)
  end_time: string;
  position: string | null;
  notes: string | null;
  status: ShiftStatus;
  published_at: string | null;
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
  email: string;
  phone: string | null;
  comment: string;
  status: FeedbackStatus;
  created_at: string;
};

export type ActivityLog = {
  id: number;
  actor_email: string | null;
  action: "insert" | "update" | "delete";
  entity: string;
  entity_id: string | null;
  entity_label: string | null;
  changes: Record<string, unknown>;
  created_at: string;
};

export const ROLE_LABEL: Record<AppRole, string> = {
  dba: "Database Admin",
  admin: "Admin",
  staff: "Staff",
};
