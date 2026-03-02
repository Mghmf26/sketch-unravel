import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Save, Shield, Layout, Blocks, Network } from 'lucide-react';

const PAGE_OPTIONS = [
  { slug: 'dashboard', label: 'Overview Dashboard' },
  { slug: 'clients', label: 'Clients / Engagements' },
  { slug: 'processes', label: 'All Processes' },
  { slug: 'risks-controls', label: 'Risks' },
  { slug: 'controls', label: 'Controls' },
  { slug: 'regulations', label: 'Regulations' },
  { slug: 'incidents', label: 'Incidents' },
  { slug: 'mainframe-imports', label: 'MF Data Sources' },
  { slug: 'analysis', label: 'Analysis (all scenario modes)' },
  { slug: 'visual-analytics', label: 'Visual Analytics' },
  { slug: 'ai-reports', label: 'AI Reports' },
  { slug: 'client-reports', label: 'Client Reports' },
  { slug: 'data-entry', label: 'Data Entry / New Process' },
  { slug: 'upload', label: 'Upload & Extract' },
];

const MODULE_OPTIONS = [
  { slug: 'steps', label: 'Steps' },
  { slug: 'risks', label: 'Risks' },
  { slug: 'controls', label: 'Controls' },
  { slug: 'regulations', label: 'Regulations' },
  { slug: 'incidents', label: 'Incidents' },
  { slug: 'raci', label: 'RACI Matrix' },
  { slug: 'imports', label: 'MF Imports' },
  { slug: 'ai', label: 'AI / Questionnaire' },
];

interface Props {
  userId: string;
  userName: string;
  onSaved?: () => void;
}

export default function UserPermissionsEditor({ userId, userName, onSaved }: Props) {
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [excludedProcessIds, setExcludedProcessIds] = useState<string[]>([]);
  const [processes, setProcesses] = useState<{ id: string; process_name: string; client_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: perms }, { data: procs }] = await Promise.all([
        supabase.from('user_permissions').select('*').eq('user_id', userId).single(),
        supabase.from('business_processes').select('id, process_name, clients(name)'),
      ]);

      if (perms) {
        setAllowedPages((perms as any).allowed_pages || []);
        setAllowedModules((perms as any).allowed_modules || []);
        setExcludedProcessIds((perms as any).excluded_process_ids || []);
      } else {
        // Create default permissions row
        setAllowedPages(PAGE_OPTIONS.map(p => p.slug));
        setAllowedModules(MODULE_OPTIONS.map(m => m.slug));
        setExcludedProcessIds([]);
      }

      setProcesses((procs || []).map((p: any) => ({
        id: p.id,
        process_name: p.process_name,
        client_name: p.clients?.name || 'No client',
      })));
      setLoading(false);
    };
    load();
  }, [userId]);

  const togglePage = (slug: string) => {
    setAllowedPages(prev => prev.includes(slug) ? prev.filter(p => p !== slug) : [...prev, slug]);
  };

  const toggleModule = (slug: string) => {
    setAllowedModules(prev => prev.includes(slug) ? prev.filter(m => m !== slug) : [...prev, slug]);
  };

  const toggleProcessExclusion = (processId: string) => {
    setExcludedProcessIds(prev => prev.includes(processId) ? prev.filter(p => p !== processId) : [...prev, processId]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('user_permissions').upsert({
        user_id: userId,
        allowed_pages: allowedPages,
        allowed_modules: allowedModules,
        excluded_process_ids: excludedProcessIds,
      } as any, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: 'Permissions saved', description: `Updated permissions for ${userName}` });
      onSaved?.();
    } catch (err: any) {
      toast({ title: 'Error saving permissions', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectAllPages = () => setAllowedPages(PAGE_OPTIONS.map(p => p.slug));
  const clearAllPages = () => setAllowedPages([]);
  const selectAllModules = () => setAllowedModules(MODULE_OPTIONS.map(m => m.slug));
  const clearAllModules = () => setAllowedModules([]);

  if (loading) return <div className="text-sm text-muted-foreground py-4">Loading permissions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Permissions for {userName}</h3>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Permissions'}
        </Button>
      </div>

      {/* Page Access */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layout className="h-4 w-4" /> Page Access
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={selectAllPages}>All</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={clearAllPages}>None</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PAGE_OPTIONS.map(page => (
              <div key={page.slug} className="flex items-center gap-2">
                <Checkbox
                  id={`page-${page.slug}`}
                  checked={allowedPages.includes(page.slug)}
                  onCheckedChange={() => togglePage(page.slug)}
                />
                <Label htmlFor={`page-${page.slug}`} className="text-xs cursor-pointer">
                  {page.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Access (within Process View) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Blocks className="h-4 w-4" /> Process View Modules
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={selectAllModules}>All</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={clearAllModules}>None</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MODULE_OPTIONS.map(mod => (
              <div key={mod.slug} className="flex items-center gap-2">
                <Checkbox
                  id={`mod-${mod.slug}`}
                  checked={allowedModules.includes(mod.slug)}
                  onCheckedChange={() => toggleModule(mod.slug)}
                />
                <Label htmlFor={`mod-${mod.slug}`} className="text-xs cursor-pointer">
                  {mod.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Process Exclusions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="h-4 w-4" /> Process Exclusions
            <Badge variant="secondary" className="text-[10px]">{excludedProcessIds.length} excluded</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No processes found</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {processes.map(proc => (
                <div key={proc.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`proc-${proc.id}`}
                    checked={excludedProcessIds.includes(proc.id)}
                    onCheckedChange={() => toggleProcessExclusion(proc.id)}
                  />
                  <Label htmlFor={`proc-${proc.id}`} className="text-xs cursor-pointer flex-1">
                    <span className="font-medium">{proc.process_name}</span>
                    <span className="text-muted-foreground ml-2">({proc.client_name})</span>
                  </Label>
                  {excludedProcessIds.includes(proc.id) && (
                    <Badge variant="destructive" className="text-[9px]">Blocked</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">
            Checked processes will be hidden from this user (excluded from their access).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
