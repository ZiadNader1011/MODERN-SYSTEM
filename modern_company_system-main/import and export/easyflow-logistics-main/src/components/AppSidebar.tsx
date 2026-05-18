import { 
  LayoutDashboard, Users, Wheat, Ship, Archive, ChevronLeft, 
  Briefcase, DollarSign, Building2, PackageSearch, ClipboardList,
  CheckSquare, MessageSquare // ✅ إضافة الأيقونات الجديدة
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';



export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const navItems = [
    { title: t('common.dashboard', 'Dashboard'), url: '/', icon: LayoutDashboard },
    { title: t('common.jobs', 'Jobs'), url: '/jobs', icon: Briefcase },
    { title: t('common.clients', 'Clients'), url: '/clients', icon: Users },
    { title: t('common.suppliers', 'Suppliers'), url: '/suppliers', icon: Users },
    { title: t('common.products', 'Products'), url: '/products', icon: Wheat },
    { title: t('common.containers', 'Containers'), url: '/containers', icon: Ship },
    { title: t('common.financials', 'Financials - Daybook'), url: '/financials', icon: DollarSign },
    { title: t('Banks', 'Banks'), url: '/banks', icon: Building2 },
    { title: t('Shipping Agents', 'Shipping Agents'), url: '/shipping-agents', icon: Ship },
    { title: t('Employees', 'Employees'), url: '/employees', icon: Users },
    { title: t('Packing Lists', 'Standalone Packing Lists'), url: '/packing-lists', icon: PackageSearch },
    { title: t('Commissions', 'Commissions'), url: '/commissions', icon: Briefcase },
    { title: t('Operations', 'التشغيل'), url: '/operations', icon: ClipboardList },
  ];

  return (
    <Sidebar collapsible="icon" side={i18n.dir() === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden shrink-0">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight leading-tight">
                Modern enterprise<br/>for business and supplies
              </span>
            </div>
          )}
          <button onClick={toggleSidebar} className="rounded-md p-1 hover:bg-sidebar-accent">
            <ChevronLeft className={`h-4 w-4 text-sidebar-foreground transition-transform z-10 ${collapsed ? 'rotate-180' : ''} ${i18n.dir() === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-accent/50"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className={`h-4 w-4 ${i18n.dir() === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className={`p-4 flex ${collapsed ? 'justify-center' : i18n.dir() === 'rtl' ? 'justify-end' : 'justify-start'}`}>
        <LanguageSwitcher />
        {!collapsed && <span className={`text-sm text-muted-foreground ${i18n.dir() === 'rtl' ? 'mr-3' : 'ml-3'}`}>Lng</span>}
      </SidebarFooter>
    </Sidebar>
  );
}