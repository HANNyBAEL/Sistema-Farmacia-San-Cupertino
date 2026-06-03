import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, UserCog, Truck,
  Bell, BarChart2, History, Trash2, Settings, LogOut, Search,
  Plus, Edit2, X, Check, AlertTriangle, FileSpreadsheet,
  Eye, EyeOff, Filter, Download, RefreshCw, Shield,
  TrendingUp, TrendingDown, Clock, ChevronRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { login as apiLogin } from "../services/auth";
import { getProductos, createProducto, updateProducto, deleteProducto } from "../services/productos";
import { fetchKPIs, fetchVentasUltimos7Dias } from "../services/dashboard";
import { createVenta } from "../services/ventas";
import clientesApi from "../services/clientes";
import proveedoresApi from "../services/proveedores";

// ── Logo ──────────────────────────────────────────────────────────────────
function FarmaciaLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className={className} fill="none">
      <rect width="64" height="64" rx="12" fill="#0a4b7a" />
      <rect x="28" y="10" width="8" height="44" rx="4" fill="white" />
      <rect x="10" y="28" width="44" height="8" rx="4" fill="white" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────
type Role = "administrador" | "farmaceutico" | "cajero";
type Screen =
  | "dashboard" | "ventas" | "productos" | "clientes"
  | "empleados" | "proveedores" | "alertas" | "reportes"
  | "historial" | "eliminados" | "configuracion";

interface User { name: string; role: Role; id: number; }

interface Product {
  id_producto: number;
  nombre_producto: string;
  descripcion?: string;
  precio: number;
  stock: number;
  lote: string;
  fecha_vencimiento: string;
  id_proveedor: number;
  deleted?: number;
}

interface Client {
  id_cliente: number;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  direccion?: string;
}

interface Supplier {
  id_proveedor: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
}

interface CartItem { product: Product; qty: number; }

// ── Helpers ───────────────────────────────────────────────────────────────
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

// ── UI Components ─────────────────────────────────────────────────────────
function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}

function Btn({ children, variant = "primary", size = "md", className = "", onClick, disabled = false }: {
  children: React.ReactNode; variant?: "primary"|"secondary"|"danger"|"ghost";
  size?: "sm"|"md"|"lg"; className?: string; onClick?: () => void; disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 font-medium rounded-lg transition-all cursor-pointer select-none disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  const variants = {
    primary: "bg-[#0a4b7a] text-white hover:bg-[#0d5c96]",
    secondary: "border border-[#0a4b7a] text-[#0a4b7a] bg-white hover:bg-[#e3f2fd]",
    danger: "bg-[#d32f2f] text-white hover:bg-[#c62828]",
    ghost: "text-[#6b7280] hover:bg-gray-100 bg-transparent",
  };
  return <button disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}

function Card({ children, className = "", accent }: { children: React.ReactNode; className?: string; accent?: "blue"|"red"|"green"|"amber" }) {
  const borders = { blue: "border-l-4 border-l-[#0a4b7a]", red: "border-l-4 border-l-[#d32f2f]", green: "border-l-4 border-l-green-500", amber: "border-l-4 border-l-amber-500" };
  return <div className={`bg-white rounded-lg shadow-sm border border-gray-100 ${accent ? borders[accent] : ""} ${className}`}>{children}</div>;
}

function Input({ placeholder, value, onChange, type = "text", className = "" }: {
  placeholder?: string; value: string; onChange: (v: string) => void; type?: string; className?: string;
}) {
  return <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
    className={`w-full px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-[#1e1e1e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a] transition-all text-sm ${className}`} />;
}

function Select({ children, value, onChange, className = "" }: {
  children: React.ReactNode; value: string; onChange: (v: string) => void; className?: string;
}) {
  return <select value={value} onChange={e => onChange(e.target.value)}
    className={`px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-[#1e1e1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a] cursor-pointer ${className}`}>
    {children}
  </select>;
}

function LoadingSpinner() {
  return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-[#0a4b7a] border-t-transparent rounded-full animate-spin" /></div>;
}

// ── Login ─────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Complete todos los campos."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiLogin(email, password);
      // Mapear cargo de BD a role del frontend
      const roleMap: Record<string, Role> = {
        administrador: "administrador",
        farmaceutico: "farmaceutico",
        cajero: "cajero",
      };
      const role = roleMap[data.rol?.toLowerCase()] ?? "cajero";
      onLogin({ name: data.nombre, role, id: data.id });
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[#f0f7ff] border border-[#0a4b7a]/10 p-2 mb-4">
            <FarmaciaLogo className="w-full h-full" />
          </div>
          <h1 className="text-lg font-bold text-[#0a2a44] text-center">Farmacias San Cupertino</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sistema de gestión</p>
        </div>
        <h2 className="text-xl font-bold text-[#1e1e1e] mb-1">Iniciar sesión</h2>
        <p className="text-gray-500 text-sm mb-6">Ingrese sus credenciales para continuar</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1e1e1e] mb-1.5">Correo</label>
            <Input placeholder="correo@farmacia.com" value={email} onChange={setEmail} type="email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1e1e1e] mb-1.5">Contraseña</label>
            <div className="relative">
              <Input placeholder="Contraseña" type={showPw ? "text" : "password"} value={password} onChange={setPassword} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2">
            <AlertTriangle size={14} />{error}
          </div>
        )}
        <Btn variant="primary" size="lg" className="w-full mt-6 justify-center" onClick={handleLogin} disabled={loading}>
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </Btn>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────
const NAV_ITEMS: { screen: Screen; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { screen: "dashboard",    label: "Dashboard",            icon: <LayoutDashboard size={18} />, roles: ["administrador"] },
  { screen: "ventas",       label: "Ventas (POS)",          icon: <ShoppingCart size={18} />,   roles: ["administrador","cajero"] },
  { screen: "productos",    label: "Productos",             icon: <Package size={18} />,         roles: ["administrador"] },
  { screen: "clientes",     label: "Clientes",              icon: <Users size={18} />,           roles: ["administrador"] },
  { screen: "empleados",    label: "Empleados",             icon: <UserCog size={18} />,         roles: ["administrador"] },
  { screen: "proveedores",  label: "Proveedores",           icon: <Truck size={18} />,           roles: ["administrador"] },
  { screen: "alertas",      label: "Alertas de Stock",      icon: <Bell size={18} />,            roles: ["administrador","farmaceutico"] },
  { screen: "reportes",     label: "Reportes",              icon: <BarChart2 size={18} />,       roles: ["administrador","farmaceutico"] },
  { screen: "configuracion",label: "Configuración",         icon: <Settings size={18} />,        roles: ["administrador"] },
];

function Sidebar({ user, current, onNav, onLogout }: { user: User; current: Screen; onNav: (s: Screen) => void; onLogout: () => void }) {
  const visible = NAV_ITEMS.filter(i => i.roles.includes(user.role));
  return (
    <aside className="flex flex-col h-full bg-[#0a2a44] w-60 flex-shrink-0">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
        <div className="w-9 h-9 flex-shrink-0 bg-white rounded-xl flex items-center justify-center p-1">
          <FarmaciaLogo className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-bold text-sm block leading-tight">Farmacias San Cupertino</span>
          <span className="text-white/40 text-[10px]">Gestión Farmacéutica</span>
        </div>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {visible.map(item => {
          const active = current === item.screen;
          return (
            <button key={item.screen} onClick={() => onNav(item.screen)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${active ? "bg-[#0a4b7a] text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight size={14} className="ml-auto" />}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0a4b7a] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user.name}</div>
            <div className="text-white/50 text-xs capitalize">{user.role}</div>
          </div>
          <button onClick={onLogout} className="text-white/40 hover:text-[#d32f2f] transition-colors"><LogOut size={15} /></button>
        </div>
      </div>
    </aside>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchKPIs(), fetchVentasUltimos7Dias()])
      .then(([k, s]) => { setKpis(k); setSalesData(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const cards = [
    { label: "Ingresos del día", value: `$${kpis?.ingresosHoy?.toFixed(2) ?? "0.00"}`, icon: <TrendingUp size={20} />, accent: "blue" as const },
    { label: "Ventas del día", value: kpis?.ventasHoy ?? 0, icon: <ShoppingCart size={20} />, accent: "blue" as const },
    { label: "Stock Bajo (≤20)", value: kpis?.stockBajo ?? 0, icon: <TrendingDown size={20} />, accent: "amber" as const },
    { label: "Stock Crítico (≤10)", value: kpis?.stockCritico ?? 0, icon: <AlertTriangle size={20} />, accent: "red" as const },
    { label: "Agotados", value: kpis?.agotados ?? 0, icon: <X size={20} />, accent: "red" as const },
    { label: "Próx. Vencer (30d)", value: kpis?.porVencer ?? 0, icon: <Clock size={20} />, accent: "amber" as const },
    { label: "Proveedores", value: kpis?.proveedoresActivos ?? 0, icon: <Truck size={20} />, accent: "blue" as const },
    { label: "Empleados", value: kpis?.empleadosActivos ?? 0, icon: <UserCog size={20} />, accent: "blue" as const },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1e1e1e]">Tablero Principal</h1>
        <p className="text-gray-500 text-sm">Resumen operativo — {new Date().toLocaleDateString('es-SV')}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map(k => (
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
          <BarChart data={salesData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={(v: number) => [`$${v}`, "Ventas"]} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
            <Bar dataKey="ventas" fill="#0a4b7a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ── Productos ─────────────────────────────────────────────────────────────
function Productos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ nombre_producto: "", descripcion: "", precio: "", stock: "", lote: "", fecha_vencimiento: "", id_proveedor: "" });

  async function load() {
    setLoading(true);
    try {
      const [prods, provs] = await Promise.all([getProductos(), proveedoresApi.getAll()]);
      setProducts(prods);
      setSuppliers(provs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.nombre_producto.toLowerCase().includes(search.toLowerCase()) &&
    (!filterStock ||
      (filterStock === "agotado" && p.stock === 0) ||
      (filterStock === "critico" && p.stock > 0 && p.stock <= 10) ||
      (filterStock === "bajo" && p.stock > 10 && p.stock <= 20) ||
      (filterStock === "normal" && p.stock > 20))
  );

  function openNew() {
    setEditProduct(null);
    setForm({ nombre_producto: "", descripcion: "", precio: "", stock: "", lote: "", fecha_vencimiento: "", id_proveedor: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setForm({
      nombre_producto: p.nombre_producto,
      descripcion: p.descripcion ?? "",
      precio: String(p.precio),
      stock: String(p.stock),
      lote: p.lote,
      fecha_vencimiento: p.fecha_vencimiento,
      id_proveedor: String(p.id_proveedor),
    });
    setFormError("");
    setShowForm(true);
  }

  async function saveForm() {
    if (!form.nombre_producto || !form.precio || !form.stock || !form.lote || !form.fecha_vencimiento || !form.id_proveedor) {
      setFormError("Complete todos los campos obligatorios."); return;
    }
    const payload = {
      nombre_producto: form.nombre_producto,
      descripcion: form.descripcion || null,
      precio: parseFloat(form.precio),
      stock: parseInt(form.stock),
      lote: form.lote,
      fecha_vencimiento: form.fecha_vencimiento,
      id_proveedor: parseInt(form.id_proveedor),
    };
    try {
      if (editProduct) {
        await updateProducto(editProduct.id_producto, payload);
      } else {
        await createProducto(payload);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? "Error al guardar.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este producto?")) return;
    try { await deleteProducto(id); load(); } catch (e) { console.error(e); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Productos</h1>
        <Btn variant="primary" size="sm" onClick={openNew}><Plus size={14} /> Nuevo producto</Btn>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
          <Select value={filterStock} onChange={setFilterStock}>
            <option value="">Todo el stock</option>
            <option value="agotado">Agotado</option>
            <option value="critico">Crítico (1–10)</option>
            <option value="bajo">Bajo (11–20)</option>
            <option value="normal">Normal</option>
          </Select>
          <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14} /> Actualizar</Btn>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Nombre", "Descripción", "Precio", "Stock", "Lote", "Vencimiento", "Proveedor ID", "Acciones"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id_producto} className="border-b border-gray-50 hover:bg-[#f0f7ff] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#1e1e1e]">{p.nombre_producto}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{p.descripcion ?? "—"}</td>
                  <td className="py-3 px-4 font-mono text-[#0a4b7a] font-semibold">${Number(p.precio).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockColor(p.stock)}`}>
                      {p.stock} — {stockLabel(p.stock)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-500 text-xs">{p.lote}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{p.fecha_vencimiento}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{p.id_proveedor}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(p.id_producto)} className="text-[#d32f2f] p-1 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-gray-400">Sin productos.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">{editProduct ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {formError && <div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={14} />{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                <Input value={form.nombre_producto} onChange={v => setForm(p => ({ ...p, nombre_producto: v }))} placeholder="Nombre del medicamento" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <Input value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} placeholder="Descripción opcional" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Precio ($) *</label>
                <Input type="number" value={form.precio} onChange={v => setForm(p => ({ ...p, precio: v }))} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Stock *</label>
                <Input type="number" value={form.stock} onChange={v => setForm(p => ({ ...p, stock: v }))} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Lote *</label>
                <Input value={form.lote} onChange={v => setForm(p => ({ ...p, lote: v }))} placeholder="LOT-2024-XXX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha vencimiento *</label>
                <Input type="date" value={form.fecha_vencimiento} onChange={v => setForm(p => ({ ...p, fecha_vencimiento: v }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor *</label>
                <Select value={form.id_proveedor} onChange={v => setForm(p => ({ ...p, id_proveedor: v }))} className="w-full">
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map(s => <option key={s.id_proveedor} value={s.id_proveedor}>{s.nombre} {s.apellido}</option>)}
                </Select>
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

// ── Ventas (POS) ──────────────────────────────────────────────────────────
function Ventas({ user }: { user: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saleError, setSaleError] = useState("");
  const [saleDone, setSaleDone] = useState(false);

  useEffect(() => {
    Promise.all([getProductos(), clientesApi.getAll()])
      .then(([prods, clts]) => { setProducts(prods); setClients(clts); })
      .catch(console.error);
  }, []);

  const results = products.filter(p =>
    p.nombre_producto.toLowerCase().includes(search.toLowerCase()) && p.stock > 0
  ).slice(0, 6);

  function addToCart(p: Product) {
    if (p.stock === 0) { setSaleError(`Sin stock de ${p.nombre_producto}.`); return; }
    setSaleError("");
    setCart(prev => {
      const exists = prev.find(i => i.product.id_producto === p.id_producto);
      if (exists) {
        if (exists.qty >= p.stock) { setSaleError(`Solo quedan ${p.stock} unidades.`); return prev; }
        return prev.map(i => i.product.id_producto === p.id_producto ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function removeFromCart(id: number) { setCart(prev => prev.filter(i => i.product.id_producto !== id)); }
  function setQty(id: number, qty: number) {
    if (qty <= 0) { removeFromCart(id); return; }
    const item = cart.find(i => i.product.id_producto === id);
    if (item && qty > item.product.stock) { setSaleError(`Solo quedan ${item.product.stock} unidades.`); return; }
    setSaleError("");
    setCart(prev => prev.map(i => i.product.id_producto === id ? { ...i, qty } : i));
  }

  const subtotal = cart.reduce((s, i) => s + Number(i.product.precio) * i.qty, 0);
  const iva = subtotal * 0.12;
  const total = subtotal + iva;

  async function finalizarVenta() {
    if (cart.length === 0) { setSaleError("El carrito está vacío."); return; }
    try {
      await createVenta({
        id_cliente: selectedClient?.id_cliente ?? null,
        id_empleado: user.id,
        productos: cart.map(i => ({ id_producto: i.product.id_producto, cantidad: i.qty })),
      });
      setSaleDone(true);
      setCart([]);
      setSelectedClient(null);
      setClientSearch("");
      // Recargar stock actualizado
      const prods = await getProductos();
      setProducts(prods);
      setTimeout(() => setSaleDone(false), 3000);
    } catch (e: any) {
      setSaleError(e?.response?.data?.error ?? "Error al registrar la venta.");
    }
  }

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1e1e1e] text-sm mb-3">Buscar Producto</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {search && results.map(p => (
            <button key={p.id_producto} onClick={() => addToCart(p)}
              className="w-full text-left p-3 rounded-lg hover:bg-[#e3f2fd] transition-colors border border-transparent hover:border-[#0a4b7a]/20 mb-1">
              <div className="text-sm font-medium text-[#1e1e1e]">{p.nombre_producto}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[#0a4b7a] font-semibold">${Number(p.precio).toFixed(2)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${stockColor(p.stock)}`}>Stock: {p.stock}</span>
              </div>
            </button>
          ))}
          {search && results.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Sin resultados</p>}
          {!search && <p className="text-sm text-gray-400 text-center py-6">Escriba para buscar</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
        <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
          <h2 className="font-semibold text-[#1e1e1e] text-sm">Carrito</h2>
          {cart.length > 0 && <Btn variant="ghost" size="sm" onClick={() => { setCart([]); setSaleError(""); }}><X size={13} /> Limpiar</Btn>}
        </div>
        {saleDone && <div className="mx-4 mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2"><Check size={16} /> Venta registrada exitosamente.</div>}
        {saleError && <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-[#d32f2f] rounded-lg px-4 py-3 text-sm flex items-center gap-2"><AlertTriangle size={14} />{saleError}</div>}
        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <ShoppingCart size={40} strokeWidth={1} /><span className="text-sm">El carrito está vacío</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Producto", "P.Unit", "Cant.", "Subtotal", ""].map(h => <th key={h} className="text-left py-2 px-2 text-xs text-gray-500 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.product.id_producto} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium text-[#1e1e1e]">{item.product.nombre_producto}</td>
                    <td className="py-2 px-2 text-gray-600">${Number(item.product.precio).toFixed(2)}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(item.product.id_producto, item.qty - 1)} className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100">−</button>
                        <span className="w-8 text-center font-medium">{item.qty}</span>
                        <button onClick={() => setQty(item.product.id_producto, item.qty + 1)} className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100">+</button>
                      </div>
                    </td>
                    <td className="py-2 px-2 font-semibold text-[#0a4b7a]">${(Number(item.product.precio) * item.qty).toFixed(2)}</td>
                    <td className="py-2 px-2"><button onClick={() => removeFromCart(item.product.id_producto)} className="text-gray-400 hover:text-[#d32f2f]"><X size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="w-64 border-l border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1e1e1e] text-sm mb-3">Cliente</h2>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Buscar cliente..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-xs focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
          {clientSearch && (
            <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
              {clients.filter(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                <button key={c.id_cliente} onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#e3f2fd] border-b border-gray-50 last:border-0">
                  {c.nombre} {c.apellido}
                </button>
              ))}
            </div>
          )}
          {selectedClient && (
            <div className="mt-2 flex items-center justify-between bg-[#e3f2fd] rounded-lg px-3 py-2">
              <span className="text-xs text-[#0a4b7a] font-medium">{selectedClient.nombre} {selectedClient.apellido}</span>
              <button onClick={() => setSelectedClient(null)} className="text-[#0a4b7a]/50 hover:text-[#d32f2f]"><X size={13} /></button>
            </div>
          )}
        </div>
        <div className="p-4 flex-1">
          <h2 className="font-semibold text-[#1e1e1e] text-sm mb-4">Resumen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-600"><span>IVA (12%)</span><span>${iva.toFixed(2)}</span></div>
            <div className="flex justify-between text-[#1e1e1e] font-bold text-base border-t border-gray-100 pt-2">
              <span>Total</span><span className="text-[#0a4b7a]">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <Btn variant="primary" className="w-full justify-center" onClick={finalizarVenta} disabled={cart.length === 0}>
            <Check size={15} /> Finalizar venta
          </Btn>
          <Btn variant="danger" className="w-full justify-center" onClick={() => { setCart([]); setSaleError(""); }} disabled={cart.length === 0}>
            <X size={15} /> Cancelar
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Clientes ──────────────────────────────────────────────────────────────
function Clientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "" });
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    try { setClients(await clientesApi.getAll()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(search.toLowerCase()));

  function openNew() { setEditClient(null); setForm({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "" }); setFormError(""); setShowForm(true); }
  function openEdit(c: Client) { setEditClient(c); setForm({ nombre: c.nombre, apellido: c.apellido, telefono: c.telefono, correo: c.correo, direccion: c.direccion ?? "" }); setFormError(""); setShowForm(true); }

  async function saveForm() {
    if (!form.nombre || !form.apellido || !form.telefono || !form.correo) { setFormError("Complete los campos obligatorios."); return; }
    try {
      if (editClient) await clientesApi.update(editClient.id_cliente, form);
      else await clientesApi.create(form);
      setShowForm(false); load();
    } catch (e: any) { setFormError(e?.response?.data?.error ?? "Error al guardar."); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este cliente?")) return;
    try { await clientesApi.delete(id); load(); } catch (e) { console.error(e); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Clientes</h1>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14} /> Actualizar</Btn>
          <Btn variant="primary" size="sm" onClick={openNew}><Plus size={14} /> Nuevo cliente</Btn>
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
              {["Nombre", "Teléfono", "Correo", "Dirección", "Acciones"].map(h => <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id_cliente} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{c.nombre} {c.apellido}</td>
                <td className="py-3 px-4 text-gray-600">{c.telefono}</td>
                <td className="py-3 px-4 text-gray-600">{c.correo}</td>
                <td className="py-3 px-4 text-gray-600 text-xs">{c.direccion ?? "—"}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(c.id_cliente)} className="text-[#d32f2f] p-1 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Sin clientes.</td></tr>}
          </tbody>
        </table>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">{editClient ? "Editar Cliente" : "Nuevo Cliente"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {formError && <div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={14} />{formError}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label><Input value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Apellido *</label><Input value={form.apellido} onChange={v => setForm(p => ({ ...p, apellido: v }))} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono *</label><Input value={form.telefono} onChange={v => setForm(p => ({ ...p, telefono: v }))} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Correo *</label><Input type="email" value={form.correo} onChange={v => setForm(p => ({ ...p, correo: v }))} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label><Input value={form.direccion} onChange={v => setForm(p => ({ ...p, direccion: v }))} /></div>
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

// ── Proveedores ───────────────────────────────────────────────────────────
function Proveedores() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "" });
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    try { setSuppliers(await proveedoresApi.getAll()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = suppliers.filter(s => `${s.nombre} ${s.apellido}`.toLowerCase().includes(search.toLowerCase()));

  function openNew() { setEditSupplier(null); setForm({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "" }); setFormError(""); setShowForm(true); }
  function openEdit(s: Supplier) { setEditSupplier(s); setForm({ nombre: s.nombre, apellido: s.apellido, telefono: s.telefono ?? "", correo: s.correo ?? "", direccion: s.direccion ?? "" }); setFormError(""); setShowForm(true); }

  async function saveForm() {
    if (!form.nombre || !form.apellido) { setFormError("Nombre y apellido son obligatorios."); return; }
    try {
      if (editSupplier) await proveedoresApi.update(editSupplier.id_proveedor, form);
      else await proveedoresApi.create(form);
      setShowForm(false); load();
    } catch (e: any) { setFormError(e?.response?.data?.error ?? "Error al guardar."); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este proveedor?")) return;
    try { await proveedoresApi.delete(id); load(); } catch (e) { console.error(e); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Proveedores</h1>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14} /> Actualizar</Btn>
          <Btn variant="primary" size="sm" onClick={openNew}><Plus size={14} /> Nuevo proveedor</Btn>
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
              {["Nombre", "Teléfono", "Correo", "Dirección", "Acciones"].map(h => <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id_proveedor} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{s.nombre} {s.apellido}</td>
                <td className="py-3 px-4 text-gray-600">{s.telefono ?? "—"}</td>
                <td className="py-3 px-4 text-gray-600">{s.correo ?? "—"}</td>
                <td className="py-3 px-4 text-gray-600 text-xs">{s.direccion ?? "—"}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(s.id_proveedor)} className="text-[#d32f2f] p-1 rounded hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">Sin proveedores.</td></tr>}
          </tbody>
        </table>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">{editSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {formError && <div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={14} />{formError}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label><Input value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Apellido *</label><Input value={form.apellido} onChange={v => setForm(p => ({ ...p, apellido: v }))} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label><Input value={form.telefono} onChange={v => setForm(p => ({ ...p, telefono: v }))} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Correo</label><Input type="email" value={form.correo} onChange={v => setForm(p => ({ ...p, correo: v }))} /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label><Input value={form.direccion} onChange={v => setForm(p => ({ ...p, direccion: v }))} /></div>
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

// ── Alertas de Stock ──────────────────────────────────────────────────────
function Alertas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductos()
      .then(prods => setProducts(prods.filter((p: Product) => p.stock <= 20)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const agotados = products.filter(p => p.stock === 0);
  const criticos = products.filter(p => p.stock > 0 && p.stock <= 10);
  const bajos    = products.filter(p => p.stock > 10 && p.stock <= 20);

  function alertType(stock: number) {
    if (stock === 0) return { label: "agotado", cls: "bg-red-100 text-red-700" };
    if (stock <= 10) return { label: "crítico", cls: "bg-red-50 text-red-600" };
    return { label: "bajo", cls: "bg-amber-50 text-amber-700" };
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Alertas de Stock</h1>
          <p className="text-sm text-gray-500">{agotados.length} agotados · {criticos.length} críticos · {bajos.length} bajos</p>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => { setLoading(true); getProductos().then(prods => setProducts(prods.filter((p: Product) => p.stock <= 20))).finally(() => setLoading(false)); }}>
          <RefreshCw size={14} /> Actualizar
        </Btn>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Producto", "Lote", "Stock actual", "Estado", "Vencimiento"].map(h => <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const { label, cls } = alertType(p.stock);
              return (
                <tr key={p.id_producto} className={`border-b border-gray-50 hover:bg-gray-50 ${p.stock === 0 ? "bg-red-50/40" : ""}`}>
                  <td className="py-3 px-4 font-medium text-[#1e1e1e]">{p.nombre_producto}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{p.lote}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-[#1e1e1e]">{p.stock} uds.</td>
                  <td className="py-3 px-4"><Badge className={cls}>{label}</Badge></td>
                  <td className="py-3 px-4 text-xs text-gray-500">{p.fecha_vencimiento}</td>
                </tr>
              );
            })}
            {products.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No hay alertas de stock.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Configuración (sin cambios) ───────────────────────────────────────────
function Configuracion() {
  const [stockBajo, setStockBajo] = useState("20");
  const [stockCritico, setStockCritico] = useState("10");
  const [saved, setSaved] = useState(false);
  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div><h1 className="text-xl font-bold text-[#1e1e1e]">Configuración del Sistema</h1><p className="text-sm text-gray-500">Parámetros generales y umbrales de alerta</p></div>
      {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><Check size={16} /> Configuración guardada.</div>}
      <Card className="p-6 space-y-5">
        <h2 className="text-sm font-bold text-[#1e1e1e] border-b border-gray-100 pb-3">Umbrales de Stock</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Stock Bajo</label><Input type="number" value={stockBajo} onChange={setStockBajo} /></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Stock Crítico</label><Input type="number" value={stockCritico} onChange={setStockCritico} /></div>
        </div>
      </Card>
      <div className="flex justify-end"><Btn variant="primary" onClick={handleSave}><Check size={14} /> Guardar cambios</Btn></div>
    </div>
  );
}

// ── Empleados (placeholder — requiere ruta backend) ───────────────────────
function Empleados() {
  return <div className="p-6"><h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Empleados</h1><p className="text-gray-500 text-sm mt-2">Requiere ruta <code className="bg-gray-100 px-1 rounded">/api/empleados</code> en el backend.</p></div>;
}

// ── App Shell ─────────────────────────────────────────────────────────────
function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [screen, setScreen] = useState<Screen>(() => {
    if (user.role === "cajero") return "ventas";
    if (user.role === "farmaceutico") return "alertas";
    return "dashboard";
  });

  const screenTitle: Record<Screen, string> = {
    dashboard: "Dashboard", ventas: "Ventas (POS)", productos: "Productos",
    clientes: "Clientes", empleados: "Empleados", proveedores: "Proveedores",
    alertas: "Alertas de Stock", reportes: "Reportes", historial: "Historial",
    eliminados: "Eliminados", configuracion: "Configuración",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7fa]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar user={user} current={screen} onNav={setScreen} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b-2 border-[#0a4b7a]/10 flex items-center px-6 gap-4 flex-shrink-0">
          <h2 className="font-semibold text-[#1e1e1e] text-sm">{screenTitle[screen]}</h2>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-7 h-7 bg-[#0a4b7a] rounded-full flex items-center justify-center text-white text-xs font-bold">{user.name.charAt(0)}</div>
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
        <main className="flex-1 overflow-auto">
          {screen === "dashboard"    && <Dashboard />}
          {screen === "ventas"       && <Ventas user={user} />}
          {screen === "productos"    && <Productos />}
          {screen === "clientes"     && <Clientes />}
          {screen === "empleados"    && <Empleados />}
          {screen === "proveedores"  && <Proveedores />}
          {screen === "alertas"      && <Alertas />}
          {screen === "configuracion"&& <Configuracion />}
          {screen === "reportes"     && <div className="p-6"><h1 className="text-xl font-bold">Reportes</h1><p className="text-gray-500 text-sm mt-2">Próximamente.</p></div>}
          {screen === "historial"    && <div className="p-6"><h1 className="text-xl font-bold">Historial</h1><p className="text-gray-500 text-sm mt-2">Próximamente.</p></div>}
          {screen === "eliminados"   && <div className="p-6"><h1 className="text-xl font-bold">Eliminados</h1><p className="text-gray-500 text-sm mt-2">Próximamente.</p></div>}
        </main>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  if (!user) return <LoginScreen onLogin={setUser} />;
  return <AppShell user={user} onLogout={() => { localStorage.removeItem('token'); setUser(null); }} />;
}