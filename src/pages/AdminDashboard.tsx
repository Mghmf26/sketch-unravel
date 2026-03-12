import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, ShieldCheck, Users, Plus, UserX, UserCheck, Trash2, Mail,
  Clock, Building2, ChevronDown, MoreHorizontal, Pause, Play, Eye, Shield
} from 'lucide-react';
import UserPermissionsEditor from '@/components/UserPermissionsEditor';
import PageVisibilityEditor from '@/components/PageVisibilityEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UserRow {
  user_id: string;
  email: string;
  display_name: string | null;
  job_title: string | null;
  department: string | null;
  role: string;
  status: string;
  last_sign_in: string | null;
  assigned_clients: { id: string; name: string }[];
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  client_id: string | null;
  client_name?: string;
}

interface Client {
  id: string;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  team_coordinator: 'Team Coordinator',
  team_participant: 'Team Participant',
  client_coordinator: 'Client Coordinator',
  client_participant: 'Client Participant',
  user: 'User',
  root: 'Root',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/30',
  team_coordinator: 'bg-blue-500/10 text-blue-700 border-blue-300',
  team_participant: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
  client_coordinator: 'bg-amber-500/10 text-amber-700 border-amber-300',
  client_participant: 'bg-violet-500/10 text-violet-700 border-violet-300',
  user: 'bg-muted text-muted-foreground border-border',
  root: 'bg-red-900/20 text-red-400 border-red-500/30',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { role, loading, session, isRoot } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState<string | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState<UserRow | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', display_name: '', role: 'team_participant', client_id: '', temp_password: 'TempPass123!' });
  const [inviting, setInviting] = useState(false);

  const invokeAdmin = async (action: string, params: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { action, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadAll = async () => {
    const [{ data: profiles }, { data: roles }, { data: cls }, { data: invs }, { data: assignments }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('clients').select('id, name'),
      supabase.from('invitations').select('*').order('created_at', { ascending: false }),
      supabase.from('client_assignments').select('user_id, client_id, clients(name)'),
    ]);
    setClients((cls || []) as Client[]);

    // Get auth users for last_sign_in
    let authUsersMap: Record<string, any> = {};
    try {
      const authData = await invokeAdmin('list_users');
      (authData?.users || []).forEach((u: any) => {
        authUsersMap[u.id] = u;
      });
    } catch { /* ignore */ }

    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

    const assignMap: Record<string, { id: string; name: string }[]> = {};
    (assignments || []).forEach((a: any) => {
      if (!assignMap[a.user_id]) assignMap[a.user_id] = [];
      assignMap[a.user_id].push({ id: a.client_id, name: (a as any).clients?.name || '' });
    });

    // Filter out root users from list (unless current user is root)
    const filteredProfiles = isRoot
      ? (profiles || [])
      : (profiles || []).filter((p: any) => roleMap[p.user_id] !== 'root');

    setUsers(filteredProfiles.map((p: any) => ({
      user_id: p.user_id,
      email: authUsersMap[p.user_id]?.email || '',
      display_name: p.display_name,
      job_title: p.job_title,
      department: p.department,
      role: roleMap[p.user_id] || 'user',
      status: p.status || 'active',
      last_sign_in: authUsersMap[p.user_id]?.last_sign_in_at || null,
      assigned_clients: assignMap[p.user_id] || [],
    })));

    const clientMap: Record<string, string> = {};
    (cls || []).forEach((c: any) => { clientMap[c.id] = c.name; });
    setInvitations((invs || []).map((i: any) => ({
      ...i,
      client_name: i.client_id ? clientMap[i.client_id] : undefined,
    })));
  };

  useEffect(() => { loadAll(); }, []);

  const handleInvite = async () => {
    setInviting(true);
    try {
      await invokeAdmin('invite', inviteForm);
      toast({ title: 'User invited', description: `Invitation sent to ${inviteForm.email}` });
      setShowInviteDialog(false);
      setInviteForm({ email: '', display_name: '', role: 'team_participant', client_id: '', temp_password: 'TempPass123!' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleAction = async (action: string, user_id: string) => {
    try {
      await invokeAdmin(action, { user_id });
      toast({ title: 'Success' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRoleChange = async (user_id: string, newRole: string) => {
    try {
      await invokeAdmin('update_role', { user_id, role: newRole });
      toast({ title: 'Role updated' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAssignClient = async (user_id: string, client_id: string) => {
    try {
      await invokeAdmin('assign_client', { user_id, client_id });
      toast({ title: 'Client assigned' });
      setShowAssignDialog(null);
      loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveAssignment = async (user_id: string, client_id: string) => {
    try {
      await invokeAdmin('remove_client_assignment', { user_id, client_id });
      toast({ title: 'Assignment removed' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  if (role !== 'admin') {
    return (
      <div className="p-8">
        <Card className="border-destructive/30">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-1">You need admin privileges.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Go to Overview</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage users, roles, invitations & client assignments</p>
          </div>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Users', count: users.length, icon: Users },
          { label: 'Admins', count: users.filter(u => u.role === 'admin').length, icon: ShieldCheck },
          { label: 'Team', count: users.filter(u => u.role.startsWith('team_')).length, icon: Users },
          { label: 'Clients', count: users.filter(u => u.role.startsWith('client_')).length, icon: Building2 },
          { label: 'Paused', count: users.filter(u => u.status === 'paused').length, icon: Pause },
        ].map(s => (
          <Card key={s.label} className="border border-dashed border-primary/40">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xl font-bold text-primary">{s.count}</p>
                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">{s.label}</p>
              </div>
              <s.icon className="h-4 w-4 text-primary/60" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
          {isRoot && <TabsTrigger value="page-visibility">Page Visibility</TabsTrigger>}
        </TabsList>

        <TabsContent value="users">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase">User</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-center">Role</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Clients</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Last Login</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No users</TableCell></TableRow>
                ) : users.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{u.display_name || '—'}</p>
                        <p className="text-[11px] text-muted-foreground">{u.department || ''} {u.job_title ? `· ${u.job_title}` : ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-center">
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                        <SelectTrigger className="w-40 mx-auto h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[10px] ${
                        u.status === 'active' ? 'border-emerald-300 text-emerald-700' :
                        u.status === 'paused' ? 'border-amber-300 text-amber-700' :
                        'border-destructive/30 text-destructive'
                      }`}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.assigned_clients.map(c => (
                          <Badge key={c.id} variant="secondary" className="text-[10px] gap-1">
                            {c.name}
                            <button onClick={() => handleRemoveAssignment(u.user_id, c.id)} className="ml-0.5 hover:text-destructive">×</button>
                          </Badge>
                        ))}
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => setShowAssignDialog(u.user_id)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_sign_in ? format(new Date(u.last_sign_in), 'dd MMM yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.status === 'active' ? (
                            <DropdownMenuItem onClick={() => handleAction('pause_user', u.user_id)}>
                              <Pause className="mr-2 h-3.5 w-3.5" /> Pause User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleAction('activate_user', u.user_id)}>
                              <Play className="mr-2 h-3.5 w-3.5" /> Activate User
                            </DropdownMenuItem>
                          )}
                          {(u.role === 'team_participant' || u.role === 'client_participant') && (
                            <DropdownMenuItem onClick={() => setShowPermissionsDialog(u)}>
                              <Shield className="mr-2 h-3.5 w-3.5" /> Permissions
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleAction('remove_user', u.user_id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card className="border-0 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Role</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Client</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No invitations</TableCell></TableRow>
                ) : invitations.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[inv.role] || ''}`}>
                        {ROLE_LABELS[inv.role] || inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.client_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${
                        inv.status === 'accepted' ? 'border-emerald-300 text-emerald-700' :
                        inv.status === 'pending' ? 'border-amber-300 text-amber-700' :
                        'border-destructive/30 text-destructive'
                      }`}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(inv.created_at), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>


        {isRoot && (
          <TabsContent value="page-visibility">
            <PageVisibilityEditor />
          </TabsContent>
        )}
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div>
              <Label>Display Name</Label>
              <Input value={inviteForm.display_name} onChange={e => setInviteForm(f => ({ ...f, display_name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'user').map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign to Client (optional)</Label>
              <Select value={inviteForm.client_id || '__none__'} onValueChange={v => setInviteForm(f => ({ ...f, client_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Temporary Password *</Label>
              <Input value={inviteForm.temp_password} onChange={e => setInviteForm(f => ({ ...f, temp_password: e.target.value }))} />
              <p className="text-[10px] text-muted-foreground mt-1">User will use this to sign in initially</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteForm.email}>
              {inviting ? 'Inviting...' : 'Create & Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Client Dialog */}
      <Dialog open={!!showAssignDialog} onOpenChange={() => setShowAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {clients.map(c => (
              <Button key={c.id} variant="outline" className="w-full justify-start" onClick={() => showAssignDialog && handleAssignClient(showAssignDialog, c.id)}>
                <Building2 className="mr-2 h-4 w-4" /> {c.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={!!showPermissionsDialog} onOpenChange={() => setShowPermissionsDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Permissions</DialogTitle>
          </DialogHeader>
          {showPermissionsDialog && (
            <UserPermissionsEditor
              userId={showPermissionsDialog.user_id}
              userName={showPermissionsDialog.display_name || showPermissionsDialog.email}
              onSaved={() => setShowPermissionsDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
