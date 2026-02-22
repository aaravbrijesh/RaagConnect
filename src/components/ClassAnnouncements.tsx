import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Megaphone, Send, Loader2, Trash2 } from 'lucide-react';

interface ClassAnnouncementsProps {
  classId: string;
  isOwner: boolean;
}

export default function ClassAnnouncements({ classId, isOwner }: ClassAnnouncementsProps) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('class_announcements')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!message.trim() || !user) return;
    setPosting(true);
    try {
      const { error } = await supabase.from('class_announcements').insert({
        class_id: classId,
        user_id: user.id,
        message: message.trim(),
      });
      if (error) throw error;
      setMessage('');
      toast.success('Announcement posted');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error('Failed to post: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('class_announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error('Failed to delete');
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> Announcements
        </h3>

        {isOwner && (
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Post an update for your students…"
              rows={2}
              className="text-sm resize-none"
            />
            <Button size="sm" onClick={handlePost} disabled={posting || !message.trim()} className="gap-1.5">
              {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Post
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No announcements yet</p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {announcements.map(a => (
              <div key={a.id} className="border-l-2 border-primary/30 pl-3 py-1">
                <p className="text-sm text-foreground whitespace-pre-wrap">{a.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(a.created_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                  {isOwner && (
                    <button onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
