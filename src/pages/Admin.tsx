import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Users, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Nav from '@/components/Nav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface UserWithRoles {
  user_id: string;
  email: string;
  roles: string[];
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
  user_email?: string;
}

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [isAdmin, rolesLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchAuditLogs();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email');

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersMap = new Map<string, UserWithRoles>();
      
      profiles?.forEach(profile => {
        usersMap.set(profile.user_id, {
          user_id: profile.user_id,
          email: profile.email || 'No email',
          roles: []
        });
      });

      rolesData?.forEach(roleEntry => {
        const user = usersMap.get(roleEntry.user_id);
        if (user) {
          user.roles.push(roleEntry.role);
        }
      });

      setUsers(Array.from(usersMap.values()));
    } catch (error: any) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as 'viewer' | 'artist' | 'organizer' | 'admin' });

      if (error) throw error;

      toast.success(`Added ${role} role`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add role');
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as 'viewer' | 'artist' | 'organizer' | 'admin');

      if (error) throw error;

      toast.success(`Removed ${role} role`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove role');
    }
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Fetch user emails
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email');

      if (profilesError) throw profilesError;

      const emailMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);
      
      const logsWithEmails = logs?.map(log => ({
        ...log,
        user_email: emailMap.get(log.user_id) || 'Unknown user'
      })) || [];

      setAuditLogs(logsWithEmails);
    } catch (error: any) {
      toast.error('Failed to load audit logs');
      console.error(error);
    } finally {
      setLogsLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
    };
    return variants[action] || 'outline';
  };

  const formatTableName = (table: string) => {
    return table.charAt(0).toUpperCase() + table.slice(1);
  };

  if (rolesLoading || loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Nav />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="audit">Site Edits</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((userEntry) => (
                    <div
                      key={userEntry.user_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border/50 rounded-lg bg-card/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{userEntry.email}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {userEntry.user_id}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {userEntry.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={
                                role === 'admin'
                                  ? 'default'
                                  : role === 'artist'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="flex items-center gap-1"
                            >
                              {role}
                              <button
                                onClick={() => handleRemoveRole(userEntry.user_id, role)}
                                className="ml-1 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(role) => handleAddRole(userEntry.user_id, role)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Add role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="artist">Artist</SelectItem>
                            <SelectItem value="organizer">Organizer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Site Data Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading audit logs...</p>
                ) : auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No edits recorded yet</p>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 border border-border/50 rounded-lg bg-card/50"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getActionBadge(log.action)}>
                              {log.action.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{formatTableName(log.table_name)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          By: {log.user_email}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          Record ID: {log.record_id}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}