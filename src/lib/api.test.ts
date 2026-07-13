import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client used by api.ts.
const invoke = vi.fn();
vi.mock('./supabase', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
  isSupabaseConfigured: true,
}));

import { sendChat } from './api';

describe('sendChat', () => {
  beforeEach(() => invoke.mockReset());

  it('returns the function payload on success', async () => {
    invoke.mockResolvedValue({
      data: { conversationId: 'c1', message: { id: 'm1' }, referredUnit: null },
      error: null,
    });
    const res = await sendChat('halo');
    expect(res.conversationId).toBe('c1');
    expect(invoke).toHaveBeenCalledWith('chat', { body: { question: 'halo', conversationId: undefined } });
  });

  it('surfaces the function error message on failure', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'boom', context: { json: async () => ({ error: 'Terlalu banyak permintaan.' }) } },
    });
    await expect(sendChat('halo')).rejects.toThrow('Terlalu banyak permintaan.');
  });

  it('falls back to a generic message when no detail is available', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'network' } });
    await expect(sendChat('halo')).rejects.toThrow(/kesalahan/i);
  });
});
