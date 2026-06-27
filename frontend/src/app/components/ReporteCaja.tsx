import React from 'react';
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
  total_transferencia: number;
  total_apple_pay: number;
  total_paypal: number;
  total_western_union: number;
  recaudacion_total: number;
  diferencia_caja: number;
  observaciones: string;
  supervisor: string;
  denominaciones_apertura: Denominacion[];
  denominaciones_cierre: Denominacion[];
}

interface ReporteCajaProps {
  turnoData: TurnoData;
  onClose?: () => void;
}

const DENOMINACIONES = [0.01, 0.05, 0.10, 0.25, 0.50, 1, 2, 5, 10, 20, 50, 100];
const BLUE = [8, 43, 112] as const;
const GRAY = [221, 221, 221] as const;
const LIGHT_BLUE = [218, 229, 246] as const;

export const ReporteCaja: React.FC<ReporteCajaProps> = ({ turnoData, onClose }) => {
  const money = (amount: number | string) =>
    new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(Number(amount) || 0);

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

  const diferenciaLabel = () => {
    const diferencia = Number(turnoData.diferencia_caja) || 0;
    if (diferencia > 0) return `SOBRANTE: +${money(diferencia)}`;
    if (diferencia < 0) return `FALTANTE: -${money(Math.abs(diferencia))}`;
    return money(0);
  };

  const observaciones = () => {
    if (turnoData.observaciones?.trim()) return turnoData.observaciones;
    const diferencia = Number(turnoData.diferencia_caja) || 0;
    if (diferencia > 0) {
      return `El cajero decidio cerrar la caja con un sobrante de ${money(diferencia)}.`;
    }
    if (diferencia < 0) {
      return `El cajero decidio cerrar la caja con un faltante de ${money(Math.abs(diferencia))}.`;
    }
    return '';
  };

  const generarPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const left = 8;
    const top = 10;
    const tableW = 126;
    const col = [left, left + 40, left + 62, left + 84, left + 106, left + tableW];
    let y = top;

    const rect = (x: number, yy: number, w: number, h: number, fill?: readonly number[]) => {
      if (fill) {
        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.rect(x, yy, w, h, 'FD');
      } else {
        doc.rect(x, yy, w, h);
      }
    };
    const text = (value: string, x: number, yy: number, options?: any) => doc.text(value, x, yy, options);
    const center = (value: string, x: number, yy: number, w: number, h: number, color: 'dark' | 'light' = 'dark') => {
      doc.setTextColor(color === 'light' ? 255 : 20);
      text(value, x + w / 2, yy + h / 2 + 1.4, { align: 'center', baseline: 'middle' });
      doc.setTextColor(20);
    };
    const section = (title: string, height = 10) => {
      rect(left, y, tableW, height, BLUE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      center(title, left, y, tableW, height, 'light');
      y += height;
    };
    const row = (label: string, value: string, highlight = false) => {
      rect(left, y, 84, 5.4);
      rect(left + 84, y, 42, 5.4, highlight ? BLUE : undefined);
      doc.setFont('helvetica', highlight ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(highlight ? 255 : 20);
      text(label, left + 82, y + 3.9, { align: 'right' });
      text(value, left + 105, y + 3.9, { align: 'center' });
      doc.setTextColor(20);
      y += 5.4;
    };

    doc.setDrawColor(0);
    doc.setLineWidth(0.25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    rect(left, y, tableW, 11, BLUE);
    doc.setFontSize(15);
    center('FARMACIAS SAN CUPERTINO', left, y, tableW, 11, 'light');
    y += 16;

    rect(left, y, 77, 10, GRAY);
    rect(left + 77, y, 22, 10, GRAY);
    rect(left + 99, y, 27, 10, GRAY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    center('REGISTRO DE CAJA', left, y, 77, 10);
    center('FECHA', left + 77, y, 22, 10);
    center(dateOnly(turnoData.fecha), left + 99, y, 27, 10);
    y += 16;

    rect(col[1], y, 44, 10, GRAY);
    rect(col[3], y, 42, 10, GRAY);
    doc.setFontSize(8);
    center('INICIO DE TURNO', col[1], y, 44, 10);
    center('FINAL DE TURNO', col[3], y, 42, 10);
    y += 10;

    const headerY = y;
    ['MONEDAS/BILLETES', 'CANTIDAD', 'DINERO', 'CANTIDAD', 'DINERO'].forEach((label, i) => {
      rect(col[i], headerY, col[i + 1] - col[i], 5.2, i === 0 ? undefined : GRAY);
      center(label, col[i], headerY, col[i + 1] - col[i], 5.2);
    });
    y += 5.2;

    const apertura = byDenominacion(turnoData.denominaciones_apertura);
    const cierre = byDenominacion(turnoData.denominaciones_cierre);
    doc.setFontSize(8);

    DENOMINACIONES.forEach((valor) => {
      const key = valor.toFixed(2);
      const ini = apertura.get(key);
      const fin = cierre.get(key);
      const values = [
        money(valor),
        String(ini?.cantidad ?? 0),
        money(ini?.monto ?? 0),
        String(fin?.cantidad ?? 0),
        money(fin?.monto ?? 0),
      ];
      values.forEach((value, i) => {
        rect(col[i], y, col[i + 1] - col[i], 5.2, i === 1 || i === 3 ? LIGHT_BLUE : undefined);
        const align = i === 0 ? 'left' : 'center';
        text(value, i === 0 ? col[i] + 1.5 : col[i] + (col[i + 1] - col[i]) / 2, y + 3.8, { align });
      });
      y += 5.2;
    });

    rect(left, y, 40, 5.6, BLUE);
    rect(left + 40, y, 44, 5.6, BLUE);
    rect(left + 84, y, 42, 5.6, BLUE);
    doc.setFont('helvetica', 'bold');
    center('TOTAL EFECTIVO', left, y, 40, 5.6, 'light');
    center(money(turnoData.caja_inicial), left + 40, y, 44, 5.6, 'light');
    center(money(turnoData.caja_final), left + 84, y, 42, 5.6, 'light');
    y += 11;

    section('RESUMEN DE RECAUDACION');
    row('TOTAL EN EFECTIVO', money(turnoData.total_efectivo));
    row('TOTAL EN TRANSFERENCIA', money(turnoData.total_transferencia));
    row('TOTAL APPLE PAY', money(turnoData.total_apple_pay));
    row('TOTAL PAYPAL', money(turnoData.total_paypal));
    row('TOTAL WESTERN UNION', money(turnoData.total_western_union));
    row('RECAUDACION TOTAL DEL DIA', money(turnoData.recaudacion_total), true);
    y += 5;

    section('DETALLES DEL TURNO');
    row('CAJA INICIAL', money(turnoData.caja_inicial));
    row('HORARIO DEL TURNO', `${timeOnly(turnoData.hora_inicio)}  ${timeOnly(turnoData.hora_cierre)}`);
    y += 5;

    section('DIFERENCIA DE CAJA');
    row('', diferenciaLabel(), true);
    y += 5;

    section('OBSERVACIONES/INCIDENTES', 6);
    rect(left, y, tableW, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(observaciones(), tableW - 4), left + 2, y + 5);
    y += 31;

    doc.setFontSize(8.5);
    const sigY = y + 9;
    doc.line(left + 8, sigY, left + 50, sigY);
    doc.line(left + 72, sigY, left + 116, sigY);
    text('FIRMA DEL EMPLEADO', left + 29, sigY + 5, { align: 'center' });
    text(turnoData.nombre_empleado || 'NOMBRE Y APELLIDO', left + 29, sigY + 10, { align: 'center' });
    text('FIRMA DEL SUPERVISOR', left + 94, sigY + 5, { align: 'center' });
    text(turnoData.supervisor || 'NOMBRE Y APELLIDO', left + 94, sigY + 10, { align: 'center' });

    doc.save(`Registro_Caja_${turnoData.id_turno}_${dateOnly(turnoData.fecha).replace(/\//g, '-')}.pdf`);
  };

  const handlePrint = () => {
    generarPDF();
    onClose?.();
  };

  const diferencia = Number(turnoData.diferencia_caja) || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
        >
          Imprimir Reporte
        </button>
      </div>

      <div className="mx-auto w-full max-w-[720px] bg-white p-6 text-black shadow-sm border" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="bg-[#082b70] text-white text-center text-2xl py-2">FARMACIAS SAN CUPERTINO</div>
        <div className="grid grid-cols-[1fr_110px_140px] mt-5 border border-black text-sm">
          <div className="bg-gray-200 text-center py-2 border-r border-black">REGISTRO DE CAJA</div>
          <div className="bg-gray-200 text-center py-2 border-r border-black">FECHA</div>
          <div className="bg-gray-200 text-center py-2">{dateOnly(turnoData.fecha)}</div>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th></th>
              <th colSpan={2} className="border border-black bg-gray-200 py-2">INICIO DE TURNO</th>
              <th colSpan={2} className="border border-black bg-gray-200 py-2">FINAL DE TURNO</th>
            </tr>
            <tr>
              <th className="border border-black">MONEDAS/BILLETES</th>
              <th className="border border-black">CANTIDAD</th>
              <th className="border border-black">DINERO</th>
              <th className="border border-black">CANTIDAD</th>
              <th className="border border-black">DINERO</th>
            </tr>
          </thead>
          <tbody>
            {DENOMINACIONES.map((valor) => {
              const apertura = byDenominacion(turnoData.denominaciones_apertura).get(valor.toFixed(2));
              const cierre = byDenominacion(turnoData.denominaciones_cierre).get(valor.toFixed(2));
              return (
                <tr key={valor}>
                  <td className="border border-black px-2">{money(valor)}</td>
                  <td className="border border-black bg-blue-50 text-center">{apertura?.cantidad ?? 0}</td>
                  <td className="border border-black text-center">{money(apertura?.monto ?? 0)}</td>
                  <td className="border border-black bg-blue-50 text-center">{cierre?.cantidad ?? 0}</td>
                  <td className="border border-black text-center">{money(cierre?.monto ?? 0)}</td>
                </tr>
              );
            })}
            <tr className="bg-[#082b70] text-white font-bold">
              <td className="border border-black px-2">TOTAL EFECTIVO</td>
              <td colSpan={2} className="border border-black text-center">{money(turnoData.caja_inicial)}</td>
              <td colSpan={2} className="border border-black text-center">{money(turnoData.caja_final)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 bg-[#082b70] text-white text-center font-bold py-2">RESUMEN DE RECAUDACION</div>
        <div className="border border-black text-sm">
          {[
            ['TOTAL EN EFECTIVO', money(turnoData.total_efectivo)],
            ['TOTAL EN TRANSFERENCIA', money(turnoData.total_transferencia)],
            ['TOTAL APPLE PAY', money(turnoData.total_apple_pay)],
            ['TOTAL PAYPAL', money(turnoData.total_paypal)],
            ['TOTAL WESTERN UNION', money(turnoData.total_western_union)],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[1fr_160px] border-b border-black">
              <div className="text-right px-2">{label}</div>
              <div className="text-center border-l border-black">{value}</div>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_160px] bg-[#082b70] text-white font-bold">
            <div className="text-right px-2">RECAUDACION TOTAL DEL DIA</div>
            <div className="text-center border-l border-black">{money(turnoData.recaudacion_total)}</div>
          </div>
        </div>

        <div className="mt-5 bg-[#082b70] text-white text-center font-bold py-2">DIFERENCIA DE CAJA</div>
        <div className={`border border-black text-center font-bold py-2 ${diferencia < 0 ? 'text-red-700' : diferencia > 0 ? 'text-green-700' : ''}`}>
          {diferenciaLabel()}
        </div>
      </div>
    </div>
  );
};

export default ReporteCaja;
