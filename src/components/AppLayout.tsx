import { Link, Outlet, useRouter } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  CarFrontIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  TagIcon,
  UsersIcon,
  LogOutIcon,
  HomeIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  MenuIcon,
  XIcon,
} from 'lucide-react';
import { authApi } from '@/api/endpoints';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/ordens-servico', label: 'Ordens de Serviço', icon: FileTextIcon, exact: false },
  { to: '/clientes', label: 'Clientes', icon: UsersIcon, exact: false },
  { to: '/veiculos', label: 'Veículos', icon: CarFrontIcon, exact: false },
  { to: '/financeiro', label: 'Financeiro', icon: LayoutDashboardIcon, exact: true },
  { to: '/financeiro/despesas', label: 'Gastos', icon: ReceiptIcon, exact: false },
  { to: '/financeiro/categories', label: 'Categorias', icon: TagIcon, exact: false },
] as const;

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'app-layout:sidebar-collapsed';

export function AppLayout() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  // mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage errors and keep the in-memory state working.
    }
  }, [collapsed]);

  // close drawer on route change
  useEffect(() => {
    return router.subscribe('onLoad', () => setDrawerOpen(false));
  }, [router]);

  // close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => router.navigate({ to: '/login' }),
  });

  const sidebarContent = (mobile = false) => (
    <>
      {/* Brand + toggle */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-2">
        {(!collapsed || mobile) && (
          <div className="flex flex-1 items-center gap-2 pl-1 overflow-hidden">
            <HomeIcon className="size-5 shrink-0 text-sidebar-primary" />
            <span className="truncate font-semibold tracking-tight text-sidebar-foreground">
              OficinaDigital
            </span>
          </div>
        )}
        {mobile ? (
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          >
            <XIcon className="size-4" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'flex size-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent',
              collapsed && 'mx-auto',
            )}
          >
            {collapsed
              ? <PanelLeftOpenIcon className="size-4" />
              : <PanelLeftCloseIcon className="size-4" />}
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-1 p-2 pt-3">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={exact ? { exact: true } : undefined}
            title={!mobile && collapsed ? label : undefined}
            className={cn(
              'flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              '[&.active]:bg-sidebar-primary [&.active]:text-sidebar-primary-foreground',
              !mobile && collapsed ? 'justify-center gap-0' : 'gap-3',
            )}
          >
            <Icon className="size-4 shrink-0" />
            {(mobile || !collapsed) && <span>{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          title={!mobile && collapsed ? 'Sair' : undefined}
          className={cn(
            'flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50',
            !mobile && collapsed ? 'justify-center gap-0' : 'gap-3',
          )}
        >
          <LogOutIcon className="size-4 shrink-0" />
          {(mobile || !collapsed) && <span>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full overflow-x-clip bg-background">
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* ── Mobile: top bar + drawer ── */}
      <div className="flex min-w-0 flex-1 flex-col md:contents">
        {/* Top bar (mobile only) */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            aria-label="Abrir menu"
          >
            <MenuIcon className="size-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <HomeIcon className="size-5 text-sidebar-primary" />
            <span className="truncate font-semibold tracking-tight text-sidebar-foreground">OficinaDigital</span>
          </div>
        </header>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Drawer panel */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 md:hidden',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebarContent(true)}
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
