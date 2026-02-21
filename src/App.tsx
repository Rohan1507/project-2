import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Calendar, 
  Plus, 
  Search, 
  LogOut, 
  Wrench, 
  Phone, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Vehicle {
  id: number;
  owner_name: string;
  phone: string;
  vehicle_number: string;
  make: string;
  model: string;
  last_service_date: string;
  next_service_date: string;
  notes: string;
}

interface User {
  email: string;
  garageName: string;
}

// --- Components ---

const Button = ({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50', variants[variant], className)} 
      {...props} 
    />
  );
};

const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-semibold text-slate-700 ml-1">{label}</label>}
    <input 
      className={cn(
        "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none",
        error && "border-rose-500 focus:ring-rose-500"
      )} 
      {...props} 
    />
    {error && <p className="text-xs text-rose-500 ml-1">{error}</p>}
  </div>
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<'login' | 'signup' | 'dashboard' | 'vehicles'>('login');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auth State
  const [authForm, setAuthForm] = useState({ email: '', password: '', garageName: '' });
  const [authError, setAuthError] = useState('');

  // Vehicle Form State
  const [vehicleForm, setVehicleForm] = useState({
    owner_name: '',
    phone: '',
    vehicle_number: '',
    make: '',
    model: '',
    last_service_date: format(new Date(), 'yyyy-MM-dd'),
    next_service_date: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    if (token) {
      fetchVehicles();
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
  }, [token]);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setView('dashboard');
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const method = editingVehicle ? 'PUT' : 'POST';
    const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(vehicleForm)
      });
      if (res.ok) {
        fetchVehicles();
        setIsModalOpen(false);
        setEditingVehicle(null);
        setVehicleForm({
          owner_name: '', phone: '', vehicle_number: '', make: '', model: '',
          last_service_date: format(new Date(), 'yyyy-MM-dd'),
          next_service_date: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
          notes: ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteVehicle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setVehicleForm({
      owner_name: v.owner_name,
      phone: v.phone,
      vehicle_number: v.vehicle_number,
      make: v.make,
      model: v.model,
      last_service_date: v.last_service_date,
      next_service_date: v.next_service_date,
      notes: v.notes
    });
    setIsModalOpen(true);
  };

  // --- Stats & Charts ---
  const stats = useMemo(() => {
    const today = new Date();
    const overdue = vehicles.filter(v => isBefore(parseISO(v.next_service_date), today)).length;
    const upcoming = vehicles.filter(v => {
      const next = parseISO(v.next_service_date);
      return isAfter(next, today) && isBefore(next, addDays(today, 7));
    }).length;
    return { total: vehicles.length, overdue, upcoming };
  }, [vehicles]);

  const chartData = useMemo(() => {
    const makes: Record<string, number> = {};
    vehicles.forEach(v => {
      makes[v.make] = (makes[v.make] || 0) + 1;
    });
    return Object.entries(makes).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [vehicles]);

  const filteredVehicles = vehicles.filter(v => 
    v.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
    v.phone.includes(search)
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
              <Wrench className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">GaragePro</h1>
            <p className="text-slate-500 mt-2">Manage your workshop with ease</p>
          </div>

          <Card className="p-8">
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setView('login')}
                className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-all", view === 'login' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
              >
                Login
              </button>
              <button 
                onClick={() => setView('signup')}
                className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-all", view === 'signup' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {view === 'signup' && (
                <Input 
                  label="Garage Name" 
                  placeholder="e.g. Elite Auto Works" 
                  required
                  value={authForm.garageName}
                  onChange={e => setAuthForm({...authForm, garageName: e.target.value})}
                />
              )}
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="name@example.com" 
                required
                value={authForm.email}
                onChange={e => setAuthForm({...authForm, email: e.target.value})}
              />
              <Input 
                label="Password" 
                type="password" 
                placeholder="••••••••" 
                required
                value={authForm.password}
                onChange={e => setAuthForm({...authForm, password: e.target.value})}
              />
              {authError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {authError}
                </div>
              )}
              <Button type="submit" className="w-full py-3" disabled={loading}>
                {loading ? 'Processing...' : view === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 lg:relative lg:translate-x-0",
        !sidebarOpen && "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">GaragePro</h2>
              <p className="text-xs text-slate-400 truncate w-32">{user?.garageName}</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => setView('dashboard')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                view === 'dashboard' ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => setView('vehicles')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                view === 'vehicles' ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Car className="w-5 h-5" />
              <span className="font-medium">Vehicles</span>
            </button>
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-bottom border-slate-200 sticky top-0 z-30 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-slate-900 capitalize">{view}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Synced
            </div>
            <Button onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {view === 'dashboard' ? (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Total Vehicles</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Overdue Service</p>
                    <p className="text-2xl font-bold text-rose-600">{stats.overdue}</p>
                  </div>
                </Card>
                <Card className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Upcoming (7 days)</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.upcoming}</p>
                  </div>
                </Card>
              </div>

              {/* Charts & Recent */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Service Distribution by Make</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Recent Vehicles</h3>
                    <button onClick={() => setView('vehicles')} className="text-sm text-indigo-600 font-semibold hover:underline">View All</button>
                  </div>
                  <div className="space-y-4">
                    {vehicles.slice(0, 5).map(v => (
                      <div key={v.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                            <Car className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{v.vehicle_number}</p>
                            <p className="text-xs text-slate-500">{v.owner_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-700">{v.make} {v.model}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Added {format(new Date(), 'MMM d')}</p>
                        </div>
                      </div>
                    ))}
                    {vehicles.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        No vehicles added yet.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, number or phone..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="text-sm text-slate-500 font-medium">
                  Showing {filteredVehicles.length} of {vehicles.length} vehicles
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredVehicles.map(v => {
                    const isOverdue = isBefore(parseISO(v.next_service_date), new Date());
                    return (
                      <motion.div
                        layout
                        key={v.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <Card className="group hover:border-indigo-200 transition-all">
                          <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold tracking-wider uppercase">
                                {v.vehicle_number}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => openEditModal(v)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteVehicle(v.id)} className="p-2 hover:bg-rose-50 rounded-lg text-rose-500">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <h4 className="text-lg font-bold text-slate-900 mb-1">{v.owner_name}</h4>
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                              <Phone className="w-3.5 h-3.5" />
                              {v.phone}
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl mb-4">
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Make / Model</p>
                                <p className="text-sm font-semibold text-slate-700">{v.make} {v.model}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Last Service</p>
                                <p className="text-sm font-semibold text-slate-700">{format(parseISO(v.last_service_date), 'MMM d, yyyy')}</p>
                              </div>
                            </div>

                            <div className={cn(
                              "flex items-center justify-between p-3 rounded-xl",
                              isOverdue ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                            )}>
                              <div className="flex items-center gap-2 text-xs font-bold">
                                <Calendar className="w-4 h-4" />
                                Next Service
                              </div>
                              <div className="text-sm font-bold">
                                {format(parseISO(v.next_service_date), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {filteredVehicles.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No vehicles found</h3>
                  <p className="text-slate-500">Try adjusting your search or add a new vehicle.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingVehicle ? 'Edit Vehicle Record' : 'Add New Vehicle'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleVehicleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Owner Name" 
                    required 
                    value={vehicleForm.owner_name}
                    onChange={e => setVehicleForm({...vehicleForm, owner_name: e.target.value})}
                  />
                  <Input 
                    label="Phone Number" 
                    type="tel" 
                    required 
                    value={vehicleForm.phone}
                    onChange={e => setVehicleForm({...vehicleForm, phone: e.target.value})}
                  />
                  <Input 
                    label="Vehicle Number" 
                    required 
                    placeholder="e.g. MH 12 AB 1234"
                    value={vehicleForm.vehicle_number}
                    onChange={e => setVehicleForm({...vehicleForm, vehicle_number: e.target.value.toUpperCase()})}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Make" 
                      required 
                      placeholder="e.g. Honda"
                      value={vehicleForm.make}
                      onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})}
                    />
                    <Input 
                      label="Model" 
                      required 
                      placeholder="e.g. City"
                      value={vehicleForm.model}
                      onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})}
                    />
                  </div>
                  <Input 
                    label="Last Service Date" 
                    type="date" 
                    required 
                    value={vehicleForm.last_service_date}
                    onChange={e => setVehicleForm({...vehicleForm, last_service_date: e.target.value})}
                  />
                  <Input 
                    label="Next Service Date" 
                    type="date" 
                    required 
                    value={vehicleForm.next_service_date}
                    onChange={e => setVehicleForm({...vehicleForm, next_service_date: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Notes</label>
                  <textarea 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                    placeholder="Any specific issues or parts replaced..."
                    value={vehicleForm.notes}
                    onChange={e => setVehicleForm({...vehicleForm, notes: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="secondary" className="flex-1 py-3" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 py-3" disabled={loading}>
                    {loading ? 'Saving...' : editingVehicle ? 'Update Record' : 'Save Vehicle'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
