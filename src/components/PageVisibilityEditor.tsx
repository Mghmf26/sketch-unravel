import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const ALL_PAGE_SLUGS = [
  { slug: 'dashboard', label: 'Overview / Dashboard' },
  { slug: 'processes', label: 'Business Processes' },
  { slug: 'clients', label: 'Clients / Engagements' },
  { slug: 'risks-controls', label: 'Risks' },
  { slug: 'controls', label: 'Controls' },
  { slug: 'regulations', label: 'Regulations' },
  { slug: 'incidents', label: 'Incidents' },
  { slug: 'mainframe-imports', label: 'Mainframe Ecosystem' },
  { slug: 'on-premise', label: 'On Premise Ecosystems' },
  { slug: 'cloud', label: 'Cloud Ecosystems' },
  { slug: 'analysis', label: 'Analysis' },
  { slug: 'visual-analytics', label: 'Visual Analytics' },
  { slug: 'ai-reports', label: 'AI Reports' },
  { slug: 'client-reports', label: 'Client Reports' },
  { slug: 'data-entry', label: 'Data Entry' },
  { slug: 'upload', label: 'Upload / Extract' },
];

const HIDEABLE_ROLES = [
  { role: 'admin', label: 'Admin' },
  { role: 'team_coordinator', label: 'Team Coordinator' },
  { role: 'team_participant', label: 'Team Participant' },
  { role: 'client_coordinator', label: 'Client Coordinator' },
  { role: 'client_participant', label: 'Client Participant' },
  { role: 'user', label: 'User' },
];

interface VisibilityRow {
  id?: string;
  page_slug: string;
  hidden_from_roles: string[];
}

export default function PageVisibilityEditor() {
  const [rows, setRows] = useState<VisibilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadVisibility();
  }, []);

  const loadVisibility = async () => {
    const { data } = await supabase.from('page_visibility').select('*');
    const existing = (data || []) as VisibilityRow[];
    // Merge with all slugs
    const merged = ALL_PAGE_SLUGS.map(p => {
      const found = existing.find(e => e.page_slug === p.slug);
      return found || { page_slug: p.slug, hidden_from_roles: [] };
    });
    setRows(merged);
    setLoading(false);
  };

  const toggleRole = async (pageSlug: string, role: string) => {
    setSaving(pageSlug + role);
    const row = rows.find(r => r.page_slug === pageSlug);
    const currentHidden = row?.hidden_from_roles || [];
    const newHidden = currentHidden.includes(role)
      ? currentHidden.filter(r => r !== role)
      : [...currentHidden, role];

    const { error } = await supabase
      .from('page_visibility')
      .upsert(
        { page_slug: pageSlug, hidden_from_roles: newHidden, updated_at: new Date().toISOString() },
        { onConflict: 'page_slug' }
      );

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRows(prev => prev.map(r => r.page_slug === pageSlug ? { ...r, hidden_from_roles: newHidden } : r));
    }
    setSaving(null);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Page Visibility Controls</CardTitle>
        <CardDescription>Toggle to hide pages from specific roles. Root is never affected.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-semibold text-xs uppercase text-muted-foreground">Page</th>
                {HIDEABLE_ROLES.map(r => (
                  <th key={r.role} className="text-center py-2 px-2 font-semibold text-xs uppercase text-muted-foreground">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const pageInfo = ALL_PAGE_SLUGS.find(p => p.slug === row.page_slug);
                return (
                  <tr key={row.page_slug} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{pageInfo?.label || row.page_slug}</td>
                    {HIDEABLE_ROLES.map(r => (
                      <td key={r.role} className="text-center py-2 px-2">
                        <div className="flex justify-center">
                          <Switch
                            checked={!row.hidden_from_roles.includes(r.role)}
                            onCheckedChange={() => toggleRole(row.page_slug, r.role)}
                            disabled={saving === row.page_slug + r.role}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">Toggle OFF to hide a page from that role. Changes take effect immediately.</p>
      </CardContent>
    </Card>
  );
}
