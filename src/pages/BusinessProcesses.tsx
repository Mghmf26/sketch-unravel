import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { loadDiagrams, deleteDiagram } from '@/lib/store';
import type { EPCDiagram } from '@/types/epc';
import { exportToExcel } from '@/lib/excel-export';
import { toast } from '@/hooks/use-toast';

export default function BusinessProcesses() {
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<EPCDiagram[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setDiagrams(loadDiagrams());
  }, []);

  const filtered = useMemo(() => {
    return diagrams.filter((d) => {
      const matchesSearch =
        !search ||
        d.processName.toLowerCase().includes(search.toLowerCase()) ||
        d.processId.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || true; // all active for now
      return matchesSearch && matchesStatus;
    });
  }, [diagrams, search, statusFilter]);

  const handleDelete = (id: string, name: string) => {
    deleteDiagram(id);
    setDiagrams(loadDiagrams());
    toast({ title: 'Deleted', description: `"${name}" has been removed.` });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Processes</h1>
        <p className="text-sm text-muted-foreground">Manage and analyze business processes</p>
      </div>

      <Button
        onClick={() => navigate('/upload')}
        className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]"
      >
        <Plus className="mr-2 h-4 w-4" /> Add New Business Process
      </Button>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Client</label>
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Search</label>
          <Input
            placeholder="Search processes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold text-foreground">PROCESS NAME</TableHead>
              <TableHead className="font-semibold text-foreground">CLIENT</TableHead>
              <TableHead className="font-semibold text-foreground">OWNER</TableHead>
              <TableHead className="font-semibold text-foreground">DEPARTMENT</TableHead>
              <TableHead className="font-semibold text-foreground">STATUS</TableHead>
              <TableHead className="font-semibold text-foreground text-center">STEPS</TableHead>
              <TableHead className="font-semibold text-foreground text-center">RISKS</TableHead>
              <TableHead className="font-semibold text-foreground text-center">CONTROLS</TableHead>
              <TableHead className="font-semibold text-foreground text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No processes found. Click "Add New Business Process" to get started.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => {
                const risks = d.nodes.filter((n) => n.type === 'event').length;
                const controls = d.nodes.filter((n) => n.type === 'xor').length;
                return (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{d.processName}</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell>
                      <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 text-xs">
                        ACTIVE
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{d.nodes.length}</TableCell>
                    <TableCell className="text-center">{risks}</TableCell>
                    <TableCell className="text-center">{controls}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/view/${d.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/edit/${d.id}`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id, d.processName)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
