'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { useState } from 'react';
import clsx from 'clsx';
import {
  LayoutDashboard, Package, Warehouse, Users, BarChart3,
  Sparkles, UserCog, Receipt, Building2, Shield, ChevronDown,
  LogOut, ChevronsLeft, ChevronsRight, ArrowRightLeft, ShoppingCart,
  Wallet, Gift, Tag, Truck,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/ai', label: 'AI Insights', icon: Sparkles },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/products', label: 'Products & Menu', icon: Package },
      { href: '/inventory', label: 'Inventory', icon: Warehouse },
      { href: '/transfers', label: 'Transfers', icon: ArrowRightLeft },
      { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
      { href: '/suppliers', label: 'Suppliers', icon: Truck },
      { href: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/promotions', label: 'Promotions', icon: Tag },
      { href: '/gift-cards', label: 'Gift Cards', icon: Gift },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  {
    label: 'Administration',
    adminOnly: true,
    items: [
      { href: '/staff', label: 'Staff', icon: UserCog, adminOnly: true },
      { href: '/sales', label: 'Sales History', icon: Receipt, adminOnly: true },
      { href: '/branches', label: 'Branches', icon: Building2, adminOnly: true },
      { href: '/audit', label: 'Audit Logs', icon: Shield, adminOnly: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { selectedBranch, setSelectedBranch } = useBranchStore();
  const router = useRouter();
  const [branchOpen, setBranchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '');

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => posApi.getBranches().then((r) => r.data),
    enabled: isAdmin,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside
      className={clsx(
        'relative flex flex-col bg-slate-950 border-r border-slate-800/80 transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-[22px] z-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg"
      >
        {collapsed ? <ChevronsRight size={11} /> : <ChevronsLeft size={11} />}
      </button>

      {/* Brand */}
      <div className={clsx('flex items-center border-b border-slate-800/80 h-16 shrink-0', collapsed ? 'justify-center' : 'px-4 gap-3')}>
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/50">
          <span className="text-white font-black text-sm tracking-tighter">P</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none">Ddotsmedia POS</p>
            <p className="text-indigo-400 text-[10px] mt-0.5 font-medium">Admin Console</p>
          </div>
        )}
      </div>

      {/* Branch Switcher */}
      {isAdmin && !collapsed && Array.isArray(branches) && (branches as any[]).length > 0 && (
        <div className="px-3 pt-3 pb-1 relative">
          <button
            onClick={() => setBranchOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 size={12} className="text-indigo-400 shrink-0" />
              <span className="truncate">{selectedBranch?.name ?? 'All Branches'}</span>
            </div>
            <ChevronDown size={12} className={clsx('text-slate-500 transition-transform duration-200 shrink-0', branchOpen && 'rotate-180')} />
          </button>
          {branchOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
              <button
                onClick={() => { setSelectedBranch(null); setBranchOpen(false); }}
                className={clsx('w-full text-left px-3 py-2.5 text-xs transition-colors', !selectedBranch ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800')}
              >
                All Branches
              </button>
              {(branches as any[]).map((b: any) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBranch(b); setBranchOpen(false); }}
                  className={clsx('w-full text-left px-3 py-2.5 text-xs border-t border-slate-800 transition-colors', selectedBranch?.id === b.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800')}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAV_SECTIONS.map((section) => {
          if ((section as any).adminOnly && !isAdmin) return null;
          const visibleItems = section.items.filter((item) => !(item as any).adminOnly || isAdmin);
          if (!visibleItems.length) return null;

          return (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {section.label}
                </p>
              )}
              {collapsed && <div className="mx-auto w-6 h-px bg-slate-800 mb-1.5" />}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={clsx(
                        'flex items-center rounded-lg transition-all duration-150 group relative',
                        collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-900/40'
                          : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100',
                      )}
                    >
                      <Icon size={15} className="shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                      {!collapsed && (
                        <span className={clsx('text-sm', isActive ? 'font-semibold' : 'font-medium')}>
                          {item.label}
                        </span>
                      )}
                      {isActive && !collapsed && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300 opacity-80" />
                      )}
                      {collapsed && isActive && (
                        <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer / User */}
      <div className="border-t border-slate-800/80 p-2 shrink-0">
        {!collapsed ? (
          <div className="px-2 py-2 mb-1 rounded-lg hover:bg-slate-900 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate leading-tight">{user?.name}</p>
                <p className="text-slate-500 text-[10px] truncate mt-0.5">{user?.email}</p>
              </div>
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-indigo-900/60 text-indigo-300 rounded font-semibold tracking-wide">
                {user?.role}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {initials}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={clsx(
            'flex items-center gap-2.5 w-full rounded-lg text-slate-500 hover:bg-red-950/50 hover:text-red-400 transition-all py-2',
            collapsed ? 'justify-center' : 'px-3',
          )}
        >
          <LogOut size={14} />
          {!collapsed && <span className="text-xs font-medium">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
