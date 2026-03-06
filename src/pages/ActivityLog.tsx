import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import {
  Clock, User, Filter, Search, Plus, Pencil, Trash2,
  Network, AlertTriangle, ShieldCheck, Scale, AlertCircle,
  Users, Database, Cpu, RefreshCw, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, string> | null;
  created_at: string;
}

const ENTITY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  business_processes: { label: 'Process', icon: Network, color: 'bg-blue-100 text-blue-700' },
  process_steps: { label: 'Step', icon: Network, color: 'bg-indigo-100 text-indigo-700' },
  risks: { label: 'Risk', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
  controls: { label: 'Control', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-700' },
  incidents: { label: 'Incident', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
  regulations: { label: 'Regulation', icon: Scale, color: 'bg-purple-100 text-purple-700' },
  clients: { label: 'Client', icon: Users, color: 'bg-sky-100 text-sky-700' },
  mainframe_imports: { label: 'Data Source', icon: Database, color: 'bg-orange-100 text-orange-700' },
  mainframe_flows: { label: 'MF Flow', icon: Cpu, color: 'bg-violet-100 text-violet-700' },
};

const ACTION_ICON: Record<string, React.ElementType> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
};

const ACTION_STYLE: Record<string, string> = {
  created: 'text-emerald-600',
  updated: 'text-blue-600',
  deleted: 'text-red-600',
};

export default function ActivityLog() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) setEntries(data as ActivityEntry[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterType !== 'all' && e.entity_type !== filterType) return false;
      if (filterAction !== 'all' && e.action !== filterAction) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          (e.entity_name || '').toLowerCase().includes(s) ||
          (e.user_email || '').toLowerCase().includes(s) ||
          e.entity_type.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [entries, filterType, filterAction, search]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, ActivityEntry[]> = {};
    filtered.forEach(e => {
      const day = format(new Date(e.created_at), 'yyyy-MM-dd');
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return groups;
  }, [filtered]);

  // Build navigation path for an activity entry
  const getNavigationPath = (entry: ActivityEntry): string | null => {
    if (entry.action === 'deleted' || !entry.entity_id) return null;
    const details = entry.details as Record<string, string> | null;
    const processId = details?.table === 'business_processes' ? entry.entity_id : null;
    
    switch (entry.entity_type) {
      case 'business_processes':
        return `/process-view/${entry.entity_id}`;
      case 'process_steps':
        // Steps belong to a process - navigate to process edit tab
        return null; // We'd need process_id from details, handled below
      case 'risks':
      case 'controls':
        return '/risks';
      case 'regulations':
        return '/regulations';
      case 'incidents':
        return '/incidents';
      case 'clients':
        return '/clients';
      case 'mainframe_imports':
        return '/imports';
      case 'mainframe_flows':
        return '/mainframe-flow-hub';
      default:
        return null;
    }
  };

  // Enhanced navigation using stored details
  const navigateToEntry = async (entry: ActivityEntry) => {
    if (entry.action === 'deleted') {
      return; // Can't navigate to deleted items
    }
    
    const entityType = entry.entity_type;
    const entityId = entry.entity_id;
    
    if (!entityId) return;

    try {
      switch (entityType) {
        case 'business_processes':
          navigate(`/process-view/${entityId}`);
          break;
        case 'process_steps': {
          // Find the process this step belongs to
          const { data: step } = await supabase.from('process_steps').select('process_id').eq('id', entityId).single();
          if (step) navigate(`/process-view/${step.process_id}?tab=edit`);
          break;
        }
        case 'risks': {
          const { data: risk } = await supabase.from('risks').select('process_id, step_id').eq('id', entityId).single();
          if (risk) navigate(`/process-view/${risk.process_id}?tab=diagram&stepId=${risk.step_id}`);
          else navigate('/risks');
          break;
        }
        case 'controls':
          navigate('/controls');
          break;
        case 'regulations': {
          const { data: reg } = await supabase.from('regulations').select('process_id').eq('id', entityId).single();
          if (reg) navigate(`/process-view/${reg.process_id}?tab=edit`);
          else navigate('/regulations');
          break;
        }
        case 'incidents': {
          const { data: inc } = await supabase.from('incidents').select('process_id').eq('id', entityId).single();
          if (inc) navigate(`/process-view/${inc.process_id}?tab=edit`);
          else navigate('/incidents');
          break;
        }
        case 'clients':
          navigate('/clients');
          break;
        case 'mainframe_imports':
          navigate('/imports');
          break;
        case 'mainframe_flows': {
          const { data: flow } = await supabase.from('mainframe_flows').select('process_id, step_id').eq('id', entityId).single();
          if (flow) navigate(`/process-view/${flow.process_id}?tab=mainframe-flows&stepId=${flow.step_id}&flowId=${entityId}`);
          else navigate('/mainframe-flow-hub');
          break;
        }
        default:
          break;
      }
    } catch {
      // If entity not found (deleted), just ignore
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Activity Log"
        description="Full audit trail of all changes across the platform"
        breadcrumbs={[
          { label: 'Portfolio', to: '/' },
          { label: 'Activity Log' },
        ]}
        actions={
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-muted/30 rounded-lg p-3 border">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or entity..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {Object.entries(ENTITY_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">{filtered.length} entries</Badge>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No activity recorded yet</p>
          <p className="text-xs mt-1">Changes to processes, risks, controls, and other entities will appear here.</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, dayEntries]) => (
              <div key={day}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 mb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {format(new Date(day), 'EEEE, MMMM d, yyyy')}
                  </h3>
                </div>
                <div className="relative pl-6 border-l-2 border-border space-y-1">
                  {dayEntries.map(entry => {
                    const meta = ENTITY_META[entry.entity_type] || { label: entry.entity_type, icon: Network, color: 'bg-muted text-muted-foreground' };
                    const ActionIcon = ACTION_ICON[entry.action] || Pencil;
                    const actionStyle = ACTION_STYLE[entry.action] || '';

                    return (
                      <div key={entry.id} className="relative group">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[31px] top-3 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center ${
                          entry.action === 'created' ? 'bg-emerald-500' :
                          entry.action === 'deleted' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          <ActionIcon className="h-2 w-2 text-white" />
                        </div>

                        <div 
                          className={`rounded-lg border bg-card hover:bg-accent/30 transition-colors p-3 ml-2 ${entry.action !== 'deleted' ? 'cursor-pointer' : ''}`}
                          onClick={() => entry.action !== 'deleted' && navigateToEntry(entry)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`shrink-0 rounded-md p-1.5 ${meta.color}`}>
                              <meta.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-semibold capitalize ${actionStyle}`}>
                                  {entry.action}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                                  {meta.label}
                                </Badge>
                                <span className="text-sm font-medium text-foreground truncate max-w-[300px]" title={entry.entity_name || ''}>
                                  {entry.entity_name || 'Unnamed'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {entry.user_email || 'System'}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(entry.created_at), 'HH:mm:ss')}
                                </span>
                              </div>
                            </div>
                            {entry.action !== 'deleted' && (
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
