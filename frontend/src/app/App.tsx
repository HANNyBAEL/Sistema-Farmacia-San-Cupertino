import React, { useEffect, useState } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, UserCog, Truck,
  Bell, BarChart2, History, Trash2, Settings, LogOut, Search,
  Plus, Edit2, X, Check, AlertTriangle, FileSpreadsheet,
  Eye, EyeOff, Filter, Download, RefreshCw, Shield,
  TrendingUp, TrendingDown, Clock, ChevronRight, RotateCcw,
  Camera
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { login as apiLogin } from "../services/auth";
import { getProductos, createProducto, updateProducto, deleteProducto } from "../services/productos";
import { fetchKPIs, fetchVentasUltimos7Dias } from "../services/dashboard";
import { createVenta } from "../services/ventas";
import clientesApi from "../services/clientes";
import proveedoresApi, { moverProductoAPapelera } from "../services/proveedores";
import empleadosApi from "../services/empleados";
import { getHistorial, getDetalleVenta } from "../services/historial";
import eliminadosApi from "../services/eliminados";
import api from "../services/api";
import EscanerCodigoBarras from '../app/EscanerCodigoBarras';
import { getSiguienteCorrelativo, guardarFactura } from "../services/facturas";
import { generarFacturaPDF } from "./GenerarFactura";
import auditoriaApi from '../services/auditoria';

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
  | "historial" | "eliminados" | "configuracion"
  | "auditoria";

interface User { name: string; role: Role; id: number; }

interface Product {
  codigo_barras: string;
  papelera: any;
  has_ventas: any;
  id_producto: number;
  nombre_producto: string;
  descripcion?: string;
  precio: number;
  stock: number;
  lote: string;
  fecha_vencimiento: string;
  id_proveedor: number;
  deleted: number;
  proveedor_nombre?: string;
  categorias_nombres?: string;
  categorias_ids?: string;
}

interface Client {
  papelera: any;
  has_ventas: any;
  id_cliente: number;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  direccion?: string;
  deleted: number;
}

interface Supplier {
  id_proveedor: number;
  nombre: string;
  apellido: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  deleted: number;
  has_productos: any;
}

interface Empleado {
  id_empleado: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  cargo: string;
  fecha_contratacion?: string;
  activo: number;
}

interface CartItem { product: Product; qty: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── UI Components ─────────────────────────────────────────────────────────────
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
    primary:   "bg-[#0a4b7a] text-white hover:bg-[#0d5c96]",
    secondary: "border border-[#0a4b7a] text-[#0a4b7a] bg-white hover:bg-[#e3f2fd]",
    danger:    "bg-[#d32f2f] text-white hover:bg-[#c62828]",
    ghost:     "text-[#6b7280] hover:bg-gray-100 bg-transparent",
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

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Complete todos los campos."); return; }
    setLoading(true); setError("");
    try {
      const data = await apiLogin(email, password);
      const roleMap: Record<string, Role> = { administrador:"administrador", farmaceutico:"farmaceutico", cajero:"cajero" };
      const role = roleMap[data.rol?.toLowerCase()] ?? "cajero";
      onLogin({ name: data.nombre, role, id: data.id });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Error al conectar con el servidor.";
      setError(msg);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]" style={{ fontFamily:"Inter, sans-serif" }}>
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
        {error && <div className="mt-3 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={14}/>{error}</div>}
        <Btn variant="primary" size="lg" className="w-full mt-6 justify-center" onClick={handleLogin} disabled={loading}>
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </Btn>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_ITEMS: { screen: Screen; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { screen: "dashboard",    label: "Dashboard",             icon: <LayoutDashboard size={18}/>, roles: ["administrador"] },
  { screen: "ventas",       label: "Ventas (POS)",           icon: <ShoppingCart size={18}/>,    roles: ["administrador","cajero"] },
  { screen: "productos",    label: "Productos",              icon: <Package size={18}/>,          roles: ["administrador"] },
  { screen: "clientes",     label: "Clientes",               icon: <Users size={18}/>,            roles: ["administrador"] },
  { screen: "empleados",    label: "Empleados",              icon: <UserCog size={18}/>,          roles: ["administrador"] },
  { screen: "proveedores",  label: "Proveedores",            icon: <Truck size={18}/>,            roles: ["administrador"] },
  { screen: "alertas",      label: "Alertas de Stock",       icon: <Bell size={18}/>,             roles: ["administrador","farmaceutico"] },
  { screen: "historial",    label: "Historial de Ventas",    icon: <History size={18}/>,          roles: ["administrador","farmaceutico"] },
  { screen: "eliminados",   label: "Registros Eliminados",   icon: <Trash2 size={18}/>,           roles: ["administrador"] },
  { screen: "reportes",     label: "Reportes",               icon: <BarChart2 size={18}/>,        roles: ["administrador","farmaceutico"] },
  { screen: "configuracion",label: "Configuración",          icon: <Settings size={18}/>,         roles: ["administrador"] },
  { screen: "auditoria", label: "Auditoría", icon: <Shield size={18} />, roles: ["administrador"] },
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
          <button onClick={onLogout} className="text-white/40 hover:text-[#d32f2f] transition-colors"><LogOut size={15}/></button>
        </div>
      </div>
    </aside>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [kpis, setKpis]         = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([fetchKPIs(), fetchVentasUltimos7Dias()])
      .then(([k, s]) => {
        const processed = s.map((item: { dia: string; ventas: number }) => {
          // ← cambiar "day" por "dia"
          const date = new Date(item.dia + 'T12:00:00Z'); // ← cambiar "day" por "dia"
          const dayName = date.toLocaleDateString('es-ES', {
            weekday: 'short',
            timeZone: 'America/El_Salvador'
          });
          return { day: dayName.replace('.', ''), ventas: item.ventas };
        });
        setSalesData(processed);
        setKpis(k);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const cards = [
    { label: "Ingresos del día",   value: `$${kpis?.ingresosHoy?.toFixed(2) ?? "0.00"}`, icon: <TrendingUp size={20}/>,    accent: "blue" as const },
    { label: "Ventas del día",     value: kpis?.ventasHoy ?? 0,                           icon: <ShoppingCart size={20}/>,  accent: "blue" as const },
    { label: "Stock Bajo (≤20)",   value: kpis?.stockBajo ?? 0,                           icon: <TrendingDown size={20}/>,  accent: "amber" as const },
    { label: "Stock Crítico (≤10)",value: kpis?.stockCritico ?? 0,                        icon: <AlertTriangle size={20}/>, accent: "red" as const },
    { label: "Agotados",           value: kpis?.agotados ?? 0,                            icon: <X size={20}/>,             accent: "red" as const },
    { label: "Próx. Vencer (30d)", value: kpis?.porVencer ?? 0,                           icon: <Clock size={20}/>,         accent: "amber" as const },
    { label: "Proveedores",        value: kpis?.proveedoresActivos ?? 0,                  icon: <Truck size={20}/>,         accent: "blue" as const },
    { label: "Empleados",          value: kpis?.empleadosActivos ?? 0,                    icon: <UserCog size={20}/>,       accent: "blue" as const },
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
            <div className={`inline-flex p-2 rounded-lg mb-3 ${
              k.accent === "red" ? "bg-red-50 text-red-600" :
              k.accent === "amber" ? "bg-amber-50 text-amber-600" :
              "bg-[#e3f2fd] text-[#0a4b7a]"
            }`}>
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
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12, fill: "#6b7280" }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fontSize: 12, fill: "#6b7280" }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={v => `$${v}`} 
            />
            <Tooltip 
              formatter={(v: number) => [`$${v}`, "Ventas"]} 
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} 
            />
            <Bar dataKey="ventas" fill="#0a4b7a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ── Productos ─────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { id: 1,  nombre: "Analgésicos" },
  { id: 2,  nombre: "Antibióticos" },
  { id: 3,  nombre: "Vitaminas" },
  { id: 4,  nombre: "Antiinflamatorios" },
  { id: 5,  nombre: "Antipsicóticos" },
  { id: 6,  nombre: "Antidepresivos" },
  { id: 7,  nombre: "Anticonvulsionantes" },
  { id: 8,  nombre: "Controlados" },
  { id: 9,  nombre: "Antihistamínicos" },
  { id: 10, nombre: "Antidiabéticos" },
  { id: 11, nombre: "Antihipertensivos" },
  { id: 12, nombre: "Antibióticos orales" },
  { id: 13, nombre: "Corticosteroides" },
  { id: 14, nombre: "Diuréticos" },
  { id: 15, nombre: "Antivirales" },
  { id: 16, nombre: "Antimicóticos" },
  { id: 17, nombre: "Antiparasitarios" },
  { id: 18, nombre: "Suplementos" },
  { id: 19, nombre: "Analgésicos Opioides" },
  { id: 20, nombre: "Broncodilatadores" },
  { id: 21, nombre: "Anticoagulantes" },
  { id: 22, nombre: "Ansiolíticos" },
  { id: 23, nombre: "Hipnóticos" },
  { id: 24, nombre: "Cardioprotectores" },
  { id: 25, nombre: "Gastrointestinal" },
  { id: 26, nombre: "Otros" },
];

function Productos({ user }: { user: User }) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [form, setForm] = useState({
    nombre_producto:"", descripcion:"", precio:"", stock:"",
    lote:"", fecha_vencimiento:"", id_proveedor:"", codigo_barras:""
  });

  async function load() {
    setLoading(true);
    try {
      const [prods, provs] = await Promise.all([getProductos(), proveedoresApi.getAll()]);
      setProducts(prods); setSuppliers(provs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);


  const filtered = products
    .filter(p =>
      p.nombre_producto.toLowerCase().startsWith(search.toLowerCase()) &&
      (!filterStock ||
        (filterStock==="agotado" && p.stock===0) ||
        (filterStock==="critico" && p.stock>0 && p.stock<=10) ||
        (filterStock==="bajo"    && p.stock>10 && p.stock<=20) ||
        (filterStock==="normal"  && p.stock>20))
    )
    .sort((a, b) => a.nombre_producto.localeCompare(b.nombre_producto, 'es'));

  function openNew() {
    setEditProduct(null);
    setSelectedCats([]);
    setForm({ nombre_producto:"", descripcion:"", precio:"", stock:"", lote:"", fecha_vencimiento:"", id_proveedor:"", codigo_barras:"" });
    setFormError(""); setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    const cats = p.categorias_ids
      ? String(p.categorias_ids).split(',').map(Number).filter(Boolean)
      : [];
    setSelectedCats(cats);
    setForm({
      nombre_producto: p.nombre_producto,
      descripcion: p.descripcion ?? "",
      precio: String(p.precio),
      stock: String(p.stock),
      lote: p.lote,
      fecha_vencimiento: p.fecha_vencimiento,
      id_proveedor: String(p.id_proveedor),
      codigo_barras: p.codigo_barras ?? ""
    });
    setFormError(""); setShowForm(true);
  }

  function toggleCat(id: number) {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
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
      categorias: selectedCats,
      codigo_barras: form.codigo_barras || null,
      id_empleado: user.id,
      nombre_empleado: user.name,
    };
    try {
      if (editProduct) await updateProducto(editProduct.id_producto, payload);
      else             await createProducto(payload);
      setShowForm(false); load();
    } catch (e: any) { setFormError(e?.response?.data?.error ?? "Error al guardar."); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Mover este producto a la papelera?")) return;
    try {
      await api.patch(`/productos/${id}/papelera`, { id_empleado: user.id, nombre_empleado: user.name });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Error al eliminar el producto.");
    }
  }

  async function handleToggle(id: number, deleted: number) {
    const accion = deleted ? "activar" : "desactivar";
    if (!confirm(`¿Deseas ${accion} este producto?`)) return;
    try {
      await api.patch(`/productos/${id}/toggle`, { id_empleado: user.id, nombre_empleado: user.name });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? `Error al ${accion} el producto.`);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Productos</h1>
        <Btn variant="primary" size="sm" onClick={openNew}><Plus size={14}/> Nuevo producto</Btn>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
          <Select value={filterStock} onChange={setFilterStock}>
            <option value="">Todo el stock</option>
            <option value="agotado">Agotado</option>
            <option value="critico">Crítico (1–10)</option>
            <option value="bajo">Bajo (11–20)</option>
            <option value="normal">Normal</option>
          </Select>
          <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14}/> Actualizar</Btn>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Nombre","Categoría","Precio","Stock","Lote","Vencimiento","Proveedor","Estado","Acciones"].map(h=>(
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id_producto} className={`border-b border-gray-50 transition-colors ${p.deleted ? 'bg-gray-50 opacity-60' : 'hover:bg-[#f0f7ff]'}`}>
                  <td className="py-3 px-4 font-medium text-[#1e1e1e]">{p.nombre_producto}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {p.categorias_nombres ? (() => {
                      const cats = p.categorias_nombres.split(', ');
                      const primera = cats[0];
                      const resto = cats.slice(1);
                      return (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded">{primera}</span>
                          {resto.length > 0 && (
                            <div className="relative group">
                              <button className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold hover:bg-blue-200 transition-colors">
                                +{resto.length}
                              </button>
                              <div className="absolute left-0 top-6 z-50 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-max">
                                <p className="text-xs font-semibold text-gray-500 mb-1.5">Otras categorías:</p>
                                {resto.map((cat: string, i: number) => (
                                  <div key={i} className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded mb-1">{cat}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })() : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#0a4b7a] font-semibold">${Number(p.precio).toFixed(2)}</td>
                  <td className="py-3 px-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${stockColor(p.stock)}`}>{p.stock} — {stockLabel(p.stock)}</span></td>
                  <td className="py-3 px-4 font-mono text-gray-500 text-xs">{p.lote}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{p.fecha_vencimiento}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{p.proveedor_nombre ?? p.id_proveedor}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.deleted ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                      {p.deleted ? "Inactivo" : "Activo"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={()=>openEdit(p)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]" title="Editar"><Edit2 size={14}/></button>
                      <button
                        onClick={()=>handleToggle(p.id_producto, p.deleted)}
                        className={`p-1 rounded text-xs font-semibold px-2 py-1 ${p.deleted ? 'text-green-700 bg-green-50 hover:bg-green-100' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'}`}
                        title={p.deleted ? "Activar producto" : "Desactivar producto"}
                      >
                        {p.deleted ? "Activar" : "Desactivar"}
                      </button>
                      {!p.has_ventas && (
                        <button onClick={()=>handleDelete(p.id_producto)} className="text-[#d32f2f] p-1 rounded hover:bg-red-50" title="Mover a papelera"><Trash2 size={14}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">Sin productos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">{editProduct ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            {formError && <div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={14}/>{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label><Input value={form.nombre_producto} onChange={v=>setForm(p=>({...p,nombre_producto:v}))} placeholder="Nombre del medicamento" /></div>
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label><Input value={form.descripcion} onChange={v=>setForm(p=>({...p,descripcion:v}))} placeholder="Descripción opcional" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Precio ($) *</label><Input type="number" value={form.precio} onChange={v=>setForm(p=>({...p,precio:v}))} placeholder="0.00" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Stock *</label><Input type="number" value={form.stock} onChange={v=>setForm(p=>({...p,stock:v}))} placeholder="0" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Lote *</label><Input value={form.lote} onChange={v=>setForm(p=>({...p,lote:v}))} placeholder="LOT-2024-XXX" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Fecha vencimiento *</label><Input type="date" value={form.fecha_vencimiento} onChange={v=>setForm(p=>({...p,fecha_vencimiento:v}))} /></div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Código de barras</label>
                <Input value={form.codigo_barras} onChange={v=>setForm(p=>({...p,codigo_barras:v}))} placeholder="Ej: 7501234567890" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor *</label>
                <Select value={form.id_proveedor} onChange={v=>setForm(p=>({...p,id_proveedor:v}))} className="w-full">
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map(s=><option key={s.id_proveedor} value={s.id_proveedor}>{s.nombre} {s.apellido}</option>)}
                </Select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-2">Categorías</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-[#f8fafc]">
                  {CATEGORIAS.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedCats.includes(cat.id)}
                        onChange={() => toggleCat(cat.id)}
                        className="rounded"
                      />
                      <span className="text-gray-700">{cat.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={()=>setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm}><Check size={14}/> Guardar</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Ventas (POS) ──────────────────────────────────────────────────────────────
function Ventas({ user }: { user: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [search, setSearch]     = useState("");
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [clientSearch, setClientSearch]     = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saleError, setSaleError] = useState("");
  const [saleDone, setSaleDone]   = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [efectivo, setEfectivo] = useState("");

  // Modal nuevo cliente
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ nombre:"", apellido:"", telefono:"", correo:"", direccion:"" });
  const [newClientError, setNewClientError] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    Promise.all([getProductos(), clientesApi.getAll()])
      .then(([prods, clts]) => {
        setProducts(prods.sort((a: { nombre_producto: string; }, b: { nombre_producto: any; }) => a.nombre_producto.localeCompare(b.nombre_producto, 'es')));
        setClients(clts);
      })
      .catch(console.error);
  }, []);

  const results = products
    .filter(p => {
      if (p.stock <= 0) return false;
      if (p.papelera) return false;
      const term = search.toLowerCase();
      const name = p.nombre_producto.toLowerCase();
      return name.startsWith(term) || name.split(' ').some(word => word.startsWith(term));
    })
    .slice(0, 6);

  function addToCart(p: Product) {
    if (p.papelera) { setSaleError(`"${p.nombre_producto}" no está disponible.`); return; }
    if (p.deleted === 1) { setSaleError(`"${p.nombre_producto}" está desactivado y no se puede vender.`); return; }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(p.fecha_vencimiento + 'T00:00:00');
    if (vencimiento < hoy) { setSaleError(`"${p.nombre_producto}" está vencido y no se puede vender.`); return; }
    if (p.stock === 0) { setSaleError(`"${p.nombre_producto}" no tiene stock disponible.`); return; }
    // Verificar si es medicamento controlado
    const categoriasControladas = ['Controlados', 'Analgésicos Opioides', 'Ansiolíticos', 'Hipnóticos'];
    const esControlado = p.categorias_nombres
      ? categoriasControladas.some(cat => p.categorias_nombres!.includes(cat))
      : false;

    if (esControlado) {
      const confirmar = confirm(
        `⚠️ MEDICAMENTO CONTROLADO\n\n"${p.nombre_producto}" pertenece a una categoría controlada.\n\nDebe pedir y retener la receta médica del cliente antes de vender.\n\n¿Confirma que tiene la receta en mano?`
      );
      if (!confirmar) return;
    }
    setSaleError("");
    setCart(prev => {
      const exists = prev.find(i => i.product.id_producto === p.id_producto);
      if (exists) {
        if (exists.qty >= p.stock) { setSaleError(`Solo quedan ${p.stock} unidades de "${p.nombre_producto}".`); return prev; }
        return prev.map(i => i.product.id_producto === p.id_producto ? { ...i, qty: i.qty+1 } : i);
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function handleCodigoDetectado(codigo: string) {
    setShowScanner(false);
    const producto = products.find(p => p.codigo_barras === codigo);
    if (!producto) {
      setSaleError(`No se encontró ningún producto con el código: ${codigo}`);
      return;
    }
    addToCart(producto);
  }

  function removeFromCart(id: number) { setCart(prev => prev.filter(i => i.product.id_producto !== id)); }
  function setQty(id: number, qty: number) {
    if (qty <= 0) { removeFromCart(id); return; }
    const item = cart.find(i => i.product.id_producto === id);
    if (item && qty > item.product.stock) { setSaleError(`Solo quedan ${item.product.stock} unidades.`); return; }
    setSaleError("");
    setCart(prev => prev.map(i => i.product.id_producto === id ? { ...i, qty } : i));
  }

  const total    = cart.reduce((s, i) => s + Number(i.product.precio) * i.qty, 0);
  const subtotal = total / 1.13;
  const iva      = total - subtotal;

  async function finalizarVenta() {
    if (!efectivo || parseFloat(efectivo) < total) {
      setSaleError("Ingrese el efectivo recibido (debe cubrir el total)."); return;
    }
    if (cart.length === 0) { setSaleError("El carrito está vacío."); return; }
    try {
      const ventaResp = await createVenta({
        id_cliente: selectedClient?.id_cliente ?? null,
        id_empleado: user.id,
        productos: cart.map(i => ({ id_producto: i.product.id_producto, cantidad: i.qty }))
      });

      // Preguntar si desea factura
      const desea = confirm("¿Desea generar factura electrónica para esta venta?");
      if (desea) {
        try {
          const { numero_control } = await getSiguienteCorrelativo();
          const codigo_generacion = crypto.randomUUID().toUpperCase();
          const ahora = new Date();
          const fecha_emision = ahora.toISOString().slice(0,19).replace("T"," ");

          await guardarFactura({
            numero_control,
            codigo_generacion,
            id_venta: ventaResp.id_venta,
            id_cliente: selectedClient?.id_cliente ?? null,
            fecha_emision,
            total: ventaResp.total,
          });

          generarFacturaPDF({
            numero_control,
            codigo_generacion,
            fecha_emision,
            receptor: {
              nombre: selectedClient
                ? `${selectedClient.nombre} ${selectedClient.apellido}`
                : "CONSUMIDOR FINAL",
              dui:       (selectedClient as any)?.dui,
              correo:    selectedClient?.correo,
              telefono:  selectedClient?.telefono,
              direccion: selectedClient?.direccion,
            },
            items: cart.map(i => ({
              codigo:          i.product.id_producto,
              descripcion:     i.product.nombre_producto,
              cantidad:        i.qty,
              precio_unitario: Number(i.product.precio),
              subtotal:        Number(i.product.precio) * i.qty,
            })),
            total: ventaResp.total,
            empleado: user.name,
          });
        } catch (fe) {
          console.error("Error generando factura:", fe);
          alert("Venta registrada pero no se pudo generar la factura.");
        }
      }

      setSaleDone(true);
      setEfectivo("");
      setCart([]);
      setSelectedClient(null);
      setClientSearch("");
      const prods = await getProductos();
      setProducts([...prods].sort((a: Product, b: Product) =>
        a.nombre_producto.localeCompare(b.nombre_producto, 'es')
      ));
      setTimeout(() => setSaleDone(false), 3000);

    } catch (e: any) {
      setSaleError(e?.response?.data?.error ?? "Error al registrar la venta.");
    }
  }

  async function guardarNuevoCliente() {
    if (!newClientForm.nombre || !newClientForm.apellido || !newClientForm.telefono) {
      setNewClientError("Nombre, apellido y teléfono son obligatorios."); return;
    }
    setSavingClient(true);
    try {
      await clientesApi.create(newClientForm);
      const clts = await clientesApi.getAll();
      setClients(clts);
      const creado = clts.find((c: Client) =>
        c.nombre === newClientForm.nombre &&
        c.apellido === newClientForm.apellido &&
        c.telefono === newClientForm.telefono
      );
      if (creado) setSelectedClient(creado);
      setShowNewClient(false);
      setNewClientForm({ nombre:"", apellido:"", telefono:"", correo:"", direccion:"" });
      setNewClientError("");
    } catch (e: any) {
      setNewClientError(e?.response?.data?.error ?? "Error al registrar el cliente.");
    } finally {
      setSavingClient(false);
    }
  }

  return (
    <div className="flex h-full" style={{ minHeight:0 }}>

      {/* Escáner de código de barras */}
      {showScanner && (
        <EscanerCodigoBarras
          onDetected={handleCodigoDetectado}
          onClose={()=>setShowScanner(false)}
        />
      )}

      {/* Modal nuevo cliente */}
      {showNewClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">Nuevo Cliente</h2>
              <button onClick={()=>{setShowNewClient(false);setNewClientError("");}} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            {newClientError && (
              <div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle size={14}/>{newClientError}
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                  <Input value={newClientForm.nombre} onChange={v=>setNewClientForm(p=>({...p,nombre:v}))} placeholder="Nombre"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Apellido *</label>
                  <Input value={newClientForm.apellido} onChange={v=>setNewClientForm(p=>({...p,apellido:v}))} placeholder="Apellido"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono *</label>
                <Input value={newClientForm.telefono} onChange={v=>setNewClientForm(p=>({...p,telefono:v}))} placeholder="7000-0000"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Correo</label>
                <Input type="email" value={newClientForm.correo} onChange={v=>setNewClientForm(p=>({...p,correo:v}))} placeholder="correo@ejemplo.com"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label>
                <Input value={newClientForm.direccion} onChange={v=>setNewClientForm(p=>({...p,direccion:v}))} placeholder="Dirección opcional"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <Btn variant="secondary" onClick={()=>{setShowNewClient(false);setNewClientError("");}}>Cancelar</Btn>
              <Btn variant="primary" onClick={guardarNuevoCliente} disabled={savingClient}>
                <Check size={14}/> {savingClient ? "Guardando..." : "Registrar"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      <div className="w-72 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#1e1e1e] text-sm">Buscar Producto</h2>
            <button
              onClick={()=>setShowScanner(true)}
              className="flex items-center gap-1 text-xs text-[#0a4b7a] hover:bg-[#e3f2fd] px-2 py-1 rounded-lg font-medium transition-colors"
              title="Escanear código de barras"
            >
              <Camera size={13}/> Escanear
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {search && results.map(p=>(
            <button key={p.id_producto} onClick={()=>addToCart(p)}
              className="w-full text-left p-3 rounded-lg hover:bg-[#e3f2fd] transition-colors border border-transparent hover:border-[#0a4b7a]/20 mb-1">
              <div className="text-sm font-medium text-[#1e1e1e]">{p.nombre_producto}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-[#0a4b7a] font-semibold">${Number(p.precio).toFixed(2)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${stockColor(p.stock)}`}>Stock: {p.stock}</span>
              </div>
            </button>
          ))}
          {search && results.length===0 && <p className="text-sm text-gray-400 text-center py-6">Sin resultados</p>}
          {!search && <p className="text-sm text-gray-400 text-center py-6">Escriba para buscar</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col" style={{ minWidth:0 }}>
        <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
          <h2 className="font-semibold text-[#1e1e1e] text-sm">Carrito</h2>
          {cart.length>0 && <Btn variant="ghost" size="sm" onClick={()=>{setCart([]);setSaleError("");}}><X size={13}/> Limpiar</Btn>}
        </div>
        {saleDone && <div className="mx-4 mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2"><Check size={16}/> Venta registrada exitosamente.</div>}
        {saleError && <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-[#d32f2f] rounded-lg px-4 py-3 text-sm flex items-center gap-2"><AlertTriangle size={14}/>{saleError}</div>}
        <div className="flex-1 overflow-auto p-4">
          {cart.length===0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3"><ShoppingCart size={40} strokeWidth={1}/><span className="text-sm">El carrito está vacío</span></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">{["Producto","P.Unit","Cant.","Subtotal",""].map(h=><th key={h} className="text-left py-2 px-2 text-xs text-gray-500 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {cart.map(item=>(
                  <tr key={item.product.id_producto} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium text-[#1e1e1e]">{item.product.nombre_producto}</td>
                    <td className="py-2 px-2 text-gray-600">${Number(item.product.precio).toFixed(2)}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>setQty(item.product.id_producto,item.qty-1)} className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100">−</button>
                        <span className="w-8 text-center font-medium">{item.qty}</span>
                        <button onClick={()=>setQty(item.product.id_producto,item.qty+1)} className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-100">+</button>
                      </div>
                    </td>
                    <td className="py-2 px-2 font-semibold text-[#0a4b7a]">${(Number(item.product.precio)*item.qty).toFixed(2)}</td>
                    <td className="py-2 px-2"><button onClick={()=>removeFromCart(item.product.id_producto)} className="text-gray-400 hover:text-[#d32f2f]"><X size={15}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="w-64 border-l border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#1e1e1e] text-sm">Cliente</h2>
            <button
              onClick={()=>{setShowNewClient(true);setNewClientError("");}}
              className="flex items-center gap-1 text-xs text-[#0a4b7a] hover:text-[#0d5c96] font-medium hover:bg-[#e3f2fd] px-2 py-1 rounded-lg transition-colors"
              title="Registrar nuevo cliente"
            >
              <Plus size={12}/> Nuevo
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Buscar por correo electrónico..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-xs focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
          {clientSearch && (
            <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
              {clients.filter(c => c.correo.toLowerCase().includes(clientSearch.toLowerCase()) && !c.deleted && !c.papelera).map(c => (
                <button key={c.id_cliente} onClick={()=>{setSelectedClient(c);setClientSearch("");}}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#e3f2fd] border-b border-gray-50 last:border-0">
                  {c.nombre} {c.apellido}
                </button>
              ))}
            </div>
          )}
          {selectedClient && (
            <div className="mt-2 flex items-center justify-between bg-[#e3f2fd] rounded-lg px-3 py-2">
              <span className="text-xs text-[#0a4b7a] font-medium">{selectedClient.nombre} {selectedClient.apellido}</span>
              <button onClick={()=>setSelectedClient(null)} className="text-[#0a4b7a]/50 hover:text-[#d32f2f]"><X size={13}/></button>
            </div>
          )}
        </div>
        <div className="p-4 flex-1">
          <h2 className="font-semibold text-[#1e1e1e] text-sm mb-4">Resumen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#1e1e1e] font-bold text-base border-t border-gray-100 pt-2">
              <span>Total</span><span className="text-[#0a4b7a]">${total.toFixed(2)}</span>
            </div>
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Efectivo recibido *</label>
              <input
                type="number"
                min={0}
                value={efectivo}
                onChange={e => setEfectivo(e.target.value)}
                placeholder="$0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]"
              />
            </div>
            {parseFloat(efectivo) >= total && (
              <div className="flex justify-between text-green-700 font-bold text-base bg-green-50 rounded-lg px-3 py-2">
                <span>Cambio</span><span>${(parseFloat(efectivo) - total).toFixed(2)}</span>
              </div>
            )}
            {efectivo && parseFloat(efectivo) < total && (
              <div className="flex items-center gap-1 text-[#d32f2f] text-xs">
                <AlertTriangle size={12} /> Monto insuficiente
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <Btn variant="primary" className="w-full justify-center" onClick={finalizarVenta} disabled={cart.length===0}><Check size={15}/> Finalizar venta</Btn>
          <Btn variant="danger"  className="w-full justify-center" onClick={()=>{setCart([]);setSaleError("");}} disabled={cart.length===0}><X size={15}/> Cancelar</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Clientes ──────────────────────────────────────────────────────────────────
function Clientes({ user }: { user: User }) {
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm]         = useState({ nombre:"", apellido:"", telefono:"", correo:"", direccion:"" });
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    try { setClients(await clientesApi.getAll()); } catch(e){console.error(e);} finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  const filtered = clients.filter(c=>
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(search.toLowerCase())
  );

  function openNew(){setEditClient(null);setForm({nombre:"",apellido:"",telefono:"",correo:"",direccion:""});setFormError("");setShowForm(true);}
  function openEdit(c:Client){setEditClient(c);setForm({nombre:c.nombre,apellido:c.apellido,telefono:c.telefono,correo:c.correo,direccion:c.direccion??""});setFormError("");setShowForm(true);}

  async function saveForm() {
    if (!form.nombre || !form.apellido || !form.telefono || !form.correo) { setFormError("Complete los campos obligatorios."); return; }
    try {
      if (editClient) await clientesApi.update(editClient.id_cliente, { ...form, id_empleado: user.id, nombre_empleado: user.name });
      else            await clientesApi.create({ ...form, id_empleado: user.id, nombre_empleado: user.name });
      setShowForm(false); load();
    } catch (e: any) { setFormError(e?.response?.data?.error ?? "Error al guardar."); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este cliente permanentemente?")) return;
    try {
      await api.delete(`/clientes/${id}`, { data: { id_empleado: user.id, nombre_empleado: user.name } });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "No se puede eliminar este cliente.");
    }
  }

  async function handleToggle(id: number, deleted: number) {
    const accion = deleted ? "activar" : "desactivar";
    if (!confirm(`¿Deseas ${accion} este cliente?`)) return;
    try {
      await api.patch(`/clientes/${id}/toggle`, { id_empleado: user.id, nombre_empleado: user.name });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? `Error al ${accion} el cliente.`);
    }
  }

  if(loading) return <LoadingSpinner/>;
  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Clientes</h1>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14}/> Actualizar</Btn>
          <Btn variant="primary"   size="sm" onClick={openNew}><Plus size={14}/> Nuevo cliente</Btn>
        </div>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]"/>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Nombre","Teléfono","Correo","Dirección","Estado","Acciones"].map(h=>(
                <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.id_cliente} className={`border-b border-gray-50 transition-colors ${c.deleted ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{c.nombre} {c.apellido}</td>
                <td className="py-3 px-4 text-gray-600">{c.telefono}</td>
                <td className="py-3 px-4 text-gray-600">{c.correo}</td>
                <td className="py-3 px-4 text-gray-600 text-xs">{c.direccion??"—"}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.deleted ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {c.deleted ? "Inactivo" : "Activo"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 items-center">
                    <button onClick={()=>openEdit(c)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]" title="Editar"><Edit2 size={14}/></button>
                    <button
                      onClick={()=>handleToggle(c.id_cliente, c.deleted ?? 0)}
                      className={`p-1 rounded text-xs font-semibold px-2 py-1 ${
                        c.deleted
                          ? 'text-green-700 bg-green-50 hover:bg-green-100'
                          : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      }`}
                      title={c.deleted ? "Activar cliente" : "Desactivar cliente"}
                    >
                      {c.deleted ? "Activar" : "Desactivar"}
                    </button>
                    {!c.has_ventas && (
                      <button onClick={()=>handleDelete(c.id_cliente)} className="text-[#d32f2f] p-1 rounded hover:bg-red-50" title="Eliminar permanentemente"><Trash2 size={14}/></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0&&(<tr><td colSpan={6} className="py-10 text-center text-gray-400">Sin clientes.</td></tr>)}
          </tbody>
        </table>
      </Card>
      {showForm&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">{editClient?"Editar Cliente":"Nuevo Cliente"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            {formError&&<div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={14}/>{formError}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label><Input value={form.nombre} onChange={v=>setForm(p=>({...p,nombre:v}))}/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Apellido *</label><Input value={form.apellido} onChange={v=>setForm(p=>({...p,apellido:v}))}/></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono *</label><Input value={form.telefono} onChange={v=>setForm(p=>({...p,telefono:v}))}/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Correo *</label><Input type="email" value={form.correo} onChange={v=>setForm(p=>({...p,correo:v}))}/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label><Input value={form.direccion} onChange={v=>setForm(p=>({...p,direccion:v}))}/></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={()=>setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm}><Check size={14}/> Guardar</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Proveedores ───────────────────────────────────────────────────────────────
function Proveedores({ user }: { user: User }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm]           = useState({ nombre:"", apellido:"", telefono:"", correo:"", direccion:"" });
  const [formError, setFormError] = useState("");

  async function load(){
    setLoading(true);
    try{ setSuppliers(await proveedoresApi.getAll()); }
    catch(e){ console.error(e); }
    finally{ setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  const filtered = suppliers.filter(s=>
    `${s.nombre} ${s.apellido}`.toLowerCase().includes(search.toLowerCase())
  );

  function openNew(){ setEditSupplier(null); setForm({nombre:"",apellido:"",telefono:"",correo:"",direccion:""}); setFormError(""); setShowForm(true); }
  function openEdit(s:Supplier){ setEditSupplier(s); setForm({nombre:s.nombre,apellido:s.apellido,telefono:s.telefono??"",correo:s.correo??"",direccion:s.direccion??""}); setFormError(""); setShowForm(true); }

  async function saveForm() {
    if (!form.nombre || !form.apellido) { setFormError("Nombre y apellido son obligatorios."); return; }
    try {
      if (editSupplier) await proveedoresApi.update(editSupplier.id_proveedor, { ...form, id_empleado: user.id, nombre_empleado: user.name });
      else              await proveedoresApi.create({ ...form, id_empleado: user.id, nombre_empleado: user.name });
      setShowForm(false); load();
    } catch (e: any) { setFormError(e?.response?.data?.error ?? "Error al guardar."); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Mover este proveedor a la papelera?")) return;
    try {
      await api.patch(`/proveedores/${id}/papelera`, { id_empleado: user.id, nombre_empleado: user.name });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Error al eliminar el proveedor.");
    }
  }

  async function handleToggle(id: number, deleted: number) {
    const accion = deleted ? "activar" : "desactivar";
    if (!confirm(`¿Deseas ${accion} este proveedor?`)) return;
    try {
      await api.patch(`/proveedores/${id}/toggle`, { id_empleado: user.id, nombre_empleado: user.name });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? `Error al ${accion} el proveedor.`);
    }
  }

  if(loading) return <LoadingSpinner/>;
  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Proveedores</h1>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14}/> Actualizar</Btn>
          <Btn variant="primary"   size="sm" onClick={openNew}><Plus size={14}/> Nuevo proveedor</Btn>
        </div>
      </div>
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar proveedor..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]"/>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Nombre","Teléfono","Correo","Dirección","Estado","Acciones"].map(h=>(
                <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s=>(
              <tr key={s.id_proveedor} className={`border-b border-gray-50 transition-colors ${s.deleted ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                <td className="py-3 px-4 font-medium text-[#1e1e1e]">{s.nombre} {s.apellido}</td>
                <td className="py-3 px-4 text-gray-600">{s.telefono??"—"}</td>
                <td className="py-3 px-4 text-gray-600">{s.correo??"—"}</td>
                <td className="py-3 px-4 text-gray-600 text-xs">{s.direccion??"—"}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.deleted ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {s.deleted ? "Inactivo" : "Activo"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 items-center">
                    <button onClick={()=>openEdit(s)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]" title="Editar"><Edit2 size={14}/></button>
                    <button
                      onClick={()=>handleToggle(s.id_proveedor, s.deleted ?? 0)}
                      className={`p-1 rounded text-xs font-semibold px-2 py-1 ${
                        s.deleted
                          ? 'text-green-700 bg-green-50 hover:bg-green-100'
                          : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      }`}
                      title={s.deleted ? "Activar proveedor" : "Desactivar proveedor"}
                    >
                      {s.deleted ? "Activar" : "Desactivar"}
                    </button>
                    {!s.has_productos && (
                      <button onClick={()=>handleDelete(s.id_proveedor)} className="text-[#d32f2f] p-1 rounded hover:bg-red-50" title="Eliminar permanentemente"><Trash2 size={14}/></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0&&<tr><td colSpan={6} className="py-10 text-center text-gray-400">Sin proveedores.</td></tr>}
          </tbody>
        </table>
      </Card>
      {showForm&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">{editSupplier?"Editar Proveedor":"Nuevo Proveedor"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            {formError&&<div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={14}/>{formError}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label><Input value={form.nombre} onChange={v=>setForm(p=>({...p,nombre:v}))}/></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Apellido *</label><Input value={form.apellido} onChange={v=>setForm(p=>({...p,apellido:v}))}/></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label><Input value={form.telefono} onChange={v=>setForm(p=>({...p,telefono:v}))}/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Correo</label><Input type="email" value={form.correo} onChange={v=>setForm(p=>({...p,correo:v}))}/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label><Input value={form.direccion} onChange={v=>setForm(p=>({...p,direccion:v}))}/></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={()=>setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm}><Check size={14}/> Guardar</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Empleados ─────────────────────────────────────────────────────────────────
function Empleados({ user }: { user: User }) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterCargo, setFilterCargo] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editEmp, setEditEmp]     = useState<Empleado | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm]           = useState({ nombre:"", apellido:"", correo:"", telefono:"", cargo:"cajero", password:"", fecha_contratacion:"" });

  const CARGOS = ["administrador","farmaceutico","cajero"];
  const CARGO_COLOR: Record<string,string> = { administrador:"bg-[#e3f2fd] text-[#0a4b7a]", farmaceutico:"bg-[#e8f5e9] text-green-800", cajero:"bg-[#fff3e0] text-amber-800" };
  const CARGO_ICON: Record<string,React.ReactNode> = { administrador:<Shield size={12}/>, farmaceutico:<Package size={12}/>, cajero:<ShoppingCart size={12}/> };

  async function load(){setLoading(true);try{setEmpleados(await empleadosApi.getAll());}catch(e){console.error(e);}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);

  const filtered = empleados.filter(e =>
    `${e.nombre} ${e.apellido}`.toLowerCase().includes(search.toLowerCase()) &&
    (!filterCargo || e.cargo === filterCargo)
  );

  function openNew(){setEditEmp(null);setForm({nombre:"",apellido:"",correo:"",telefono:"",cargo:"cajero",password:"",fecha_contratacion:""});setFormError("");setShowForm(true);}
  function openEdit(emp:Empleado){setEditEmp(emp);setForm({nombre:emp.nombre,apellido:emp.apellido,correo:emp.correo,telefono:emp.telefono??"",cargo:emp.cargo,password:"",fecha_contratacion:emp.fecha_contratacion??""});setFormError("");setShowForm(true);}

  async function saveForm(){
    if(!form.nombre||!form.apellido||!form.correo||!form.cargo){setFormError("Complete los campos obligatorios.");return;}
    if(!editEmp&&!form.password){setFormError("La contraseña es obligatoria para nuevos empleados.");return;}
    try{
      const payload:any={
        ...form,
        id_empleado_sesion: user.id,
        nombre_empleado_sesion: user.name,
      };
      if(!payload.password) delete payload.password;
      if(editEmp) await empleadosApi.update(editEmp.id_empleado, payload);
      else        await empleadosApi.create(payload);
      setShowForm(false); load();
    }catch(e:any){setFormError(e?.response?.data?.error??"Error al guardar.");}
  }

  async function handleToggle(emp: Empleado){
    const action = emp.activo ? "desactivar" : "activar";
    if(!confirm(`¿${action.charAt(0).toUpperCase()+action.slice(1)} a ${emp.nombre}?`)) return;
    try{
      await empleadosApi.update(emp.id_empleado, {
        ...emp,
        activo: emp.activo ? 0 : 1,
        id_empleado_sesion: user.id,
        nombre_empleado_sesion: user.name,
      });
      load();
    }catch(e){console.error(e);}
  }

  if(loading) return <LoadingSpinner/>;
  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Gestión de Empleados</h1>
          <p className="text-sm text-gray-500">{filtered.length} empleados encontrados</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14}/> Actualizar</Btn>
          <Btn variant="primary"   size="sm" onClick={openNew}><Plus size={14}/> Nuevo empleado</Btn>
        </div>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]"/>
          </div>
          <Select value={filterCargo} onChange={setFilterCargo}>
            <option value="">Todos los cargos</option>
            {CARGOS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </Select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Empleado","Correo","Teléfono","Cargo","Contratación","Estado","Acciones"].map(h=>(
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp=>(
                <tr key={emp.id_empleado} className={`border-b border-gray-50 hover:bg-[#f0f7ff] transition-colors ${!emp.activo?"opacity-50":""}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#e3f2fd] flex items-center justify-center text-[#0a4b7a] text-xs font-bold flex-shrink-0">
                        {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                      </div>
                      <span className="font-medium text-[#1e1e1e]">{emp.nombre} {emp.apellido}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{emp.correo}</td>
                  <td className="py-3 px-4 text-gray-600">{emp.telefono??"—"}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CARGO_COLOR[emp.cargo]??"bg-gray-100 text-gray-600"}`}>
                      {CARGO_ICON[emp.cargo]} {emp.cargo}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{emp.fecha_contratacion??"—"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.activo?"bg-green-50 text-green-700":"bg-gray-100 text-gray-500"}`}>
                      {emp.activo?"Activo":"Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={()=>openEdit(emp)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]" title="Editar"><Edit2 size={14}/></button>
                      <button onClick={()=>handleToggle(emp)} className={`p-1 rounded ${emp.activo?"text-[#d32f2f] hover:bg-red-50":"text-green-600 hover:bg-green-50"}`} title={emp.activo?"Desactivar":"Activar"}>
                        {emp.activo?<X size={14}/>:<Check size={14}/>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={7} className="py-12 text-center text-gray-400">Sin empleados registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {showForm&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1e1e]">{editEmp?"Editar Empleado":"Nuevo Empleado"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            {formError&&<div className="mb-4 flex items-center gap-2 text-[#d32f2f] text-sm bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={14}/>{formError}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label><Input value={form.nombre} onChange={v=>setForm(p=>({...p,nombre:v}))}/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Apellido *</label><Input value={form.apellido} onChange={v=>setForm(p=>({...p,apellido:v}))}/></div>
              <div className="col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Correo *</label><Input type="email" value={form.correo} onChange={v=>setForm(p=>({...p,correo:v}))}/></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label><Input value={form.telefono} onChange={v=>setForm(p=>({...p,telefono:v}))}/></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cargo *</label>
                <Select value={form.cargo} onChange={v=>setForm(p=>({...p,cargo:v}))} className="w-full">
                  {CARGOS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </Select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Fecha contratación</label><Input type="date" value={form.fecha_contratacion} onChange={v=>setForm(p=>({...p,fecha_contratacion:v}))}/></div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña {editEmp?"(vacío = no cambiar)":"*"}</label>
                <Input type="password" value={form.password} onChange={v=>setForm(p=>({...p,password:v}))} placeholder="••••••••"/>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={()=>setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm}><Check size={14}/> Guardar</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Alertas de Stock ──────────────────────────────────────────────────────────
function Alertas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("todos");

  async function load(){
    setLoading(true);
    try{ setProducts(await getProductos()); }catch(e){ console.error(e); }finally{ setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  const today = new Date();
  today.setHours(0,0,0,0);
  const in30 = new Date();
  in30.setDate(today.getDate()+30);
  in30.setHours(0,0,0,0);

  const agotados  = products.filter(p => p.stock === 0);
  const criticos  = products.filter(p => p.stock > 0 && p.stock <= 10);
  const bajos     = products.filter(p => p.stock > 10 && p.stock <= 20);
  const vencer    = products.filter(p => {
    if(!p.fecha_vencimiento) return false;
    const d = new Date(p.fecha_vencimiento + 'T00:00:00');
    return d >= today && d <= in30;
  });
  const vencidos  = products.filter(p => {
    if(!p.fecha_vencimiento) return false;
    const d = new Date(p.fecha_vencimiento + 'T00:00:00');
    return d < today;
  });

  const totalStock = agotados.length + criticos.length + bajos.length;
  const totalTodos = totalStock + vencer.length + vencidos.length;

  const tabs = [
    { id:"todos",   label:"Todos",          count: totalTodos,      color:"text-[#0a4b7a]" },
    { id:"agotado", label:"Agotados",        count: agotados.length, color:"text-[#d32f2f]" },
    { id:"critico", label:"Críticos (1–10)", count: criticos.length, color:"text-orange-600" },
    { id:"bajo",    label:"Bajo (11–20)",    count: bajos.length,    color:"text-amber-600" },
    { id:"vencer",  label:"Próx. vencer",    count: vencer.length,   color:"text-purple-600" },
    { id:"vencido", label:"Vencidos",        count: vencidos.length, color:"text-red-700" },
  ];

  const displayed =
    tab === "todos"   ? [...agotados, ...criticos, ...bajos, ...vencer, ...vencidos] :
    tab === "agotado" ? agotados :
    tab === "critico" ? criticos :
    tab === "bajo"    ? bajos :
    tab === "vencer"  ? vencer :
    vencidos;

  function stockCls(stock: number){
    if(stock === 0) return "bg-red-100 text-red-800";
    if(stock <= 10) return "bg-orange-100 text-orange-800";
    return "bg-amber-100 text-amber-800";
  }

  function stockLabel(stock: number){
    if(stock === 0) return "Agotado";
    if(stock <= 10) return "Crítico";
    return "Bajo";
  }

  function isVencido(fecha: string){
    return new Date(fecha + 'T00:00:00') < today;
  }

  if(loading) return <LoadingSpinner/>;
  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Alertas</h1>
          <p className="text-sm text-gray-500">
            {agotados.length} agotados · {criticos.length} críticos · {bajos.length} bajos · {vencer.length} próx. vencer · {vencidos.length} vencidos
          </p>
        </div>
        <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14}/> Actualizar</Btn>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label:"Agotados",      value: agotados.length, cls:"bg-red-50 text-[#d32f2f] border-red-100" },
          { label:"Críticos",      value: criticos.length, cls:"bg-orange-50 text-orange-700 border-orange-100" },
          { label:"Stock Bajo",    value: bajos.length,    cls:"bg-amber-50 text-amber-700 border-amber-100" },
          { label:"Próx. Vencer",  value: vencer.length,   cls:"bg-purple-50 text-purple-700 border-purple-100" },
          { label:"Vencidos",      value: vencidos.length, cls:"bg-red-50 text-red-800 border-red-200" },
        ].map(k=>(
          <div key={k.label} className={`rounded-lg border p-4 ${k.cls}`}>
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs font-medium mt-0.5 opacity-80">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab===t.id?"bg-white shadow-sm text-[#1e1e1e]":"text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            {t.count>0&&<span className={`text-xs font-bold ${tab===t.id?t.color:"text-gray-400"}`}>({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Producto","Lote","Stock","Estado","Vencimiento","Días"].map(h=>(
                <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map(p=>{
              const fechaDate = p.fecha_vencimiento ? new Date(p.fecha_vencimiento + 'T00:00:00') : null;
              const dias = fechaDate ? Math.round((fechaDate.getTime() - today.getTime()) / 86400000) : null;
              const vencido = fechaDate ? isVencido(p.fecha_vencimiento) : false;

              return(
                <tr key={p.id_producto} className={`border-b border-gray-50 transition-colors ${p.stock===0?"bg-red-50/40":vencido?"bg-red-50/20":"hover:bg-gray-50"}`}>
                  <td className="py-3 px-4 font-medium text-[#1e1e1e]">{p.nombre_producto}</td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-500">{p.lote}</td>
                  <td className="py-3 px-4 font-mono font-semibold">{p.stock} uds.</td>
                  <td className="py-3 px-4">
                    {vencido ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-200 text-red-900">Vencido</span>
                    ) : p.stock === 0 || p.stock <= 20 ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockCls(p.stock)}`}>{stockLabel(p.stock)}</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">Próx. vencer</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-500">{p.fecha_vencimiento ?? "—"}</td>
                  <td className="py-3 px-4">
                    {dias !== null ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        dias < 0        ? "bg-red-200 text-red-900" :
                        dias <= 7       ? "bg-red-100 text-red-800" :
                        dias <= 15      ? "bg-orange-100 text-orange-800" :
                                          "bg-amber-100 text-amber-800"
                      }`}>
                        {dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : `${dias} días`}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
            {displayed.length===0&&(
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">Sin alertas en esta categoría. ✓</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Historial de Ventas ───────────────────────────────────────────────────────
function Historial() {
  const [data, setData]         = useState<{ventas:any[];total:number}>({ventas:[],total:0});
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [page, setPage]         = useState(0);
  const [detalle, setDetalle]   = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 20;

  async function load(p=0){
    setLoading(true);
    try{
      const res=await getHistorial({from:from||undefined,to:to||undefined,limit:LIMIT,offset:p*LIMIT});
      setData(res);setPage(p);
    }catch(e){console.error(e);}finally{setLoading(false);}
  }
  useEffect(()=>{load(0);},[]);

  async function verDetalle(venta:any){
    setDetailLoading(true);
    try{const d=await getDetalleVenta(venta.id_venta);setDetalle(d);}catch(e){console.error(e);}finally{setDetailLoading(false);}
  }

  const totalPages=Math.ceil(data.total/LIMIT);

  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Historial de Ventas</h1>
          <p className="text-sm text-gray-500">{data.total} ventas registradas</p>
        </div>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]"/>
          </div>
          <Btn variant="primary" size="sm" onClick={()=>load(0)}><Search size={14}/> Filtrar</Btn>
          <Btn variant="ghost" size="sm" onClick={()=>{setFrom("");setTo("");setTimeout(()=>load(0),0);}}><X size={14}/> Limpiar</Btn>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["# Venta","Fecha","Cliente","Empleado","Total","Detalle"].map(h=>(
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">Cargando...</td></tr>
              ):data.ventas.map(v=>(
                <tr key={v.id_venta} className="border-b border-gray-50 hover:bg-[#f0f7ff] transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-[#0a4b7a] font-semibold">#{v.id_venta}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{v.fecha}</td>
                  <td className="py-3 px-4 text-gray-700">{v.cliente??<span className="text-gray-400 italic">Consumidor final</span>}</td>
                  <td className="py-3 px-4 text-gray-700">{v.empleado}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-[#0a4b7a]">${Number(v.total).toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <button onClick={()=>verDetalle(v)} className="text-[#0a4b7a] hover:text-[#0d5c96] p-1 rounded hover:bg-[#e3f2fd]" title="Ver detalle"><Eye size={14}/></button>
                  </td>
                </tr>
              ))}
              {!loading&&data.ventas.length===0&&<tr><td colSpan={6} className="py-12 text-center text-gray-400">Sin ventas en el período.</td></tr>}
            </tbody>
          </table>
        </div>
        {totalPages>1&&(
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Página {page+1} de {totalPages}</span>
            <div className="flex gap-2">
              <Btn variant="secondary" size="sm" disabled={page===0} onClick={()=>load(page-1)}>← Anterior</Btn>
              <Btn variant="secondary" size="sm" disabled={page>=totalPages-1} onClick={()=>load(page+1)}>Siguiente →</Btn>
            </div>
          </div>
        )}
      </Card>
      {detalle&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#1e1e1e]">Detalle de Venta #{detalle.venta?.id_venta}</h2>
                <p className="text-xs text-gray-500">{detalle.venta?.fecha} · {detalle.venta?.empleado}</p>
              </div>
              <button onClick={()=>setDetalle(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            {detalle.venta?.cliente&&<div className="mb-4 bg-[#f0f7ff] rounded-lg px-3 py-2 text-xs text-[#0a4b7a]">Cliente: <strong>{detalle.venta.cliente}</strong></div>}
            <table className="w-full text-sm mb-4">
              <thead><tr className="border-b border-gray-100 bg-gray-50">{["Producto","Lote","Cant.","P.Unit","Subtotal"].map(h=><th key={h} className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {detailLoading?<tr><td colSpan={5} className="py-6 text-center text-gray-400">Cargando...</td></tr>
                :detalle.detalle?.map((d:any)=>(
                  <tr key={d.id_detalle} className="border-b border-gray-50">
                    <td className="py-2 px-3 font-medium text-[#1e1e1e]">{d.nombre_producto}</td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">{d.lote}</td>
                    <td className="py-2 px-3 text-gray-600">{d.cantidad}</td>
                    <td className="py-2 px-3 font-mono text-gray-600">${Number(d.precio_unitario).toFixed(2)}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-[#0a4b7a]">${Number(d.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center border-t border-gray-100 pt-3">
              <span className="text-sm font-semibold text-[#1e1e1e]">Total</span>
              <span className="text-lg font-bold text-[#0a4b7a]">${Number(detalle.venta?.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-end mt-4"><Btn variant="secondary" onClick={()=>setDetalle(null)}>Cerrar</Btn></div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Eliminados ────────────────────────────────────────────────────────────────
function Eliminados() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [tab, setTab]         = useState("todos");

  async function load(){
    setLoading(true);
    try{ setRecords(await eliminadosApi.getAll()); }
    catch(e){ console.error(e); }
    finally{ setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  const tipoLabel: Record<string, string> = {
    producto: "Producto",
    cliente:  "Cliente",
    proveedor:"Proveedor",
    empleado: "Empleado",
  };

  const tipoCls: Record<string, string> = {
    producto:  "bg-blue-50 text-blue-700",
    cliente:   "bg-green-50 text-green-700",
    proveedor: "bg-purple-50 text-purple-700",
    empleado:  "bg-amber-50 text-amber-700",
  };

  const tabs = [
    { id:"todos",     label:"Todos" },
    { id:"producto",  label:"Productos" },
    { id:"cliente",   label:"Clientes" },
    { id:"proveedor", label:"Proveedores" },
    { id:"empleado",  label:"Empleados" },
  ];

  const byTab = tab === "todos" ? records : records.filter(r => r.tipo === tab);
  const filtered = byTab.filter(r => r.nombre.toLowerCase().includes(search.toLowerCase()));

  async function handleRestore(tipo: string, id: number) {
    if (!confirm(`¿Restaurar este ${tipoLabel[tipo].toLowerCase()}?`)) return;
    try {
      await eliminadosApi.restaurar(tipo, id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Error al restaurar.");
    }
  }

  async function handlePermanent(tipo: string, id: number) {
    if (!confirm(`⚠️ Esta acción es irreversible. ¿Eliminar permanentemente este ${tipoLabel[tipo].toLowerCase()}?`)) return;
    try {
      await eliminadosApi.eliminar(tipo, id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Error al eliminar permanentemente.");
    }
  }

  if(loading) return <LoadingSpinner/>;
  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Registros Eliminados</h1>
          <p className="text-sm text-gray-500">{records.length} registros en papelera</p>
        </div>
        <Btn variant="secondary" size="sm" onClick={load}><RefreshCw size={14}/> Actualizar</Btn>
      </div>

      {records.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle size={15}/>
          Los registros aquí pueden ser restaurados o eliminados permanentemente.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map(t => {
          const count = t.id === "todos" ? records.length : records.filter(r => r.tipo === t.id).length;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab===t.id?"bg-white shadow-sm text-[#1e1e1e]":"text-gray-500 hover:text-gray-700"}`}>
              {t.label}
              {count > 0 && <span className={`text-xs font-bold ${tab===t.id?"text-[#0a4b7a]":"text-gray-400"}`}>({count})</span>}
            </button>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar registro..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]"/>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Tipo","Nombre","Detalle","Acciones"].map(h=>(
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i)=>(
                <tr key={`${r.tipo}-${r.id}-${i}`} className="border-b border-gray-50 hover:bg-red-50/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoCls[r.tipo]}`}>
                      {tipoLabel[r.tipo]}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-[#1e1e1e] opacity-60 line-through">{r.nombre}</td>
                  <td className="py-3 px-4 text-xs text-gray-400">{r.detalle ?? "—"}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={()=>handleRestore(r.tipo, r.id)}
                        className="flex items-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg font-medium transition-colors"
                      >
                        <RotateCcw size={12}/> Restaurar
                      </button>
                      <button
                        onClick={()=>handlePermanent(r.tipo, r.id)}
                        className="flex items-center gap-1 text-xs text-[#d32f2f] bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg font-medium transition-colors"
                      >
                        <Trash2 size={12}/> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&(
                <tr><td colSpan={4} className="py-12 text-center text-gray-400">
                  {records.length===0?"La papelera está vacía.":"Sin resultados para la búsqueda."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Auditoria({ user }: { user: User }) {
  const [data, setData]     = useState<{ data: any[]; total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [tabla, setTabla]   = useState("");
  const [accion, setAccion] = useState("");
  const [page, setPage]     = useState(0);
  const LIMIT = 30;

  async function load(p = 0) {
    setLoading(true);
    try {
      const res = await auditoriaApi.getAll({
        from: from || undefined,
        to: to || undefined,
        tabla: tabla || undefined,
        accion: accion || undefined,
        limit: LIMIT,
        offset: p * LIMIT,
      });
      setData(res); setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(0); }, []);

  const totalPages = Math.ceil(data.total / LIMIT);

  const accionColor: Record<string, string> = {
    CREAR:      "bg-green-50 text-green-700",
    EDITAR:     "bg-blue-50 text-blue-700",
    ELIMINAR:   "bg-red-50 text-red-700",
    DESACTIVAR: "bg-amber-50 text-amber-700",
    ACTIVAR:    "bg-green-50 text-green-700",
    PAPELERA:   "bg-orange-50 text-orange-700",
    RESTAURAR:  "bg-purple-50 text-purple-700",
  };

  const tablaColor: Record<string, string> = {
    productos:   "bg-blue-50 text-blue-700",
    clientes:    "bg-green-50 text-green-700",
    proveedores: "bg-purple-50 text-purple-700",
    empleados:   "bg-amber-50 text-amber-700",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1e1e1e]">Auditoría del Sistema</h1>
          <p className="text-sm text-gray-500">{data.total} registros de cambios</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-[#f8fafc] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4b7a]/30 focus:border-[#0a4b7a]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tabla</label>
            <Select value={tabla} onChange={setTabla}>
              <option value="">Todas</option>
              <option value="productos">Productos</option>
              <option value="clientes">Clientes</option>
              <option value="proveedores">Proveedores</option>
              <option value="empleados">Empleados</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Acción</label>
            <Select value={accion} onChange={setAccion}>
              <option value="">Todas</option>
              <option value="CREAR">Crear</option>
              <option value="EDITAR">Editar</option>
              <option value="ELIMINAR">Eliminar</option>
              <option value="ACTIVAR">Activar</option>
              <option value="DESACTIVAR">Desactivar</option>
              <option value="PAPELERA">Papelera</option>
              <option value="RESTAURAR">Restaurar</option>
            </Select>
          </div>
          <Btn variant="primary" size="sm" onClick={() => load(0)}><Search size={14} /> Filtrar</Btn>
          <Btn variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setTabla(""); setAccion(""); setTimeout(() => load(0), 0); }}><X size={14} /> Limpiar</Btn>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Fecha", "Tabla", "Acción", "Descripción", "Empleado"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400">Cargando...</td></tr>
              ) : data.data.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-[#f0f7ff] transition-colors">
                  <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(r.fecha).toLocaleString('es-SV')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${tablaColor[r.tabla] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.tabla}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accionColor[r.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.accion}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{r.descripcion}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{r.nombre_empleado ?? '—'}</td>
                </tr>
              ))}
              {!loading && data.data.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400">Sin registros de auditoría.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Btn variant="secondary" size="sm" disabled={page === 0} onClick={() => load(page - 1)}>← Anterior</Btn>
              <Btn variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>Siguiente →</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Configuración ─────────────────────────────────────────────────────────────
function Configuracion() {
  const [stockBajo, setStockBajo]       = useState("20");
  const [stockCritico, setStockCritico] = useState("10");
  const [saved, setSaved]               = useState(false);
  function handleSave(){setSaved(true);setTimeout(()=>setSaved(false),2500);}
  return(
    <div className="p-6 max-w-2xl space-y-6">
      <div><h1 className="text-xl font-bold text-[#1e1e1e]">Configuración del Sistema</h1><p className="text-sm text-gray-500">Parámetros generales y umbrales de alerta</p></div>
      {saved&&<div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm"><Check size={16}/> Configuración guardada.</div>}
      <Card className="p-6 space-y-5">
        <h2 className="text-sm font-bold text-[#1e1e1e] border-b border-gray-100 pb-3">Umbrales de Stock</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Stock Bajo</label><Input type="number" value={stockBajo} onChange={setStockBajo}/></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Stock Crítico</label><Input type="number" value={stockCritico} onChange={setStockCritico}/></div>
        </div>
      </Card>
      <div className="flex justify-end"><Btn variant="primary" onClick={handleSave}><Check size={14}/> Guardar cambios</Btn></div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [screen, setScreen] = useState<Screen>(()=>{
    if(user.role==="cajero") return "ventas";
    if(user.role==="farmaceutico") return "alertas";
    return "dashboard";
  });

  const screenTitle: Record<Screen,string> = {
    dashboard:"Dashboard", ventas:"Ventas (POS)", productos:"Productos",
    clientes:"Clientes", empleados:"Empleados", proveedores:"Proveedores",
    alertas:"Alertas de Stock", reportes:"Reportes", historial:"Historial de Ventas",
    eliminados:"Registros Eliminados", configuracion:"Configuración", auditoria: "Auditoría del Sistema",
  };

  return(
    <div className="flex h-screen overflow-hidden bg-[#f5f7fa]" style={{ fontFamily:"Inter, sans-serif" }}>
      <Sidebar user={user} current={screen} onNav={setScreen} onLogout={onLogout}/>
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
              <LogOut size={13}/> Salir
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {screen==="dashboard"    && <Dashboard/>}
          {screen==="ventas"       && <Ventas user={user}/>}
          {screen==="productos"    && <Productos user={user}/>}
          {screen==="clientes"     && <Clientes user={user}/>}
          {screen==="empleados"    && <Empleados user={user}/>}
          {screen==="proveedores"  && <Proveedores user={user}/>}
          {screen==="alertas"      && <Alertas/>}
          {screen==="historial"    && <Historial/>}
          {screen==="eliminados"   && <Eliminados/>}
          {screen==="configuracion"&& <Configuracion/>}
          {screen === "auditoria" && <Auditoria user={user} />}
          {screen==="reportes"     && <div className="p-6"><h1 className="text-xl font-bold">Reportes</h1><p className="text-gray-500 text-sm mt-2">Próximamente.</p></div>}
        </main>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  if(!user) return <LoginScreen onLogin={setUser}/>;
  return <AppShell user={user} onLogout={()=>{localStorage.removeItem('token');setUser(null);}}/>;
}

function setSaleError(arg0: string) {
  throw new Error("Function not implemented.");
}
function addToCart(producto: any) {
  throw new Error("Function not implemented.");
}

