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
  Workflow,
  ChevronDown,
  ChevronRight,
  Cpu,
  BarChart3,
  PieChart,
  Brain,
  Sparkles,
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

interface MenuGroup {
  title: string;
  icon: React.ElementType;
  children: { title: string; url: string; icon: React.ElementType }[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    children: [
      { title: 'Admin Dashboard', url: '/admin', icon: ShieldCheck },
      { title: 'Overview', url: '/', icon: LayoutDashboard },
      { title: 'Clients / Engagements', url: '/clients', icon: Users },
    ],
  },
  {
    title: 'Business Processes',
    icon: Network,
    children: [
      { title: 'All Processes', url: '/processes', icon: Network },
      { title: 'Process Details', url: '/process-details', icon: FileText },
      { title: 'Risks & Controls', url: '/risks', icon: AlertTriangle },
      { title: 'Regulations', url: '/regulations', icon: Scale },
      { title: 'Incidents', url: '/incidents', icon: AlertCircle },
    ],
  },
  {
    title: 'Mainframe Layer',
    icon: Cpu,
    children: [
      { title: 'Mainframe Imports', url: '/imports', icon: Database },
      { title: 'Processing Analysis', url: '/processing-analysis', icon: BarChart3 },
    ],
  },
  {
    title: 'Reporting',
    icon: PieChart,
    children: [
      { title: 'Visual Analytics', url: '/analytics', icon: BarChart3 },
      { title: 'AI Reports', url: '/ai-reports', icon: Brain },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

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
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
                <Workflow className="h-5 w-5 text-sidebar-primary-foreground" />
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-sidebar-primary animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-sidebar-foreground tracking-tight leading-none flex items-center gap-1.5">
                  MF AI Navigator
                  <Sparkles className="h-3 w-3 text-sidebar-primary" />
                </h1>
                <p className="text-[9px] text-sidebar-primary/70 mt-1 tracking-[0.2em] uppercase font-semibold">
                  Process Intelligence
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
                <Workflow className="h-4.5 w-4.5 text-sidebar-primary-foreground" />
              </div>
            </div>
          )}
        </div>

        <SidebarGroup className="mt-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {menuGroups.map((group) => (
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
                      {group.children.map((item) => (
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
              ))}
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
