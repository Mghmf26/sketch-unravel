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
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild disabled={item.disabled}>
                    {item.disabled ? (
                      <span className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground/50 cursor-not-allowed">
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.title}</span>
                      </span>
                    ) : (
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.title}</span>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
