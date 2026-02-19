import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Plus, Search, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
      const matchesStatus = statusFilter === 'all' || true;
      return matchesSearch && matchesStatus;
    });
  }, [diagrams, search, statusFilter]);

  const handleDelete = (id: string, name: string) => {
    deleteDiagram(id);
    setDiagrams(loadDiagrams());
    toast({ title: 'Deleted', description: `"${name}" has been removed.` });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Business Processes</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and analyze business processes</p>
        </div>
        <Button
          onClick={() => navigate('/upload')}
          className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))] shadow-md shadow-[hsl(var(--success))]/20 hover:shadow-lg hover:shadow-[hsl(var(--success))]/30 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Business Process
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground tracking-wide uppercase mb-1.5 block">Client</label>
              <Select defaultValue="all">
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground tracking-wide uppercase mb-1.5 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground tracking-wide uppercase mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder="Search processes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Process Name</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Client</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Owner</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Department</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase">Status</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Steps</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Risks</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-center">Controls</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground tracking-wide uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">No processes found</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">Click "Add New Business Process" to get started</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => {
                const risks = d.nodes.filter((n) => n.type === 'event').length;
                const controls = d.nodes.filter((n) => n.type === 'xor').length;
                return (
                  <TableRow key={d.id} className="group hover:bg-[hsl(var(--success))]/[0.03] transition-colors">
                    <TableCell className="font-medium text-foreground">{d.processName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">—</TableCell>
                    <TableCell className="text-muted-foreground text-sm">—</TableCell>
                    <TableCell className="text-muted-foreground text-sm">—</TableCell>
                    <TableCell>
                      <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/20 border-0 text-[10px] font-bold tracking-wider shadow-none">
                        ACTIVE
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{d.nodes.length}</TableCell>
                    <TableCell className="text-center font-medium">{risks}</TableCell>
                    <TableCell className="text-center font-medium">{controls}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/view/${d.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View diagram</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/edit/${d.id}`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportToExcel(d)}>
                              <FileSpreadsheet className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Export Excel</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(d.id, d.processName)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
