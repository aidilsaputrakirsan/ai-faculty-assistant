// Central data-access layer. All Supabase queries live here so pages/hooks
// stay declarative and the query surface is easy to audit.

import { supabase } from './supabase';
import type {
  ActivityLog,
  AdminStats,
  Category,
  Conversation,
  Faq,
  FacultyDocument,
  Feedback,
  Message,
  Profile,
  Unit,
} from './types';

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ------------------------------ profile ------------------------------
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'program_studi'>>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  return unwrap(data, error);
}

// ----------------------------- categories ----------------------------
export async function listCategories(activeOnly = true): Promise<Category[]> {
  let q = supabase.from('categories').select('*').order('name');
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  return unwrap(data, error);
}

export async function createCategory(input: Partial<Category>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert(input)
    .select('*')
    .single();
  return unwrap(data, error);
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  return unwrap(data, error);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// -------------------------------- units ------------------------------
export async function listUnits(activeOnly = true): Promise<Unit[]> {
  let q = supabase.from('units').select('*').order('name');
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  return unwrap(data, error);
}

export async function createUnit(input: Partial<Unit>): Promise<Unit> {
  const { data, error } = await supabase.from('units').insert(input).select('*').single();
  return unwrap(data, error);
}

export async function updateUnit(id: string, patch: Partial<Unit>): Promise<Unit> {
  const { data, error } = await supabase
    .from('units')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  return unwrap(data, error);
}

export async function deleteUnit(id: string): Promise<void> {
  const { error } = await supabase.from('units').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// -------------------------------- FAQs -------------------------------
const FAQ_SELECT = '*, category:categories(*), unit:units(*)';

export interface FaqFilter {
  search?: string;
  categoryId?: string;
  status?: 'all' | 'active' | 'inactive';
  activeOnly?: boolean;
}

export async function listFaqs(filter: FaqFilter = {}): Promise<Faq[]> {
  let q = supabase.from('faqs').select(FAQ_SELECT).order('priority', { ascending: false });
  if (filter.activeOnly) q = q.eq('is_active', true);
  if (filter.status === 'active') q = q.eq('is_active', true);
  if (filter.status === 'inactive') q = q.eq('is_active', false);
  if (filter.categoryId) q = q.eq('category_id', filter.categoryId);
  if (filter.search) q = q.or(`question.ilike.%${filter.search}%,answer.ilike.%${filter.search}%`);
  const { data, error } = await q;
  return unwrap(data, error);
}

export async function getFaq(id: string): Promise<Faq | null> {
  const { data, error } = await supabase
    .from('faqs')
    .select(FAQ_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createFaq(input: Partial<Faq>): Promise<Faq> {
  const { data, error } = await supabase.from('faqs').insert(input).select(FAQ_SELECT).single();
  return unwrap(data, error);
}

export async function updateFaq(id: string, patch: Partial<Faq>): Promise<Faq> {
  const { data, error } = await supabase
    .from('faqs')
    .update(patch)
    .eq('id', id)
    .select(FAQ_SELECT)
    .single();
  return unwrap(data, error);
}

export async function deleteFaq(id: string): Promise<void> {
  const { error } = await supabase.from('faqs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ------------------------------ documents ----------------------------
const DOC_SELECT = '*, category:categories(*), unit:units(*)';

export async function listDocuments(adminView = false): Promise<FacultyDocument[]> {
  let q = supabase.from('documents').select(DOC_SELECT).order('created_at', { ascending: false });
  if (!adminView) q = q.eq('is_active', true).eq('is_public', true);
  const { data, error } = await q;
  return unwrap(data, error);
}

export async function createDocument(input: Partial<FacultyDocument>): Promise<FacultyDocument> {
  const { data, error } = await supabase
    .from('documents')
    .insert(input)
    .select(DOC_SELECT)
    .single();
  return unwrap(data, error);
}

export async function updateDocument(
  id: string,
  patch: Partial<FacultyDocument>,
): Promise<FacultyDocument> {
  const { data, error } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', id)
    .select(DOC_SELECT)
    .single();
  return unwrap(data, error);
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadDocumentFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

// Knowledge chunk used by the AI retrieval. For the MVP an admin can paste a
// searchable summary of a document; it is stored as a single chunk.
export async function replaceDocumentContent(
  documentId: string,
  content: string,
): Promise<void> {
  await supabase.from('document_chunks').delete().eq('document_id', documentId);
  const trimmed = content.trim();
  if (trimmed) {
    const { error } = await supabase
      .from('document_chunks')
      .insert({ document_id: documentId, chunk_index: 0, content: trimmed });
    if (error) throw new Error(error.message);
  }
}

export async function getDocumentContent(documentId: string): Promise<string> {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('document_id', documentId)
    .order('chunk_index');
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => d.content).join('\n\n');
}

export async function getDocumentUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}

// --------------------------- conversations ---------------------------
export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });
  return unwrap(data, error);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return unwrap(data, error);
}

// -------------------------------- chat -------------------------------
export interface ChatResponse {
  conversationId: string;
  message: Message;
  referredUnit: Unit | null;
}

export async function sendChat(question: string, conversationId?: string): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { question, conversationId },
  });
  if (error) {
    // Try to surface the function's error (JSON body, else status/text).
    let message = 'Terjadi kesalahan saat menghubungi layanan AI.';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.clone === 'function') {
      try {
        const body = await ctx.clone().json();
        if (body?.error) message = body.error;
        else message = `Layanan AI error (HTTP ${ctx.status}).`;
      } catch {
        try {
          const text = await ctx.text();
          message = `Layanan AI error (HTTP ${ctx.status}): ${text.slice(0, 200)}`;
        } catch {
          message = `Layanan AI tidak merespons (${(error as Error).message}).`;
        }
      }
    } else {
      message = `Layanan AI tidak dapat dihubungi: ${(error as Error).message}`;
    }
    throw new Error(message);
  }
  return data as ChatResponse;
}

// ------------------------------ feedback -----------------------------
export async function getFeedbackForMessages(messageIds: string[]): Promise<Feedback[]> {
  if (messageIds.length === 0) return [];
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .in('message_id', messageIds);
  return unwrap(data, error);
}

export async function submitFeedback(
  messageId: string,
  userId: string,
  rating: -1 | 1,
  comment: string,
): Promise<Feedback> {
  const { data, error } = await supabase
    .from('feedback')
    .upsert(
      { message_id: messageId, user_id: userId, rating, comment },
      { onConflict: 'message_id,user_id' },
    )
    .select('*')
    .single();
  return unwrap(data, error);
}

export interface AdminFeedbackRow extends Feedback {
  message: Pick<Message, 'content' | 'conversation_id'> | null;
}

export async function listAllFeedback(): Promise<AdminFeedbackRow[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*, message:messages(content, conversation_id)')
    .order('created_at', { ascending: false });
  return unwrap(data, error);
}

// ------------------------------- stats -------------------------------
export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats');
  return unwrap(data, error);
}

export async function listActivityLogs(limit = 100): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return unwrap(data, error);
}

export async function logActivity(
  actorId: string,
  action: string,
  entity: string,
  entityId?: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  // Best-effort; never block the UI on audit logging.
  await supabase
    .from('activity_logs')
    .insert({ actor_id: actorId, action, entity, entity_id: entityId ?? null, detail });
}

export async function adminUpdateUser(
  id: string,
  patch: Partial<Pick<Profile, 'role' | 'is_active'>>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  return unwrap(data, error);
}

export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return unwrap(data, error);
}
