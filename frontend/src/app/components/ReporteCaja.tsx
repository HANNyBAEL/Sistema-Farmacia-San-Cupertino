import React, { useEffect, useRef } from 'react';
import jsPDF from 'jspdf';

interface Denominacion {
  denominacion: number;
  cantidad: number;
  monto: number;
}

interface TurnoData {
  id_turno: number;
  fecha: string;
  hora_inicio: string;
  hora_cierre: string;
  nombre_empleado: string;
  usuario_pos: string;
  caja_inicial: number;
  caja_final: number;
  total_efectivo: number;
  total_tarjeta?: number;
  total_transferencia: number;
  total_apple_pay: number;
  total_paypal: number;
  total_western_union: number;
  recaudacion_total: number;
  diferencia_caja: number;
  observaciones: string;
  supervisor?: string;
  denominaciones_apertura: Denominacion[];
  denominaciones_cierre: Denominacion[];
}

interface ReporteCajaProps {
  turnoData: TurnoData;
  onClose?: () => void;
  autoDownload?: boolean;
}

const DENOMINACIONES = [0.01, 0.05, 0.10, 0.25, 0.50, 1, 2, 5, 10, 20, 50, 100];
const BLUE = [7, 42, 111] as const;
const GRAY = [214, 212, 212] as const;
const LIGHT_BLUE = [220, 228, 245] as const;
const LIGHT_GRAY = [242, 242, 242] as const;

export const ReporteCaja: React.FC<ReporteCajaProps> = ({ turnoData, autoDownload = false }) => {
  const downloadedRef = useRef(false);

  const money = (amount: number | string) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount) || 0);

  const dateOnly = (value: string) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const timeOnly = (value: string) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
  };

  const byDenominacion = (items: Denominacion[] = []) =>
    new Map(items.map((item) => [Number(item.denominacion).toFixed(2), item]));

  const diferenciaTexto = () => {
    const diferencia = Number(turnoData.diferencia_caja) || 0;
    if (diferencia > 0) return `SOBRANTE $ ${money(diferencia)}`;
    if (diferencia < 0) return `FALTANTE $ ${money(Math.abs(diferencia))}`;
    return `$ ${money(0)}`;
  };

  const observaciones = () => {
    if (turnoData.observaciones?.trim()) return turnoData.observaciones;
    const diferencia = Number(turnoData.diferencia_caja) || 0;
    if (diferencia > 0) return `El cajero decidio cerrar la caja con un sobrante de $ ${money(diferencia)}.`;
    if (diferencia < 0) return `El cajero decidio cerrar la caja con un faltante de $ ${money(Math.abs(diferencia))}.`;
    return '';
  };

  const firmaNombre = (value?: string) => value?.trim() || 'N/A';

  const generarPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const tableW = 160;
    const left = (pageWidth - tableW) / 2;
    const col = [left, left + 46, left + 75, left + 104, left + 131, left + tableW];
    let y = 6;

    const rect = (x: number, yy: number, w: number, h: number, fill?: readonly number[]) => {
      if (fill) {
        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.rect(x, yy, w, h, 'FD');
      } else {
        doc.rect(x, yy, w, h);
      }
    };
    const line = (x1: number, y1: number, x2: number, y2: number) => doc.line(x1, y1, x2, y2);
    const text = (value: string, x: number, yy: number, options?: any) => doc.text(value, x, yy, options);
    const center = (value: string, x: number, yy: number, w: number, h: number, light = false) => {
      doc.setTextColor(light ? 255 : 20);
      text(value, x + w / 2, yy + h / 2 + 1.2, { align: 'center', baseline: 'middle' });
      doc.setTextColor(20);
    };
    const amount = (value: number | string, x: number, yy: number, w: number, h: number, fill?: readonly number[], light = false) => {
      rect(x, yy, w, h, fill);
      doc.setTextColor(light ? 255 : 20);
      text('$', x + 3, yy + h / 2 + 1.2, { baseline: 'middle' });
      text(money(value), x + w - 5, yy + h / 2 + 1.2, { align: 'right', baseline: 'middle' });
      doc.setTextColor(20);
    };
    const section = (title: string, h = 9) => {
      rect(left, y, tableW, h, BLUE);
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      center(title, left, y, tableW, h, true);
      y += h;
    };
    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - 10) return;
      doc.addPage();
      y = 12;
    };
    const summaryRow = (label: string, value: number, highlight = false) => {
      rect(left, y, 104, 5.8, highlight ? BLUE : undefined);
      amount(value, left + 104, y, 56, 5.8, highlight ? BLUE : LIGHT_GRAY, highlight);
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(highlight ? 255 : 20);
      text(label, left + 102, y + 4.2, { align: 'right' });
      doc.setTextColor(20);
      y += 5.8;
    };

    doc.setDrawColor(0);
    doc.setLineWidth(0.35);
    doc.setFont('times', 'bold');

    rect(left, y, tableW, 12, BLUE);
    doc.setFontSize(18);
    center('FARMACIAS SAN CUPERTINO', left, y, tableW, 12, true);
    y += 18;

    rect(left, y, 94, 12, GRAY);
    rect(left + 94, y, 29, 12, GRAY);
    rect(left + 123, y, 37, 12, GRAY);
    doc.setFontSize(11);
    center('REGISTRO DE CAJA', left, y, 94, 12);
    center('FECHA', left + 94, y, 29, 12);
    center(dateOnly(turnoData.fecha), left + 123, y, 37, 12);
    y += 18;

    rect(col[1], y, col[3] - col[1], 12, GRAY);
    rect(col[3], y, col[5] - col[3], 12, GRAY);
    doc.setFontSize(10.5);
    center('INICIO DE TURNO', col[1], y, col[3] - col[1], 12);
    center('FINAL DE TURNO', col[3], y, col[5] - col[3], 12);
    y += 12;

    ['MONEDAS/BILLETES', 'CANTIDAD', 'DINERO', 'CANTIDAD', 'DINERO'].forEach((label, i) => {
      rect(col[i], y, col[i + 1] - col[i], 6, i === 1 || i === 3 ? LIGHT_BLUE : undefined);
      doc.setFontSize(9.5);
      center(label, col[i], y, col[i + 1] - col[i], 6);
    });
    y += 6;

    const apertura = byDenominacion(turnoData.denominaciones_apertura);
    const cierre = byDenominacion(turnoData.denominaciones_cierre);

    DENOMINACIONES.forEach((valor) => {
      const key = valor.toFixed(2);
      const ini = apertura.get(key);
      const fin = cierre.get(key);
      rect(col[0], y, col[1] - col[0], 6);
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      text('$', col[0] + 3, y + 4.3);
      text(money(valor), col[1] - 2, y + 4.3, { align: 'right' });
      rect(col[1], y, col[2] - col[1], 6, LIGHT_BLUE);
      center(String(ini?.cantidad || ''), col[1], y, col[2] - col[1], 6);
      amount(ini?.monto || 0, col[2], y, col[3] - col[2], 6, LIGHT_GRAY);
      rect(col[3], y, col[4] - col[3], 6, LIGHT_BLUE);
      center(String(fin?.cantidad || ''), col[3], y, col[4] - col[3], 6);
      amount(fin?.monto || 0, col[4], y, col[5] - col[4], 6, LIGHT_GRAY);
      y += 6;
    });

    rect(left, y, 46, 6.5, BLUE);
    amount(turnoData.caja_inicial, left + 46, y, 58, 6.5, BLUE, true);
    amount(turnoData.caja_final, left + 104, y, 56, 6.5, BLUE, true);
    doc.setTextColor(255);
    doc.setFontSize(10.5);
    text('TOTAL EFECTIVO', left + 4, y + 4.7);
    doc.setTextColor(20);
    y += 12;

    section('RESUMEN DE RECAUDACION');
    summaryRow('TOTAL EN EFECTIVO', turnoData.total_efectivo);
    summaryRow('TOTAL EN TARJETA', turnoData.total_tarjeta || 0);
    summaryRow('TOTAL EN TRANSFERENCIA', turnoData.total_transferencia);
    summaryRow('TOTAL APPLE PAY', turnoData.total_apple_pay);
    summaryRow('TOTAL PAYPAL', turnoData.total_paypal);
    summaryRow('TOTAL WESTERN UNION', turnoData.total_western_union);
    summaryRow('RECAUDACION TOTAL DEL DIA', turnoData.recaudacion_total, true);
    y += 6;

    section('DETALLES DEL TURNO');
    summaryRow('CAJA INICIAL', turnoData.caja_inicial);
    rect(left, y, 104, 5.8);
    rect(left + 104, y, 28, 5.8);
    rect(left + 132, y, 28, 5.8);
    doc.setFontSize(9.5);
    text('HORARIO DEL TURNO', left + 102, y + 4.2, { align: 'right' });
    center(timeOnly(turnoData.hora_inicio), left + 104, y, 28, 5.8);
    center(timeOnly(turnoData.hora_cierre), left + 132, y, 28, 5.8);
    y += 5.8;
    summaryRow('INGRESOS POR VENTAS', turnoData.recaudacion_total);
    summaryRow('TOTAL', Number(turnoData.caja_inicial || 0) + Number(turnoData.recaudacion_total || 0));
    y += 6;

    rect(left, y, 104, 6.5, BLUE);
    rect(left + 104, y, 56, 6.5, BLUE);
    doc.setTextColor(255);
    doc.setFontSize(10.5);
    text('DIFERENCIA DE CAJA', left + 2, y + 4.8);
    text(diferenciaTexto(), left + 132, y + 4.8, { align: 'center' });
    doc.setTextColor(20);
    y += 18;

    ensureSpace(58);
    section('OBSERVACIONES/INCIDENTES', 6.5);
    rect(left, y, tableW, 15);
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(observaciones(), tableW - 4), left + 2, y + 4.5);
    y += 24;

    ensureSpace(34);
    section('NOMBRES Y FIRMAS', 6.5);
    const half = tableW / 2;
    rect(left, y, half, 22);
    rect(left + half, y, half, 22);
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    center('EMPLEADO', left, y, half, 5);
    center('SUPERVISORA', left + half, y, half, 5);
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    text('Nombre:', left + 4, y + 10);
    text(firmaNombre(turnoData.nombre_empleado), left + 20, y + 10);
    text('Nombre:', left + half + 4, y + 10);
    text(firmaNombre(turnoData.supervisor), left + half + 20, y + 10);
    line(left + 20, y + 18, left + half - 6, y + 18);
    line(left + half + 20, y + 18, left + tableW - 6, y + 18);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    text('Firma', left + half / 2, y + 21, { align: 'center' });
    text('Firma', left + half + half / 2, y + 21, { align: 'center' });

    doc.save(`Registro_Caja_${turnoData.id_turno}_${dateOnly(turnoData.fecha).replace(/\//g, '-')}.pdf`);
  };

  useEffect(() => {
    if (autoDownload && !downloadedRef.current) {
      downloadedRef.current = true;
      generarPDF();
    }
  }, [autoDownload]);

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      El documento de cierre se descargo automaticamente.
    </div>
  );
};

export default ReporteCaja;
