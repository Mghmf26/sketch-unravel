import { useState, useEffect, useMemo } from 'react';
import { useColumnSettings, type ColumnDef } from '@/hooks/useColumnSettings';
import { ColumnSettingsDropdown } from '@/components/ColumnSettingsDropdown';
import { PageHeader } from '@/components/PageHeader';

const APP_COLUMNS: ColumnDef[] = [
  { key: 'client', label: 'Client', defaultVisible: true, minWidth: 80 },
  { key: 'process', label: 'Process', defaultVisible: true, minWidth: 100 },
  { key: 'step', label: 'Step', defaultVisible: true, minWidth: 80 },
  { key: 'name', label: 'Name', defaultVisible: true, minWidth: 120 },
  { key: 'type', label: 'Type', defaultVisible: true, minWidth: 60 },
  { key: 'owner', label: 'App Owner', defaultVisible: true, minWidth: 80 },
  { key: 'ba_business', label: 'BA (Business)', defaultVisible: true, minWidth: 80 },
  { key: 'ba_it', label: 'BA (IT)', defaultVisible: true, minWidth: 80 },
  { key: 'platform', label: 'Platform', defaultVisible: true, minWidth: 70 },
];

import { Monitor, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

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
  client_id: string | null;
  client_name: string;
}

export default function ApplicationScreenDetails() {
  const colSettings = useColumnSettings('app-screen-details', APP_COLUMNS);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterProcess, setFilterProcess] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');

  useEffect(() => {
    const load = async () => {
      const { data: appData } = await supabase
        .from('step_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!appData || appData.length === 0) { setApps([]); setLoading(false); return; }

      const stepIds = [...new Set(appData.map(a => a.step_id))];
      const processIds = [...new Set(appData.map(a => a.process_id))];

      const [{ data: steps }, { data: processes }, { data: clients }] = await Promise.all([
        supabase.from('process_steps').select('id, label').in('id', stepIds),
        supabase.from('business_processes').select('id, process_name, client_id').in('id', processIds),
        supabase.from('clients').select('id, name'),
      ]);

      const stepMap = new Map((steps || []).map(s => [s.id, s.label]));
      const processMap = new Map((processes || []).map(p => [p.id, p]));
      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

      const rows: AppRow[] = appData.map(a => {
        const proc = processMap.get(a.process_id);
        return {
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
          step_label: stepMap.get(a.step_id) || '—',
          process_name: proc?.process_name || '—',
          client_id: proc?.client_id || null,
          client_name: proc?.client_id ? clientMap.get(proc.client_id) || '—' : '—',
        };
      });

      setApps(rows);
      setLoading(false);
    };
    load();
  }, []);

  const clients = useMemo(() => [...new Map(apps.filter(a => a.client_id).map(a => [a.client_id!, a.client_name])).entries()].map(([id, name]) => ({ id, name })), [apps]);
  const processes = useMemo(() => [...new Map(apps.map(a => [a.process_id, a.process_name])).entries()].map(([id, name]) => ({ id, name })), [apps]);
  const owners = useMemo(() => [...new Set(apps.map(a => a.application_owner).filter(Boolean))] as string[], [apps]);
  const platforms = useMemo(() => [...new Set(apps.map(a => a.platform).filter(Boolean))] as string[], [apps]);

  const filtered = useMemo(() => {
    return apps.filter(a => {
      if (filterClient !== 'all' && a.client_id !== filterClient) return false;
      if (filterProcess !== 'all' && a.process_id !== filterProcess) return false;
      if (filterType !== 'all' && a.app_type !== filterType) return false;
      if (filterOwner !== 'all' && a.application_owner !== filterOwner) return false;
      if (filterPlatform !== 'all' && a.platform !== filterPlatform) return false;
      if (search) {
        const q = search.toLowerCase();
        if (![a.name, a.process_name, a.step_label, a.application_owner, a.platform, a.client_name]
          .some(v => v?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [apps, search, filterClient, filterProcess, filterType, filterOwner, filterPlatform]);

  const hasFilters = search || filterClient !== 'all' || filterProcess !== 'all' || filterType !== 'all' || filterOwner !== 'all' || filterPlatform !== 'all';
  const clearFilters = () => { setSearch(''); setFilterClient('all'); setFilterProcess('all'); setFilterType('all'); setFilterOwner('all'); setFilterPlatform('all'); };

  const stats = {
    total: apps.length,
    applications: apps.filter(a => a.app_type === 'application').length,
    screens: apps.filter(a => a.app_type === 'screen').length,
    processes: new Set(apps.map(a => a.process_id)).size,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader
        title="Application & Screen Details"
        description="Comprehensive view of all applications and screens linked to business process steps"
        breadcrumbs={[
          { label: 'Portfolio', to: '/' },
          { label: 'Business Processes', to: '/processes' },
          { label: 'Scr./App.' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: stats.total, icon: Monitor },
          { label: 'Applications', value: stats.applications, icon: Monitor },
          { label: 'Screens', value: stats.screens, icon: Monitor },
          { label: 'Linked Processes', value: stats.processes, icon: Monitor },
        ].map(s => (
          <Card variant="elevated" key={s.label} className="border border-border/60">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase mt-0.5">{s.label}</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary/70" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProcess} onValueChange={setFilterProcess}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Processes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processes</SelectItem>
            {processes.filter(p => filterClient === 'all' || apps.some(a => a.process_id === p.id && (filterClient === 'all' || a.client_id === filterClient))).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="application">Application</SelectItem>
            <SelectItem value="screen">Screen</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterOwner} onValueChange={setFilterOwner}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
        <ColumnSettingsDropdown {...colSettings} />
      </div>

      {/* Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wide">Screens / Applications Registry</CardTitle>
            <span className="text-[10px] text-muted-foreground">{filtered.length} of {apps.length}</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  {colSettings.isVisible('client') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('client')}}>Client</TableHead>}
                  {colSettings.isVisible('process') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('process')}}>Process</TableHead>}
                  {colSettings.isVisible('step') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('step')}}>Step</TableHead>}
                  {colSettings.isVisible('name') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('name')}}>Name</TableHead>}
                  {colSettings.isVisible('type') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 text-center" style={{width: colSettings.getWidth('type')}}>Type</TableHead>}
                  {colSettings.isVisible('owner') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('owner')}}>App Owner</TableHead>}
                  {colSettings.isVisible('ba_business') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('ba_business')}}>BA (Business)</TableHead>}
                  {colSettings.isVisible('ba_it') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('ba_it')}}>BA (IT)</TableHead>}
                  {colSettings.isVisible('platform') && <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3" style={{width: colSettings.getWidth('platform')}}>Platform</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSettings.visibleColumns.length} className="text-center py-16 text-sm text-muted-foreground">
                      {hasFilters ? 'No items match the current filters.' : 'No applications or screens found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(app => (
                    <TableRow key={app.id} className="group hover:bg-muted/30">
                      {colSettings.isVisible('client') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{app.client_name}</TableCell>}
                      {colSettings.isVisible('process') && <TableCell className="text-xs font-medium text-foreground py-2.5 px-3 whitespace-nowrap">{app.process_name}</TableCell>}
                      {colSettings.isVisible('step') && <TableCell className="py-2.5 px-3"><Badge variant="outline" className="text-[10px] font-normal">{app.step_label}</Badge></TableCell>}
                      {colSettings.isVisible('name') && <TableCell className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{app.name}</p>
                            {app.description && <p className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5">{app.description}</p>}
                          </div>
                        </div>
                      </TableCell>}
                      {colSettings.isVisible('type') && <TableCell className="text-center py-2.5 px-3">
                        <Badge className={`text-[10px] border-0 font-medium capitalize ${app.app_type === 'screen' ? 'bg-sky-500/10 text-sky-600' : 'bg-primary/10 text-primary'}`}>{app.app_type}</Badge>
                      </TableCell>}
                      {colSettings.isVisible('owner') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{app.application_owner || '—'}</TableCell>}
                      {colSettings.isVisible('ba_business') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{app.business_analyst_business || '—'}</TableCell>}
                      {colSettings.isVisible('ba_it') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{app.business_analyst_it || '—'}</TableCell>}
                      {colSettings.isVisible('platform') && <TableCell className="text-xs text-muted-foreground py-2.5 px-3 whitespace-nowrap">{app.platform || '—'}</TableCell>}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
