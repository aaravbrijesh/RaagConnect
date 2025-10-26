import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Reply, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Discussion {
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
}

export default function EventDiscussion({ eventId }: EventDiscussionProps) {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDiscussions();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('event-discussions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_discussions',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          fetchDiscussions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const fetchDiscussions = async () => {
    const { data, error } = await supabase
      .from('event_discussions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching discussions:', error);
    } else {
      setDiscussions(data || []);
    }
  };

  const handlePostMessage = async () => {
    if (!user) {
      toast.error('Please sign in to post');
      return;
    }

    if (!newMessage.trim()) {
      toast.error('Please enter a message');
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
      toast.success('Message posted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to post message');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    if (!replyMessage.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('event_discussions')
        .insert({
          event_id: eventId,
          user_id: user.id,
          message: replyMessage.trim(),
          parent_id: parentId
        });

      if (error) throw error;

      setReplyMessage('');
      setReplyingTo(null);
      toast.success('Reply posted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to post reply');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (discussionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('event_discussions')
        .delete()
        .eq('id', discussionId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Message deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    }
  };

  const topLevelDiscussions = discussions.filter(d => !d.parent_id);

  const getReplies = (parentId: string) => {
    return discussions.filter(d => d.parent_id === parentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">Discussion Forum</h3>
      </div>

      {/* New message input */}
      {user && (
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Share your thoughts about this concert..."
              rows={3}
              className="mb-3"
            />
            <Button onClick={handlePostMessage} disabled={loading}>
              {loading ? 'Posting...' : 'Post Message'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Display discussions */}
      <div className="space-y-4">
        {topLevelDiscussions.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No discussions yet. Be the first to share your thoughts!</p>
            </CardContent>
          </Card>
        ) : (
          topLevelDiscussions.map((discussion) => (
            <Card key={discussion.id} className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {discussion.user_id.substring(0, 8)}...
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{discussion.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(discussion.id)}
                        className="h-7 text-xs"
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                      {user && user.id === discussion.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(discussion.id)}
                          className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {getReplies(discussion.id).map((reply) => (
                  <div key={reply.id} className="ml-8 mt-3 pl-4 border-l-2 border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="bg-secondary/50 rounded-full p-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs">
                            {reply.user_id.substring(0, 8)}...
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{reply.message}</p>
                        {user && user.id === reply.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(reply.id)}
                            className="h-6 text-xs text-destructive hover:text-destructive mt-1"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Reply input */}
                {replyingTo === discussion.id && user && (
                  <div className="ml-8 mt-3">
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Write your reply..."
                      rows={2}
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(discussion.id)}
                        disabled={loading}
                      >
                        {loading ? 'Posting...' : 'Post Reply'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyMessage('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}