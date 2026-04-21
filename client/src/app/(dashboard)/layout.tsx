'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/Sidebar';
import { Bell, Search } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products & Menu',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/reports': 'Reports & Analytics',
  '/ai': 'AI Insights',
  '/staff': 'Staff Management',
  '/sales': 'Sales History',
  '/transfers': 'Stock Transfers',
  '/purchase-orders': 'Purchase Orders',
  '/branches': 'Branches',
  '/audit': 'Audit Logs',
};

function TopBar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const title = PAGE_TITLES[pathname] ?? 'POS System';
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U';

  return (
    <header className="h-14 shrink-0 border-b border-gray-100 bg-white/80 backdrop-blur-sm flex items-center justify-between px-6 gap-4 sticky top-0 z-10">
      <h1 className="text-base font-bold text-gray-900">{title}</h1>

      <div className="flex items-center gap-2 ml-auto">
        <div className="hidden sm:flex items-center gap-2 bg-gray-100/80 rounded-xl px-3 py-1.5 w-44 border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all">
          <Search size={12} className="text-gray-400 shrink-0" />
          <input placeholder="Search..." className="bg-transparent text-xs text-gray-600 placeholder-gray-400 outline-none w-full" />
        </div>

        <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
          <Bell size={15} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-gray-800 leading-none">{user?.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
