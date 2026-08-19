import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { HandHeart, Plus, Trash2, ShoppingBasket, Wrench, Loader2 } from 'lucide-react';

type VolunteerRole = {
  id: string;
  event_id: string;
  kind: string;
  title: string;
  description: string | null;
  slots_needed: number;
};

type Signup = {
  id: string;
  role_id: string;
  user_id: string | null;
  volunteer_name: string;
  quantity: number;
  note: string | null;
};

interface Props {
  eventId: string;
  canManage: boolean;
}

export default function EventVolunteers({ eventId, canManage }: Props) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openRoleId, setOpenRoleId] = useState<string | null>(null);
  const [signupForm, setSignupForm] = useState({ name: '', quantity: '1', note: '' });
  const [newRole, setNewRole] = useState({ kind: 'job', title: '', description: '', slots_needed: '1' });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  useEffect(() => {
    if (user) {
      setSignupForm((prev) => ({
        ...prev,
        name: prev.name || (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || '',
      }));
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [rolesRes, signupsRes] = await Promise.all([
      supabase.from('event_volunteer_roles').select('*').eq('event_id', eventId).order('created_at'),
      supabase.from('event_volunteer_signups').select('*').eq('event_id', eventId).order('created_at'),
    ]);
    if (rolesRes.data) setRoles(rolesRes.data as VolunteerRole[]);
    if (signupsRes.data) setSignups(signupsRes.data as Signup[]);
    setLoading(false);
  };

  const filled = (roleId: string) =>
    signups.filter((s) => s.role_id === roleId).reduce((sum, s) => sum + (s.quantity || 1), 0);

  const handleAddRole = async () => {
    if (!newRole.title.trim()) {
      toast.error('Give this job or item a name');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('event_volunteer_roles').insert({
      event_id: eventId,
      kind: newRole.kind,
      title: newRole.title.trim(),
      description: newRole.description.trim() || null,
      slots_needed: Math.max(1, parseInt(newRole.slots_needed, 10) || 1),
    });
    setSaving(false);
    if (error) {
      toast.error('Could not add this item');
      return;
    }
    setNewRole({ kind: 'job', title: '', description: '', slots_needed: '1' });
    setShowAdd(false);
    fetchData();
  };

  const handleDeleteRole = async (id: string) => {
    const { error } = await supabase.from('event_volunteer_roles').delete().eq('id', id);
    if (error) toast.error('Could not remove');
    else fetchData();
  };

  const handleSignup = async (role: VolunteerRole) => {
    if (!signupForm.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('event_volunteer_signups').insert({
      role_id: role.id,
      event_id: eventId,
      user_id: user?.id ?? null,
      volunteer_name: signupForm.name.trim(),
      quantity: Math.max(1, parseInt(signupForm.quantity, 10) || 1),
      note: signupForm.note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not sign you up');
      return;
    }
    toast.success(`Thanks! You're signed up for "${role.title}"`);
    setSignupForm({ ...signupForm, quantity: '1', note: '' });
    setOpenRoleId(null);
    fetchData();
  };

  const handleRemoveSignup = async (id: string) => {
    const { error } = await supabase.from('event_volunteer_signups').delete().eq('id', id);
    if (error) toast.error('Could not remove sign-up');
    else fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading volunteer list...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-primary" />
            Volunteer &amp; Sign-Up Sheet
          </h3>
          <p className="text-sm text-muted-foreground">
            Claim a job or bring something for this event.
          </p>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" />
            Add Need
          </Button>
        )}
      </div>

      {canManage && showAdd && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              {[
                { value: 'job', label: 'Job / Task', icon: Wrench },
                { value: 'item', label: 'Item to Bring', icon: ShoppingBasket },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewRole({ ...newRole, kind: opt.value })}
                  className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    newRole.kind === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <opt.icon className="h-4 w-4 mb-1 mx-auto" />
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="vr-title">Title</Label>
                <Input
                  id="vr-title"
                  value={newRole.title}
                  onChange={(e) => setNewRole({ ...newRole, title: e.target.value })}
                  placeholder={newRole.kind === 'job' ? 'e.g. Sound setup, Ushering' : 'e.g. Water bottles, Snacks'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vr-slots">How many needed</Label>
                <Input
                  id="vr-slots"
                  type="number"
                  min="1"
                  value={newRole.slots_needed}
                  onChange={(e) => setNewRole({ ...newRole, slots_needed: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vr-desc">Details (optional)</Label>
              <Textarea
                id="vr-desc"
                rows={2}
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Any instructions for volunteers"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAddRole} disabled={saving}>Add</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-lg p-6 text-center">
          {canManage
            ? 'No volunteer needs yet. Add the jobs and items you need help with.'
            : 'The organizer has not posted any volunteer needs for this event.'}
        </p>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const taken = filled(role.id);
            const remaining = Math.max(0, role.slots_needed - taken);
            const roleSignups = signups.filter((s) => s.role_id === role.id);
            return (
              <Card key={role.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1">
                          {role.kind === 'item' ? <ShoppingBasket className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                          {role.kind === 'item' ? 'Bring' : 'Job'}
                        </Badge>
                        <span className="font-semibold">{role.title}</span>
                        <Badge variant={remaining === 0 ? 'outline' : 'default'}>
                          {remaining === 0 ? 'Filled' : `${remaining} of ${role.slots_needed} left`}
                        </Badge>
                      </div>
                      {role.description && (
                        <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {remaining > 0 && (
                        <Button
                          size="sm"
                          onClick={() => setOpenRoleId(openRoleId === role.id ? null : role.id)}
                        >
                          Sign Up
                        </Button>
                      )}
                      {canManage && (
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteRole(role.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {openRoleId === role.id && (
                    <div className="space-y-3 rounded-lg bg-muted/40 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-2">
                          <Label htmlFor={`name-${role.id}`}>Your name</Label>
                          <Input
                            id={`name-${role.id}`}
                            value={signupForm.name}
                            onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`qty-${role.id}`}>{role.kind === 'item' ? 'Quantity' : 'People'}</Label>
                          <Input
                            id={`qty-${role.id}`}
                            type="number"
                            min="1"
                            max={remaining}
                            value={signupForm.quantity}
                            onChange={(e) => setSignupForm({ ...signupForm, quantity: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`note-${role.id}`}>Note (optional)</Label>
                        <Input
                          id={`note-${role.id}`}
                          value={signupForm.note}
                          onChange={(e) => setSignupForm({ ...signupForm, note: e.target.value })}
                          placeholder="e.g. Bringing 2 trays of samosas"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setOpenRoleId(null)}>Cancel</Button>
                        <Button size="sm" disabled={saving} onClick={() => handleSignup(role)}>
                          Confirm Sign-Up
                        </Button>
                      </div>
                    </div>
                  )}

                  {roleSignups.length > 0 && (
                    <>
                      <Separator />
                      <ul className="space-y-1">
                        {roleSignups.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                            <span>
                              <span className="font-medium">{s.volunteer_name}</span>
                              {s.quantity > 1 && <span className="text-muted-foreground"> ×{s.quantity}</span>}
                              {s.note && <span className="text-muted-foreground"> — {s.note}</span>}
                            </span>
                            {(canManage || (user && s.user_id === user.id)) && (
                              <Button size="icon" variant="ghost" onClick={() => handleRemoveSignup(s.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
