import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Receipt,
  ClipboardList,
  Mail,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Menu,
  UserCheck,
  Newspaper,
  ListChecks,
  FileSignature,
  Award,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: { label: string; path?: string }[];
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function AdminLayout({ children, pageTitle, breadcrumbs }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('admin-sidebar-collapsed') === 'true';
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('admin-dark') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('admin-dark', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const { data: pendingQuotes = 0 } = useQuery({
    queryKey: ['nav-badge-quotes'],
    queryFn: async () => {
      const { count } = await supabase
        .from('quote_requests')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const { data: pendingEnquiries = 0 } = useQuery({
    queryKey: ['nav-badge-enquiries'],
    queryFn: async () => {
      const { count } = await supabase
        .from('contact_enquiries')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const { data: unreadEmails = 0 } = useQuery({
    queryKey: ['nav-badge-emails'],
    queryFn: async () => {
      const { count } = await supabase
        .from('email_messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Customers', path: '/admin/customers', icon: <Users size={18} /> },
        { label: 'Quote Requests', path: '/admin/quote-requests', icon: <FileText size={18} />, badge: pendingQuotes },
        { label: 'Quotes', path: '/admin/quotes', icon: <ClipboardList size={18} /> },
        { label: 'Service Agreements', path: '/admin/service-agreements', icon: <FileSignature size={18} /> },
        { label: 'Service Jobs', path: '/admin/jobs', icon: <Briefcase size={18} /> },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Invoicing', path: '/admin/invoices', icon: <Receipt size={18} /> },
        { label: 'Waste Transfer Notes', path: '/admin/waste-transfer-notes', icon: <ListChecks size={18} /> },
        { label: 'Certificates', path: '/admin/certificates', icon: <Award size={18} /> },
      ],
    },
    {
      title: 'Communications',
      items: [
        { label: 'Email Inbox', path: '/admin/email-inbox', icon: <Mail size={18} />, badge: unreadEmails },
        { label: 'Contact Enquiries', path: '/admin/contact-enquiries', icon: <Bell size={18} />, badge: pendingEnquiries },
        { label: 'Mailing Lists', path: '/admin/mailing-lists', icon: <UserCheck size={18} /> },
        { label: 'Subscriptions', path: '/admin/subscriptions', icon: <Newspaper size={18} /> },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Staff', path: '/admin/staff', icon: <UserCheck size={18} /> },
        { label: 'News', path: '/admin/news', icon: <Newspaper size={18} /> },
        { label: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center ${collapsed ? 'justify-center px-3' : 'justify-between px-4'} py-4 border-b border-slate-700`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/mediwaste-logo.png" alt="MediWaste" className="h-7 w-auto" />
            <span className="text-white font-semibold text-sm">Admin</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hidden lg:flex"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-2 mb-1">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {item.badge && item.badge > 0 ? (
                    <span className={`flex-shrink-0 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold ${collapsed ? 'absolute top-1 right-1 min-w-[14px] h-[14px] text-[10px]' : ''}`}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={`border-t border-slate-700 p-3 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white text-sm transition-colors"
          title={collapsed ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-slate-300 hover:bg-red-600 hover:text-white text-sm transition-colors"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 flex-shrink-0 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-64 h-full bg-slate-900 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="flex items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-300">/</span>}
                    {crumb.path && i < breadcrumbs.length - 1 ? (
                      <Link to={crumb.path} className="text-gray-500 hover:text-gray-700 transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-gray-900 font-medium">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            ) : (
              <h1 className="text-base font-semibold text-gray-900 truncate">{pageTitle}</h1>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
