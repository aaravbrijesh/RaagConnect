import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'viewer' | 'artist' | 'organizer' | 'admin';

export const useUserRoles = (userId: string | undefined) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    fetchRoles();
  }, [userId]);

  const fetchRoles = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      setRoles(data?.map(r => r.role as UserRole) || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: UserRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isArtist = hasRole('artist');
  const isOrganizer = hasRole('organizer');
  const isViewer = hasRole('viewer');
  
  const canCreateEvents = isArtist || isOrganizer || isAdmin;
  const canCreateArtistProfile = isArtist || isOrganizer || isAdmin;

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isArtist,
    isOrganizer,
    isViewer,
    canCreateEvents,
    canCreateArtistProfile,
    refetch: fetchRoles
  };
};