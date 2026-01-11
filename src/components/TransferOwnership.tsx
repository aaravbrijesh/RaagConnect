import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransferOwnershipProps {
  eventId: string;
  eventTitle: string;
  onTransferred: () => void;
}

export default function TransferOwnership({ eventId, eventTitle, onTransferred }: TransferOwnershipProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!email.trim()) {
      setSearchError('Please enter an email address');
      return;
    }

    setLoading(true);
    setSearchError(null);
    setFoundUser(null);

    try {
      // Search for user by email in profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        setSearchError('No user found with this email address. They must have an account first.');
        return;
      }

      // Check if user has organizer or artist role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id);

      if (rolesError) throw rolesError;

      const hasPermission = roles?.some(r => r.role === 'organizer' || r.role === 'artist' || r.role === 'admin');
      
      if (!hasPermission) {
        setSearchError('This user does not have organizer or artist permissions. They cannot own events.');
        return;
      }

      setFoundUser({
        id: profile.user_id,
        email: profile.email || email,
        full_name: profile.full_name
      });
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError('Failed to search for user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!foundUser) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('events')
        .update({ user_id: foundUser.id })
        .eq('id', eventId);

      if (error) throw error;

      toast.success(`Event ownership transferred to ${foundUser.full_name || foundUser.email}`);
      setOpen(false);
      setEmail('');
      setFoundUser(null);
      onTransferred();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error('Failed to transfer ownership. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setFoundUser(null);
    setSearchError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Event Ownership</DialogTitle>
          <DialogDescription>
            Transfer "{eventTitle}" to another organizer or artist. They will become the new owner and you will lose editing permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              This action cannot be undone. The new owner will have full control over this event.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="email">New Owner's Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="organizer@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFoundUser(null);
                  setSearchError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}

          {foundUser && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">User Found:</p>
              <div className="space-y-1">
                <p className="font-semibold">{foundUser.full_name || 'No name set'}</p>
                <p className="text-sm text-muted-foreground">{foundUser.email}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleTransfer}
            disabled={!foundUser || loading}
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Transferring...
              </>
            ) : (
              'Transfer Ownership'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
