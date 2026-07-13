// =====================================================================
// Edge Function: chat
// ---------------------------------------------------------------------
// Secure backend for the hybrid AI assistant.
//   1. Authenticates the caller with their Supabase JWT.
//   2. Applies a basic per-user rate limit.
//   3. Retrieves context from FAQs (structured) then document chunks.
//   4. Calls Groq with a strict system prompt (grounded answers only).
//   5. Persists the user + assistant messages, sources, and usage log.
//
// The GROQ_API_KEY is read from Edge Function secrets and NEVER exposed
// to the browser. All Groq traffic happens here.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile';

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 12; // max messages per window per user
const MAX_QUESTION_LEN = 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `Anda adalah "AI Faculty Assistant", asisten resmi fakultas.

ATURAN WAJIB:
- Jawab HANYA berdasarkan KONTEKS yang diberikan (FAQ dan dokumen fakultas).
- DILARANG mengarang, menebak, atau menambah informasi di luar konteks.
- Jika konteks tidak memuat jawaban yang pasti, JANGAN memberi kepastian. Sampaikan bahwa informasi belum cukup dan arahkan pengguna menghubungi unit terkait.
- Gunakan Bahasa Indonesia yang jelas, ringkas, dan profesional.
- Untuk pertanyaan bersifat pribadi/sensitif (nilai pribadi, data pribadi orang lain, keuangan pribadi), jangan menjawab spesifik; arahkan ke unit resmi.
- Jangan menyebutkan bahwa Anda sebuah model AI atau menyebut nama sistem internal.
- Jangan menuliskan bagian "Sumber:" di dalam jawaban; sumber ditampilkan terpisah oleh aplikasi.
- Jika informasi perlu dikonfirmasi ke petugas, tambahkan kalimat peringatan singkat.`;

interface Source {
  type: 'faq' | 'document' | 'unit';
  title: string;
  ref_id: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return json({ error: 'Tidak terautentikasi.' }, 401);

  // Admin client (service role) for trusted reads/writes.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve the caller from their JWT.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: 'Sesi tidak valid.' }, 401);
  const userId = userData.user.id;

  let payload: { conversationId?: string; question?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Permintaan tidak valid.' }, 400);
  }

  const question = (payload.question ?? '').trim();
  if (!question) return json({ error: 'Pertanyaan tidak boleh kosong.' }, 400);
  if (question.length > MAX_QUESTION_LEN) {
    return json({ error: 'Pertanyaan terlalu panjang.' }, 400);
  }

  // ------------------------- rate limiting ---------------------------
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await admin
    .from('usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return json(
      { error: 'Terlalu banyak permintaan. Silakan coba lagi sebentar lagi.' },
      429,
    );
  }

  // ---------------------- conversation handling ----------------------
  let conversationId = payload.conversationId;
  if (conversationId) {
    const { data: conv } = await admin
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!conv || conv.user_id !== userId) {
      return json({ error: 'Percakapan tidak ditemukan.' }, 404);
    }
  } else {
    const title = question.length > 60 ? question.slice(0, 57) + '...' : question;
    const { data: conv, error } = await admin
      .from('conversations')
      .insert({ user_id: userId, title })
      .select('id')
      .single();
    if (error || !conv) return json({ error: 'Gagal membuat percakapan.' }, 500);
    conversationId = conv.id;
  }

  // Save the user's message.
  await admin.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: question,
  });

  // ---------------------- hybrid retrieval ---------------------------
  const sources: Source[] = [];
  const contextParts: string[] = [];
  let referredUnitId: string | null = null;
  let referredUnit: Record<string, unknown> | null = null;
  let categoryId: string | null = null;

  const { data: faqs } = await admin.rpc('search_faqs', {
    query_text: question,
    max_results: 4,
  });

  if (faqs && faqs.length > 0) {
    for (const f of faqs) {
      contextParts.push(`[FAQ] ${f.question}\n${f.answer}`);
      sources.push({ type: 'faq', title: f.question, ref_id: f.id });
      if (!referredUnitId && f.unit_id) {
        referredUnitId = f.unit_id;
      }
    }
  }

  const { data: chunks } = await admin.rpc('search_chunks', {
    query_text: question,
    max_results: 3,
  });
  if (chunks && chunks.length > 0) {
    const seenDocs = new Set<string>();
    for (const c of chunks) {
      contextParts.push(`[Dokumen: ${c.document_title}]\n${c.content}`);
      if (!seenDocs.has(c.document_id)) {
        sources.push({ type: 'document', title: c.document_title, ref_id: c.document_id });
        seenDocs.add(c.document_id);
      }
    }
  }

  // Look up the referred unit for the "hand off to a human" case.
  if (referredUnitId) {
    const { data: unit } = await admin
      .from('units')
      .select('*')
      .eq('id', referredUnitId)
      .maybeSingle();
    referredUnit = unit;
  }

  const hasContext = contextParts.length > 0;

  // -------------------------- call Groq ------------------------------
  let answer = '';
  let needsHuman = false;
  let tokensUsed = 0;

  if (!hasContext) {
    // No grounded context -> do not call the model; hand off.
    needsHuman = true;
    answer =
      'Maaf, informasi yang tersedia belum cukup untuk memberikan jawaban yang pasti. ' +
      'Silakan konfirmasi ke unit terkait melalui kontak yang tersedia.';
  } else if (!GROQ_API_KEY) {
    return json({ error: 'Layanan AI belum dikonfigurasi. Hubungi administrator.' }, 503);
  } else {
    const userPrompt =
      `KONTEKS:\n${contextParts.join('\n\n---\n\n')}\n\n` +
      `PERTANYAAN PENGGUNA:\n${question}\n\n` +
      `Jawab berdasarkan konteks di atas saja. Jika konteks tidak menjawab pertanyaan, ` +
      `katakan informasi belum cukup dan sarankan menghubungi unit terkait.`;

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.2,
          max_tokens: 800,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!groqRes.ok) {
        const detail = await groqRes.text();
        console.error('Groq error', groqRes.status, detail);
        return json(
          { error: 'Layanan AI sedang mengalami gangguan. Silakan coba lagi nanti.' },
          502,
        );
      }

      const groqJson = await groqRes.json();
      answer = groqJson.choices?.[0]?.message?.content?.trim() ?? '';
      tokensUsed = groqJson.usage?.total_tokens ?? 0;

      if (!answer) {
        needsHuman = true;
        answer =
          'Maaf, jawaban belum dapat dipastikan dari informasi yang tersedia. ' +
          'Silakan hubungi unit terkait untuk konfirmasi.';
      } else {
        // Heuristic: if the model signalled uncertainty, mark for human follow-up.
        const lowered = answer.toLowerCase();
        needsHuman =
          lowered.includes('belum cukup') ||
          lowered.includes('tidak tersedia') ||
          lowered.includes('konfirmasi ke');
      }
    } catch (e) {
      console.error('Groq request failed', e);
      return json(
        { error: 'Tidak dapat menghubungi layanan AI. Silakan coba lagi nanti.' },
        502,
      );
    }
  }

  // Derive category from the top FAQ for statistics.
  if (faqs && faqs.length > 0) {
    const { data: topFaq } = await admin
      .from('faqs')
      .select('category_id')
      .eq('id', faqs[0].id)
      .maybeSingle();
    categoryId = topFaq?.category_id ?? null;
  }

  if (needsHuman && referredUnit) {
    sources.push({
      type: 'unit',
      title: referredUnit.name as string,
      ref_id: referredUnit.id as string,
    });
  }

  // Save the assistant message.
  const { data: assistantMsg } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: answer,
      sources,
      needs_human: needsHuman,
      referred_unit_id: needsHuman ? referredUnitId : null,
      model: hasContext ? GROQ_MODEL : '',
      tokens_used: tokensUsed,
    })
    .select('*')
    .single();

  // Bump conversation timestamp.
  await admin
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Usage log.
  await admin.from('usage_logs').insert({
    user_id: userId,
    conversation_id: conversationId,
    question,
    answered: !needsHuman,
    category_id: categoryId,
    model: hasContext ? GROQ_MODEL : '',
    tokens_used: tokensUsed,
  });

  return json({
    conversationId,
    message: assistantMsg,
    referredUnit: needsHuman ? referredUnit : null,
  });
});
