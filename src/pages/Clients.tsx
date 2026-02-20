import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Users,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Loader2,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Client {
  id: string;
  name: string;
  industry: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  name: '',
  industry: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  notes: '',
  status: 'active',
};

const industries = [
  'Banking & Finance',
  'Insurance',
  'Healthcare',
  'Manufacturing',
  'Retail & E-commerce',
  'Technology',
  'Energy & Utilities',
  'Government',
  'Telecommunications',
  'Transportation & Logistics',
  'Other',
];

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error loading clients', description: error.message, variant: 'destructive' });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const openAdd = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setForm({
      name: c.name,
      industry: c.industry || '',
      contact_person: c.contact_person || '',
      contact_email: c.contact_email || '',
      contact_phone: c.contact_phone || '',
      address: c.address || '',
      notes: c.notes || '',
      status: c.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Client name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      industry: form.industry || null,
      contact_person: form.contact_person || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      address: form.address || null,
      notes: form.notes || null,
      status: form.status,
    };

    if (editingClient) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
      if (error) {
        toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Client updated' });
      }
    } else {
      const { error } = await supabase.from('clients').insert(payload);
      if (error) {
        toast({ title: 'Failed to add client', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Client added successfully' });
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchClients();
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    const { error } = await supabase.from('clients').delete().eq('id', deletingClient.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Client deleted' });
    }
    setDeleteDialogOpen(false);
    setDeletingClient(null);
    fetchClients();
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your clients and their business process engagements
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, industry, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3">
          <Card className="border border-dashed border-primary/40 bg-card px-4 py-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{clients.length}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </Card>
          <Card className="border border-dashed border-primary/40 bg-card px-4 py-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{clients.filter(c => c.status === 'active').length}</span>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-foreground">
                {search ? 'No clients match your search' : 'No clients yet'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'Try a different search term' : 'Add your first client to get started'}
              </p>
            </div>
            {!search && (
              <Button onClick={openAdd} variant="outline" className="gap-2 mt-2">
                <Plus className="h-4 w-4" /> Add Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card
              key={client.id}
              className="group border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{client.name}</h3>
                      {client.industry && (
                        <p className="text-xs text-muted-foreground truncate">{client.industry}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={client.status === 'active' ? 'default' : 'secondary'}
                      className={client.status === 'active' ? 'bg-primary/15 text-primary border-0 text-[10px]' : 'text-[10px]'}
                    >
                      {client.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(client)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => { setDeletingClient(client); setDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-1.5 mt-4">
                  {client.contact_person && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{client.contact_person}</span>
                    </div>
                  )}
                  {client.contact_email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{client.contact_email}</span>
                    </div>
                  )}
                  {client.contact_phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{client.contact_phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <p className="text-xs text-muted-foreground/70 mt-3 line-clamp-2 italic">{client.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Update client information below.' : 'Fill in the client details to add them to your platform.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Client Name *</Label>
              <Input id="name" placeholder="e.g. Acme Corporation" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input id="contact_person" placeholder="John Doe" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" type="email" placeholder="john@acme.com" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input id="contact_phone" placeholder="+1 234 567 890" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main St, City" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Additional notes about this client..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingClient ? 'Update Client' : 'Add Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingClient?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
