import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const useAuthGuard = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const requireAuth = (action: string = 'perform this action') => {
    if (!user || !session) {
      toast.error(`Please sign in to ${action}`);
      navigate('/login');
      return false;
    }
    return true;
  };

  return { requireAuth, isAuthenticated: !!(user && session) };
};
