import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Provide default env for modules that read import.meta.env at import time.
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
