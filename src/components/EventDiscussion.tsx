import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Megaphone, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  event_id: string;
  user_id: string;
  parent_id: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

interface EventDiscussionProps {
  eventId: string;
  organizerId: string;
}

export default function EventDiscussion({ eventId, organizerId }: EventDiscussionProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRoles(user?.id);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const canPostAnnouncements = user && (user.id === organizerId || isAdmin);

  useEffect(() => {
    fetchAnnouncements();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('event-announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_discussions',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('event_discussions')
      .select('*')
      .eq('event_id', eventId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data || []);
    }
  };

  const handlePostMessage = async () => {
    if (!canPostAnnouncements) {
      toast.error('Only event organizers can post announcements');
      return;
    }

    if (!newMessage.trim()) {
      toast.error('Please enter an announcement');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('event_discussions')
        .insert({
          event_id: eventId,
          user_id: user.id,
          message: newMessage.trim(),
          parent_id: null
        });

      if (error) throw error;

      setNewMessage('');
      toast.success('Announcement posted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('event_discussions')
        .delete()
        .eq('id', announcementId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Announcement deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">Event Announcements</h3>
      </div>

      {/* New announcement input - only for organizers */}
      {canPostAnnouncements && (
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Post an important update for attendees..."
              rows={3}
              className="mb-3"
            />
            <Button onClick={handlePostMessage} disabled={loading}>
              {loading ? 'Posting...' : 'Post Announcement'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Display announcements */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No announcements yet</p>
              <p className="text-sm mt-1">
                {canPostAnnouncements 
                  ? "Post updates to keep attendees informed about this event."
                  : "Check back closer to the event for important updates from the organizer."}
              </p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">Event Organizer</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{announcement.message}</p>
                    {user && user.id === announcement.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                        className="h-7 text-xs text-destructive hover:text-destructive mt-2"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}