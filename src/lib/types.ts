// Shared domain types mirroring the Supabase schema.

export type UserRole = 'admin' | 'user';
export type MessageRole = 'user' | 'assistant';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  program_studi: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  office_hours: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category_id: string | null;
  unit_id: string | null;
  keywords: string[];
  reference: string | null;
  priority: number;
  is_active: boolean;
  effective_date: string | null;
  expiry_date: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category | null;
  unit?: Unit | null;
}

export interface FacultyDocument {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  unit_id: string | null;
  year: number | null;
  doc_number: string | null;
  version: string | null;
  storage_path: string | null;
  is_public: boolean;
  is_active: boolean;
  effective_date: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  unit?: Unit | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageSource {
  type: 'faq' | 'document' | 'unit';
  title: string;
  ref_id: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources: MessageSource[];
  needs_human: boolean;
  referred_unit_id: string | null;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  message_id: string;
  user_id: string;
  rating: -1 | 1;
  comment: string | null;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_faqs: number;
  total_documents: number;
  total_conversations: number;
  questions_today: number;
  unanswered: number;
  feedback_positive: number;
  feedback_negative: number;
  top_categories: { name: string; count: number }[];
  usage_last_7_days: { day: string; count: number }[];
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}
