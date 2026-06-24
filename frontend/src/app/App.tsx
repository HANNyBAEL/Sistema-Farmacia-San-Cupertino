import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  LayoutDashboard, ShoppingCart, Package, Users, UserCog, Truck,
  Bell, History, Trash2, LogOut, Search,
  Plus, Edit2, X, Check, AlertTriangle,
  Eye, EyeOff, Filter, Download, RefreshCw, Shield,
  TrendingUp, TrendingDown, Clock, ChevronRight,
  DollarSign, Menu, ArrowLeft, Moon, Sun,
  FileSpreadsheet,
  Camera,
  RotateCcw,
  Plus as PlusIcon,
  Minus as MinusIcon
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { login } from "../services/auth";
import { getProductos, createProducto, updateProducto, deleteProducto } from "../services/productos";
import { fetchKPIs, fetchVentasUltimos7Dias } from "../services/dashboard";
import { createVenta } from "../services/ventas";
import clientesApi from "../services/clientes";
import proveedoresApi from "../services/proveedores";
import empleadosApi from "../services/empleados";
import { getHistorial, getDetalleVenta } from "../services/historial";
import eliminadosApi from "../services/eliminados";
import api from "../services/api";
import EscanerCodigoBarras from '../app/EscanerCodigoBarras';
import { getSiguienteCorrelativo, guardarFactura } from "../services/facturas";
import { generarFacturaPDF, generarFacturaPDFBase64 } from './GenerarFactura';
import auditoriaApi from '../services/auditoria';
import logoImg from "../imports/logo.png";
import { useTheme } from '../context/ThemeContext';

const RECAPTCHA_SITE_KEY = "6Lc-5S0tAAAAANGcokPZobPlAHatfcoNRBqQeMYb";
const isRecaptchaDebugEnabled = () =>
  import.meta.env.DEV || localStorage.getItem("recaptchaDebug") === "true";


// ── Types ─────────────────────────────────────────────────────────────────────
type Role = "administrador" | "farmaceutico" | "cajero";
type Screen = "dashboard" | "ventas" | "productos" | "clientes" | "empleados" | "proveedores" | "alertas" | "historial" | "eliminados" | "auditoria";


  interface User {
  name: string;
  role: Role;
  id: number;
}

interface EliminadoRecord {
  tipo: 'producto' | 'cliente' | 'proveedor' | 'empleado';
  id: number;
  nombre: string;
  detalle: string | null;
}

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
  dui: string;
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
  product_count?: number;
}

interface Empleado {
  has_ventas: any;
  has_acciones: any;
  papelera: any;
  dui: string;
  nit: string;
  afp: string;
  cuenta_banco: string;
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
function expiryStyle(fecha: string) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const vence = new Date(fecha + 'T00:00:00');
  const dias = Math.ceil((vence.getTime() - hoy.getTime()) / (1000*60*60*24));
  if (dias < 0)  return { row: 'bg-destructive/10',    badge: 'bg-destructive/15 text-destructive font-semibold' };
  if (dias <= 30) return { row: 'bg-amber-50 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold' };
  return { row: '', badge: 'text-muted-foreground' };
}

function stockColor(stock: number): string {
  if (stock === 0) return "text-destructive bg-destructive/10";
  if (stock <= 10) return "text-destructive bg-destructive/10";
  if (stock <= 20) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20";
  return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
}
function stockLabel(stock: number): string {
  if (stock === 0) return "Agotado";
  if (stock <= 10) return "Crítico";
  if (stock <= 20) return "Bajo";
  return "Normal";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

// ── UI Components ─────────────────────────────────────────────────────────────
// ── Design System Tokens ──
// Todos los colores usan variables CSS de theme.css
// Esto garantiza consistencia en light Y dark mode

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>{children}</span>;
}

function Btn({ children, variant = "primary", size = "md", className = "", onClick, disabled = false, type = "button" as const }: {
  children: React.ReactNode; variant?: "primary"|"secondary"|"danger"|"ghost";
  size?: "sm"|"md"|"lg"; className?: string; onClick?: () => void; disabled?: boolean; type?: "button"|"submit"|"reset";
}) {
  const base = "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  const variants = {
    primary:   "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
    danger:    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    ghost:     "text-muted-foreground hover:bg-muted hover:text-foreground",
  };
  return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}

function Card({ children, className = "", accent, onClick }: { 
  children: React.ReactNode; 
  className?: string; 
  accent?: "blue"|"red"|"green"|"amber"; 
  onClick?: (e: React.MouseEvent) => void;
}) {
  const borders = {
    blue:  "border-l-4 border-l-primary",
    red:   "border-l-4 border-l-destructive",
    green: "border-l-4 border-l-green-600 dark:border-l-green-400",
    amber: "border-l-4 border-l-amber-500",
  };
  return (
    <div 
      onClick={onClick}
      className={`bg-card rounded-lg shadow-sm border border-border ${accent ? borders[accent] : ""} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function Input({ placeholder, value, onChange, type = "text", className = "", maxLength, disabled = false }: {
  placeholder?: string; value: string; onChange: (v: string) => void; type?: string; className?: string; maxLength?: number; disabled?: boolean;
}) {
  return <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} disabled={disabled}
    className={`w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`} />;
}

function Select({ children, value, onChange, className = "", disabled = false }: {
  children: React.ReactNode; value: string; onChange: (v: string) => void; className?: string; disabled?: boolean;
}) {
  return <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
    className={`px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </select>;
}

// ── Componentes nuevos del Design System ──

function ErrorAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2.5">
      <AlertTriangle size={14} className="flex-shrink-0" />
      <span className="break-words">{message}</span>
    </div>
  );
}

function PageLayout({ title, subtitle, children, actions }: {
  title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function FilterBar({ children, onClear, hasFilters }: {
  children: React.ReactNode; onClear?: () => void; hasFilters?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {children}
      <div className="ml-auto self-end">
        <Btn variant="ghost" size="sm" onClick={onClear} disabled={!hasFilters}>
          <X size={14} /> Limpiar
        </Btn>
      </div>
    </div>
  );
}

function SectionCard({ title, children, actions, className = "" }: {
  title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string;
}) {
  return (
    <Card className={className}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 md:px-5 py-3.5 border-b border-border">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </Card>
  );
}

function LogoContainer({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-10 h-10 p-1.5", md: "w-14 h-14 p-2", lg: "w-20 h-20 p-3" };
  return (
    <div className={`${sizes[size]} rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/10`}>
      <img src={logoImg} alt="Farmacia San Cupertino" className="w-full h-full object-contain" />
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-400'
          : 'bg-destructive/10 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400'
      }`}>
        {type === 'success' ? <Check size={18} className="flex-shrink-0" /> : <AlertTriangle size={18} className="flex-shrink-0" />}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X size={14} /></button>
      </div>
    </div>
  );
}



function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground/30 mb-4">{icon}</div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Componente de confirmación para cerrar sesión ──
function ConfirmModal({
  isOpen, title, message, onConfirm, onCancel,
  confirmText = "Confirmar", cancelText = "Cancelar", variant = "danger", loading = false,
}: {
  isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void;
  confirmText?: string; cancelText?: string; variant?: "danger" | "primary"; loading?: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <Card className="max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200" onClick ={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            variant === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}>
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <Btn variant="secondary" onClick={onCancel} disabled={loading}>{cancelText}</Btn>
          <Btn variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmText}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function LoadingSpinner() {
  return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
}

// ── Auth Card Wrapper (consistente en todas las pantallas de auth) ──
function AuthCard({ children, maxWidth = "max-w-sm" }: { children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className={`w-full ${maxWidth} bg-card rounded-2xl shadow-lg border border-border p-8`}>
        {children}
      </div>
    </div>
  );
}

type RecaptchaHandle = {
  getToken: () => Promise<string>;
  reset: () => void;
};

const RecaptchaBox = React.forwardRef<RecaptchaHandle, { action: string }>(({ action }, ref) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const waitForRecaptcha = () => {
      if (cancelled) return;

      if (!window.grecaptcha?.ready || !window.grecaptcha?.execute) {
        retryTimer = window.setTimeout(waitForRecaptcha, 250);
        return;
      }

      window.grecaptcha.ready(() => {
        if (isRecaptchaDebugEnabled()) {
          console.log("[reCAPTCHA] listo para ejecutar", { action });
        }
        if (!cancelled) setReady(true);
      });
    };

    waitForRecaptcha();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, []);

  React.useImperativeHandle(ref, () => ({
    getToken: async () => {
      if (!window.grecaptcha?.execute) return "";
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
      if (isRecaptchaDebugEnabled()) {
        console.log("[reCAPTCHA] token generado", {
          action,
          tokenLength: token.length,
          tokenPreview: `${token.slice(0, 12)}...`,
        });
      }
      return token;
    },
    reset: () => {},
  }));

  return ready ? null : <p className="text-xs text-muted-foreground text-center mt-3">Preparando verificacion...</p>;
});
RecaptchaBox.displayName = "RecaptchaBox";

function CambiarContrasenaForzado({ token, onSuccess, onCancel }: { token: string | null; onSuccess: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const handleSubmit = async () => {
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/cambiar-contrasena', { password_actual: '', password_nuevo: password }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al cambiar la contraseña');
    } finally { setLoading(false); }
  };

  return (
    <AuthCard maxWidth="max-w-md">
      <div className="flex flex-col items-center mb-6">
        <LogoContainer size="md" />
        <h2 className="text-xl font-bold text-foreground mt-4">Cambio de contraseña obligatorio</h2>
        <p className="text-sm text-muted-foreground text-center mt-1">Por seguridad, debes cambiar tu contraseña antes de continuar.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña</label>
          <div className="relative">
            <Input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={setConfirmPassword} placeholder="Repite la contraseña" />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>
      <ErrorAlert message={error} />
      <div className="flex gap-3 mt-6">
        <Btn variant="primary" className="flex-1" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Cambiando...' : 'Cambiar contraseña'}
        </Btn>
        <Btn variant="secondary" className="flex-1" onClick={onCancel}>Cerrar sesión</Btn>
      </div>
    </AuthCard>
  );
}

function EstablecerContrasena({ token, onSuccess }: { token: string | null; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const recaptchaRef = useRef<RecaptchaHandle | null>(null);

  const handleSubmit = async () => {
    if (!token) { setError('Token de invitación inválido'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true); setError('');
    try {
      const recaptchaToken = await (recaptchaRef.current?.getToken() ?? Promise.resolve(""));
      if (!recaptchaToken) {
        setError('Confirma que no eres un robot.');
        return;
      }
      await api.post('/auth/establecer-contrasena', { token, password, recaptchaToken });
      setSuccess(true);
      setTimeout(onSuccess, 2000);
    } catch (e: any) { setError(e?.response?.data?.error || 'Error al establecer la contraseña'); }
    finally { setLoading(false); }
  };

  if (success) {
    return (
      <AuthCard>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">¡Contraseña establecida!</h2>
          <p className="text-sm text-muted-foreground mt-2">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <Btn variant="primary" className="w-full mt-6" onClick={onSuccess}>Ir al inicio de sesión</Btn>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard maxWidth="max-w-md">
      <div className="flex flex-col items-center mb-6">
        <LogoContainer size="md" />
        <h2 className="text-xl font-bold text-foreground mt-4">Establecer contraseña</h2>
        <p className="text-sm text-muted-foreground text-center mt-1">Has sido invitado al sistema. Establece tu contraseña.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña</label>
          <div className="relative">
            <Input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={setConfirmPassword} placeholder="Repite la contraseña" />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>
      <RecaptchaBox ref={recaptchaRef} action="employee_invitation_password" />
      <ErrorAlert message={error} />
      <Btn variant="primary" className="w-full mt-6" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Estableciendo...' : 'Establecer contraseña'}
      </Btn>
    </AuthCard>
  );
}

function RecuperarContrasena({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<'solicitar' | 'verificar'>('solicitar');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const solicitarRecaptchaRef = useRef<RecaptchaHandle | null>(null);
  const verificarRecaptchaRef = useRef<RecaptchaHandle | null>(null);

  const handleSolicitar = async () => {
    if (!email) { setError('Ingresa tu correo electronico'); return; }
    const recaptchaToken = await (solicitarRecaptchaRef.current?.getToken() ?? Promise.resolve(""));
    if (!recaptchaToken) { setError('Confirma que no eres un robot.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/solicitar-recuperacion', { email, recaptchaToken });
      setStep('verificar');
    } catch (err: any) {
      solicitarRecaptchaRef.current?.reset();
      setError(err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Error al enviar el codigo');
    } finally { setLoading(false); }
  };

  const handleVerificar = async () => {
    if (!codigo || !password || password !== confirmPassword) { setError('Completa todos los campos y verifica que las contrasenas coincidan'); return; }
    if (password.length < 6) { setError('La contrasena debe tener al menos 6 caracteres'); return; }
    const recaptchaToken = await (verificarRecaptchaRef.current?.getToken() ?? Promise.resolve(""));
    if (!recaptchaToken) { setError('Confirma que no eres un robot.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/recuperar-contrasena', { email, codigo, password, recaptchaToken });
      setSuccess(true);
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      verificarRecaptchaRef.current?.reset();
      setError(err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Error al restablecer');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <AuthCard>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">¡Contraseña restablecida!</h2>
          <p className="text-sm text-muted-foreground mt-2">Ahora puedes iniciar sesión.</p>
          <Btn variant="primary" className="w-full mt-6" onClick={onSuccess}>Ir al inicio de sesión</Btn>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="flex flex-col items-center mb-6">
        <LogoContainer size="lg" />
        <h2 className="text-xl font-bold text-foreground mt-4">
          {step === 'solicitar' ? 'Recuperar contraseña' : 'Verificar código'}
        </h2>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {step === 'solicitar' ? 'Te enviaremos un código a tu correo' : 'Ingresa el código que recibiste'}
        </p>
      </div>

      {step === 'solicitar' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
            <Input type="email" value={email} onChange={setEmail} placeholder="tu@correo.com" />
          </div>
          <RecaptchaBox ref={solicitarRecaptchaRef} action="password_recovery_request" />
          <ErrorAlert message={error} />
          <Btn variant="primary" className="w-full" onClick={handleSolicitar} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar código'}
          </Btn>
          <div className="text-center">
            <button onClick={onSuccess} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Volver al inicio de sesión
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Código de verificación</label>
            <Input value={codigo} onChange={setCodigo} placeholder="000000" maxLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña</label>
            <div className="relative">
              <Input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={setConfirmPassword} placeholder="Repite la contraseña" />
              <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <RecaptchaBox ref={verificarRecaptchaRef} action="password_recovery_reset" />
          <ErrorAlert message={error} />
          <Btn variant="primary" className="w-full" onClick={handleVerificar} disabled={loading}>
            {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
          </Btn>
          <div className="text-center">
            <button onClick={() => setStep('solicitar')} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Volver atrás
            </button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}

function LoginScreen({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const loginRecaptchaRef = useRef<RecaptchaHandle | null>(null);

  async function handleLogin() {
    if (!email || !password) { setError("Complete todos los campos."); return; }
    const recaptchaToken = await (loginRecaptchaRef.current?.getToken() ?? Promise.resolve(""));
    if (!recaptchaToken) { setError("Confirma que no eres un robot."); return; }
    setLoading(true); setError("");
    try {
      const data = await login(email, password, recaptchaToken);
      onLogin({ name: data.nombre, role: data.rol, id: data.id });
    } catch (err: any) {
      loginRecaptchaRef.current?.reset();
      setError(err?.response?.data?.error ?? err?.message ?? "Error al conectar con el servidor.");
    } finally { setLoading(false); }
  }

  if (showRecovery) return <RecuperarContrasena onSuccess={() => setShowRecovery(false)} />;

  return (
    <AuthCard>
      <div className="flex flex-col items-center mb-6">
        <LogoContainer size="lg" />
        <h1 className="text-lg font-bold text-foreground text-center mt-4">Farmacias San Cupertino</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Sistema de gestión</p>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1">Iniciar sesión</h2>
      <p className="text-sm text-muted-foreground mb-6">Ingrese sus credenciales para continuar</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Correo</label>
          <Input placeholder="correo@farmacia.com" value={email} onChange={setEmail} type="email" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
          <div className="relative">
            <Input placeholder="Contraseña" type={showPw ? "text" : "password"} value={password} onChange={setPassword} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      <RecaptchaBox ref={loginRecaptchaRef} action="login" />

      <ErrorAlert message={error} />
      <Btn variant="primary" size="lg" className="w-full mt-6" onClick={handleLogin} disabled={loading}>
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </Btn>
      <div className="mt-4 text-center">
        <button onClick={() => setShowRecovery(true)} className="text-sm text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </button>
      </div>
    </AuthCard>
  );
}


// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV_ITEMS: { screen: Screen; label: string; icon: React.ReactNode; roles: Role[] }[] = [
  { screen: "dashboard",    label: "Dashboard",             icon: <LayoutDashboard size={18}/>, roles: ["administrador"] },
  { screen: "ventas",       label: "Ventas (POS)",          icon: <ShoppingCart size={18}/>,    roles: ["administrador","cajero"] },
  { screen: "productos",    label: "Productos",             icon: <Package size={18}/>,          roles: ["administrador","farmaceutico"] },
  { screen: "clientes",     label: "Clientes",              icon: <Users size={18}/>,            roles: ["administrador"] },
  { screen: "empleados",    label: "Empleados",             icon: <UserCog size={18}/>,          roles: ["administrador"] },
  { screen: "proveedores",  label: "Proveedores",           icon: <Truck size={18}/>,            roles: ["administrador","farmaceutico"] },
  { screen: "alertas",      label: "Alertas de Stock",      icon: <Bell size={18}/>,             roles: ["administrador","farmaceutico"] },
  { screen: "historial",    label: "Historial de Ventas",   icon: <History size={18}/>,          roles: ["administrador"] },
  { screen: "eliminados",   label: "Historial Desactivados", icon: <EyeOff size={18}/>,           roles: ["administrador"] },
  { screen: "auditoria",    label: "Auditoría",             icon: <Shield size={18} />,          roles: ["administrador"] },
];

function Sidebar({ user, current, onNav, onLogout }: {
  user: User; current: Screen; onNav: (s: Screen) => void; onLogout: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const visible = NAV_ITEMS.filter(i => i.roles.includes(user.role));
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-50 md:hidden bg-sidebar text-sidebar-accent-foreground p-2 rounded-lg shadow-lg hover:bg-sidebar-accent transition-colors"
        aria-label="Menú"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar w-64 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-60 md:flex md:flex-col md:shrink-0
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex-shrink-0 bg-sidebar-accent/20 rounded-xl flex items-center justify-center p-1">
              <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sidebar-accent-foreground font-bold text-sm block leading-tight">San Cupertino</span>
              <span className="text-sidebar-foreground/40 text-[10px]">Gestión Farmacéutica</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-sidebar-foreground/70 hover:text-sidebar-accent-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {visible.map(item => {
            const active = current === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => { onNav(item.screen); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-accent-foreground"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center text-sidebar-accent-foreground text-xs font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sidebar-accent-foreground text-xs font-medium truncate">{user.name}</div>
              <div className="text-sidebar-foreground/50 text-xs capitalize">{user.role}</div>
            </div>
            <button onClick={toggleTheme} className="text-sidebar-foreground/40 hover:text-sidebar-accent-foreground transition-colors p-1"
              title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button onClick={onLogout} className="text-sidebar-foreground/40 hover:text-destructive transition-colors p-1">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}


// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [expiredCount, setExpiredCount] = useState(0);
  const [avgDailySales, setAvgDailySales] = useState(0);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    Promise.all([fetchKPIs(), fetchVentasUltimos7Dias(), getProductos()])
      .then(([k, s, productos]) => {
        const processed = s.map((item: { dia: string; ventas: number }) => {
          const date = new Date(item.dia + 'T12:00:00');
          const dayName = date.toLocaleDateString('es-ES', {
            weekday: 'short',
            timeZone: 'America/El_Salvador'
          });
          return { day: dayName.replace('.', ''), ventas: item.ventas };
        });
        setSalesData(processed);

        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const vencidos = productos.filter((p: any) => {
          if (!p.fecha_vencimiento) return false;
          return new Date(p.fecha_vencimiento + 'T00:00:00') < hoy;
        }).length;
        setExpiredCount(vencidos);

        const totalVentas = processed.reduce((sum: number, day: { ventas: number }) => sum + day.ventas, 0);
        setAvgDailySales(processed.length ? totalVentas / processed.length : 0);
        setKpis(k);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const cards = [
    { label: "Ingresos del día",      value: `$${kpis?.ingresosHoy?.toFixed(2) ?? "0.00"}`, icon: <TrendingUp size={20}/>,    accent: "blue" as const },
    { label: "Ventas del día",        value: kpis?.ventasHoy ?? 0,                           icon: <ShoppingCart size={20}/>,  accent: "blue" as const },
    { label: "Stock Bajo (≤20)",      value: kpis?.stockBajo ?? 0,                           icon: <TrendingDown size={20}/>,  accent: "amber" as const },
    { label: "Stock Crítico (≤10)",   value: kpis?.stockCritico ?? 0,                        icon: <AlertTriangle size={20}/>, accent: "red" as const },
    { label: "Agotados",              value: kpis?.agotados ?? 0,                            icon: <X size={20}/>,             accent: "red" as const },
    { label: "Próx. Vencer (30d)",    value: kpis?.porVencer ?? 0,                           icon: <Clock size={20}/>,         accent: "amber" as const },
    { label: "Productos Vencidos",    value: expiredCount,                                   icon: <Package size={20}/>,       accent: "red" as const },
    { label: "Venta Promedio Diario", value: `$${avgDailySales.toFixed(2)}`,                 icon: <DollarSign size={20}/>,    accent: "blue" as const },
  ];

  const iconBg = {
    blue:  "bg-primary/10 text-primary",
    red:   "bg-destructive/10 text-destructive",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  };

  return (
    <PageLayout
      title="Tablero Principal"
      subtitle={`Resumen operativo — ${new Date().toLocaleDateString('es-SV')}`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map(k => (
          <Card key={k.label} accent={k.accent} className="p-4">
            <div className={`inline-flex p-2.5 rounded-lg mb-3 ${iconBg[k.accent]}`}>
              {k.icon}
            </div>
            <div className="text-2xl font-bold text-foreground">{k.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
          </Card>
        ))}
      </div>

      <SectionCard title="Ventas últimos 7 días">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={salesData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "oklch(0.28 0.015 250)" : "#f0f0f0"} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: isDark ? "oklch(0.60 0.01 250)" : "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: isDark ? "oklch(0.60 0.01 250)" : "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              formatter={(v: number) => [`$${v}`, "Ventas"]}
              contentStyle={{
                borderRadius: 8,
                border: isDark ? "1px solid oklch(0.28 0.015 250)" : "1px solid #e5e7eb",
                fontSize: 12,
                backgroundColor: isDark ? "oklch(0.20 0.015 250)" : "#fff",
                color: isDark ? "oklch(0.92 0.008 250)" : "#222",
              }}
            />
            <Bar dataKey="ventas" fill={isDark ? "oklch(0.58 0.14 250)" : "#0a4b7a"} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
    </PageLayout>
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

// ── Componente para celdas con texto largo que se pueden expandir ──
function ExpandableCell({ text, maxLength = 30 }: { text?: string | null; maxLength?: number }) {
  const [showModal, setShowModal] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element || !text) return;

    const checkOverflow = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);
    window.addEventListener('resize', checkOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  if (!text || text.length === 0) return <span className="text-muted-foreground">—</span>;

  const truncated = text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
  const canShowFull = text.length > maxLength || isOverflowing;

  return (
    <>
      <div className="flex min-w-0 max-w-full items-center gap-1">
        <span
          ref={textRef}
          onClick={() => canShowFull && setShowModal(true)}
          className={`block min-w-0 truncate ${canShowFull ? 'cursor-pointer underline decoration-dotted underline-offset-2 hover:text-primary transition-colors' : ''}`}
          title={canShowFull ? 'Haz clic para ver completo' : text}
        >
          {truncated}
        </span>
        {canShowFull && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            title="Ver información completa"
            aria-label="Ver información completa"
          >
            <Eye size={13} />
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <Card className="max-w-md w-full p-5 animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-foreground">Información completa</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X size={16} />
              </button>
            </div>
            <div className="text-sm text-foreground/80 break-words max-h-96 overflow-y-auto leading-relaxed">{text}</div>
            <div className="mt-4 flex justify-end">
              <Btn variant="secondary" size="sm" onClick={() => setShowModal(false)}>Cerrar</Btn>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Productos({ user }: { user: User }) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [filterCat, setFilterCat]           = useState("");
  const [filterProveedor, setFilterProveedor] = useState("");
  const [filterEstado, setFilterEstado]     = useState("");
  const [filterVenc, setFilterVenc]         = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [form, setForm] = useState({
    nombre_producto:"", descripcion:"", precio:"", stock:"",
    lote:"", fecha_vencimiento:"", id_proveedor:"", codigo_barras:""
  });
  const [originalForm, setOriginalForm] = useState({
    nombre_producto:"", descripcion:"", precio:"", stock:"",
    lote:"", fecha_vencimiento:"", id_proveedor:"", codigo_barras:""
  });
  const [originalSelectedCats, setOriginalSelectedCats] = useState<number[]>([]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    productId: number | null;
  }>({ isOpen: false, productId: null });

  const [toggleModal, setToggleModal] = useState<{
    isOpen: boolean;
    productId: number | null;
    deleted: number;
  }>({ isOpen: false, productId: null, deleted: 0 });

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [prods, provs] = await Promise.all([getProductos(), proveedoresApi.getAll()]);
      setProducts(prods); setSuppliers(provs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filtered = products
    .filter(p => {
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const vence = new Date(p.fecha_vencimiento + 'T00:00:00');
      const dias = Math.ceil((vence.getTime() - hoy.getTime()) / (1000*60*60*24));
      
      if (search) {
        const term = search.toLowerCase();
        const nameMatch = p.nombre_producto.toLowerCase().startsWith(term);
        const codeMatch = (p.codigo_barras ?? "").toLowerCase().startsWith(term);
        if (!nameMatch && !codeMatch) return false;
      }
      
      if (filterStock) {
        if (filterStock==="agotado" && p.stock!==0) return false;
        if (filterStock==="critico" && !(p.stock>0&&p.stock<=10)) return false;
        if (filterStock==="bajo"    && !(p.stock>10&&p.stock<=20)) return false;
        if (filterStock==="normal"  && p.stock<=20) return false;
      }
      if (filterCat && !(p.categorias_nombres ?? "").startsWith(filterCat)) return false;
      if (filterProveedor && String(p.id_proveedor) !== filterProveedor) return false;
      if (filterEstado === "activo"   && p.deleted) return false;
      if (filterEstado === "inactivo" && !p.deleted) return false;
      if (filterVenc === "vencido"  && dias >= 0) return false;
      if (filterVenc === "proximo"  && !(dias >= 0 && dias <= 30)) return false;
      if (filterVenc === "vigente"  && dias <= 30) return false;
      return true;
    })
    .sort((a, b) => a.nombre_producto.localeCompare(b.nombre_producto, 'es'));

  function openNew() {
    setEditProduct(null);
    const initial = { nombre_producto:"", descripcion:"", precio:"", stock:"", lote:"", fecha_vencimiento:"", id_proveedor:"", codigo_barras:"" };
    setSelectedCats([]);
    setOriginalSelectedCats([]);
    setForm(initial);
    setOriginalForm(initial);
    setFormError(""); setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    const cats = p.categorias_ids
      ? String(p.categorias_ids).split(',').map(Number).filter(Boolean)
      : [];
    const initial = {
      nombre_producto: p.nombre_producto,
      descripcion: p.descripcion ?? "",
      precio: String(p.precio),
      stock: String(p.stock),
      lote: p.lote,
      fecha_vencimiento: p.fecha_vencimiento,
      id_proveedor: String(p.id_proveedor),
      codigo_barras: p.codigo_barras ?? ""
    };
    setSelectedCats(cats);
    setOriginalSelectedCats(cats);
    setForm(initial);
    setOriginalForm(initial);
    setFormError(""); setShowForm(true);
  }

  function toggleCat(id: number) {
    setSelectedCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  const hasProductChanges = () => {
    const sameForm =
      form.nombre_producto === originalForm.nombre_producto &&
      form.descripcion === originalForm.descripcion &&
      form.precio === originalForm.precio &&
      form.stock === originalForm.stock &&
      form.lote === originalForm.lote &&
      form.fecha_vencimiento === originalForm.fecha_vencimiento &&
      form.id_proveedor === originalForm.id_proveedor &&
      form.codigo_barras === originalForm.codigo_barras;

    const currentCats = [...selectedCats].sort((a, b) => a - b).join(",");
    const originalCats = [...originalSelectedCats].sort((a, b) => a - b).join(",");
    return !sameForm || currentCats !== originalCats;
  };

  async function saveForm() {
    if (editProduct && !hasProductChanges()) return;
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

  function handleDelete(id: number) {
    setConfirmModal({ isOpen: true, productId: id });
  }

  async function confirmDelete() {
    if (confirmModal.productId === null) return;
    try {
      await api.patch(`/productos/${confirmModal.productId}/papelera`, {
        id_empleado: user.id,
        nombre_empleado: user.name
      });
      setConfirmModal({ isOpen: false, productId: null });
      setToast({ message: "Producto movido a papelera correctamente.", type: 'success' });
      load();
    } catch (e: any) {
      setConfirmModal({ isOpen: false, productId: null });
      setToast({
        message: e?.response?.data?.error ?? "No se puede eliminar este producto porque tiene ventas asociadas.",
        type: 'error'
      });
    }
  }

  function handleToggle(id: number, deleted: number) {
    setToggleModal({ isOpen: true, productId: id, deleted });
  }

  async function confirmToggle() {
    if (toggleModal.productId === null) return;
    try {
      await api.patch(`/productos/${toggleModal.productId}/toggle`, {
        id_empleado: user.id,
        nombre_empleado: user.name
      });
      setToggleModal({ isOpen: false, productId: null, deleted: 0 });
      setToast({ message: "Estado actualizado correctamente.", type: 'success' });
      load();
    } catch (e: any) {
      setToggleModal({ isOpen: false, productId: null, deleted: 0 });
      setToast({ message: e?.response?.data?.error ?? "Error al cambiar estado.", type: 'error' });
    }
  }

  const hayFiltros = !!(filterStock||filterCat||filterProveedor||filterEstado||filterVenc);
  if (loading) return <LoadingSpinner />;

  function limpiarFiltros() {
    setFilterStock(""); setFilterCat(""); setFilterProveedor("");
    setFilterEstado(""); setFilterVenc("");
  }

  return (
    <PageLayout
      title="Gestión de Productos"
      subtitle={`${filtered.length} de ${products.length} productos`}
      actions={
        <Btn onClick={openNew}><Plus size={14}/> Nuevo producto</Btn>
      }
    >
      {/* ── Filtros ── */}
      <SectionCard title="Filtros">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Buscar por nombre o código</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={setSearch}
                    placeholder="Nombre o código..."
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock</label>
                <Select value={filterStock} onChange={setFilterStock} className="w-full">
                  <option value="">Todos</option>
                  <option value="agotado">Agotado</option>
                  <option value="critico">Crítico</option>
                  <option value="bajo">Bajo</option>
                  <option value="normal">Normal</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Categoría</label>
                <Select value={filterCat} onChange={setFilterCat} className="w-full">
                  <option value="">Todas</option>
                  {CATEGORIAS.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Proveedor</label>
                <Select value={filterProveedor} onChange={setFilterProveedor} className="w-full">
                  <option value="">Todos</option>
                  {suppliers
                    .filter(s => s.deleted === 0)
                    .map(s => (
                      <option key={s.id_proveedor} value={s.id_proveedor}>{s.nombre} {s.apellido}</option>
                    ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Vencimiento</label>
                <Select value={filterVenc} onChange={setFilterVenc} className="w-full">
                  <option value="">Todos</option>
                  <option value="vencido">Vencidos</option>
                  <option value="proximo">Próximos (≤30 días)</option>
                  <option value="vigente">Vigentes</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
                <Select value={filterEstado} onChange={setFilterEstado} className="w-full">
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </Select>
              </div>
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={limpiarFiltros} disabled={!hayFiltros}>
            <X size={14} /> Limpiar
          </Btn>
        </div>
      </SectionCard>

      {/* ── Tabla ── */}
      <SectionCard title="Listado de productos" className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-muted">
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Nombre</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Categoría</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Precio</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Stock</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Lote</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Código barras</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Venc.</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Proveedor</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Estado</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(p => (
                  <tr
                    key={p.id_producto}
                    className={`transition-colors ${p.deleted ? 'opacity-60 bg-muted/50' : 'hover:bg-muted/50'} ${expiryStyle(p.fecha_vencimiento).row}`}
                  >
                    <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap truncate max-w-0">
                      <ExpandableCell text={p.nombre_producto} maxLength={20} />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap truncate max-w-0">
                      {p.categorias_nombres ? (() => {
                        const cats = p.categorias_nombres.split(', ');
                        const primera = cats[0];
                        const resto = cats.slice(1);
                        return (
                          <div className="flex items-center gap-0.5 flex-wrap">
                            <span className="inline-block bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded truncate max-w-full">{primera}</span>
                            {resto.length > 0 && (
                              <div className="relative group">
                                <button className="inline-flex items-center justify-center w-5 h-5 bg-primary/15 text-primary text-[10px] rounded-full font-bold hover:bg-primary/25 transition-colors flex-shrink-0">
                                  +{resto.length}
                                </button>
                                <div className="absolute left-0 top-6 z-50 hidden group-hover:block bg-card border border-border rounded-lg shadow-lg p-2 min-w-max">
                                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Otras categorías:</p>
                                  {resto.map((cat: string, i: number) => (
                                    <div key={i} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded mb-0.5">{cat}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })() : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-primary font-semibold whitespace-nowrap">${Number(p.precio).toFixed(2)}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${stockColor(p.stock)}`}>{p.stock}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap truncate max-w-0">
                      <ExpandableCell text={p.lote} maxLength={10} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap truncate max-w-0">
                      <ExpandableCell text={p.codigo_barras} maxLength={12} />
                    </td>
                    <td className={`py-2.5 px-3 text-xs font-mono whitespace-nowrap ${expiryStyle(p.fecha_vencimiento).badge}`}>
                      {p.fecha_vencimiento}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap truncate max-w-0">
                      <ExpandableCell text={p.proveedor_nombre ?? `ID: ${p.id_proveedor}`} maxLength={15} />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        p.deleted
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {p.deleted ? "Inactivo" : "Activo"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(p.id_producto, p.deleted)}
                          className={`p-1 rounded text-xs font-semibold px-1.5 py-0.5 transition-colors ${
                            p.deleted
                              ? 'text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                              : 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/30'
                          }`}
                          title={p.deleted ? "Activar producto" : "Desactivar producto"}
                        >
                          {p.deleted ? "Activar" : "Desactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <EmptyState
                icon={<Package size={40} />}
                title="Sin productos"
                description="No se encontraron productos con los filtros aplicados."
              />
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Modal de formulario ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editProduct ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <ErrorAlert message={formError} />

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                <Input value={form.nombre_producto} onChange={v => setForm(p => ({ ...p, nombre_producto: v }))} placeholder="Nombre del medicamento" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descripción</label>
                <Input value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} placeholder="Descripción opcional" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Precio ($) *</label>
                <Input type="number" value={form.precio} onChange={v => setForm(p => ({ ...p, precio: v }))} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock *</label>
                <Input type="number" value={form.stock} onChange={v => setForm(p => ({ ...p, stock: v }))} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Lote *</label>
                <Input value={form.lote} onChange={v => setForm(p => ({ ...p, lote: v }))} placeholder="LOT-2024-XXX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Código de barras</label>
                <Input value={form.codigo_barras} onChange={v => setForm(p => ({ ...p, codigo_barras: v }))} placeholder="Ej: 7501234567890" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha vencimiento *</label>
                <Input type="date" value={form.fecha_vencimiento} onChange={v => setForm(p => ({ ...p, fecha_vencimiento: v }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Proveedor *</label>
                <Select value={form.id_proveedor} onChange={v => setForm(p => ({ ...p, id_proveedor: v }))} className="w-full">
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers
                    .filter(s => s.deleted === 0)
                    .map(s => (
                      <option key={s.id_proveedor} value={s.id_proveedor}>{s.nombre} {s.apellido}</option>
                    ))}
                </Select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Categorías</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-input-background">
                  {CATEGORIAS.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-card rounded px-1 py-0.5 transition-colors">
                      <input type="checkbox" checked={selectedCats.includes(cat.id)} onChange={() => toggleCat(cat.id)} className="rounded" />
                      <span className="text-foreground">{cat.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm} disabled={!hasProductChanges()}>
                <Check size={14} /> {editProduct ? "Guardar cambios" : "Guardar"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── Modales de confirmación ── */}
      <ConfirmModal
        isOpen={toggleModal.isOpen}
        title={toggleModal.deleted ? "Activar producto" : "Desactivar producto"}
        message={`¿Estás seguro de que deseas ${toggleModal.deleted ? 'activar' : 'desactivar'} este producto?`}
        onConfirm={confirmToggle}
        onCancel={() => setToggleModal({ isOpen: false, productId: null, deleted: 0 })}
        confirmText={toggleModal.deleted ? "Activar" : "Desactivar"}
        variant="primary"
      />

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </PageLayout>
  );
}

// ── Ventas (POS) ──────────────────────────────────────────────────────────────
function Ventas({ user }: { user: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saleError, setSaleError] = useState("");
  const [saleDone, setSaleDone] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [efectivo, setEfectivo] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "tarjeta" | "transferencia" | "applepay" | "paypal" | "western">("efectivo");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "", dui: "" });
  const [newClientError, setNewClientError] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const [controlledModal, setControlledModal] = useState<{ show: boolean; product: Product | null; onConfirm: () => void }>({ show: false, product: null, onConfirm: () => {} });
  const [noClientModal, setNoClientModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [productModal, setProductModal] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const cartContainerRef = useRef<HTMLDivElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Helper: extraer string de campos que a veces vienen como objeto de la BD
  function extraerString(valor: any): string {
    if (valor == null) return '';
    if (typeof valor === 'string') return valor.trim();
    if (typeof valor === 'object') return valor.valor || valor.email || valor.direccion || valor.numero || String(valor);
    return String(valor);
  }

  function formatDUI(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 8) return digits;
    return `${digits.slice(0, 8)}-${digits.slice(8, 9)}`;
  }

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
  }

  useEffect(() => {
    Promise.all([getProductos(), clientesApi.getAll()])
      .then(([prods, clts]) => {
        setProducts(prods.sort((a: { nombre_producto: string; }, b: { nombre_producto: any; }) => a.nombre_producto.localeCompare(b.nombre_producto, 'es')));
        setClients(clts);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (cartContainerRef.current) {
      const lastRow = cartContainerRef.current.querySelector('tbody tr:last-child');
      if (lastRow) lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [cart]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (productModal.show) {
      const timer = setTimeout(() => setProductModal({ show: false, message: '', type: 'success' }), 2000);
      return () => clearTimeout(timer);
    }
  }, [productModal.show]);

  // Barcode scanner input handler for physical barcode readers
  useEffect(() => {
    const barcodeBuffer: string[] = [];
    let barcodeTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // No capturar si el input está enfocado en otro elemento
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'Enter' && barcodeBuffer.length > 0) {
        const code = barcodeBuffer.join('');
        handleCodigoDetectado(code);
        barcodeBuffer.length = 0;
      } else if (event.key.length === 1) {
        barcodeBuffer.push(event.key);
        
        if (barcodeTimeout) clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer.length = 0;
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimeout) clearTimeout(barcodeTimeout);
    };
  }, [products]);

  const results = products
    .filter(p => {
      if (p.stock <= 0 || p.papelera) return false;
      const term = search.toLowerCase().trim();
      if (!term) return false;
      const name = p.nombre_producto.toLowerCase();
      const codigo = p.codigo_barras?.toLowerCase() || "";
      return name.startsWith(term) || name.split(' ').some(word => word.startsWith(term)) || codigo.startsWith(term);
    })
    .slice(0, 6);

  const [facturaModal, setFacturaModal] = useState<{ show: boolean; onConfirm: () => void; onCancel: () => void }>({
    show: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  function addToCart(p: Product) {
    if (p.papelera || p.deleted === 1) {
      setToast({ message: `"${p.nombre_producto}" no está disponible.`, type: 'error' });
      return;
    }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(p.fecha_vencimiento + 'T00:00:00');
    if (vencimiento < hoy) {
      setToast({ message: `"${p.nombre_producto}" está vencido.`, type: 'error' });
      return;
    }
    if (p.stock === 0) {
      setToast({ message: `"${p.nombre_producto}" sin stock.`, type: 'error' });
      return;
    }
    const categoriasControladas = ['Controlados', 'Analgésicos Opioides', 'Ansiolíticos', 'Hipnóticos'];
    const esControlado = p.categorias_nombres
      ? categoriasControladas.some(cat => p.categorias_nombres!.startsWith(cat))
      : false;

    if (esControlado) {
      setControlledModal({
        show: true,
        product: p,
        onConfirm: () => {
          addToCartConfirmed(p);
          setControlledModal({ show: false, product: null, onConfirm: () => {} });
        }
      });
    } else {
      addToCartConfirmed(p);
    }
  }

  function addToCartConfirmed(p: Product) {
    setSaleError("");
    setCart(prev => {
      const exists = prev.find(i => i.product.id_producto === p.id_producto);
      if (exists) {
        if (exists.qty >= p.stock) {
          setToast({ message: `Solo quedan ${p.stock} unidades.`, type: 'error' });
          return prev;
        }
        return prev.map(i => i.product.id_producto === p.id_producto ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function handleCodigoDetectado(codigo: string) {
    // Cerrar el escáner de cámara si está abierto
    if (showScanner) {
      setShowScanner(false);
    }
    
    // Limpiar el campo de búsqueda
    setSearch("");
    
    const producto = products.find(p => p.codigo_barras === codigo);
    if (!producto) {
      setProductModal({ show: true, message: `Código no encontrado: ${codigo}`, type: 'error' });
      return;
    }
    
    // Verificar si el producto puede ser agregado al carrito
    if (producto.papelera || producto.deleted === 1) {
      setProductModal({ show: true, message: `"${producto.nombre_producto}" no está disponible.`, type: 'error' });
      return;
    }
    
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(producto.fecha_vencimiento + 'T00:00:00');
    if (vencimiento < hoy) {
      setProductModal({ show: true, message: `"${producto.nombre_producto}" no agregado por estar vencido.`, type: 'error' });
      return;
    }
    
    if (producto.stock === 0) {
      setProductModal({ show: true, message: `"${producto.nombre_producto}" no agregado por no tener stock.`, type: 'error' });
      return;
    }
    
    addToCart(producto);
    setProductModal({ show: true, message: `${producto.nombre_producto} agregado al carrito`, type: 'success' });
  }

  function removeFromCart(id: number) { setCart(prev => prev.filter(i => i.product.id_producto !== id)); }
  function setQty(id: number, qty: number) {
    if (qty <= 0) { removeFromCart(id); return; }
    const item = cart.find(i => i.product.id_producto === id);
    if (item && qty > item.product.stock) {
      setToast({ message: `Solo quedan ${item.product.stock} unidades.`, type: 'error' });
      return;
    }
    setSaleError("");
    setCart(prev => prev.map(i => i.product.id_producto === id ? { ...i, qty } : i));
  }

  const total = cart.reduce((s, i) => s + Number(i.product.precio) * i.qty, 0);
  const soloEfectivo = metodoPago === "efectivo";

  async function finalizarVenta() {
    if (cart.length === 0) {
      setToast({ message: "El carrito está vacío.", type: 'error' });
      return;
    }
    if (soloEfectivo && (!efectivo || parseFloat(efectivo) < total)) {
      setToast({ message: "El efectivo recibido debe cubrir el total.", type: 'error' });
      return;
    }
    if (!selectedClient) {
      setNoClientModal(true);
      return;
    }
    await procesarVenta(selectedClient.id_cliente);
  }

  async function procesarVenta(id_cliente: number) {
    try {
      const ventaResp = await createVenta({
        id_cliente: id_cliente,
        id_empleado: user.id,
        metodo_pago: metodoPago,
        productos: cart.map(i => ({ id_producto: i.product.id_producto, cantidad: i.qty })),
      });

      const fechaHoraLocal = ventaResp.fecha;

      const finalizarVentaExitosa = async () => {
        setSaleDone(true);
        setMetodoPago("efectivo");
        setEfectivo("");
        setCart([]);
        setSelectedClient(null);
        setClientSearch("");
        const prods = await getProductos();
        setProducts([...prods].sort((a, b) => a.nombre_producto.localeCompare(b.nombre_producto, 'es')));
        setTimeout(() => setSaleDone(false), 3000);
      };

      setFacturaModal({
        show: true,
        onConfirm: async () => {
          setFacturaModal({ show: false, onConfirm: () => {}, onCancel: () => {} });
          try {
            const { numero_control } = await getSiguienteCorrelativo();
            // Generate UUIDv4 format (36 characters with hyphens)
            const generateUUIDv4 = (): string => {
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
            };
            const codigo_generacion = generateUUIDv4();
            // Generate mock Sello de Recepción (unique alphanumeric string)
            const generateSelloRecepcion = (numeroControl: string): string => {
              const year = new Date().getFullYear();
              const tipoDoc = '01'; // Factura
              const correlativo = numeroControl.split('-').pop() || '00000000';
              const randomPart = Math.random().toString(36).substring(2, 14).toUpperCase();
              return `${year}DTE${tipoDoc}${correlativo}${randomPart}`;
            };
            const sello_recepcion = generateSelloRecepcion(numero_control);
            await guardarFactura({
              numero_control,
              codigo_generacion,
              id_venta: ventaResp.id_venta,
              id_cliente: id_cliente,
              fecha_emision: fechaHoraLocal,
              total: ventaResp.total,
            });

            // =====================================================================
            // GENERAR PDF EN BASE64 Y ENVIAR POR CORREO
            // =====================================================================
            const clienteCorreo = extraerString(selectedClient?.correo);

            const datosFactura = {
              numero_control,
              codigo_generacion,
              sello_recepcion,
              ambiente_destino: '00', // CAT-001: Ambiente de Pruebas
              fecha_emision: fechaHoraLocal,
              receptor: {
                nombre: `${extraerString(selectedClient?.nombre)} ${extraerString(selectedClient?.apellido)}`,
                dui: extraerString(selectedClient?.dui),
                correo: clienteCorreo,
                telefono: extraerString(selectedClient?.telefono),
                direccion: extraerString(selectedClient?.direccion),
              },
              items: cart.map(i => ({
                codigo: i.product.id_producto,
                descripcion: i.product.nombre_producto,
                cantidad: i.qty,
                precio_unitario: Number(i.product.precio),
                subtotal: Number(i.product.precio) * i.qty,
              })),
              total: ventaResp.total,
              empleado: user.name,
            };

            if (clienteCorreo && !clienteCorreo.includes('object') && clienteCorreo.includes('@')) {
              try {
                const pdfBase64 = generarFacturaPDFBase64(datosFactura);
                await api.post('/facturas/enviar', {
                  email: clienteCorreo,
                  pdfBase64: pdfBase64,
                  numero_control: numero_control,
                  codigo_generacion: codigo_generacion,
                  total: ventaResp.total,
                  cliente: `${extraerString(selectedClient?.nombre)} ${extraerString(selectedClient?.apellido)}`,
                });
                setToast({ message: "Factura enviada al correo del cliente.", type: 'success' });
              } catch (emailErr) {
                console.error("Error enviando correo:", emailErr);
                setToast({ message: "Factura generada pero error al enviar por correo.", type: 'error' });
              }
            } else {
              setToast({ message: "El cliente no tiene correo electrónico válido.", type: 'error' });
            }
            // =====================================================================

            // Generar el PDF visual para descarga local
            generarFacturaPDF(datosFactura);

          } catch (fe) {
            console.error("Error generando factura:", fe);
            setToast({ message: "Venta registrada, pero hubo un error al enviar la factura por correo.", type: 'error' });
          }
          await finalizarVentaExitosa();
        },
        onCancel: () => {
          setFacturaModal({ show: false, onConfirm: () => {}, onCancel: () => {} });
          finalizarVentaExitosa();
        },
      });

    } catch (e: any) {
      setToast({ message: e?.response?.data?.error ?? "Error al registrar la venta.", type: 'error' });
    }
  }

  async function guardarNuevoCliente() {
    if (!newClientForm.nombre || !newClientForm.apellido || !newClientForm.telefono) {
      setNewClientError("Nombre, apellido y teléfono son obligatorios.");
      return;
    }
    if (!newClientForm.correo || !isValidEmail(newClientForm.correo)) {
      setNewClientError("Ingresa un correo electronico valido.");
      return;
    }
    setSavingClient(true);
    try {
      const payload = {
        ...newClientForm,
        dui: newClientForm.dui.replace(/\D/g, ''),
        telefono: newClientForm.telefono.replace(/\D/g, ''),
        id_empleado: user.id,
        nombre_empleado: user.name,
      };
      await clientesApi.create(payload);
      const clts = await clientesApi.getAll();
      setClients(clts);
      const creado = clts.find((c: Client) =>
        c.nombre === newClientForm.nombre &&
        c.apellido === newClientForm.apellido &&
        c.telefono.replace(/\D/g, '') === newClientForm.telefono.replace(/\D/g, '')
      );
      if (creado) setSelectedClient(creado);
      setShowNewClient(false);
      setNewClientForm({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "", dui: "" });
      setNewClientError("");
    } catch (e: any) {
      setNewClientError(e?.response?.data?.error ?? "Error al registrar el cliente.");
    } finally {
      setSavingClient(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full gap-3 md:gap-0 p-0" style={{ minHeight: 0 }}>
      {/* Toast flotante */}
      {toast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-95 fade-in duration-200">
          <div className={`rounded-lg shadow-lg px-6 py-4 text-sm flex items-center gap-3 ${toast.type === 'error' ? 'bg-destructive/10 border border-red-200 text-destructive' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {toast.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Modal de producto (se cierra automáticamente) */}
      {productModal.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className={`max-w-sm w-full p-6 ${productModal.type === 'error' ? 'border-red-200' : 'border-green-200'}`}>
            <div className="flex items-center justify-center gap-3">
              {productModal.type === 'error' ? (
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle size={24} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <Check size={24} />
                </div>
              )}
            </div>
            <p className={`text-center mt-4 font-medium ${productModal.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
              {productModal.message}
            </p>
          </Card>
        </div>
      )}

      {/* Modal medicamento controlado */}
      {controlledModal.show && controlledModal.product && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle size={20} />
              </div>
              <h2 className="text-lg font-bold text-foreground">Medicamento Controlado</h2>
            </div>
            <p className="text-foreground mb-2">
              <strong>{controlledModal.product.nombre_producto}</strong> pertenece a una categoría controlada.
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              Debe pedir y retener la receta médica del cliente antes de vender.
            </p>
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setControlledModal({ show: false, product: null, onConfirm: () => {} })}>
                Cancelar
              </Btn>
              <Btn variant="primary" onClick={controlledModal.onConfirm}>
                Sí, tengo la receta
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Modal sin cliente */}
      {noClientModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Users size={20} />
              </div>
              <h2 className="text-lg font-bold text-foreground">Cliente no seleccionado</h2>
            </div>
            <p className="text-foreground mb-4">Debes seleccionar un cliente antes de finalizar la venta.</p>
            <div className="flex justify-end">
              <Btn variant="primary" onClick={() => setNoClientModal(false)}>Aceptar</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Modal generar factura */}
      {facturaModal.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <FileSpreadsheet size={20} />
              </div>
              <h2 className="text-lg font-bold text-foreground">Generar Factura</h2>
            </div>
            <p className="text-foreground mb-4">¿Desea generar factura electrónica para esta venta?</p>
            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={facturaModal.onCancel}>Cancelar</Btn>
              <Btn variant="primary" onClick={facturaModal.onConfirm}>Sí, generar</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Escáner */}
      {showScanner && (
        <EscanerCodigoBarras
          onDetected={handleCodigoDetectado}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Modal nuevo cliente */}
      {showNewClient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Nuevo Cliente</h2>
              <button onClick={() => { setShowNewClient(false); setNewClientError(""); }} className="text-muted-foreground hover:text-muted-foreground"><X size={20} /></button>
            </div>
            {newClientError && (
              <div className="mb-4 flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2">
                <AlertTriangle size={14} />{newClientError}
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                  <Input value={newClientForm.nombre} onChange={v => setNewClientForm(p => ({ ...p, nombre: v }))} placeholder="Nombre" className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Apellido *</label>
                  <Input value={newClientForm.apellido} onChange={v => setNewClientForm(p => ({ ...p, apellido: v }))} placeholder="Apellido" className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">DUI *</label>
                <input
                  value={formatDUI(newClientForm.dui)}
                  onChange={e => setNewClientForm(prev => ({ ...prev, dui: e.target.value }))}
                  placeholder="00000000-0"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono *</label>
                <input
                  value={formatPhone(newClientForm.telefono)}
                  onChange={e => setNewClientForm(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="0000-0000"
                  maxLength={9}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Correo</label>
                <Input type="email" value={newClientForm.correo} onChange={v => setNewClientForm(p => ({ ...p, correo: v }))} placeholder="correo@ejemplo.com" className="w-full" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Dirección</label>
                <Input value={newClientForm.direccion} onChange={v => setNewClientForm(p => ({ ...p, direccion: v }))} placeholder="Dirección opcional" className="w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <Btn variant="secondary" onClick={() => { setShowNewClient(false); setNewClientError(""); }}>Cancelar</Btn>
              <Btn variant="primary" onClick={guardarNuevoCliente} disabled={savingClient}><Check size={14} /> {savingClient ? "Guardando..." : "Registrar"}</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* Panel izquierdo: búsqueda de productos */}
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border flex flex-col bg-card">
        <div className="p-3 md:p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h2 className="font-semibold text-foreground text-sm">Buscar Producto</h2>
            <button onClick={() => setShowScanner(true)} className="flex items-center gap-1 text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded-lg font-medium transition-colors"><Camera size={13} /> Escanear</button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o código de barras..." className="w-full pl-8 pr-3 py-2 border border-border rounded-lg bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 max-h-[300px] md:max-h-none">
          {search && results.map(p => (
            <button key={p.id_producto} onClick={() => addToCart(p)} className="w-full text-left p-2 md:p-3 rounded-lg hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20 mb-1">
              <div className="text-sm font-medium text-foreground">{p.nombre_producto}</div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-primary font-semibold">${Number(p.precio).toFixed(2)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${stockColor(p.stock)}`}>Stock: {p.stock}</span>
                {p.codigo_barras && <span className="text-xs text-muted-foreground">Código: {p.codigo_barras}</span>}
              </div>
            </button>
          ))}
          {search && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin resultados</p>}
          {!search && <p className="text-sm text-muted-foreground text-center py-6">Escriba para buscar</p>}
        </div>
      </div>

      {/* Panel central: carrito */}
      <div className="flex-1 flex flex-col border-b md:border-b-0" style={{ minWidth: 0 }}>
        <div className="p-3 md:p-4 border-b border-border bg-card flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Carrito</h2>
          {cart.length > 0 && <Btn variant="ghost" size="sm" onClick={() => { setCart([]); setSaleError(""); }}><X size={13} /> Limpiar</Btn>}
        </div>
        {saleDone && <div className="mx-3 md:mx-4 mt-3 md:mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2"><Check size={16} /> Venta registrada exitosamente.</div>}
        {saleError && <div className="mx-3 md:mx-4 mt-3 md:mt-4 bg-destructive/10 border border-red-200 text-destructive rounded-lg px-4 py-3 text-sm flex items-center gap-2"><AlertTriangle size={14} />{saleError}</div>}
        <div className="flex-1 overflow-auto p-3 md:p-4" ref={cartContainerRef}>
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3"><ShoppingCart size={40} strokeWidth={1} /><span className="text-sm">El carrito está vacío</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Producto", "P.Unit", "Cant.", "Subtotal", ""].map(h => <th key={h} className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.product.id_producto} className="border-b border-gray-50 hover:bg-muted">
                      <td className="py-2 px-2 font-medium text-foreground">{item.product.nombre_producto}</td>
                      <td className="py-2 px-2 text-muted-foreground">${Number(item.product.precio).toFixed(2)}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setQty(item.product.id_producto, item.qty - 1)} className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center border border-border rounded text-muted-foreground hover:bg-muted text-sm">−</button>
                          <span className="w-6 text-center font-medium text-sm">{item.qty}</span>
                          <button onClick={() => setQty(item.product.id_producto, item.qty + 1)} className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center border border-border rounded text-muted-foreground hover:bg-muted text-sm">+</button>
                        </div>
                      </td>
                      <td className="py-2 px-2 font-semibold text-primary">${(Number(item.product.precio) * item.qty).toFixed(2)}</td>
                      <td className="py-2 px-2"><button onClick={() => removeFromCart(item.product.id_producto)} className="text-muted-foreground hover:text-destructive"><X size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: cliente y pago */}
      <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border flex flex-col bg-card">
        <div className="p-3 md:p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h2 className="font-semibold text-foreground text-sm">Cliente</h2>
            <button onClick={() => { setShowNewClient(true); setNewClientError(""); }} className="flex items-center gap-1 text-xs text-primary hover:text-[#0d5c96] font-medium hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"><Plus size={12} /> Nuevo</button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Buscar por DUI..." className="w-full pl-8 pr-3 py-2 border border-border rounded-lg bg-input-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary" />
          </div>
          {clientSearch && (
            <div className="mt-1 border border-border rounded-lg overflow-hidden shadow-sm max-h-40 overflow-y-auto">
              {clients.filter(c => (c.dui ?? "").toLowerCase().startsWith(clientSearch.toLowerCase()) && !c.deleted && !c.papelera).map(c => (
                <button key={c.id_cliente} onClick={() => { setSelectedClient(c); setClientSearch(""); }} className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 border-b border-gray-50 last:border-0">
                  {c.nombre} {c.apellido} {c.dui && <span className="text-muted-foreground ml-1">({c.dui})</span>}
                </button>
              ))}
            </div>
          )}
          {selectedClient && (
            <div className="mt-2 flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
              <span className="text-xs text-primary font-medium">{selectedClient.nombre} {selectedClient.apellido}</span>
              <button onClick={() => setSelectedClient(null)} className="text-primary/50 hover:text-destructive"><X size={13} /></button>
            </div>
          )}
        </div>
        <div className="p-3 md:p-4 flex-1 space-y-3 md:space-y-4 overflow-y-auto">
          <h2 className="font-semibold text-foreground text-sm">Resumen</h2>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Método de pago</label>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { id: "efectivo", label: "💵 Efectivo" },
                { id: "tarjeta", label: "💳 Tarjeta" },
                { id: "transferencia", label: "🏦 Transferencia" },
                { id: "applepay", label: " Apple Pay" },
                { id: "paypal", label: "🅿️ PayPal" },
                { id: "western", label: "🌐 Western Union" },
              ] as const).map(m => (
                <button key={m.id} onClick={() => { setMetodoPago(m.id); setEfectivo(""); }} className={`text-[10px] md:text-xs px-2 py-1.5 rounded-lg border font-medium transition-colors text-left ${metodoPago === m.id ? 'bg-sidebar-accent text-sidebar-accent-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'}`}>{m.label}</button>
              ))}
            </div>
          </div>
          {metodoPago === "tarjeta" && <div className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2">💳 El cliente paga con tarjeta en el datáfono.</div>}
          {metodoPago === "transferencia" && <div className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2">🏦 Transferencia bancaria. Confirme comprobante.</div>}
          {metodoPago === "applepay" && <div className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2">Apple Pay desde su dispositivo.</div>}
          {metodoPago === "paypal" && <div className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2">🅿️ PayPal. Confirme pago recibido.</div>}
          {metodoPago === "western" && <div className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2">🌐 Western Union. Verifique número de transferencia.</div>}
          <div className="flex justify-between text-foreground font-bold text-base border-t border-border pt-2"><span>Total</span><span className="text-primary">${total.toFixed(2)}</span></div>
          {soloEfectivo && (
            <div className="space-y-2">
              <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Efectivo recibido *</label><input type="number" min={0} value={efectivo} onChange={e => setEfectivo(e.target.value)} placeholder="$0.00" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary" /></div>
              {parseFloat(efectivo) >= total && (
                <div className="flex justify-between text-green-700 font-bold text-base bg-green-50 rounded-lg px-3 py-2">
                  <span>Cambio</span>
                  <span>${(parseFloat(efectivo) - total).toFixed(2)}</span>
                </div>
              )}
              {efectivo && parseFloat(efectivo) < total && (
                <div className="flex items-center gap-1 text-destructive text-xs"><AlertTriangle size={12} /> Monto insuficiente</div>
              )}
            </div>
          )}
        </div>
        <div className="p-3 md:p-4 border-t border-border space-y-2">
          <Btn variant="primary" className="w-full justify-center text-sm" onClick={finalizarVenta} disabled={cart.length === 0}><Check size={15} /> Finalizar venta</Btn>
          <Btn variant="danger" className="w-full justify-center text-sm" onClick={() => { setCart([]); setSaleError(""); }} disabled={cart.length === 0}><X size={15} /> Cancelar</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Clientes ──────────────────────────────────────────────────────────────────
function Clientes({ user }: { user: User }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDui, setFilterDui] = useState("");
  const [filterTel, setFilterTel] = useState("");
  const [filterCorreo, setFilterCorreo] = useState("");
  const [filterDir, setFilterDir] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "", dui: "" });
  const [originalForm, setOriginalForm] = useState({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "", dui: "" });
  const [formError, setFormError] = useState("");
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; clienteId: number | null }>({ isOpen: false, clienteId: null });
  const [toggleModal, setToggleModal] = useState<{ isOpen: boolean; clienteId: number | null; deleted: number }>({ isOpen: false, clienteId: null, deleted: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  async function load() {
    setLoading(true);
    try { setClients(await clientesApi.getAll()); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filtered = clients.filter(c => {
    if (search && !`${c.nombre} ${c.apellido}`.toLowerCase().startsWith(search.toLowerCase())) return false;
    if (filterDui && !(c.dui ?? "").toLowerCase().startsWith(filterDui.toLowerCase())) return false;
    if (filterTel && !c.telefono.toLowerCase().startsWith(filterTel.toLowerCase())) return false;
    if (filterCorreo && !c.correo.toLowerCase().startsWith(filterCorreo.toLowerCase())) return false;
    if (filterDir && !(c.direccion ?? "").toLowerCase().startsWith(filterDir.toLowerCase())) return false;
    if (filterEstado === "activo" && c.deleted) return false;
    if (filterEstado === "inactivo" && !c.deleted) return false;
    return true;
  });

  const hayFiltros = !!(search || filterDui || filterTel || filterCorreo || filterDir || filterEstado);
  function limpiarFiltros() {
    setSearch(""); setFilterDui(""); setFilterTel(""); setFilterCorreo("");
    setFilterDir(""); setFilterEstado("");
  }

  const hasChanges = () =>
    form.nombre !== originalForm.nombre ||
    form.apellido !== originalForm.apellido ||
    form.telefono !== originalForm.telefono ||
    form.correo !== originalForm.correo ||
    form.direccion !== originalForm.direccion ||
    form.dui !== originalForm.dui;

  function openNew() {
    setEditClient(null);
    const initial = { nombre: "", apellido: "", telefono: "", correo: "", direccion: "", dui: "" };
    setForm(initial);
    setOriginalForm(initial);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(c: Client) {
    setEditClient(c);
    const initial = {
      nombre: c.nombre, apellido: c.apellido,
      telefono: c.telefono ?? "", correo: c.correo ?? "",
      direccion: c.direccion ?? "", dui: c.dui ?? ""
    };
    setForm(initial);
    setOriginalForm(initial);
    setFormError("");
    setShowForm(true);
  }

  async function saveForm() {
    if (editClient && !hasChanges()) return;
    if (!form.nombre || !form.apellido || !form.telefono || !form.correo) {
      setFormError("Complete los campos obligatorios."); return;
    }
    if (!isValidEmail(form.correo)) {
      setFormError("Ingresa un correo electronico valido."); return;
    }
    try {
      const payload = { ...form, id_empleado: user.id, nombre_empleado: user.name };
      if (editClient) await clientesApi.update(editClient.id_cliente, payload);
      else await clientesApi.create(payload);
      setShowForm(false);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? "Error al guardar.");
    }
  }

  function handleDelete(id: number) {
    setConfirmModal({ isOpen: true, clienteId: id });
  }

  async function confirmDelete() {
    if (confirmModal.clienteId === null) return;
    try {
      await api.patch(`/clientes/${confirmModal.clienteId}/papelera`, {
        id_empleado: user.id, nombre_empleado: user.name
      });
      setConfirmModal({ isOpen: false, clienteId: null });
      setToast({ message: "Cliente movido a papelera correctamente.", type: 'success' });
      load();
    } catch (e: any) {
      setConfirmModal({ isOpen: false, clienteId: null });
      setToast({ message: e?.response?.data?.error ?? "No se puede mover a la papelera porque tiene ventas asociadas.", type: 'error' });
    }
  }

  function handleToggle(id: number, deleted: number) {
    setToggleModal({ isOpen: true, clienteId: id, deleted });
  }

  async function confirmToggle() {
    if (toggleModal.clienteId === null) return;
    try {
      await api.patch(`/clientes/${toggleModal.clienteId}/toggle`, {
        id_empleado: user.id, nombre_empleado: user.name
      });
      setToggleModal({ isOpen: false, clienteId: null, deleted: 0 });
      setToast({ message: "Estado actualizado correctamente.", type: 'success' });
      load();
    } catch (e: any) {
      setToggleModal({ isOpen: false, clienteId: null, deleted: 0 });
      setToast({ message: e?.response?.data?.error ?? "Error al cambiar estado.", type: 'error' });
    }
  }

  if (loading) return <LoadingSpinner />;

  function formatDUI(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 9);
    if (d.length <= 8) return d;
    return `${d.slice(0, 8)}-${d.slice(8, 9)}`;
  }

  function formatPhone(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 4) return d;
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }

  const fmtClass = "w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors";

  return (
    <PageLayout
      title="Gestión de Clientes"
      subtitle={`${filtered.length} de ${clients.length} clientes`}
      actions={
        <Btn onClick={openNew}><Plus size={14} /> Nuevo cliente</Btn>
      }
    >
      {/* ── Filtros ── */}
      <SectionCard title="Filtros">
        <FilterBar hasFilters={hayFiltros} onClear={limpiarFiltros}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Buscar por nombre</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={setSearch} placeholder="Nombre completo..." className="pl-8" />
            </div>
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">DUI</label>
            <input value={formatDUI(filterDui)} onChange={e => setFilterDui(e.target.value)} placeholder="00000000-0" maxLength={10} className={fmtClass} />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono</label>
            <input value={formatPhone(filterTel)} onChange={e => setFilterTel(e.target.value)} placeholder="0000-0000" maxLength={9} className={fmtClass} />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
            <Select value={filterEstado} onChange={setFilterEstado} className="w-full">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Correo</label>
            <input value={filterCorreo} onChange={e => setFilterCorreo(e.target.value)} placeholder="ejemplo@correo.com" className={fmtClass} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Dirección</label>
            <input value={filterDir} onChange={e => setFilterDir(e.target.value)} placeholder="Calle, colonia..." className={fmtClass} />
          </div>
        </FilterBar>
      </SectionCard>

      {/* ── Tabla ── */}
      <SectionCard title="Listado de clientes" className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="bg-muted">
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Nombre</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">DUI</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Teléfono</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Correo</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Dirección</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Estado</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(c => (
                  <tr
                    key={c.id_cliente}
                    className={`transition-colors ${c.deleted ? 'opacity-50 bg-muted/50' : 'hover:bg-muted/50'}`}
                  >
                    <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
                      <ExpandableCell text={`${c.nombre} ${c.apellido}`} maxLength={22} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {c.dui ? <ExpandableCell text={c.dui} maxLength={12} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      <ExpandableCell text={c.telefono} maxLength={12} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      <ExpandableCell text={c.correo} maxLength={22} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      <ExpandableCell text={c.direccion ?? "—"} maxLength={28} />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.deleted
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      }`}>
                        {c.deleted ? "Inactivo" : "Activo"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggle(c.id_cliente, c.deleted ?? 0)}
                          className={`p-1 rounded text-xs font-semibold px-1.5 py-0.5 transition-colors ${
                            c.deleted
                              ? 'text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                              : 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/30'
                          }`}
                          title={c.deleted ? "Activar cliente" : "Desactivar cliente"}
                        >
                          {c.deleted ? "Activar" : "Desactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <EmptyState
                icon={<Users size={40} />}
                title="Sin clientes"
                description="No se encontraron clientes con los filtros aplicados."
              />
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Modal de formulario ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editClient ? "Editar Cliente" : "Nuevo Cliente"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <ErrorAlert message={formError} />

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                  <Input value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Nombre" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Apellido *</label>
                  <Input value={form.apellido} onChange={v => setForm(p => ({ ...p, apellido: v }))} placeholder="Apellido" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">DUI</label>
                <input
                  value={formatDUI(form.dui)}
                  onChange={e => setForm(prev => ({ ...prev, dui: e.target.value }))}
                  placeholder="00000000-0"
                  maxLength={10}
                  className={fmtClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono *</label>
                <input
                  value={formatPhone(form.telefono)}
                  onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="0000-0000"
                  maxLength={9}
                  className={fmtClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Correo *</label>
                <Input type="email" value={form.correo} onChange={v => setForm(p => ({ ...p, correo: v }))} placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Dirección</label>
                <Input value={form.direccion} onChange={v => setForm(p => ({ ...p, direccion: v }))} placeholder="Dirección opcional" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm} disabled={!hasChanges()}>
                <Check size={14} /> {editClient ? "Guardar cambios" : "Registrar"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── Modales de confirmación ── */}
      <ConfirmModal
        isOpen={toggleModal.isOpen}
        title={toggleModal.deleted ? "Activar cliente" : "Desactivar cliente"}
        message={`¿Estás seguro de que deseas ${toggleModal.deleted ? 'activar' : 'desactivar'} este cliente?`}
        onConfirm={confirmToggle}
        onCancel={() => setToggleModal({ isOpen: false, clienteId: null, deleted: 0 })}
        confirmText={toggleModal.deleted ? "Activar" : "Desactivar"}
        variant={toggleModal.deleted ? "primary" : "danger"}
      />

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </PageLayout>
  );
}

// ── Proveedores ───────────────────────────────────────────────────────────────
function Proveedores({ user }: { user: User }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTelefono, setFilterTelefono] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "" });
  const [originalForm, setOriginalForm] = useState({ nombre: "", apellido: "", telefono: "", correo: "", direccion: "" });
  const [formError, setFormError] = useState("");
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; proveedorId: number | null }>({ isOpen: false, proveedorId: null });
  const [toggleModal, setToggleModal] = useState<{ isOpen: boolean; proveedorId: number | null; deleted: number }>({ isOpen: false, proveedorId: null, deleted: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  async function load() {
    setLoading(true);
    try { setSuppliers(await proveedoresApi.getAll()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function formatPhone(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 4) return d;
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }

  function validateNameSurname(value: string): string {
    return value.replace(/[0-9]/g, '');
  }

  function validatePhone(value: string): string {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 4) return numbers;
    return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
  }

  function isValidPhoneFormat(phone: string): boolean {
    const regex = /^\d{4}-\d{4}$/;
    return regex.test(phone);
  }

  const filtered = suppliers.filter(s => {
    const nombreCompleto = `${s.nombre} ${s.apellido}`.toLowerCase();
    if (search && !nombreCompleto.startsWith(search.toLowerCase())) return false;
    if (filterTelefono && !(s.telefono ?? "").toLowerCase().startsWith(filterTelefono.toLowerCase())) return false;
    if (filterEstado === "activo" && s.deleted) return false;
    if (filterEstado === "inactivo" && !s.deleted) return false;
    return true;
  });

  const hasChanges = () =>
    form.nombre !== originalForm.nombre ||
    form.apellido !== originalForm.apellido ||
    form.telefono !== originalForm.telefono ||
    form.correo !== originalForm.correo ||
    form.direccion !== originalForm.direccion;

  function openNew() {
    setEditSupplier(null);
    const initial = { nombre: "", apellido: "", telefono: "", correo: "", direccion: "" };
    setForm(initial);
    setOriginalForm(initial);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(s: Supplier) {
    setEditSupplier(s);
    const initial = {
      nombre: s.nombre, apellido: s.apellido,
      telefono: s.telefono ?? "", correo: s.correo ?? "",
      direccion: s.direccion ?? ""
    };
    setForm(initial);
    setOriginalForm(initial);
    setFormError("");
    setShowForm(true);
  }

  async function saveForm() {
    if (editSupplier && !hasChanges()) return;
    
    if (!form.nombre || !form.apellido) { 
      setFormError("Nombre y apellido son obligatorios."); 
      return; 
    }
    
    if (/\d/.test(form.nombre) || /\d/.test(form.apellido)) {
      setFormError("Nombre y apellido no deben contener números.");
      return;
    }
    
    if (!form.correo || !isValidEmail(form.correo)) { 
      setFormError("Ingresa un correo electronico valido."); 
      return; 
    }
    
    if (form.telefono && !isValidPhoneFormat(form.telefono)) {
      setFormError("El teléfono debe tener el formato 0000-0000 (4 números, guión, 4 números).");
      return;
    }
    
    try {
      const payload = { ...form, id_empleado: user.id, nombre_empleado: user.name };
      if (editSupplier) await proveedoresApi.update(editSupplier.id_proveedor, payload);
      else await proveedoresApi.create(payload);
      setShowForm(false);
      load();
    } catch (e: any) { 
      setFormError(e?.response?.data?.error ?? "Error al guardar."); 
    }
  }

  function handleDelete(id: number) {
    setConfirmModal({ isOpen: true, proveedorId: id });
  }

  async function confirmDelete() {
    if (confirmModal.proveedorId === null) return;
    try {
      await api.patch(`/proveedores/${confirmModal.proveedorId}/papelera`, {
        id_empleado: user.id, nombre_empleado: user.name
      });
      setConfirmModal({ isOpen: false, proveedorId: null });
      setToast({ message: "Proveedor movido a papelera correctamente.", type: 'success' });
      load();
    } catch (e: any) {
      setConfirmModal({ isOpen: false, proveedorId: null });
      setToast({ message: e?.response?.data?.error ?? "No se puede mover a la papelera porque tiene productos asociados.", type: 'error' });
    }
  }

  function handleToggle(id: number, deleted: number) {
    setToggleModal({ isOpen: true, proveedorId: id, deleted });
  }

  async function confirmToggle() {
    if (toggleModal.proveedorId === null) return;
    try {
      await api.patch(`/proveedores/${toggleModal.proveedorId}/toggle`, {
        id_empleado: user.id, nombre_empleado: user.name
      });
      setToggleModal({ isOpen: false, proveedorId: null, deleted: 0 });
      setToast({ message: "Estado actualizado correctamente.", type: 'success' });
      load();
    } catch (e: any) {
      setToggleModal({ isOpen: false, proveedorId: null, deleted: 0 });
      setToast({ message: e?.response?.data?.error ?? "Error al cambiar estado.", type: 'error' });
    }
  }

  if (loading) return <LoadingSpinner />;

  const hayFiltros = !!(search || filterTelefono || filterEstado);
  function limpiarFiltros() {
    setSearch("");
    setFilterTelefono("");
    setFilterEstado("");
  }

  const fmtClass = "w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors";

  return (
    <PageLayout
      title="Gestión de Proveedores"
      subtitle={`${filtered.length} de ${suppliers.length} proveedores`}
      actions={
        <Btn onClick={openNew}><Plus size={14} /> Nuevo proveedor</Btn>
      }
    >
      {/* ── Filtros ── */}
      <SectionCard title="Filtros">
        <FilterBar hasFilters={hayFiltros} onClear={limpiarFiltros}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Buscar proveedor</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={setSearch} placeholder="Nombre completo..." className="pl-8" />
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono</label>
            <input value={formatPhone(filterTelefono)} onChange={e => setFilterTelefono(e.target.value)} placeholder="0000-0000" maxLength={9} className={fmtClass} />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
            <Select value={filterEstado} onChange={setFilterEstado} className="w-full">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          </div>
        </FilterBar>
      </SectionCard>

      {/* ── Tabla ── */}
      <SectionCard title="Listado de proveedores" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Nombre</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Teléfono</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Correo</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Dirección</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Medicamentos</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Estado</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
                <tr
                  key={s.id_proveedor}
                  className={`transition-colors ${s.deleted ? 'opacity-50 bg-muted/50' : 'hover:bg-muted/50'}`}
                >
                  <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
                    <ExpandableCell text={`${s.nombre} ${s.apellido}`} maxLength={25} />
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                    <ExpandableCell text={s.telefono} maxLength={15} />
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                    <ExpandableCell text={s.correo} maxLength={25} />
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                    <ExpandableCell text={s.direccion} maxLength={30} />
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {Number(s.product_count ?? 0)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.deleted
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {s.deleted ? "Inactivo" : "Activo"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/10 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(s.id_proveedor, s.deleted ?? 0)}
                        className={`p-1 rounded text-xs font-semibold px-1.5 py-0.5 transition-colors ${
                          s.deleted
                            ? 'text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30'
                            : 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/30'
                        }`}
                        title={s.deleted ? "Activar proveedor" : "Desactivar proveedor"}
                      >
                        {s.deleted ? "Activar" : "Desactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <EmptyState
              icon={<Truck size={40} />}
              title="Sin proveedores"
              description="No se encontraron proveedores con los filtros aplicados."
            />
          )}
        </div>
      </SectionCard>

      {/* ── Modal de formulario ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <ErrorAlert message={formError} />

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                  <Input 
                    value={form.nombre} 
                    onChange={v => setForm(p => ({ ...p, nombre: validateNameSurname(v) }))} 
                    placeholder="Nombre" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Apellido *</label>
                  <Input 
                    value={form.apellido} 
                    onChange={v => setForm(p => ({ ...p, apellido: validateNameSurname(v) }))} 
                    placeholder="Apellido" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono (formato: 0000-0000)</label>
                <Input 
                  value={form.telefono} 
                  onChange={v => setForm(p => ({ ...p, telefono: validatePhone(v) }))} 
                  placeholder="0000-0000" 
                  maxLength={9}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Correo</label>
                <Input type="email" value={form.correo} onChange={v => setForm(p => ({ ...p, correo: v }))} placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Dirección</label>
                <Input value={form.direccion} onChange={v => setForm(p => ({ ...p, direccion: v }))} placeholder="Dirección opcional" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm} disabled={!hasChanges()}>
                <Check size={14} /> Guardar
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── Modales de confirmación ── */}
      <ConfirmModal
        isOpen={toggleModal.isOpen}
        title={toggleModal.deleted ? "Activar proveedor" : "Desactivar proveedor"}
        message={`¿Estás seguro de que deseas ${toggleModal.deleted ? 'activar' : 'desactivar'} este proveedor?`}
        onConfirm={confirmToggle}
        onCancel={() => setToggleModal({ isOpen: false, proveedorId: null, deleted: 0 })}
        confirmText={toggleModal.deleted ? "Activar" : "Desactivar"}
        variant={toggleModal.deleted ? "primary" : "danger"}
      />

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </PageLayout>
  );
}

// ── Empleados ─────────────────────────────────────────────────────────────────
function Empleados({ user }: { user: User }) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCargo, setFilterCargo] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editEmp, setEditEmp] = useState<Empleado | null>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    nombre: "", apellido: "", correo: "", telefono: "",
    cargo: "cajero", fecha_contratacion: "",
    dui: "", nit: "", cuenta_banco: "", afp: ""
  });
  const [originalForm, setOriginalForm] = useState({
    nombre: "", apellido: "", correo: "", telefono: "",
    cargo: "cajero", fecha_contratacion: "",
    dui: "", nit: "", cuenta_banco: "", afp: ""
  });
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; empleadoId: number | null }>({ isOpen: false, empleadoId: null });
  const [toggleModal, setToggleModal] = useState<{ isOpen: boolean; empleadoId: number | null; activo: number }>({ isOpen: false, empleadoId: null, activo: 0 });

  const CARGOS = ["administrador", "farmaceutico", "cajero"];
  const CARGO_STYLE: Record<string, string> = {
    administrador: "bg-primary/10 text-primary",
    farmaceutico: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    cajero: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  };
  const CARGO_ICON: Record<string, React.ReactNode> = {
    administrador: <Shield size={12} />,
    farmaceutico: <Package size={12} />,
    cajero: <ShoppingCart size={12} />,
  };

  async function load() {
    setLoading(true);
    try { setEmpleados(await empleadosApi.getAll()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filtered = empleados.filter(e => {
    if (search && !`${e.nombre} ${e.apellido}`.toLowerCase().startsWith(search.toLowerCase())) return false;
    if (filterCargo && normalize(e.cargo) !== normalize(filterCargo)) return false;
    if (filterEstado === "activo" && !e.activo) return false;
    if (filterEstado === "inactivo" && e.activo) return false;
    return true;
  });

  function openNew() {
    setEditEmp(null);
    const initial = { nombre: "", apellido: "", correo: "", telefono: "", cargo: "cajero", fecha_contratacion: "", dui: "", nit: "", cuenta_banco: "", afp: "" };
    setForm(initial);
    setOriginalForm(initial);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(emp: Empleado) {
    setEditEmp(emp);
    const initial = {
      nombre: emp.nombre, apellido: emp.apellido, correo: emp.correo,
      telefono: emp.telefono ?? "", cargo: emp.cargo,
      fecha_contratacion: emp.fecha_contratacion ?? "",
      dui: emp.dui ?? "", nit: emp.nit ?? "",
      cuenta_banco: emp.cuenta_banco ?? "", afp: emp.afp ?? ""
    };
    setForm(initial);
    setOriginalForm(initial);
    setFormError("");
    setShowForm(true);
  }

  const hasEmployeeChanges = () =>
    form.nombre !== originalForm.nombre ||
    form.apellido !== originalForm.apellido ||
    form.correo !== originalForm.correo ||
    form.telefono !== originalForm.telefono ||
    form.cargo !== originalForm.cargo ||
    form.fecha_contratacion !== originalForm.fecha_contratacion ||
    form.dui !== originalForm.dui ||
    form.nit !== originalForm.nit ||
    form.cuenta_banco !== originalForm.cuenta_banco ||
    form.afp !== originalForm.afp;

  // ── Validaciones ──
  function validateNameSurname(value: string): string {
    return value.replace(/[0-9]/g, '');
  }

  function validatePhone(value: string): string {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 4) return numbers;
    return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
  }

  function isValidPhoneFormat(phone: string): boolean {
    const regex = /^\d{4}-\d{4}$/;
    return regex.test(phone);
  }

  function formatDUI(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 9);
    if (d.length <= 8) return d;
    return `${d.slice(0, 8)}-${d.slice(8, 9)}`;
  }

  function isValidDUIFormat(dui: string): boolean {
    const regex = /^\d{8}-\d{1}$/;
    return regex.test(dui);
  }

  function formatNIT(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 14);
    if (d.length <= 4) return d;
    if (d.length <= 10) return `${d.slice(0, 4)}-${d.slice(4)}`;
    if (d.length <= 13) return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10)}`;
    return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10, 13)}-${d.slice(13)}`;
  }

  function isValidNITFormat(nit: string): boolean {
    const regex = /^\d{4}-\d{6}-\d{3}-\d{1}$/;
    return regex.test(nit);
  }

  function formatCuentaBanco(v: string): string {
    return v.replace(/\D/g, '').slice(0, 20);
  }

  async function saveForm() {
    if (editEmp && !hasEmployeeChanges()) return;
    
    // Validar campos obligatorios básicos
    if (!form.nombre || !form.apellido || !form.correo || !form.cargo) {
      setFormError("Complete los campos obligatorios.");
      return;
    }
    
    // Validar que nombre y apellido no contengan números
    if (/\d/.test(form.nombre) || /\d/.test(form.apellido)) {
      setFormError("Nombre y apellido no deben contener números.");
      return;
    }
    
    // Validar correo
    if (!isValidEmail(form.correo)) {
      setFormError("Ingresa un correo electronico valido.");
      return;
    }
    
    // Validar teléfono (obligatorio y formato correcto)
    if (!form.telefono) {
      setFormError("El teléfono es obligatorio.");
      return;
    }
    if (!isValidPhoneFormat(form.telefono)) {
      setFormError("El teléfono debe tener el formato 0000-0000.");
      return;
    }
    
    // Validar fecha de contratación
    if (!form.fecha_contratacion) {
      setFormError("La fecha de contratación es obligatoria.");
      return;
    }
    
    // Validar DUI (obligatorio y formato correcto)
    if (!form.dui) {
      setFormError("El DUI es obligatorio.");
      return;
    }
    if (!isValidDUIFormat(form.dui)) {
      setFormError("El DUI debe tener el formato 00000000-0.");
      return;
    }
    
    // Validar NIT (obligatorio y formato correcto)
    if (!form.nit) {
      setFormError("El NIT es obligatorio.");
      return;
    }
    if (!isValidNITFormat(form.nit)) {
      setFormError("El NIT debe tener el formato 0000-000000-000-0.");
      return;
    }
    
    // Validar cuenta bancaria (obligatoria)
    if (!form.cuenta_banco) {
      setFormError("La cuenta bancaria es obligatoria.");
      return;
    }
    
    // Validar AFP (obligatoria)
    if (!form.afp) {
      setFormError("Debe seleccionar una AFP.");
      return;
    }
    
    try {
      const payload: any = {
        ...form,
        id_empleado_sesion: user.id,
        nombre_empleado_sesion: user.name,
      };
      if (editEmp) {
        await empleadosApi.update(editEmp.id_empleado, payload);
        setToast({ message: 'Empleado actualizado correctamente.', type: 'success' });
      } else {
        await empleadosApi.create(payload);
        setToast({ message: 'Empleado registrado. Se le ha enviado la invitacion a su correo.', type: 'success' });
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setFormError(e?.response?.data?.error ?? "Error al guardar.");
    }
  }

  function handleToggle(emp: Empleado) {
    setToggleModal({ isOpen: true, empleadoId: emp.id_empleado, activo: emp.activo });
  }

  async function confirmToggle() {
    if (toggleModal.empleadoId === null) return;
    try {
      const emp = empleados.find(e => e.id_empleado === toggleModal.empleadoId);
      if (!emp) return;
      await empleadosApi.update(emp.id_empleado, {
        ...emp,
        activo: emp.activo ? 0 : 1,
        id_empleado_sesion: user.id,
        nombre_empleado_sesion: user.name,
      });
      setToggleModal({ isOpen: false, empleadoId: null, activo: 0 });
      setToast({ message: "Estado actualizado correctamente.", type: 'success' });
      load();
    } catch (e: any) {
      setToggleModal({ isOpen: false, empleadoId: null, activo: 0 });
      setToast({ message: e?.response?.data?.error ?? "Error al cambiar estado.", type: 'error' });
    }
  }

  function handleDelete(id: number) {
    setConfirmModal({ isOpen: true, empleadoId: id });
  }

  async function confirmDelete() {
    if (confirmModal.empleadoId === null) return;
    try {
      await api.delete(`/empleados/${confirmModal.empleadoId}`, {
        data: { id_empleado_sesion: user.id, nombre_empleado_sesion: user.name }
      });
      setConfirmModal({ isOpen: false, empleadoId: null });
      setToast({ message: "Empleado movido a papelera correctamente.", type: 'success' });
      load();
    } catch (e: any) {
      setConfirmModal({ isOpen: false, empleadoId: null });
      setToast({ message: e?.response?.data?.error ?? "No se puede mover a papelera porque tiene ventas registradas.", type: 'error' });
    }
  }

  const hayFiltros = !!(search || filterCargo || filterEstado);
  function limpiarFiltros() {
    setSearch("");
    setFilterCargo("");
    setFilterEstado("");
  }

  if (loading) return <LoadingSpinner />;

  // Clase compartida para inputs con formato especial
  const fmtInputClass = "w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors";

  return (
    <PageLayout
      title="Gestión de Empleados"
      subtitle={`${filtered.length} empleados encontrados`}
      actions={
        <Btn onClick={openNew}><Plus size={14} /> Nuevo empleado</Btn>
      }
    >
      {/* ── Filtros ── */}
      <SectionCard title="Filtros">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Buscar por nombre</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={setSearch} placeholder="Nombre completo..." className="pl-8" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Cargo</label>
              <Select value={filterCargo} onChange={setFilterCargo} className="w-full">
                <option value="">Todos</option>
                {CARGOS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
              <Select value={filterEstado} onChange={setFilterEstado} className="w-full">
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </Select>
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={limpiarFiltros} disabled={!hayFiltros} className="self-start lg:self-end">
            <X size={14} /> Limpiar
          </Btn>
        </div>
      </SectionCard>

       {/* ── Tabla ── */}
      <SectionCard title="Listado de empleados" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-muted">
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">ID</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Empleado</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Correo</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Teléfono</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">DUI</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">NIT</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Cuenta bancaria</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">AFP</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Cargo</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Contratación</th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Estado</th>
                <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground text-xs whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(emp => {
                const fullName = `${emp.nombre} ${emp.apellido}`;
                return (
                  <tr
                    key={emp.id_empleado}
                    className={`transition-colors ${!emp.activo ? 'opacity-50' : 'hover:bg-muted/50'}`}
                  >
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">#{emp.id_empleado}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
                      <ExpandableCell text={fullName} maxLength={25} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      <ExpandableCell text={emp.correo} maxLength={25} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      <ExpandableCell text={emp.telefono} maxLength={15} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      <ExpandableCell text={emp.dui} maxLength={12} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      <ExpandableCell text={emp.nit} maxLength={18} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      <ExpandableCell text={emp.cuenta_banco} maxLength={18} />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      <ExpandableCell text={emp.afp} maxLength={16} />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${CARGO_STYLE[emp.cargo] ?? "bg-muted text-muted-foreground"}`}>
                        {CARGO_ICON[emp.cargo] ?? <UserCog size={12} />}
                        {emp.cargo.charAt(0).toUpperCase() + emp.cargo.slice(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs whitespace-nowrap">
                      {emp.fecha_contratacion || "—"}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        emp.activo
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {emp.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Editar empleado"
                          aria-label={`Editar ${fullName}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleToggle(emp)}
                          className={`p-1.5 rounded-md transition-colors ${
                            emp.activo
                              ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              : "text-muted-foreground hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          }`}
                          title={emp.activo ? "Desactivar empleado" : "Activar empleado"}
                          aria-label={`${emp.activo ? "Desactivar" : "Activar"} ${fullName}`}
                        >
                          {emp.activo ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

            {filtered.length === 0 && (
              <EmptyState
                icon={<Users size={40} />}
                title="Sin empleados"
                description="No se encontraron empleados con los filtros aplicados."
              />
            )}
        </div>
      </SectionCard>

      {/* ── Modal de formulario ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {editEmp ? "Editar Empleado" : "Nuevo Empleado"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <ErrorAlert message={formError} />

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre *</label>
                  <Input 
                    value={form.nombre} 
                    onChange={v => setForm(p => ({ ...p, nombre: validateNameSurname(v) }))} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Apellido *</label>
                  <Input 
                    value={form.apellido} 
                    onChange={v => setForm(p => ({ ...p, apellido: validateNameSurname(v) }))} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Correo *</label>
                <Input type="email" value={form.correo} onChange={v => setForm(p => ({ ...p, correo: v }))} placeholder="correo@ejemplo.com" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Teléfono * <span className="font-normal text-muted-foreground">(0000-0000)</span></label>
                  <input
                    value={form.telefono}
                    onChange={e => setForm(prev => ({ ...prev, telefono: validatePhone(e.target.value) }))}
                    placeholder="0000-0000" 
                    maxLength={9}
                    className={fmtInputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Cargo *</label>
                  <Select value={form.cargo} onChange={v => setForm(p => ({ ...p, cargo: v }))}>
                    {CARGOS.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha contratación *</label>
                  <Input type="date" value={form.fecha_contratacion} onChange={v => setForm(p => ({ ...p, fecha_contratacion: v }))} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Datos fiscales y bancarios
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">DUI * <span className="font-normal text-muted-foreground">(00000000-0)</span></label>
                    <input
                      value={form.dui}
                      onChange={e => setForm(prev => ({ ...prev, dui: formatDUI(e.target.value) }))}
                      placeholder="00000000-0" 
                      maxLength={10}
                      className={fmtInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">NIT * <span className="font-normal text-muted-foreground">(0000-000000-000-0)</span></label>
                    <input
                      value={form.nit}
                      onChange={e => setForm(prev => ({ ...prev, nit: formatNIT(e.target.value) }))}
                      placeholder="0000-000000-000-0" 
                      maxLength={17}
                      className={fmtInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Cuenta bancaria *</label>
                    <input
                      value={form.cuenta_banco}
                      onChange={e => setForm(prev => ({ ...prev, cuenta_banco: formatCuentaBanco(e.target.value) }))}
                      placeholder="Número de cuenta" 
                      maxLength={20}
                      className={fmtInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">AFP *</label>
                    <Select value={form.afp} onChange={v => setForm(p => ({ ...p, afp: v }))} className="w-full">
                      <option value="">Seleccione una AFP</option>
                      <option value="CRECER">CRECER</option>
                      <option value="CONFÍA">CONFÍA</option>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveForm} disabled={!hasEmployeeChanges()}>
                <Check size={14} /> {editEmp ? "Guardar cambios" : "Guardar"}
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* ── Modales de confirmación ── */}
      <ConfirmModal
        isOpen={toggleModal.isOpen}
        title={toggleModal.activo ? "Desactivar empleado" : "Activar empleado"}
        message={`¿Estás seguro de que deseas ${toggleModal.activo ? 'desactivar' : 'activar'} este empleado?`}
        onConfirm={confirmToggle}
        onCancel={() => setToggleModal({ isOpen: false, empleadoId: null, activo: 0 })}
        confirmText={toggleModal.activo ? "Desactivar" : "Activar"}
        variant={toggleModal.activo ? "danger" : "primary"}
      />

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </PageLayout>
  );
}

// ── Alertas de Stock ──────────────────────────────────────────────────────────
function Alertas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");

  async function load() {
    setLoading(true);
    try { setProducts(await getProductos()); } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in30 = new Date(); in30.setDate(today.getDate() + 30); in30.setHours(0, 0, 0, 0);

  const agotados = products.filter(p => p.stock === 0);
  const criticos = products.filter(p => p.stock > 0 && p.stock <= 10);
  const bajos = products.filter(p => p.stock > 10 && p.stock <= 20);
  const vencer = products.filter(p => {
    if (!p.fecha_vencimiento) return false;
    const d = new Date(p.fecha_vencimiento + 'T00:00:00');
    return d >= today && d <= in30;
  });
  const vencidos = products.filter(p => {
    if (!p.fecha_vencimiento) return false;
    return new Date(p.fecha_vencimiento + 'T00:00:00') < today;
  });

  const totalStock = agotados.length + criticos.length + bajos.length;
  const totalTodos = totalStock + vencer.length + vencidos.length;

  const tabs = [
    { id: "todos", label: "Todos", count: totalTodos, active: "bg-card text-foreground shadow-sm" },
    { id: "agotado", label: "Agotados", count: agotados.length, active: "bg-destructive/10 text-destructive" },
    { id: "critico", label: "Críticos", count: criticos.length, active: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
    { id: "bajo", label: "Bajo (11-20)", count: bajos.length, active: "bg-amber-50/50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400" },
    { id: "vencer", label: "Próx. vencer", count: vencer.length, active: "bg-primary/10 text-primary" },
    { id: "vencido", label: "Vencidos", count: vencidos.length, active: "bg-destructive/10 text-destructive" },
  ];

  const displayed =
    tab === "todos" ? [...agotados, ...criticos, ...bajos, ...vencer, ...vencidos] :
    tab === "agotado" ? agotados :
    tab === "critico" ? criticos :
    tab === "bajo" ? bajos :
    tab === "vencer" ? vencer :
    vencidos;

  function stockBadgeCls(stock: number) {
    if (stock === 0) return "bg-destructive/15 text-destructive font-semibold";
    if (stock <= 10) return "bg-destructive/10 text-destructive font-semibold";
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-semibold";
  }

  function stockLabel(stock: number) {
    if (stock === 0) return "Agotado";
    if (stock <= 10) return "Crítico";
    return "Bajo";
  }

  function diasBadge(dias: number | null) {
    if (dias === null) return null;
    if (dias < 0) return "bg-destructive/15 text-destructive font-semibold";
    if (dias <= 7) return "bg-destructive/10 text-destructive font-semibold";
    if (dias <= 15) return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-semibold";
    return "bg-primary/10 text-primary font-semibold";
  }

  if (loading) return <LoadingSpinner />;

  const summaryCards = [
    { label: "Agotados", value: agotados.length, cls: "bg-destructive/10 text-destructive border-destructive/20" },
    { label: "Críticos", value: criticos.length, cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" },
    { label: "Stock Bajo", value: bajos.length, cls: "bg-primary/10 text-primary border-primary/20" },
    { label: "Próx. Vencer", value: vencer.length, cls: "bg-primary/5 text-primary/80 border-primary/10" },
    { label: "Vencidos", value: vencidos.length, cls: "bg-destructive/10 text-destructive border-destructive/20" },
  ];

  return (
    <PageLayout
      title="Alertas de Stock"
      subtitle={`${agotados.length} agotados · ${criticos.length} críticos · ${bajos.length} bajos · ${vencer.length} próx. vencer · ${vencidos.length} vencidos`}
      actions={
        <Btn variant="secondary" onClick={load}><RefreshCw size={14} /> Actualizar</Btn>
      }
    >
      {/* ── Tarjetas resumen ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map(k => (
          <div key={k.label} className={`rounded-lg border p-4 ${k.cls}`}>
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs font-medium mt-0.5 opacity-70">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 bg-muted rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${t.active}`}
          >
            <span>{t.label}</span>
            {t.count > 0 && (
              <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tabla ── */}
      <SectionCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                {["Producto", "Lote", "Stock", "Estado", "Vencimiento", "Días"].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map(p => {
                const fechaDate = p.fecha_vencimiento ? new Date(p.fecha_vencimiento + 'T00:00:00') : null;
                const dias = fechaDate ? Math.round((fechaDate.getTime() - today.getTime()) / 86400000) : null;
                const vencido = fechaDate ? fechaDate < today : false;

                return (
                  <tr
                    key={p.id_producto}
                    className={`transition-colors ${
                      p.stock === 0 ? "bg-destructive/5" :
                      vencido ? "bg-destructive/5" :
                      "hover:bg-muted/50"
                    }`}
                  >
                    <td className="py-2.5 px-4 font-medium text-foreground whitespace-nowrap">
                      <ExpandableCell text={p.nombre_producto} maxLength={25} />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <ExpandableCell text={p.lote} maxLength={12} />
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold whitespace-nowrap">{p.stock} uds.</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {vencido ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-destructive/15 text-destructive">Vencido</span>
                      ) : p.stock === 0 || p.stock <= 20 ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stockBadgeCls(p.stock)}`}>{stockLabel(p.stock)}</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">Próx. vencer</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">{p.fecha_vencimiento ?? "—"}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {dias !== null ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${diasBadge(dias)}`}>
                          {dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : `${dias} días`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {displayed.length === 0 && (
            <EmptyState
              icon={<Bell size={40} />}
              title="Sin alertas"
              description="No hay productos en esta categoría."
            />
          )}
        </div>
      </SectionCard>
    </PageLayout>
  );
}

// ── Historial de Ventas ───────────────────────────────────────────────────────
function Historial() {
  const [data, setData] = useState<{ ventas: any[]; total: number }>({ ventas: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [detalle, setDetalle] = useState<any>(null);
  const [DetailLoading, setDetailLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cliente, setCliente] = useState("");
  const [empleado, setEmpleado] = useState("");
  const LIMIT = 20;

  async function load(p = 0) {
    setLoading(true);
    try {
      const res = await getHistorial({
        from: from || undefined,
        to: to || undefined,
        cliente: cliente || undefined,
        empleado: empleado || undefined,
        limit: LIMIT,
        offset: p * LIMIT,
      });
      setData(res);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => load(0), 300);
    return () => clearTimeout(handler);
  }, [from, to, cliente, empleado]);

  useEffect(() => { load(0); }, []);

  function limpiar() {
    setFrom("");
    setTo("");
    setCliente("");
    setEmpleado("");
  }

  async function verDetalle(venta: any) {
    setDetalle({ venta, detalle: null });
    setDetailLoading(true);
    try {
      const d = await getDetalleVenta(venta.id_venta);
      setDetalle(d);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  }

  const totalPages = Math.ceil(data.total / LIMIT);

  if (loading) return <LoadingSpinner />;

  return (
    <PageLayout
      title="Historial de Ventas"
      subtitle={`${data.total} ventas registradas`}
    >
      {/* ── Filtros (sin SectionCard — botón limpiar SIEMPRE visible) ── */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-36">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors" />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cliente</label>
            <input type="text" placeholder="Nombre cliente..." value={cliente}
              onChange={e => setCliente(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Empleado</label>
            <input type="text" placeholder="Nombre empleado..." value={empleado}
              onChange={e => setEmpleado(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors" />
          </div>
          <div className="flex items-end pb-0.5">
            <Btn variant="ghost" size="sm" onClick={limpiar}><X size={14} /> Limpiar filtros</Btn>
          </div>
        </div>
      </Card>

      {/* ── Tabla ── */}
      <SectionCard title="Ventas registradas" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                {["# Venta", "Fecha", "Hora", "Cliente", "Empleado", "Total", "Detalle"].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.ventas.map(v => (
                <tr key={v.id_venta} className="transition-colors hover:bg-muted/50">
                  <td className="py-2.5 px-4 font-mono text-xs text-primary font-semibold whitespace-nowrap">#{v.id_venta}</td>
                  <td className="py-2.5 px-4 text-muted-foreground text-xs whitespace-nowrap">{v.fecha}</td>
                  <td className="py-2.5 px-4 text-muted-foreground text-xs font-mono whitespace-nowrap">{v.hora ?? "—"}</td>
                  <td className="py-2.5 px-4 text-foreground whitespace-nowrap max-w-[200px]">
                    <ExpandableCell text={v.cliente ?? "Consumidor final"} maxLength={24} />
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap max-w-[180px]">
                    <ExpandableCell text={v.empleado} maxLength={22} />
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-primary whitespace-nowrap">${Number(v.total).toFixed(2)}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <button
                      onClick={() => verDetalle(v)}
                      className="text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/10 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.ventas.length === 0 && (
            <EmptyState
              icon={<History size={40} />}
              title="Sin ventas"
              description="No se encontraron ventas en el período seleccionado."
            />
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Btn variant="secondary" size="sm" disabled={page === 0} onClick={() => load(page - 1)}>← Anterior</Btn>
              <Btn variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>Siguiente →</Btn>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Modal detalle ── */}
      {detalle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetalle(null)}>
          <Card className="w-full max-w-xl max-h-[85vh] overflow-y-auto p-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Detalle de Venta <span className="text-primary">#{detalle.venta?.id_venta}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {detalle.venta?.fecha}{detalle.venta?.hora ? ` · ${detalle.venta.hora}` : ""}
                </p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 px-6 py-4 bg-input-background border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Cliente</p>
                <p className="text-sm font-semibold text-foreground">
                  {detalle.venta?.cliente ?? <span className="text-muted-foreground font-normal italic">Consumidor final</span>}
                </p>
                {detalle.venta?.dui && <p className="text-xs text-muted-foreground mt-0.5">DUI: {detalle.venta.dui}</p>}
                {detalle.venta?.cliente_telefono && <p className="text-xs text-muted-foreground">Tel: {detalle.venta.cliente_telefono}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Atendido por</p>
                <p className="text-sm font-semibold text-foreground">{detalle.venta?.empleado}</p>
              </div>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Productos comprados</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    {["Producto", "Cant.", "P. Unit.", "Subtotal"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {DetailLoading ? (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Cargando productos...</td></tr>
                  ) : detalle.detalle?.map((d: any) => (
                    <tr key={d.id_detalle_venta} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-3">
                        <p className="font-medium text-foreground">{d.nombre_producto}</p>
                        {d.lote && <p className="text-xs text-muted-foreground">Lote: {d.lote}</p>}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-center">{d.cantidad}</td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">${Number(d.precio_unitario).toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-primary">${Number(d.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-center justify-between bg-primary/10 rounded-xl px-5 py-3">
                <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider">Total pagado</p>
                <span className="text-2xl font-bold text-primary font-mono">{Number(detalle.venta?.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setDetalle(null)}>Cerrar</Btn>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}

// ── Desactivados ──────────────────────────────────────────────────────────────
function Eliminados() {
  const [records, setRecords]       = useState<EliminadoRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState<"todos" | EliminadoRecord["tipo"]>("todos");

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    tipo: EliminadoRecord["tipo"] | null;
    id: number | null;
    accion: 'restaurar' | null;
  }>({ isOpen: false, tipo: null, id: null, accion: null });

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  async function load() {
    setLoading(true);
    try { setRecords(await eliminadosApi.getAll()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const tipoLabel: Record<EliminadoRecord["tipo"], string> = {
    producto:  "Producto",
    cliente:   "Cliente",
    proveedor: "Proveedor",
    empleado:  "Empleado",
  };

  const tipoCls: Record<EliminadoRecord["tipo"], string> = {
    producto:  "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    cliente:   "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    proveedor: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    empleado:  "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  };

  const tabs: { id: "todos" | EliminadoRecord["tipo"]; label: string }[] = [
    { id: "todos",     label: "Todos" },
    { id: "producto",  label: "Productos" },
    { id: "cliente",   label: "Clientes" },
    { id: "proveedor", label: "Proveedores" },
    { id: "empleado",  label: "Empleados" },
  ];

  const byTab     = tab === "todos" ? records : records.filter(r => r.tipo === tab);
  const filtered  = byTab.filter(r => r.nombre.toLowerCase().startsWith(search.toLowerCase()));
  const hasFilters = search !== "";

  function handleRestore(tipo: EliminadoRecord["tipo"], id: number) {
    setConfirmModal({ isOpen: true, tipo, id, accion: 'restaurar' });
  }

  async function confirmAction() {
    if (!confirmModal.tipo || confirmModal.id === null || !confirmModal.accion) return;
    const { tipo, id, accion } = confirmModal;

    try {
      await eliminadosApi.restaurar(tipo, id);
      setToast({ message: `${tipoLabel[tipo]} activado correctamente.`, type: 'success' });
      setConfirmModal({ isOpen: false, tipo: null, id: null, accion: null });
      load();
    } catch (e: any) {
      setConfirmModal({ isOpen: false, tipo: null, id: null, accion: null });
      setToast({
        message: e?.response?.data?.error ?? 'Error al activar el registro.',
        type: 'error'
      });
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <PageLayout
      title="Historial Desactivados"
      subtitle={`${records.length} registros desactivados`}
      actions={
        <Btn variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={14} /> Actualizar
        </Btn>
      }
    >
      {/* Alerta informativa */}
      {records.length > 0 && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-400 text-amber-800 rounded-lg px-4 py-3">
          <AlertTriangle size={15} className="flex-shrink-0" />
          Los registros aquí se conservan para historial y pueden activarse nuevamente.
        </div>
      )}

      {/* Tabs de filtrado por tipo */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit flex-wrap">
        {tabs.map(t => {
          const count = t.id === "todos"
            ? records.length
            : records.filter(r => r.tipo === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`text-xs font-bold ${tab === t.id ? "text-primary" : "text-muted-foreground"}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barra de búsqueda */}
      <FilterBar onClear={() => setSearch("")} hasFilters={hasFilters}>
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={setSearch}
            placeholder="Buscar registro..."
            className="pl-8 max-w-sm"
          />
        </div>
      </FilterBar>

      {/* Tabla de registros */}
      <SectionCard
        title="Lista de registros"
        className="overflow-hidden"
      >
        {filtered.length > 0 ? (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted">
                  {["Tipo", "Nombre", "Detalle", "Acciones"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr
                    key={`${r.tipo}-${r.id}`}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Badge className={tipoCls[r.tipo]}>
                        {tipoLabel[r.tipo]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground opacity-70">
                      {r.nombre}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {r.detalle ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(r.tipo, r.id)}
                          className="text-green-700 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                        >
                          <RotateCcw size={12} /> Activar
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<EyeOff size={40} />}
            title={records.length === 0 ? "No hay registros desactivados" : "Sin resultados"}
            description={
              records.length === 0
                ? "No hay empleados, clientes, proveedores o productos desactivados en este momento."
                : "No se encontraron registros para esta búsqueda."
            }
          />
        )}
      </SectionCard>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Activar registro"
        message={`¿Activar este ${tipoLabel[confirmModal.tipo || 'producto']?.toLowerCase()}?`}
        onConfirm={confirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, tipo: null, id: null, accion: null })}
        confirmText="Sí, activar"
        variant="primary"
      />

      {/* Toast (usa el componente estándar del design system) */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </PageLayout>
  );
}

function Auditoria({ user }: { user: User }) {
  const [data, setData] = useState<{ data: any[]; total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tabla, setTabla] = useState("");
  const [accion, setAccion] = useState("");
  const [page, setPage] = useState(0);
  const LIMIT = 30;

  const formatFecha = (isoString: string) => {
    if (!isoString) return "—";
    const fecha = new Date(isoString);
    if (isNaN(fecha.getTime())) return isoString;
    return fecha.toLocaleDateString('es-SV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

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
      const sortedData = [...res.data].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setData({ data: sortedData, total: res.total });
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => load(0), 300);
    return () => clearTimeout(handler);
  }, [from, to, tabla, accion]);

  useEffect(() => { load(0); }, []);

  const totalPages = Math.ceil(data.total / LIMIT);

  const accionStyle: Record<string, string> = {
    CREAR:     "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    EDITAR:    "bg-primary/10 text-primary",
    ELIMINAR:   "bg-destructive/10 text-destructive",
    DESACTIVAR:  "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    ACTIVAR:   "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    PAPELERA:  "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
    RESTAURAR: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  };

  const tablaStyle: Record<string, string> = {
    productos:  "bg-primary/10 text-primary",
    clientes:   "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    proveedores: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    empleados: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  };

  if (loading) return <LoadingSpinner />;

  return (
    <PageLayout
      title="Auditoría del Sistema"
      subtitle={`${data.total} registros de cambios`}
    >
      {/* ── Filtros ── */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-3">
          <div className="w-full md:w-auto">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="w-full md:w-auto px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            />
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full md:w-auto px-3 py-2.5 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            />
          </div>
          <div className="w-full md:w-[130px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tabla</label>
            <Select value={tabla} onChange={setTabla} className="w-full">
              <option value="">Todas</option>
              <option value="productos">Productos</option>
              <option value="clientes">Clientes</option>
              <option value="proveedores">Proveedores</option>
              <option value="empleados">Empleados</option>
            </Select>
          </div>
          <div className="w-full md:w-[130px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Acción</label>
            <Select value={accion} onChange={setAccion} className="w-full">
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
          <div className="flex gap-2 md:mt-0">
            <Btn variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setTabla(""); setAccion(""); }}>
              <X size={14} /> Limpiar
            </Btn>
          </div>
        </div>
      </Card>

      {/* ── Tabla ── */}
      <SectionCard title="Registro de auditoría" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                {["Fecha", "Tabla", "Acción", "Descripción", "Campo", "Valor anterior", "Valor nuevo", "Empleado"].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map((r, i) => (
                <tr
                  key={i}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="py-2.5 px-4 text-muted-foreground text-xs whitespace-nowrap">
                    {formatFecha(r.fecha)}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${tablaStyle[r.tabla] ?? 'bg-muted text-muted-foreground'}`}>
                      {r.tabla}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accionStyle[r.accion] ?? 'bg-muted text-muted-foreground'}`}>
                      {r.accion}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-foreground max-w-[250px]">
                    <ExpandableCell text={r.descripcion} maxLength={36} />
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs max-w-[140px]">
                    <ExpandableCell text={r.campo_modificado} maxLength={18} />
                  </td>
                  <td className="py-2.5 px-4 max-w-[160px]">
                    {r.valor_anterior ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono block max-w-full">
                        <ExpandableCell text={r.valor_anterior} maxLength={18} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 max-w-[140px]">
                    {r.valor_nuevo ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-mono block max-w-full">
                        <ExpandableCell text={r.valor_nuevo} maxLength={18} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground text-xs max-w-[120px]">
                    <ExpandableCell text={r.nombre_empleado} maxLength={18} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.data.length === 0 && (
            <EmptyState
              icon={<Shield size={40} />}
              title="Sin registros"
              description="No se encontraron registros de auditoría con los filtros aplicados."
            />
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border gap-2">
            <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Btn variant="secondary" size="sm" disabled={page === 0} onClick={() => load(page - 1)}>← Anterior</Btn>
              <Btn variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>Siguiente →</Btn>
            </div>
          </div>
        )}
      </SectionCard>
    </PageLayout>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [screen, setScreen] = useState<Screen>(() => {
    if (user.role === "cajero") return "ventas";
    if (user.role === "farmaceutico") return "productos";
    return "dashboard";
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const screenTitle: Record<Screen, string> = {
    dashboard: "Dashboard",
    ventas: "Ventas (POS)",
    productos: "Productos",
    clientes: "Clientes",
    empleados: "Empleados",
    proveedores: "Proveedores",
    alertas: "Alertas de Stock",
    historial: "Historial de Ventas",
    eliminados: "Historial Desactivados",
    auditoria: "Auditoría del Sistema",
  };

  const increaseTextSize = () => {
    const currentSize = parseFloat(document.documentElement.style.fontSize) || 16;
    const newSize = Math.min(currentSize + 2, 24);
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  const decreaseTextSize = () => {
    const currentSize = parseFloat(document.documentElement.style.fontSize) || 16;
    const newSize = Math.max(currentSize - 2, 12);
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    onLogout(); // ejecuta el logout real (limpia localStorage y estado)
  };
  const handleLogoutCancel = () => setShowLogoutModal(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar user={user} current={screen} onNav={setScreen} onLogout={handleLogoutClick} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header con padding adaptado para móvil */}
        <header className="h-14 bg-card border-b-2 border-primary/10 flex items-center gap-4 flex-shrink-0 px-3 md:px-6 pl-14 md:pl-6">
          <h2 className="font-semibold text-foreground text-sm truncate">{screenTitle[screen]}</h2>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button onClick={decreaseTextSize} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Reducir texto">
                <MinusIcon size={14} />
              </button>
              <button onClick={increaseTextSize} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Aumentar texto">
                <PlusIcon size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <div className="w-7 h-7 bg-sidebar-accent rounded-full flex items-center justify-center text-sidebar-accent-foreground text-xs font-bold flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium text-foreground leading-tight">{user.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-red-200 rounded-lg hover:bg-destructive/10 transition-colors whitespace-nowrap"
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-scroll">
          {screen === "dashboard" && <Dashboard />}
          {screen === "ventas" && <Ventas user={user} />}
          {screen === "productos" && <Productos user={user} />}
          {screen === "clientes" && <Clientes user={user} />}
          {screen === "empleados" && <Empleados user={user} />}
          {screen === "proveedores" && <Proveedores user={user} />}
          {screen === "alertas" && <Alertas />}
          {screen === "historial" && <Historial />}
          {screen === "eliminados" && <Eliminados />}
          {screen === "auditoria" && <Auditoria user={user} />}
        </main>
      </div>

      {/* Modal de confirmación de logout */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar sesión?"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [pantalla, setPantalla] = useState<'login' | 'app' | 'cambiar-contrasena-forzado' | 'establecer-contrasena' | 'recuperar-contrasena'>('login');
  const [tokenTemp, setTokenTemp] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname.includes('/establecer-contrasena') || params.has('establecer-contrasena')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setPantalla('establecer-contrasena');
    }
  }, []);

  // Manejar login exitoso
  const handleLogin = (userData: User) => {
    setUser(userData);
    setPantalla('app');
  };

  // Manejar logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPantalla('login');
  };

  // Escuchar evento de sesión expirada (ya lo tenías)
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setPantalla('login');
    };
    window.addEventListener('session-expired', handler);
    return () => window.removeEventListener('session-expired', handler);
  }, []);

  // Si está en login, mostrar LoginScreen
  if (pantalla === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Si está en cambio de contraseña forzado
  if (pantalla === 'cambiar-contrasena-forzado') {
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    return <CambiarContrasenaForzado token={token} onSuccess={() => {
      // Recargar usuario desde localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setPantalla('app');
      } else {
        setPantalla('login');
      }
    }} onCancel={() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setPantalla('login');
    }} />;
  }

  // Si está en establecimiento de contraseña (por invitación)
  if (pantalla === 'establecer-contrasena') {
    // Obtener token de la URL (usando window.location.search)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    return <EstablecerContrasena token={token} onSuccess={() => {
      window.history.replaceState({}, '', '/');
      setPantalla('login');
    }} />;
  }

  // Si está en recuperación de contraseña
  if (pantalla === 'recuperar-contrasena') {
    return <RecuperarContrasena onSuccess={() => setPantalla('login')} />;
  }

  // App normal
  if (user) {
    return <AppShell user={user} onLogout={handleLogout} />;
  }

  // Fallback
  return <LoginScreen onLogin={handleLogin} />;
}
