import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

import handler, { __testables } from './functions/admin-profiles';

describe('admin-profiles function', () => {
  beforeEach(() => {
    mocks.createClient.mockClear();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('requires admin authorization for protected routes', async () => {
    const response = await handler(
      new Request('https://flowdesk.test/api/admin-profiles', { method: 'GET' }),
      {} as never
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/Autenticação obrigatória/);
  });

  it('validates profile e-mail addresses', () => {
    expect(() => __testables.assertEmail('bad-email')).toThrow('E-mail inválido.');
    expect(__testables.assertEmail(' Admin@Example.com ')).toBe('admin@example.com');
  });

  it('validates passwords and tab permissions', () => {
    expect(() => __testables.assertPassword('123')).toThrow('pelo menos 6 caracteres');
    expect(__testables.assertPassword('123456')).toBe('123456');
    expect(__testables.normalizeAllowedTabs(['Dashboard', 'Dashboard', 'Tarefas'])).toEqual(['Dashboard', 'Tarefas']);
    expect(() => __testables.normalizeAllowedTabs(['Dashboard', 42])).toThrow('allowed_tabs');
  });
});
