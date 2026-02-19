import {
  LayoutDashboard,
  Users,
  Network,
  FileText,
  AlertTriangle,
  Scale,
  AlertCircle,
  Database,
  GitBranch,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Admin Dashboard', url: '/admin', icon: ShieldCheck, disabled: true },
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Clients / Engagements', url: '/clients', icon: Users, disabled: true },
  { title: 'Business Processes', url: '/processes', icon: Network },
  { title: 'Process Details', url: '/process-details', icon: FileText, disabled: true },
  { title: 'Risks & Controls', url: '/risks', icon: AlertTriangle, disabled: true },
  { title: 'Regulations', url: '/regulations', icon: Scale, disabled: true },
  { title: 'Incidents', url: '/incidents', icon: AlertCircle, disabled: true },
  { title: 'Mainframe Imports', url: '/imports', icon: Database, disabled: true },
  { title: 'Process Flow', url: '/process-flow', icon: GitBranch, disabled: true },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r-0">
      <SidebarContent className="pt-0">
        {/* Brand header */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[hsl(80,60%,45%)] flex items-center justify-center shadow-sm">
              <Workflow className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground tracking-tight leading-none">BPA Platform</h1>
              <p className="text-[10px] text-sidebar-foreground/50 mt-0.5 tracking-wide">PROCESS MANAGEMENT</p>
            </div>
          </div>
        </div>

        <SidebarGroup className="mt-2">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild disabled={item.disabled}>
                    {item.disabled ? (
                      <span className="flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground/35 cursor-not-allowed rounded-lg">
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="text-[13px]">{item.title}</span>
                      </span>
                    ) : (
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150"
                        activeClassName="bg-[hsl(80,60%,45%)] text-white shadow-md shadow-[hsl(80,60%,45%)]/25 hover:bg-[hsl(80,60%,45%)] hover:text-white"
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="text-[13px] font-medium">{item.title}</span>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Version info at bottom */}
        <div className="mt-auto px-4 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/30 tracking-wide">v1.0.0 · © 2026 BPA</p>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
