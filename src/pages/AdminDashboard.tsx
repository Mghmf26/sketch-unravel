import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ShieldCheck, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface UserRow {
  user_id: string;
  display_name: string | null;
  job_title: string | null;
  department: string | null;
  role: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');
    if (!profiles) return;
    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    setUsers(profiles.map((p: any) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      job_title: p.job_title,
      department: p.department,
      role: roleMap[p.user_id] || 'user',
    })));
  };

  useEffect(() => { loadUsers(); }, []);

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('user_roles').update({ role: newRole as any }).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Role updated' });
      loadUsers();
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (role !== 'admin') {
    return (
      <div className="p-8">
        <Card className="border-destructive/30">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-1">You need admin privileges to access this page.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Go to Overview</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform users and roles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-dashed border-primary/40 bg-card">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-2xl font-bold text-primary">{users.length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">Total Users</p>
            </div>
            <Users className="h-5 w-5 text-primary/60" />
          </CardContent>
        </Card>
        <Card className="border border-dashed border-primary/40 bg-card">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-2xl font-bold text-primary">{users.filter(u => u.role === 'admin').length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">Admins</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary/60" />
          </CardContent>
        </Card>
        <Card className="border border-dashed border-primary/40 bg-card">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-2xl font-bold text-primary">{users.filter(u => u.role === 'user').length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">Regular Users</p>
            </div>
            <Users className="h-5 w-5 text-primary/60" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">User Management</CardTitle>
          <CardDescription>View and manage all registered users and their roles</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase">Name</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Job Title</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Department</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-center">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No users found.</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium text-sm">{u.display_name || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.job_title || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.department || '—'}</TableCell>
                <TableCell className="text-center">
                  <Select value={u.role} onValueChange={(v) => updateRole(u.user_id, v)}>
                    <SelectTrigger className="w-28 mx-auto h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
