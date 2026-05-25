import { describe, expect, it } from 'vitest';
import { getVisibleNavItems } from './navigation';

describe('navigation permissions', () => {
  it('shows all app tabs plus Perfis for admins', () => {
    const pages = getVisibleNavItems({ isAdmin: true, allowedTabs: null }).map((item) => item.page);

    expect(pages).toContain('Dashboard');
    expect(pages).toContain('AdministrativoINSS');
    expect(pages).toContain('Perfis');
  });

  it('shows only assigned tabs for regular users', () => {
    const pages = getVisibleNavItems({
      isAdmin: false,
      allowedTabs: ['Dashboard', 'Tarefas'],
    }).map((item) => item.page);

    expect(pages).toEqual(['Dashboard', 'Tarefas']);
    expect(pages).not.toContain('Perfis');
  });

  it('shows no tabs to regular users without assignments', () => {
    expect(getVisibleNavItems({ isAdmin: false, allowedTabs: [] })).toEqual([]);
  });
});
