import { useState, useEffect, useMemo } from 'react';
import { Monitor, Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';

interface AppRow {
  id: string;
  name: string;
  app_type: string;
  description: string | null;
  application_owner: string | null;
  business_analyst_business: string | null;
  business_analyst_it: string | null;
  platform: string | null;
  step_id: string;
  process_id: string;
  parent_id: string | null;
  step_label: string;
  process_name: string;
}

export default function ApplicationScreenDetails() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOwner, setFilterOwner] = useState('__all__');
  const [filterPlatform, setFilterPlatform] = useState('__all__');
  const [filterBABusiness, setFilterBABusiness] = useState('__all__');
  const [filterBAIT, setFilterBAIT] = useState('__all__');
  const [filterType, setFilterType] = useState('__all__');

  useEffect(() => {
    const load = async () => {
      // Fetch apps with step and process info
      const { data: appData } = await supabase
        .from('step_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!appData || appData.length === 0) { setApps([]); setLoading(false); return; }

      // Get unique step_ids and process_ids
      const stepIds = [...new Set(appData.map(a => a.step_id))];
      const processIds = [...new Set(appData.map(a => a.process_id))];

      const [{ data: steps }, { data: processes }] = await Promise.all([
        supabase.from('process_steps').select('id, label').in('id', stepIds),
        supabase.from('business_processes').select('id, process_name').in('id', processIds),
      ]);

      const stepMap = new Map((steps || []).map(s => [s.id, s.label]));
      const processMap = new Map((processes || []).map(p => [p.id, p.process_name]));

      const rows: AppRow[] = appData.map(a => ({
        id: a.id,
        name: a.name,
        app_type: a.app_type || 'application',
        description: a.description,
        application_owner: (a as any).application_owner || null,
        business_analyst_business: (a as any).business_analyst_business || null,
        business_analyst_it: (a as any).business_analyst_it || null,
        platform: (a as any).platform || null,
        step_id: a.step_id,
        process_id: a.process_id,
        parent_id: a.parent_id,
        step_label: stepMap.get(a.step_id) || 'Unknown Step',
        process_name: processMap.get(a.process_id) || 'Unknown Process',
      }));

      setApps(rows);
      setLoading(false);
    };
    load();
  }, []);

  // Unique filter options
  const owners = useMemo(() => [...new Set(apps.map(a => a.application_owner).filter(Boolean))] as string[], [apps]);
  const platforms = useMemo(() => [...new Set(apps.map(a => a.platform).filter(Boolean))] as string[], [apps]);
  const baBizList = useMemo(() => [...new Set(apps.map(a => a.business_analyst_business).filter(Boolean))] as string[], [apps]);
  const baITList = useMemo(() => [...new Set(apps.map(a => a.business_analyst_it).filter(Boolean))] as string[], [apps]);

  const filtered = useMemo(() => {
    return apps.filter(a => {
      if (search) {
        const q = search.toLowerCase();
        if (![a.name, a.process_name, a.step_label, a.application_owner, a.platform, a.business_analyst_business, a.business_analyst_it]
          .some(v => v?.toLowerCase().includes(q))) return false;
      }
      if (filterOwner !== '__all__' && a.application_owner !== filterOwner) return false;
      if (filterPlatform !== '__all__' && a.platform !== filterPlatform) return false;
      if (filterBABusiness !== '__all__' && a.business_analyst_business !== filterBABusiness) return false;
      if (filterBAIT !== '__all__' && a.business_analyst_it !== filterBAIT) return false;
      if (filterType !== '__all__' && a.app_type !== filterType) return false;
      return true;
    });
  }, [apps, search, filterOwner, filterPlatform, filterBABusiness, filterBAIT, filterType]);

  const hasActiveFilters = filterOwner !== '__all__' || filterPlatform !== '__all__' || filterBABusiness !== '__all__' || filterBAIT !== '__all__' || filterType !== '__all__';

  const clearFilters = () => {
    setFilterOwner('__all__');
    setFilterPlatform('__all__');
    setFilterBABusiness('__all__');
    setFilterBAIT('__all__');
    setFilterType('__all__');
    setSearch('');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Application & Screen Details"
        description="Comprehensive view of all applications and screens linked to business process steps."
        icon={Monitor}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{apps.length}</div>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{apps.filter(a => a.app_type === 'application').length}</div>
            <p className="text-xs text-muted-foreground">Applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{apps.filter(a => a.app_type === 'screen').length}</div>
            <p className="text-xs text-muted-foreground">Screens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{new Set(apps.map(a => a.process_id)).size}</div>
            <p className="text-xs text-muted-foreground">Linked Processes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearFilters}>
                <X className="h-3 w-3" /> Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, process, step, owner, platform..." className="pl-9" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="screen">Screen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Owners</SelectItem>
                {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Platforms</SelectItem>
                {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBABusiness} onValueChange={setFilterBABusiness}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="BA (Business)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All BA (Business)</SelectItem>
                {baBizList.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBAIT} onValueChange={setFilterBAIT}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="BA (IT)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All BA (IT)</SelectItem>
                {baITList.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Monitor className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No applications or screens found</p>
              <p className="text-xs text-muted-foreground mt-1">Applications and screens are added through Steps in a Business Process.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold">Name</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Process Name</TableHead>
                    <TableHead className="text-xs font-semibold">Step</TableHead>
                    <TableHead className="text-xs font-semibold">Application Owner</TableHead>
                    <TableHead className="text-xs font-semibold">BA (Business)</TableHead>
                    <TableHead className="text-xs font-semibold">BA (IT)</TableHead>
                    <TableHead className="text-xs font-semibold">Platform</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(app => (
                    <TableRow key={app.id} className="hover:bg-muted/20">
                      <TableCell className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          {app.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${app.app_type === 'screen' ? 'border-sky-300 text-sky-700 bg-sky-50' : 'border-slate-300 text-slate-700 bg-slate-50'}`}>
                          {app.app_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{app.process_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{app.step_label}</TableCell>
                      <TableCell className="text-sm">{app.application_owner || <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                      <TableCell className="text-sm">{app.business_analyst_business || <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                      <TableCell className="text-sm">{app.business_analyst_it || <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                      <TableCell className="text-sm">{app.platform || <span className="text-muted-foreground italic text-xs">—</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Showing {filtered.length} of {apps.length} items · Applications and screens are managed at the Step level and inherited by their Business Process.
      </p>
    </div>
  );
}
