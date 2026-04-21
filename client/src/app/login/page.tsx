'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Eye, EyeOff, Lock, Mail, ShoppingCart, BarChart3, Package, Users } from 'lucide-react';

const FEATURES = [
  { icon: ShoppingCart, text: 'Multi-branch POS transactions' },
  { icon: BarChart3, text: 'Real-time sales analytics' },
  { icon: Package, text: 'Inventory management' },
  { icon: Users, text: 'Customer loyalty tracking' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('admin@mystore.com');
  const [password, setPassword] = useState('admin123');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>

        {/* Brand */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <span className="text-white font-black text-lg">P</span>
            </div>
            <span className="text-white font-bold text-xl">Ddotsmedia POS</span>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative space-y-6">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight">
              Enterprise POS<br />
              <span className="text-indigo-400">Made Simple</span>
            </h2>
            <p className="text-slate-400 mt-3 text-base leading-relaxed">
              Manage your entire business from one powerful dashboard. Sales, inventory, customers, and AI-driven insights.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600/20 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-indigo-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-slate-600 text-xs">© 2026 Ddotsmedia. Enterprise Edition.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">P</span>
            </div>
            <span className="font-bold text-gray-900">Ddotsmedia POS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your admin account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 bg-white transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 bg-white transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-2xl text-sm transition-all mt-2 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : 'Sign in to Dashboard →'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-white rounded-2xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Demo Credentials</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p><span className="font-medium">Admin:</span> admin@mystore.com / admin123</p>
              <p><span className="font-medium">Manager:</span> manager@mystore.com / manager123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
