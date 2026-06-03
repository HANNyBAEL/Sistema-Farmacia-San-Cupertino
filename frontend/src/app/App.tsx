import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, UserCog, Truck,
  Bell, BarChart2, History, Trash2, Settings, LogOut, Search,
  Plus, Edit2, X, Check, ChevronDown, AlertTriangle, FileSpreadsheet,
  Eye, EyeOff, Filter, Download, RefreshCw, Shield,
  TrendingUp, TrendingDown, Clock, ChevronRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";



// ── Logo ──────────────────────────────────────────────────────────────────────

function FarmaciaLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className} fill="none">
      <rect width="64" height="64" rx="12" fill="#0a4b7a" />
      <rect x="28" y="10" width="8" height="44" rx="4" fill="white" />
      <rect x="10" y="28" width="44" height="8" rx="4" fill="white" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "administrador" | "farmaceutico" | "cajero";
type Screen =
  | "dashboard" | "ventas" | "productos" | "clientes"
  | "empleados" | "proveedores" | "alertas" | "reportes"
  | "historial" | "eliminados" | "configuracion";

interface User { name: string; role: Role; }

interface Product {
  id: number; name: string; description: string; price: number;
  stock: number; lot: string; expiry: string; supplier: string;
  categories: string[]; controlled: boolean; deleted?: boolean;
}

interface CartItem { product: Product; qty: number; recipe?: boolean; }
interface Client { id: number; name: string; phone: string; email: string; address: string; deleted?: boolean; }
interface Employee { id: number; name: string; role: Role; email: string; deleted?: boolean; }
interface Supplier { id: number; name: string; contact: string; phone: string; address: string; productCount: number; deleted?: boolean; }
interface StockAlert { id: number; product: string; type: "agotado" | "critico" | "bajo"; qty: number; date: string; attended: boolean; }
interface ChangeLog { id: number; date: string; user: string; field: string; before: string; after: string; product: string; }

// ── Mock Data ──────────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { id: 1, name: "Paracetamol 500mg", description: "Analgésico y antipirético", price: 2.50, stock: 145, lot: "LOT-2024-001", expiry: "2026-08-15", supplier: "FarmaDistrib S.A.", categories: ["Analgésico"], controlled: false },
  { id: 2, name: "Ibuprofeno 400mg", description: "Antiinflamatorio no esteroideo", price: 3.80, stock: 8, lot: "LOT-2024-002", expiry: "2025-12-31", supplier: "MediSupply Ltda.", categories: ["Analgésico", "Antiinflamatorio"], controlled: false },
  { id: 3, name: "Amoxicilina 500mg", description: "Antibiótico de amplio espectro", price: 12.00, stock: 0, lot: "LOT-2024-003", expiry: "2026-03-20", supplier: "FarmaDistrib S.A.", categories: ["Antibiótico"], controlled: false },
  { id: 4, name: "Alprazolam 0.5mg", description: "Ansiolítico benzodiacepínico", price: 18.50, stock: 15, lot: "LOT-2024-004", expiry: "2026-01-10", supplier: "PharmaCtrl Inc.", categories: ["Controlado", "Ansiolítico"], controlled: true },
  { id: 5, name: "Metformina 850mg", description: "Antidiabético oral", price: 5.20, stock: 62, lot: "LOT-2024-005", expiry: "2027-05-30", supplier: "MediSupply Ltda.", categories: ["Antidiabético"], controlled: false },
  { id: 6, name: "Loratadina 10mg", description: "Antihistamínico de acción prolongada", price: 4.10, stock: 5, lot: "LOT-2024-006", expiry: "2025-06-01", supplier: "FarmaDistrib S.A.", categories: ["Antihistamínico"], controlled: false },
  { id: 7, name: "Omeprazol 20mg", description: "Inhibidor de bomba de protones", price: 6.90, stock: 38, lot: "LOT-2024-007", expiry: "2026-11-22", supplier: "GlobalPharma Co.", categories: ["Gastroprotector"], controlled: false },
  { id: 8, name: "Tramadol 50mg", description: "Analgésico opioide de acción central", price: 22.00, stock: 3, lot: "LOT-2024-008", expiry: "2025-04-15", supplier: "PharmaCtrl Inc.", categories: ["Controlado", "Analgésico"], controlled: true },
];

const CLIENTS: Client[] = [
  { id: 1, name: "María González", phone: "0991234567", email: "maria@gmail.com", address: "Av. Principal 123" },
  { id: 2, name: "Carlos Ramos", phone: "0987654321", email: "carlos@yahoo.com", address: "Calle Flores 456" },
  { id: 3, name: "Ana Morales", phone: "0976543210", email: "ana.m@hotmail.com", address: "Barrio Sur Mz 3" },
  { id: 4, name: "Pedro Salazar", phone: "0965432109", email: "pedro@gmail.com", address: "Calle Norte 789", deleted: true },
];

const EMPLOYEES: Employee[] = [
  { id: 1, name: "Dr. Roberto Medina", role: "farmaceutico", email: "r.medina@farmacia.com" },
  { id: 2, name: "Lucía Pérez", role: "cajero", email: "l.perez@farmacia.com" },
  { id: 3, name: "Admin Sistema", role: "administrador", email: "admin@farmacia.com" },
  { id: 4, name: "Jorge Castro", role: "cajero", email: "j.castro@farmacia.com", deleted: true },
];

const SUPPLIERS: Supplier[] = [
  { id: 1, name: "FarmaDistrib S.A.", contact: "Ing. López", phone: "022345678", address: "Zona Industrial Norte", productCount: 3 },
  { id: 2, name: "MediSupply Ltda.", contact: "Sra. Torres", phone: "023456789", address: "Parque Empresarial Sur", productCount: 2 },
  { id: 3, name: "PharmaCtrl Inc.", contact: "Dr. Vargas", phone: "024567890", address: "Av. Comercial 500", productCount: 2 },
  { id: 4, name: "GlobalPharma Co.", contact: "Sr. Díaz", phone: "025678901", address: "Centro Logístico Este", productCount: 1 },
];

const ALERTS: StockAlert[] = [
  { id: 1, product: "Amoxicilina 500mg", type: "agotado", qty: 0, date: "21/05/2026", attended: false },
  { id: 2, product: "Ibuprofeno 400mg", type: "critico", qty: 8, date: "21/05/2026", attended: false },
  { id: 3, product: "Loratadina 10mg", type: "critico", qty: 5, date: "20/05/2026", attended: false },
  { id: 4, product: "Tramadol 50mg", type: "critico", qty: 3, date: "21/05/2026", attended: false },
  { id: 5, product: "Alprazolam 0.5mg", type: "bajo", qty: 15, date: "19/05/2026", attended: true },
];

const LOGS: ChangeLog[] = [
  { id: 1, date: "21/05/2026 09:14", user: "Admin Sistema", field: "precio", before: "$2.20", after: "$2.50", product: "Paracetamol 500mg" },
  { id: 2, date: "21/05/2026 10:32", user: "Dr. Roberto Medina", field: "stock", before: "50", after: "145", product: "Paracetamol 500mg" },
  { id: 3, date: "20/05/2026 15:01", user: "Admin Sistema", field: "fecha_vencimiento", before: "2025-12-01", after: "2026-08-15", product: "Paracetamol 500mg" },
  { id: 4, date: "20/05/2026 11:45", user: "Admin Sistema", field: "stock", before: "80", after: "0", product: "Amoxicilina 500mg" },
  { id: 5, date: "19/05/2026 08:22", user: "Admin Sistema", field: "precio", before: "$3.50", after: "$3.80", product: "Ibuprofeno 400mg" },
];

const SALES_DATA = [
  { day: "Lun", ventas: 420 }, { day: "Mar", ventas: 310 }, { day: "Mié", ventas: 580 },
  { day: "Jue", ventas: 490 }, { day: "Vie", ventas: 720 }, { day: "Sáb", ventas: 850 }, { day: "Hoy", ventas: 340 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function stockColor(stock: number): string {
  if (stock === 0) return "text-red-600 bg-red-50";
  if (stock <= 10) return "text-red-500 bg-red-50";
  if (stock <= 20) return "text-amber-600 bg-amber-50";
  return "text-green-700 bg-green-50";
}

function stockLabel(stock: number): string {
  if (stock === 0) return "Agotado";
  if (stock <= 10) return "Crítico";
  if (stock <= 20) return "Bajo";
  return "Normal";
}

function alertTypeColor(type: string): string {
  if (type === "agotado") return "bg-red-100 text-red-700";
  if (type === "critico") return "bg-red-50 text-red-600";
  return "bg-blue-50 text-blue-700";
}

// ── Components ─────────────────────────────────────────────────────────────────

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function Btn({
  children, variant = "primary", size = "md", className = "", onClick, type = "button", disabled = false
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-lg transition-all cursor-pointer select-none disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  const variants = {
    primary: "bg-[#0a4b7a] text-white hover:bg-[#0d5c96] active:bg-[#083d64]",
    secondary: "border border-[#0a4b7a] text-[#0a4b7a] bg-white hover:bg-[#e3f2fd]",
    danger: "bg-[#d32f2f] text-white hover:bg-[#c62828] active:bg-[#b71c1c]",
    ghost: "text-[#6b7280] hover:bg-gray-100 bg-transparent",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Card({ children, className = "", accent }: { children: React.ReactNode; className?: string; accent?: "blue" | "red" | "green" | "amber" }) {
  const borders = { blue: "border-l-4 border-l-[#0a4b7a]", red: "border-l-4 border-l-[#d32f2f]", green: "border-l-4 border-l-green-500", amber: "border-l-4 border-l-amber-500" };
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 ${accent ? borders[accent] : ""} ${className}`}>
      {children}
    </div>
  );
}

function Input({ placeholder, value, onChange, type = "text", className = "", id }: {
  placeholder?: string; value: string; onChange: (v: string) => void;
  type?: string; className?: string; id?: string;
}) {
  return (
    <input id={id} type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-[#1e1e1e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a] transition-all text-sm ${className}`} />
  );
}

function Select({ children, value, onChange, className = "" }: {
  children: React.ReactNode; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a] transition-all cursor-pointer ${className}`}>
      {children}
    </select>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const USERS: Record<string, { name: string; role: Role; pass: string }> = {
    admin: { name: "Admin Sistema", role: "administrador", pass: "admin123" },
    farmaceutico: { name: "Dr. Roberto Medina", role: "farmaceutico", pass: "farm123" },
    cajero: { name: "Lucía Pérez", role: "cajero", pass: "cajero123" },
  };

  function handleLogin() {
    if (!username || !password) { setError("Complete todos los campos."); return; }
    const u = USERS[username.toLowerCase()];
    if (!u || u.pass !== password) { setError("Usuario o contraseña incorrectos."); return; }
    setError("");
    onLogin({ name: u.name, role: u.role });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[#f0f7ff] border border-[#0a4b7a]/10 p-2 mb-4">
            <FarmaciaLogo className="w-full h-full" />
          </div>
          <h1 className="text-lg font-bold text-[#0a2a44] text-center leading-tight">Farmacias San Cupertino</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sistema de gestión</p>
        </div>
        <h2 className="text-xl font-bold text-[#1e1e1e] mb-1">Iniciar sesión</h2>
        <p className="text-gray-500 text-sm mb-6">Ingrese sus credenciales para continuar</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1e1e1e] mb-1.5">Usuario</label>
              <Input placeholder="Usuario" value={username} onChange={setUsername} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1e1e1e] mb-1.5">Contraseña</label>
              <div className="relative">
                <Input placeholder="Contraseña" type={showPw ? "text" : "password"} value={password} onChange={setPassword} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <Btn variant="primary" size="lg" className="w-full mt-6 justify-center" onClick={handleLogin}>
            Iniciar sesión
          </Btn>

          <button className="w-full text-center text-[#0a4b7a] text-sm mt-4 hover:underline">
            ¿Olvidó su contraseña?
          </button>

          <div className="mt-6 p-4 bg-[#e3f2fd] rounded-lg text-xs text-[#0a4b7a] space-y-1">
            <div className="font-semibold mb-2">Cuentas de prueba:</div>
            <div>admin / admin123 → Administrador</div>
            <div>farmaceutico / farm123 → Farmacéutico</div>
            <div>cajero / cajero123 → Cajero</div>
          </div>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

const NAV_ITEMS: { screen: Screen; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { screen: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, roles: ["administrador"] },
  { screen: "ventas", label: "Ventas (POS)", icon: <ShoppingCart size={18} />, roles: ["administrador", "cajero"] },
  { screen: "productos", label: "Productos", icon: <Package size={18} />, roles: ["administrador"] },
  { screen: "clientes", label: "Clientes", icon: <Users size={18} />, roles: ["administrador"] },
  { screen: "empleados", label: "Empleados", icon: <UserCog size={18} />, roles: ["administrador"] },
  { screen: "proveedores", label: "Proveedores", icon: <Truck size={18} />, roles: ["administrador"] },
  { screen: "alertas", label: "Alertas de Stock", icon: <Bell size={18} />, roles: ["administrador", "farmaceutico"] },
  { screen: "reportes", label: "Reportes", icon: <BarChart2 size={18} />, roles: ["administrador", "farmaceutico"] },
  { screen: "historial", label: "Historial Cambios", icon: <History size={18} />, roles: ["administrador"] },
  { screen: "eliminados", label: "Registros Eliminados", icon: <Trash2 size={18} />, roles: ["administrador"] },
  { screen: "configuracion", label: "Configuración", icon: <Settings size={18} />, roles: ["administrador"] },
];

function Sidebar({ user, current, onNav, onLogout }: {
  user: User; current: Screen; onNav: (s: Screen) => void; onLogout: () => void;
}) {
  const visible = NAV_ITEMS.filter(i => i.roles.includes(user.role));
  return (
    <aside className="flex flex-col h-full bg-[#0a2a44] w-60 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
        <div className="w-9 h-9 flex-shrink-0 bg-white rounded-xl flex items-center justify-center p-1">
          <FarmaciaLogo className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-bold text-sm tracking-tight block leading-tight">Farmacias San Cupertino</span>
          <span className="text-white/40 text-[10px] tracking-wide">Gestión Farmacéutica</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {visible.map(item => {
          const active = current === item.screen;
          return (
            <button key={item.screen} onClick={() => onNav(item.screen)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                active
                  ? "bg-[#0a4b7a] text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}>
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight size={14} className="ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0a4b7a] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user.name}</div>
            <div className="text-white/50 text-xs capitalize">{user.role}</div>
          </div>
          <button onClick={onLogout} className="text-white/40 hover:text-[#d32f2f] transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function Dashboard() {
  const kpis = [
    { label: "Ventas del día", value: "$2,340", icon: <TrendingUp size={20} />, accent: "blue" as const },
    { label: "Stock Bajo (≤20)", value: "3", icon: <TrendingDown size={20} />, accent: "amber" as const },
    { label: "Stock Crítico (≤10)", value: "3", icon: <AlertTriangle size={20} />, accent: "red" as const },
    { label: "Agotados", value: "1", icon: <X size={20} />, accent: "red" as const },
    { label: "Próx. Vencer (30d)", value: "2", icon: <Clock size={20} />, accent: "amber" as const },
    { label: "Proveedores Activos", value: "4", icon: <Truck size={20} />, accent: "blue" as const },
    { label: "Empleados", value: "3", icon: <UserCog size={20} />, accent: "blue" as const },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1e1e1e]">Tablero Principal</h1>
        <p className="text-gray-500 text-sm">Resumen operativo — 21/05/2026</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} accent={k.accent} className="p-4">
            <div className={`inline-flex p-2 rounded-lg mb-3 ${k.accent === "red" ? "bg-red-50 text-red-600" : k.accent === "amber" ? "bg-amber-50 text-amber-600" : "bg-[#e3f2fd] text-[#0a4b7a]"}`}>
              {k.icon}
            </div>
            <div className="text-2xl font-bold text-[#1e1e1e]">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-[#1e1e1e] mb-4">Ventas últimos 7 días</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={SALES_DATA} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={(v: number) => [`$${v}`, "Ventas"]} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
            <Bar dataKey="ventas" fill="#0a4b7a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[#1e1e1e] mb-3">Alertas recientes</h2>
          <div className="space-y-2">
            {ALERTS.filter(a => !a.attended).slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.type === "agotado" ? "bg-red-500" : a.type === "critico" ? "bg-red-400" : "bg-amber-400"}`} />
                <span className="text-sm text-[#1e1e1e] flex-1">{a.product}</span>
                <Badge className={alertTypeColor(a.type)}>{a.type}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[#1e1e1e] mb-3">Productos por vencer (30 días)</h2>
          <div className="space-y-2">
            {PRODUCTS.filter(p => {
              const d = new Date(p.expiry);
              const now = new Date();
              const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
              return diff > 0 && diff <= 30;
            }).map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                <span className="text-sm text-[#1e1e1e] flex-1">{p.name}</span>
                <span className="text-xs text-gray-400">{p.expiry}</span>
              </div>
            ))}
            {PRODUCTS.filter(p => { const d = new Date(p.expiry); const now = new Date(); const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24); return diff > 0 && diff <= 30; }).length === 0 && (
              <p className="text-sm text-gray-400">Ninguno en los próximos 30 días.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── POS / Ventas ───────────────────────────────────────────────────────────────

function Ventas() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saleError, setSaleError] = useState("");
  const [saleDone, setSaleDone] = useState(false);

  const results = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) && !p.deleted
  ).slice(0, 6);

  function addToCart(p: Product) {
    if (p.stock === 0) { setSaleError(`Sin stock de ${p.name}.`); return; }
    const exp = new Date(p.expiry);
    if (exp < new Date()) { setSaleError(`${p.name} está vencido y no se puede vender.`); return; }
    setSaleError("");
    setCart(prev => {
      const exists = prev.find(i => i.product.id === p.id);
      if (exists) {
        if (exists.qty >= p.stock) { setSaleError(`Solo quedan ${p.stock} unidades de ${p.name}.`); return prev; }
        return prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product: p, qty: 1, recipe: p.controlled ? false : undefined }];
    });
  }

  function removeFromCart(id: number) { setCart(prev => prev.filter(i => i.product.id !== id)); }
  function setQty(id: number, qty: number) {
    const item = cart.find(i => i.product.id === id);
    if (!item) return;
    if (qty > item.product.stock) { setSaleError(`Solo quedan ${item.product.stock} unidades.`); return; }
    setSaleError("");
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty } : i));
  }
  function toggleRecipe(id: number) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, recipe: !i.recipe } : i));
  }

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const iva = subtotal * 0.12;
  const total = subtotal + iva;

  const controlledPending = cart.some(i => i.product.controlled && !i.recipe);

  function finalizarVenta() {
    if (cart.length === 0) { setSaleError("El carrito está vacío."); return; }
    if (controlledPending) { setSaleError("Confirme receta para productos controlados."); return; }
    setSaleDone(true);
    setCart([]);
    setSelectedClient(null);
    setClientSearch("");
    setTimeout(() => setSaleDone(false), 3000);
  }

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* Left: search */}
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1e1e1e] text-sm mb-3">Buscar Producto</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nombre o lote..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {search && results.map(p => (
            <button key={p.id} onClick={() => addToCart(p)}
              className="w-full text-left p-3 rounded-lg hover:bg-[#e3f2fd] transition-colors border border-transparent hover:border-[#0a4b7a]/20 mb-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-[#1e1e1e] leading-tight">{p.name}</span>
                {p.controlled && <Badge className="bg-purple-100 text-purple-700 flex-shrink-0">Ctrl</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[#0a4b7a] font-semibold">${p.price.toFixed(2)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${stockColor(p.stock)}`}>Stock: {p.stock}</span>
              </div>
            </button>
          ))}
          {search && results.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Sin resultados</p>
          )}
          {!search && (
            <p className="text-sm text-gray-400 text-center py-6">Escriba para buscar</p>
          )}
        </div>
      </div>

      {/* Center: cart */}
      <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
        <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
          <h2 className="font-semibold text-[#1e1e1e] text-sm">Carrito de compra</h2>
          {cart.length > 0 && (
            <Btn variant="ghost" size="sm" onClick={() => { setCart([]); setSaleError(""); }}>
              <X size={13} /> Limpiar
            </Btn>
          )}
        </div>

        {saleDone && (
          <div className="mx-4 mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <Check size={16} /> Venta finalizada exitosamente.
          </div>
        )}
        {saleError && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-[#d32f2f] rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <AlertTriangle size={14} /> {saleError}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <ShoppingCart size={40} strokeWidth={1} />
              <span className="text-sm">El carrito está vacío</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Producto", "P.Unit", "Cant.", "Subtotal", "Stock rest.", ""].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cart.map(item => {
                  const rem = item.product.stock - item.qty;
                  return (
                    <React.Fragment key={item.product.id}>
                      <tr className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <div className="font-medium text-[#1e1e1e]">{item.product.name}</div>
                          {item.product.controlled && (
                            <Badge className="bg-purple-100 text-purple-700 mt-1">Controlado</Badge>
                          )}
                        </td>
                        <td className="py-2 px-2 text-gray-600">${item.product.price.toFixed(2)}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setQty(item.product.id, item.qty - 1)}
                              className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100">−</button>
                            <span className="w-8 text-center font-medium">{item.qty}</span>
                            <button onClick={() => setQty(item.product.id, item.qty + 1)}
                              className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100">+</button>
                          </div>
                        </td>
                        <td className="py-2 px-2 font-semibold text-[#0a4b7a]">
                          ${(item.product.price * item.qty).toFixed(2)}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${rem <= 3 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                            {rem} uds
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <button onClick={() => removeFromCart(item.product.id)} className="text-gray-400 hover:text-[#d32f2f]">
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                      {item.product.controlled && (
                        <tr key={`recipe-${item.product.id}`} className="bg-purple-50 border-b border-gray-50">
                          <td colSpan={6} className="px-3 py-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={!!item.recipe} onChange={() => toggleRecipe(item.product.id)}
                                className="w-4 h-4 rounded accent-[#0a4b7a]" />
                              <span className="text-xs text-purple-700 font-medium">
                                ¿El paciente presentó receta médica? (Requerido para producto controlado)
                              </span>
                              {!item.recipe && <AlertTriangle size={13} className="text-[#d32f2f]" />}
                            </label>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: summary */}
      <div className="w-64 border-l border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1e1e1e] text-sm mb-3">Cliente</h2>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-xs focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
          {clientSearch && (
            <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
              {CLIENTS.filter(c => !c.deleted && c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#e3f2fd] border-b border-gray-50 last:border-0">
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {selectedClient && (
            <div className="mt-2 flex items-center justify-between bg-[#e3f2fd] rounded-lg px-3 py-2">
              <span className="text-xs text-[#0a4b7a] font-medium">{selectedClient.name}</span>
              <button onClick={() => setSelectedClient(null)} className="text-[#0a4b7a]/50 hover:text-[#d32f2f]"><X size={13} /></button>
            </div>
          )}
        </div>

        <div className="p-4 flex-1">
          <h2 className="font-semibold text-[#1e1e1e] text-sm mb-4">Resumen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA (12%)</span><span>${iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#1e1e1e] font-bold text-base border-t border-gray-100 pt-2">
              <span>Total</span><span className="text-[#0a4b7a]">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <Btn variant="primary" className="w-full justify-center" onClick={finalizarVenta}
            disabled={cart.length === 0}>
            <Check size={15} /> Finalizar venta
          </Btn>
          <Btn variant="danger" className="w-full justify-center" onClick={() => { setCart([]); setSaleError(""); }}
            disabled={cart.length === 0}>
            <X size={15} /> Cancelar
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Productos ──────────────────────────────────────────────────────────────────

function Productos() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showControlled, setShowControlled] = useState(false);
  const [products, setProducts] = useState(PRODUCTS);
  const [form, setForm] = useState({ name: "", price: "", stock: "", lot: "", expiry: "", supplier: "", description: "", categories: [] as string[], controlled: false });
  const [formError, setFormError] = useState("");

  const CATEGORIES = ["Analgésico", "Antibiótico", "Antiinflamatorio", "Antidiabético", "Antihistamínico", "Ansiolítico", "Gastroprotector", "Controlado"];

  const filtered = products.filter(p => !p.deleted
    && (!showControlled || p.controlled)
    && p.name.toLowerCase().includes(search.toLowerCase())
    && (!filterCategory || p.categories.includes(filterCategory))
    && (!filterStock || (filterStock === "agotado" && p.stock === 0) || (filterStock === "critico" && p.stock > 0 && p.stock <= 10) || (filterStock === "bajo" && p.stock > 10 && p.stock <= 20) || (filterStock === "normal" && p.stock > 20))
  );

  function openEdit(p: Product) { setEditProduct(p); setForm({ name: p.name, price: String(p.price), stock: String(p.stock), lot: p.lot, expiry: p.expiry, supplier: p.supplier, description: p.description, categories: [...p.categories], controlled: p.controlled }); setShowForm(true); setFormError(""); }
  function openNew() { setEditProduct(null); setForm({ name: "", price: "", stock: "", lot: "", expiry: "", supplier: "", description: "", categories: [], controlled: false }); setShowForm(true); setFormError(""); }
  function deleteProduct(id: number) { setProducts(prev => prev.map(p => p.id === id ? { ...p, deleted: true } : p)); }
  function toggleCat(cat: string) {
    setForm(prev => {
      const has = prev.categories.includes(cat);
      const cats = has ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat];
      const controlled = cats.includes("Controlado");
      return { ...prev, categories: cats, controlled };
    });
  }
  function saveForm() {
    if (!form.name || !form.price || !form.stock || !form.lot || !form.expiry || !form.supplier) { setFormError("Complete todos los campos obligatorios."); return; }
    if (parseFloat(form.price) <= 0) { setFormError("El precio debe ser mayor a 0."); return; }
    if (new Date(form.expiry) < new Date()) { setFormError("La fecha de vencimiento debe ser futura."); return; }
    if (!editProduct && products.find(p => p.lot === form.lot)) { setFormError("El número de lote ya existe."); return; }
    setFormError("");
    if (editProduct) {
      setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...form, price: parseFloat(form.price), stock: parseInt(form.stock) } : p));
    } else {
      setProducts(prev => [...prev, { id: Date.now(), ...form, price: parseFloat(form.price), stock: parseInt(form.stock) }]);
    }
    setShowForm(false);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Productos</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn variant={showControlled ? "primary" : "secondary"} size="sm" onClick={() => setShowControlled(!showControlled)}>
            <Shield size={14} /> {showControlled ? "Todos" : "Solo Controlados"}
          </Btn>
          <Btn variant="secondary" size="sm"><Download size={14} /> Exportar Excel</Btn>
          <Btn variant="primary" size="sm" onClick={openNew}><Plus size={14} /> Nuevo producto</Btn>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o lote..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
          <Select value={filterCategory} onChange={setFilterCategory} className="min-w-40">
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Select value={filterStock} onChange={setFilterStock} className="min-w-36">
            <option value="">Todo el stock</option>
            <option value="agotado">Agotado</option>
            <option value="critico">Crítico (1–10)</option>
            <option value="bajo">Bajo (11–20)</option>
            <option value="normal">Normal</option>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Nombre", "Precio", "Stock", "Lote", "Vencimiento", "Proveedor", "Categorías", "Ctrl", "Acciones"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-[#f0f7ff] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#1e1e1e]">{p.name}</td>
                  <td className="py-3 px-4 font-mono text-[#0a4b7a] font-semibold">${p.price.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockColor(p.stock)}`}>
                      {p.stock} — {stockLabel(p.stock)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-500 text-xs">{p.lot}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{p.expiry}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{p.supplier}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {p.categories.map(c => <Badge key={c} className="bg-[#e3f2fd] text-[#0a4b7a]">{c}</Badge>)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {p.controlled ? <Badge className="bg-purple-100 text-purple-700">Sí</Badge> : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteProduct(p.id)} className="text-[#d32f2f] hover:text-red-700 p-1 rounded hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">Sin productos que coincidan con los filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">
                {editProduct ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {editProduct && (
              <div className="mb-4 p-3 bg-[#e3f2fd] rounded-lg text-xs text-[#0a4b7a] grid grid-cols-2 gap-2">
                <div>Precio anterior: <strong>${editProduct.price.toFixed(2)}</strong></div>
                <div>Stock anterior: <strong>{editProduct.stock} uds.</strong></div>
              </div>
            )}

            {formError && (
              <div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle size={14} /> {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                <Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Nombre del medicamento" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción opcional"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a] resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Precio ($) *</label>
                <Input type="number" value={form.price} onChange={v => setForm(p => ({ ...p, price: v }))} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Stock inicial *</label>
                <Input type="number" value={form.stock} onChange={v => setForm(p => ({ ...p, stock: v }))} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Número de lote *</label>
                <Input value={form.lot} onChange={v => setForm(p => ({ ...p, lot: v }))} placeholder="LOT-2024-XXX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de vencimiento *</label>
                <Input type="date" value={form.expiry} onChange={v => setForm(p => ({ ...p, expiry: v }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor *</label>
                <Select value={form.supplier} onChange={v => setForm(p => ({ ...p, supplier: v }))} className="w-full">
                  <option value="">Seleccionar proveedor...</option>
                  {SUPPLIERS.filter(s => !s.deleted).map(s => <option key={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-2">Categorías</label>
                <div className="flex flex-wrap gap-2">
                  {["Analgésico", "Antibiótico", "Antiinflamatorio", "Antidiabético", "Antihistamínico", "Ansiolítico", "Gastroprotector", "Controlado"].map(cat => (
                    <button key={cat} type="button" onClick={() => toggleCat(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        form.categories.includes(cat) ? "bg-[#0a4b7a] text-white border-[#0a4b7a]" : "border-gray-200 text-gray-600 hover:border-[#0a4b7a] hover:text-[#0a4b7a]"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
                {form.controlled && <p className="text-xs text-purple-600 mt-2 flex items-center gap-1"><Shield size={12} /> Este producto requiere receta médica en ventas.</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm}><Check size={14} /> Guardar</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Alertas ────────────────────────────────────────────────────────────────────

function Alertas() {
  const [alerts, setAlerts] = useState(ALERTS);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterAttended, setFilterAttended] = useState("all");

  function toggleType(t: string) {
    setFilterType(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }
  function attend(id: number) { setAlerts(prev => prev.map(a => a.id === id ? { ...a, attended: true } : a)); }
  function attendAll() { setAlerts(prev => prev.map(a => ({ ...a, attended: true }))); }

  const filtered = alerts.filter(a =>
    (filterType.length === 0 || filterType.includes(a.type)) &&
    (filterAttended === "all" || (filterAttended === "pending" && !a.attended) || (filterAttended === "attended" && a.attended))
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Alertas de Stock</h1>
          <p className="text-sm text-gray-500">{alerts.filter(a => !a.attended).length} alertas sin atender</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm"><Download size={14} /> Exportar</Btn>
          <Btn variant="primary" size="sm" onClick={attendAll}><Check size={14} /> Marcar todas como atendidas</Btn>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Tipo:</span>
            {["agotado", "critico", "bajo"].map(t => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={filterType.includes(t)} onChange={() => toggleType(t)} className="accent-[#0a4b7a]" />
                <span className="text-sm capitalize">{t}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-semibold text-gray-500">Estado:</span>
            <Select value={filterAttended} onChange={setFilterAttended}>
              <option value="all">Todas</option>
              <option value="pending">Sin atender</option>
              <option value="attended">Atendidas</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Producto", "Tipo", "Cantidad actual", "Fecha de alerta", "Estado", "Acción"].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${a.type === "agotado" ? "bg-red-50/50" : ""}`}>
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{a.product}</td>
                <td className="py-3 px-4"><Badge className={alertTypeColor(a.type)}>{a.type}</Badge></td>
                <td className="py-3 px-4 font-mono font-semibold text-[#1e1e1e]">{a.qty} uds.</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{a.date}</td>
                <td className="py-3 px-4">
                  {a.attended
                    ? <Badge className="bg-green-100 text-green-700"><Check size={10} className="mr-1" />Atendida</Badge>
                    : <Badge className="bg-amber-100 text-amber-700"><Clock size={10} className="mr-1" />Pendiente</Badge>}
                </td>
                <td className="py-3 px-4">
                  {!a.attended && (
                    <Btn variant="secondary" size="sm" onClick={() => attend(a.id)}>
                      <Check size={13} /> Atender
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-400">Sin alertas con los filtros actuales.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Reportes Farmacéutico ─────────────────────────────────────────────────────

function Reportes() {
  const [activeTab, setActiveTab] = useState<"vencidos" | "proximos" | "agotados" | "controlados" | "movimientos">("proximos");
  const [daysRange, setDaysRange] = useState(30);

  const today = new Date();
  const expired = PRODUCTS.filter(p => new Date(p.expiry) < today);
  const expiringSoon = PRODUCTS.filter(p => {
    const d = new Date(p.expiry);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= daysRange;
  });
  const outOfStock = PRODUCTS.filter(p => p.stock === 0);
  const controlled = PRODUCTS.filter(p => p.controlled);

  const tabs = [
    { key: "proximos" as const, label: "Próx. a Vencer", count: expiringSoon.length },
    { key: "vencidos" as const, label: "Vencidos", count: expired.length },
    { key: "agotados" as const, label: "Agotados", count: outOfStock.length },
    { key: "controlados" as const, label: "Controlados", count: controlled.length },
    { key: "movimientos" as const, label: "Movimientos", count: LOGS.length },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Panel del Farmacéutico</h1>
          <p className="text-sm text-gray-500">Reportes de inventario y control de productos</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm"><Download size={14} /> Excel</Btn>
          <Btn variant="secondary" size="sm"><FileSpreadsheet size={14} /> PDF</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Próx. a vencer", value: expiringSoon.length, color: "amber" as const },
          { label: "Vencidos", value: expired.length, color: "red" as const },
          { label: "Agotados", value: outOfStock.length, color: "red" as const },
          { label: "Controlados", value: controlled.length, color: "blue" as const },
        ].map(k => (
          <Card key={k.label} accent={k.color} className="p-4">
            <div className="text-2xl font-bold text-[#1e1e1e]">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === t.key ? "border-[#0a4b7a] text-[#0a4b7a]" : "border-transparent text-gray-500 hover:text-[#1e1e1e]"
            }`}>
            {t.label}
            {t.count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.key ? "bg-[#0a4b7a] text-white" : "bg-gray-100 text-gray-600"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "proximos" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Vencen en los próximos:</span>
            {[30, 60, 90].map(d => (
              <button key={d} onClick={() => setDaysRange(d)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${daysRange === d ? "bg-[#0a4b7a] text-white" : "border border-gray-200 text-gray-600 hover:border-[#0a4b7a]"}`}>
                {d} días
              </button>
            ))}
          </div>
          <ProductTable products={expiringSoon} emptyMsg={`Ningún producto vence en los próximos ${daysRange} días.`} />
        </div>
      )}
      {activeTab === "vencidos" && <ProductTable products={expired} emptyMsg="No hay productos vencidos." withAction />}
      {activeTab === "agotados" && <ProductTable products={outOfStock} emptyMsg="No hay productos agotados." />}
      {activeTab === "controlados" && <ProductTable products={controlled} emptyMsg="No hay productos controlados." />}
      {activeTab === "movimientos" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Fecha", "Usuario", "Producto", "Campo", "Valor anterior", "Valor nuevo"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LOGS.map(l => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 text-xs text-gray-500 font-mono">{l.date}</td>
                  <td className="py-3 px-4 text-sm">{l.user}</td>
                  <td className="py-3 px-4 font-medium text-[#1e1e1e]">{l.product}</td>
                  <td className="py-3 px-4"><Badge className="bg-[#e3f2fd] text-[#0a4b7a]">{l.field}</Badge></td>
                  <td className="py-3 px-4 text-[#d32f2f] font-mono text-xs">{l.before}</td>
                  <td className="py-3 px-4 text-green-700 font-mono text-xs">{l.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ProductTable({ products, emptyMsg, withAction = false }: { products: Product[]; emptyMsg: string; withAction?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Nombre", "Lote", "Vencimiento", "Stock", "Proveedor", ...(withAction ? ["Acción"] : [])].map(h => (
              <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 px-4 font-medium text-[#1e1e1e]">{p.name}</td>
              <td className="py-3 px-4 font-mono text-xs text-gray-500">{p.lot}</td>
              <td className="py-3 px-4 text-xs text-gray-600">{p.expiry}</td>
              <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockColor(p.stock)}`}>{p.stock}</span></td>
              <td className="py-3 px-4 text-xs text-gray-600">{p.supplier}</td>
              {withAction && <td className="py-3 px-4"><Btn variant="danger" size="sm"><X size={12} /> No vendible</Btn></td>}
            </tr>
          ))}
          {products.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-400">{emptyMsg}</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

// ── Generic CRUD List ──────────────────────────────────────────────────────────

function GenericList<T extends { id: number; deleted?: boolean }>({
  title, items, columns, renderRow, onAdd, searchField
}: {
  title: string;
  items: T[];
  columns: string[];
  renderRow: (item: T) => React.ReactNode;
  onAdd?: () => void;
  searchField: (item: T) => string;
}) {
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const filtered = items.filter(i => (showDeleted ? i.deleted : !i.deleted) && searchField(i).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#1e1e1e]">{title}</h1>
        <div className="flex gap-2 flex-wrap">
          <Btn variant={showDeleted ? "danger" : "secondary"} size="sm" onClick={() => setShowDeleted(!showDeleted)}>
            <Trash2 size={14} /> {showDeleted ? "Ver activos" : "Ver eliminados"}
          </Btn>
          <Btn variant="secondary" size="sm"><Download size={14} /> Exportar Excel</Btn>
          {onAdd && <Btn variant="primary" size="sm" onClick={onAdd}><Plus size={14} /> Nuevo</Btn>}
        </div>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {columns.map(c => <th key={c} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => renderRow(item))}
            {filtered.length === 0 && <tr><td colSpan={columns.length} className="py-10 text-center text-gray-400">Sin registros.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Clientes() {
  const [clients, setClients] = useState(CLIENTS);
  const deleteClient = (id: number) => setClients(prev => prev.map(c => c.id === id ? { ...c, deleted: true } : c));
  const restoreClient = (id: number) => setClients(prev => prev.map(c => c.id === id ? { ...c, deleted: false } : c));
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = clients.filter(c => (showDeleted ? c.deleted : !c.deleted) && c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Clientes</h1>
        <div className="flex gap-2">
          <Btn variant={showDeleted ? "danger" : "secondary"} size="sm" onClick={() => setShowDeleted(!showDeleted)}>
            <Trash2 size={14} /> {showDeleted ? "Ver activos" : "Ver eliminados"}
          </Btn>
          <Btn variant="secondary" size="sm"><Download size={14} /> Exportar Excel</Btn>
          <Btn variant="primary" size="sm"><Plus size={14} /> Nuevo cliente</Btn>
        </div>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Nombre", "Teléfono", "Correo", "Dirección", "Acciones"].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{c.name}</td>
                <td className="py-3 px-4 text-gray-600">{c.phone}</td>
                <td className="py-3 px-4 text-gray-600">{c.email}</td>
                <td className="py-3 px-4 text-gray-600 text-xs">{c.address}</td>
                <td className="py-3 px-4">
                  {showDeleted
                    ? <Btn variant="secondary" size="sm" onClick={() => restoreClient(c.id)}><RefreshCw size={13} /> Restaurar</Btn>
                    : <div className="flex gap-2">
                        <button className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]"><Edit2 size={14} /></button>
                        <button onClick={() => deleteClient(c.id)} className="text-[#d32f2f] hover:text-red-700 p-1 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Sin clientes.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Empleados() {
  const [employees, setEmployees] = useState(EMPLOYEES);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [secTab, setSecTab] = useState(false);
  const filtered = employees.filter(e => (showDeleted ? e.deleted : !e.deleted) && e.name.toLowerCase().includes(search.toLowerCase()));
  const ROLE_COLORS: Record<Role, string> = { administrador: "bg-purple-100 text-purple-700", farmaceutico: "bg-blue-100 text-blue-700", cajero: "bg-green-100 text-green-700" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Empleados</h1>
        <div className="flex gap-2">
          <Btn variant={showDeleted ? "danger" : "secondary"} size="sm" onClick={() => setShowDeleted(!showDeleted)}>
            <Trash2 size={14} /> {showDeleted ? "Ver activos" : "Ver eliminados"}
          </Btn>
          <Btn variant="secondary" size="sm"><Download size={14} /> Exportar</Btn>
          <Btn variant="primary" size="sm"><Plus size={14} /> Nuevo empleado</Btn>
        </div>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Nombre", "Rol", "Correo", "Acciones"].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{e.name}</td>
                <td className="py-3 px-4"><Badge className={ROLE_COLORS[e.role]}>{e.role}</Badge></td>
                <td className="py-3 px-4 text-gray-600">{e.email}</td>
                <td className="py-3 px-4">
                  {showDeleted
                    ? <Btn variant="secondary" size="sm" onClick={() => setEmployees(prev => prev.map(emp => emp.id === e.id ? { ...emp, deleted: false } : emp))}><RefreshCw size={13} /> Restaurar</Btn>
                    : <div className="flex gap-2">
                        <button onClick={() => { setEditEmp(e); setSecTab(false); }} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]"><Edit2 size={14} /></button>
                        <button onClick={() => setEmployees(prev => prev.map(emp => emp.id === e.id ? { ...emp, deleted: true } : emp))} className="text-[#d32f2f] p-1 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Sin empleados.</td></tr>}
          </tbody>
        </table>
      </Card>

      {editEmp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">Editar Empleado</h2>
              <button onClick={() => setEditEmp(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex border-b border-gray-100 mb-4 gap-1">
              <button onClick={() => setSecTab(false)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!secTab ? "border-[#0a4b7a] text-[#0a4b7a]" : "border-transparent text-gray-500"}`}>Datos</button>
              <button onClick={() => setSecTab(true)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${secTab ? "border-[#0a4b7a] text-[#0a4b7a]" : "border-transparent text-gray-500"}`}>Seguridad</button>
            </div>
            {!secTab ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
                  <Input value={editEmp.name} onChange={v => setEditEmp(p => p ? { ...p, name: v } : p)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Correo</label>
                  <Input value={editEmp.email} onChange={v => setEditEmp(p => p ? { ...p, email: v } : p)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Rol</label>
                  <Select value={editEmp.role} onChange={v => setEditEmp(p => p ? { ...p, role: v as Role } : p)} className="w-full">
                    <option value="administrador">Administrador</option>
                    <option value="farmaceutico">Farmacéutico</option>
                    <option value="cajero">Cajero</option>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">Solo el administrador puede cambiar la contraseña de un empleado.</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva contraseña</label>
                  <Input type="password" value="" onChange={() => {}} placeholder="Nueva contraseña" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar contraseña</label>
                  <Input type="password" value="" onChange={() => {}} placeholder="Confirmar contraseña" />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={() => setEditEmp(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={() => { setEmployees(prev => prev.map(e => e.id === editEmp.id ? editEmp : e)); setEditEmp(null); }}><Check size={14} /> Guardar</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Proveedores() {
  const [suppliers, setSuppliers] = useState(SUPPLIERS);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = suppliers.filter(s => (showDeleted ? s.deleted : !s.deleted) && s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Proveedores</h1>
        <div className="flex gap-2">
          <Btn variant={showDeleted ? "danger" : "secondary"} size="sm" onClick={() => setShowDeleted(!showDeleted)}>
            <Trash2 size={14} /> {showDeleted ? "Ver activos" : "Ver eliminados"}
          </Btn>
          <Btn variant="secondary" size="sm"><Download size={14} /> Exportar</Btn>
          <Btn variant="primary" size="sm"><Plus size={14} /> Nuevo proveedor</Btn>
        </div>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Nombre", "Contacto", "Teléfono", "Dirección", "# Productos", "Acciones"].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{s.name}</td>
                <td className="py-3 px-4 text-gray-600">{s.contact}</td>
                <td className="py-3 px-4 text-gray-600 font-mono text-xs">{s.phone}</td>
                <td className="py-3 px-4 text-gray-600 text-xs">{s.address}</td>
                <td className="py-3 px-4">
                  <Badge className="bg-[#e3f2fd] text-[#0a4b7a] font-semibold">{s.productCount}</Badge>
                </td>
                <td className="py-3 px-4">
                  {showDeleted
                    ? <Btn variant="secondary" size="sm" onClick={() => setSuppliers(prev => prev.map(sup => sup.id === s.id ? { ...sup, deleted: false } : sup))}><RefreshCw size={13} /> Restaurar</Btn>
                    : <div className="flex gap-2">
                        <button className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]"><Edit2 size={14} /></button>
                        <button onClick={() => setSuppliers(prev => prev.map(sup => sup.id === s.id ? { ...sup, deleted: true } : sup))} className="text-[#d32f2f] p-1 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-400">Sin proveedores.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Historial ──────────────────────────────────────────────────────────────────

function Historial() {
  const [filterField, setFilterField] = useState("");
  const filtered = LOGS.filter(l => !filterField || l.field === filterField);
  const fields = [...new Set(LOGS.map(l => l.field))];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Historial de Cambios</h1>
          <p className="text-sm text-gray-500">Registro de modificaciones de productos</p>
        </div>
        <Btn variant="secondary" size="sm"><Download size={14} /> Exportar</Btn>
      </div>
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-500">Filtrar por tipo:</span>
          <Select value={filterField} onChange={setFilterField}>
            <option value="">Todos los campos</option>
            {fields.map(f => <option key={f} value={f}>{f}</option>)}
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Fecha / Hora", "Usuario", "Producto", "Campo modificado", "Valor anterior", "Valor nuevo"].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 text-xs text-gray-500 font-mono whitespace-nowrap">{l.date}</td>
                <td className="py-3 px-4 text-sm text-[#1e1e1e]">{l.user}</td>
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{l.product}</td>
                <td className="py-3 px-4"><Badge className="bg-[#e3f2fd] text-[#0a4b7a]">{l.field}</Badge></td>
                <td className="py-3 px-4"><span className="font-mono text-xs text-[#d32f2f] bg-red-50 px-2 py-0.5 rounded">{l.before}</span></td>
                <td className="py-3 px-4"><span className="font-mono text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">{l.after}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-400">Sin registros.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Eliminados ─────────────────────────────────────────────────────────────────

function Eliminados() {
  const [tab, setTab] = useState<"ventas" | "clientes" | "empleados" | "proveedores" | "productos">("ventas");
  const TABS = ["ventas", "clientes", "empleados", "proveedores", "productos"] as const;

  const deletedProducts = PRODUCTS.filter(p => p.deleted);
  const deletedClients = CLIENTS.filter(c => c.deleted);
  const deletedEmployees = EMPLOYEES.filter(e => e.deleted);
  const deletedSuppliers = SUPPLIERS.filter(s => s.deleted);

  const mockDeletedSales = [
    { id: 1, date: "18/05/2026 14:23", client: "Carlos Ramos", total: "$45.80", user: "Lucía Pérez", reason: "Error en registro" },
    { id: 2, date: "17/05/2026 09:11", client: "Consumidor final", total: "$12.00", user: "Admin Sistema", reason: "Cancelación de cliente" },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-[#1e1e1e]">Registros Eliminados</h1>
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${tab === t ? "border-[#0a4b7a] text-[#0a4b7a]" : "border-transparent text-gray-500 hover:text-[#1e1e1e]"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "ventas" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Fecha", "Cliente", "Total", "Eliminado por", "Razón", "Acción"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockDeletedSales.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 text-xs text-gray-500 font-mono">{v.date}</td>
                  <td className="py-3 px-4 font-medium">{v.client}</td>
                  <td className="py-3 px-4 font-semibold text-[#0a4b7a]">{v.total}</td>
                  <td className="py-3 px-4 text-gray-600">{v.user}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{v.reason}</td>
                  <td className="py-3 px-4"><Btn variant="secondary" size="sm"><RefreshCw size={13} /> Restaurar</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "clientes" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">{["Nombre", "Teléfono", "Correo", "Acción"].map(h => <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {deletedClients.map(c => <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{c.name}</td><td className="py-3 px-4 text-gray-600">{c.phone}</td>
                <td className="py-3 px-4 text-gray-600">{c.email}</td>
                <td className="py-3 px-4"><Btn variant="secondary" size="sm"><RefreshCw size={13} /> Restaurar</Btn></td>
              </tr>)}
              {deletedClients.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Sin registros eliminados.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "empleados" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">{["Nombre", "Rol", "Correo", "Acción"].map(h => <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {deletedEmployees.map(e => <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{e.name}</td><td className="py-3 px-4"><Badge className="bg-blue-100 text-blue-700">{e.role}</Badge></td>
                <td className="py-3 px-4 text-gray-600">{e.email}</td>
                <td className="py-3 px-4"><Btn variant="secondary" size="sm"><RefreshCw size={13} /> Restaurar</Btn></td>
              </tr>)}
              {deletedEmployees.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Sin registros eliminados.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "proveedores" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">{["Nombre", "Contacto", "Teléfono", "Acción"].map(h => <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {deletedSuppliers.map(s => <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{s.name}</td><td className="py-3 px-4 text-gray-600">{s.contact}</td>
                <td className="py-3 px-4 text-gray-600 font-mono text-xs">{s.phone}</td>
                <td className="py-3 px-4"><Btn variant="secondary" size="sm"><RefreshCw size={13} /> Restaurar</Btn></td>
              </tr>)}
              {deletedSuppliers.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Sin registros eliminados.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "productos" && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">{["Nombre", "Lote", "Stock", "Acción"].map(h => <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {deletedProducts.map(p => <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{p.name}</td><td className="py-3 px-4 font-mono text-xs text-gray-500">{p.lot}</td>
                <td className="py-3 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockColor(p.stock)}`}>{p.stock}</span></td>
                <td className="py-3 px-4"><Btn variant="secondary" size="sm"><RefreshCw size={13} /> Restaurar</Btn></td>
              </tr>)}
              {deletedProducts.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Sin productos eliminados.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── Configuración ──────────────────────────────────────────────────────────────

function Configuracion() {
  const [stockBajo, setStockBajo] = useState("20");
  const [stockCritico, setStockCritico] = useState("10");
  const [alertaReposicion, setAlertaReposicion] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2500); }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1e1e1e]">Configuración del Sistema</h1>
        <p className="text-sm text-gray-500">Parámetros generales y umbrales de alerta</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <Check size={16} /> Configuración guardada exitosamente.
        </div>
      )}

      <Card className="p-6 space-y-5">
        <h2 className="text-sm font-bold text-[#1e1e1e] border-b border-gray-100 pb-3">Umbrales de Stock</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Stock Bajo (unidades)</label>
            <Input type="number" value={stockBajo} onChange={setStockBajo} placeholder="20" />
            <p className="text-xs text-gray-400 mt-1">Alertas cuando el stock esté en este valor o menor.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Stock Crítico (unidades)</label>
            <Input type="number" value={stockCritico} onChange={setStockCritico} placeholder="10" />
            <p className="text-xs text-gray-400 mt-1">Alertas prioritarias cuando el stock llegue aquí.</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-bold text-[#1e1e1e] border-b border-gray-100 pb-3 mb-5">Alertas Informativas</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={alertaReposicion} onChange={e => setAlertaReposicion(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-[#0a4b7a]" />
          <div>
            <div className="text-sm font-medium text-[#1e1e1e]">Alerta de reposición masiva</div>
            <p className="text-xs text-gray-500 mt-0.5">Notificar cuando se agregue una cantidad inusualmente grande de stock a un producto.</p>
          </div>
        </label>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-bold text-[#1e1e1e] border-b border-gray-100 pb-3 mb-5">Información de la Farmacia</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre de la farmacia</label>
            <Input value="Farmacias San Cupertino" onChange={() => {}} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Dirección</label>
            <Input value="Av. Principal 100, Ciudad" onChange={() => {}} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Teléfono</label>
            <Input value="02-345-6789" onChange={() => {}} />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Btn variant="secondary">Restablecer</Btn>
        <Btn variant="primary" onClick={handleSave}><Check size={14} /> Guardar cambios</Btn>
      </div>
    </div>
  );
}

// ── App Shell ──────────────────────────────────────────────────────────────────

function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [screen, setScreen] = useState<Screen>(() => {
    if (user.role === "cajero") return "ventas";
    if (user.role === "farmaceutico") return "reportes";
    return "dashboard";
  });
  function navigate(s: Screen) { setScreen(s); }

  const unattendedAlerts = ALERTS.filter(a => !a.attended).length;

  const screenTitle: Record<Screen, string> = {
    dashboard: "Dashboard", ventas: "Ventas (POS)", productos: "Productos",
    clientes: "Clientes", empleados: "Empleados", proveedores: "Proveedores",
    alertas: "Alertas de Stock", reportes: "Reportes", historial: "Historial de Cambios",
    eliminados: "Registros Eliminados", configuracion: "Configuración",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7fa]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar user={user} current={screen} onNav={navigate} onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b-2 border-[#0a4b7a]/10 flex items-center px-6 gap-4 flex-shrink-0">
          <h2 className="font-semibold text-[#1e1e1e] text-sm">{screenTitle[screen]}</h2>
          <div className="hidden xl:flex items-center gap-1.5 ml-1 opacity-30">
            <div className="w-5 h-5">
              <FarmaciaLogo className="w-full h-full" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {unattendedAlerts > 0 && (
              <button onClick={() => navigate("alertas")} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell size={18} className="text-gray-500" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#d32f2f] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unattendedAlerts}
                </span>
              </button>
            )}
            <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-7 h-7 bg-[#0a4b7a] rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium text-[#1e1e1e] leading-tight">{user.name}</div>
                <div className="text-xs text-gray-400 capitalize">{user.role}</div>
              </div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#d32f2f] border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut size={13} /> Salir
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {screen === "dashboard" && <Dashboard />}
          {screen === "ventas" && <Ventas />}
          {screen === "productos" && <Productos />}
          {screen === "clientes" && <Clientes />}
          {screen === "empleados" && <Empleados />}
          {screen === "proveedores" && <Proveedores />}
          {screen === "alertas" && <Alertas />}
          {screen === "reportes" && <Reportes />}
          {screen === "historial" && <Historial />}
          {screen === "eliminados" && <Eliminados />}
          {screen === "configuracion" && <Configuracion />}
        </main>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) return <LoginScreen onLogin={setUser} />;
  return <AppShell user={user} onLogout={() => setUser(null)} />;
}