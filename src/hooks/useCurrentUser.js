import { useQuery } from '@tanstack/react-query';
import { flowdesk } from '@/api/flowdeskClient';

export function useCurrentUser() {
  const { data: user = null } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => flowdesk.auth.me(),
    staleTime: 5 * 60 * 1000,
  });
  return user;
}

/** Returns a short label like "Maria S." or email fallback */
export function userLabel(user) {
  if (!user) return 'Sistema';
  if (user.full_name) {
    const parts = user.full_name.trim().split(' ');
    if (parts.length > 1) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    return parts[0];
  }
  return user.email || 'Usuário';
}

/** Build a history entry string */
export function historyEntry(action, user, extra = '') {
  const who = userLabel(user);
  const ts = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return extra
    ? `[${ts}] ${action} por ${who} — ${extra}`
    : `[${ts}] ${action} por ${who}`;
}