import { useSyncExternalStore, useMemo } from 'react';
import type { UserRole } from './useUserRoles';

export type ViewMode = 'attendee' | 'organizer' | 'teacher' | 'artist';

export const MODE_LABELS: Record<ViewMode, string> = {
  attendee: 'Attendee',
  organizer: 'Organizer',
  teacher: 'Teacher',
  artist: 'Artist',
};

const KEY = 'raag_view_mode';
const listeners = new Set<() => void>();

const read = (): ViewMode | null => {
  try { return (localStorage.getItem(KEY) as ViewMode) || null; } catch { return null; }
};

export const setViewMode = (m: ViewMode) => {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

/** Everyone is an attendee; host modes appear only for profiles the user has. */
export function availableModes(roles: UserRole[]): ViewMode[] {
  const modes: ViewMode[] = ['attendee'];
  if (roles.includes('organizer')) modes.push('organizer');
  if (roles.includes('teacher')) modes.push('teacher');
  if (roles.includes('artist')) modes.push('artist');
  return modes;
}

export function useViewMode(roles: UserRole[]) {
  const stored = useSyncExternalStore(subscribe, read, () => null);
  const modes = useMemo(() => availableModes(roles), [roles]);
  // Default hosts to their first host mode; attendees stay attendee.
  const mode: ViewMode = stored && modes.includes(stored) ? stored : modes[1] ?? 'attendee';
  return { mode, modes, setMode: setViewMode };
}
