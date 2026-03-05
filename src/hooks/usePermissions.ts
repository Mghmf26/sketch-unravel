import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPermissions {
  allowed_pages: string[];
  allowed_modules: string[];
  excluded_process_ids: string[];
}

const ALL_PAGES = [
  'dashboard', 'processes', 'clients', 'analysis', 'data-entry', 'upload',
  'incidents', 'risks-controls', 'regulations', 'controls', 'mainframe-imports',
  'visual-analytics', 'ai-reports', 'client-reports', 'on-premise', 'cloud',
];

const ALL_MODULES = ['steps', 'risks', 'controls', 'regulations', 'incidents', 'raci', 'imports', 'ai'];

const FULL_ACCESS: UserPermissions = {
  allowed_pages: ALL_PAGES,
  allowed_modules: ALL_MODULES,
  excluded_process_ids: [],
};

const PARTICIPANT_ROLES = ['team_participant', 'client_participant'];

interface PageVisibility {
  page_slug: string;
  hidden_from_roles: string[];
}

export function usePermissions() {
  const { user, role, isRoot } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>(FULL_ACCESS);
  const [loading, setLoading] = useState(true);
  const [hiddenPages, setHiddenPages] = useState<PageVisibility[]>([]);

  const isParticipant = role ? PARTICIPANT_ROLES.includes(role) : false;

  useEffect(() => {
    if (!user) {
      setPermissions(FULL_ACCESS);
      setLoading(false);
      return;
    }

    // Fetch page visibility rules
    supabase.from('page_visibility').select('page_slug, hidden_from_roles').then(({ data }) => {
      setHiddenPages((data || []) as PageVisibility[]);
    });

    if (!isParticipant) {
      setPermissions(FULL_ACCESS);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('allowed_pages, allowed_modules, excluded_process_ids')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setPermissions(FULL_ACCESS);
      } else {
        setPermissions({
          allowed_pages: (data as any).allowed_pages || ALL_PAGES,
          allowed_modules: (data as any).allowed_modules || ALL_MODULES,
          excluded_process_ids: (data as any).excluded_process_ids || [],
        });
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [user, role, isParticipant]);

  const isPageHidden = (pageSlug: string) => {
    // Root is never affected by page visibility
    if (isRoot) return false;
    if (!role) return false;
    const rule = hiddenPages.find(p => p.page_slug === pageSlug);
    if (!rule) return false;
    return rule.hidden_from_roles.includes(role);
  };

  const canAccessPage = (pageSlug: string) => !isParticipant || permissions.allowed_pages.includes(pageSlug);
  const canAccessModule = (moduleSlug: string) => !isParticipant || permissions.allowed_modules.includes(moduleSlug);
  const isProcessExcluded = (processId: string) => isParticipant && permissions.excluded_process_ids.includes(processId);

  return { permissions, loading, isParticipant, canAccessPage, canAccessModule, isProcessExcluded, isPageHidden, hiddenPages };
}

export { ALL_PAGES, ALL_MODULES, PARTICIPANT_ROLES };
