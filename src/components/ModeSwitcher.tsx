import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useViewMode, MODE_LABELS, type ViewMode } from '@/hooks/useViewMode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Shown only when the user has more than one profile (attendee + a host profile). */
export default function ModeSwitcher() {
  const { user } = useAuth();
  const { roles, loading } = useUserRoles(user?.id);
  const { mode, modes, setMode } = useViewMode(roles);
  const navigate = useNavigate();

  if (!user || loading || modes.length < 2) return null;

  return (
    <Select
      value={mode}
      onValueChange={(v) => {
        setMode(v as ViewMode);
        navigate('/');
      }}
    >
      <SelectTrigger className="h-9 w-[150px]" aria-label="Switch mode">
        <span className="text-xs text-muted-foreground mr-1">Mode:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {modes.map((m) => (
          <SelectItem key={m} value={m}>{MODE_LABELS[m]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
