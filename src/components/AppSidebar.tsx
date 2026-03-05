import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Network,
  FileText,
  AlertTriangle,
  Scale,
  AlertCircle,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Cpu,
  BarChart3,
  PieChart,
  Brain,
  TrendingUp,
  Server,
  Microscope,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import mfAiLogo from '@/assets/mf-ai-logo.png';

interface MenuGroup {
  title: string;
  icon: React.ElementType;
  children: { title: string; url: string; icon: React.ElementType; pageSlug?: string }[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'Portfolio Management',
    icon: LayoutDashboard,
    children: [
      { title: 'Admin Dashboard', url: '/admin', icon: ShieldCheck, pageSlug: '__admin__' },
      { title: 'Overview', url: '/', icon: LayoutDashboard, pageSlug: 'dashboard' },
      { title: 'Clients / Engagements', url: '/clients', icon: Users, pageSlug: 'clients' },
    ],
  },
  {
    title: 'Business Processes',
    icon: Network,
    children: [
      { title: 'All Processes', url: '/processes', icon: Network, pageSlug: 'processes' },
      { title: 'Process Details', url: '/process-details', icon: FileText, pageSlug: 'processes' },
      { title: 'Risks', url: '/risks', icon: AlertTriangle, pageSlug: 'risks-controls' },
      { title: 'Controls', url: '/controls', icon: ShieldCheck, pageSlug: 'controls' },
      { title: 'Regulations', url: '/regulations', icon: Scale, pageSlug: 'regulations' },
      { title: 'Incidents', url: '/incidents', icon: AlertCircle, pageSlug: 'incidents' },
    ],
  },
  {
    title: 'Mainframe Ecosystem',
    icon: Cpu,
    children: [
      { title: 'MF Data Sources', url: '/imports', icon: Database, pageSlug: 'mainframe-imports' },
      { title: 'Processing Analysis', url: '/processing-analysis', icon: BarChart3, pageSlug: 'mainframe-imports' },
    ],
  },
  {
    title: 'Analysis',
    icon: Microscope,
    children: [
      { title: 'Business Scenario Analysis', url: '/business-scenario-analysis', icon: TrendingUp, pageSlug: 'analysis' },
      { title: 'Mainframe Scenario Analysis', url: '/mainframe-scenario-analysis', icon: Server, pageSlug: 'analysis' },
      { title: 'Mainframe AI Analysis', url: '/mainframe-ai-analysis', icon: Brain, pageSlug: 'analysis' },
    ],
  },
  {
    title: 'Reporting',
    icon: PieChart,
    children: [
      { title: 'Visual Analytics', url: '/analytics', icon: BarChart3, pageSlug: 'visual-analytics' },
      { title: 'AI Reports', url: '/ai-reports', icon: Brain, pageSlug: 'ai-reports' },
      { title: 'Client Reports', url: '/client-reports', icon: FileText, pageSlug: 'client-reports' },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { role } = useAuth();
  const { canAccessPage } = usePermissions();
  const isAdmin = role === 'admin';

  const getInitialOpen = () => {
    const open: Record<string, boolean> = {};
    menuGroups.forEach((g) => {
      open[g.title] = g.children.some((c) => c.url === currentPath);
    });
    if (!Object.values(open).some(Boolean)) open['Dashboard'] = true;
    return open;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpen);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="pt-0">
        {/* Premium Brand Header */}
        <div className="px-3 py-5 border-b border-sidebar-border">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <img src={mfAiLogo} alt="MF AI" className="h-10 w-10 rounded-xl shadow-lg object-cover" />
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground tracking-tight leading-none">
                  MF AI Navigator
                </h1>
                <p className="text-[9px] text-sidebar-primary/70 mt-1 tracking-[0.2em] uppercase font-semibold">
                  Process Intelligence
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <img src={mfAiLogo} alt="MF AI" className="h-9 w-9 rounded-xl shadow-lg object-cover" />
            </div>
          )}
        </div>

        <SidebarGroup className="mt-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {menuGroups.map((group) => {
                // Filter children based on permissions
                const visibleChildren = group.children.filter(item => {
                  // Admin Dashboard only visible to admins
                  if (item.pageSlug === '__admin__') return isAdmin;
                  return canAccessPage(item.pageSlug || '');
                });
                if (visibleChildren.length === 0) return null;

                return (
                <div key={group.title}>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => toggleGroup(group.title)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150 w-full"
                      >
                        <group.icon className="h-[18px] w-[18px] shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="text-[13px] font-semibold flex-1 text-left">{group.title}</span>
                            {openGroups[group.title] ? (
                              <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40" />
                            )}
                          </>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {!isCollapsed && openGroups[group.title] && (
                    <div className="ml-3 border-l border-sidebar-border pl-2 mt-0.5 mb-1 space-y-0.5">
                      {visibleChildren.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150 text-[12px]"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold border-l-[3px] border-sidebar-primary rounded-l-none hover:bg-sidebar-accent hover:text-sidebar-primary"
                            >
                              <item.icon className="h-[15px] w-[15px]" />
                              <span className="font-medium">{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Version info */}
        {!isCollapsed && (
          <div className="mt-auto px-4 py-4 border-t border-sidebar-border">
            <p className="text-[10px] text-sidebar-foreground/30 tracking-wide">v1.0.0 · © 2026 MF AI</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
