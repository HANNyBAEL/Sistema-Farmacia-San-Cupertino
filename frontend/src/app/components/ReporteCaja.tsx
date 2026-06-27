import React, { useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export const ReporteCaja: React.FC<ReporteCajaProps> = ({ turnoData, onClose }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return 'N/A';
    const date = new Date(dateTime);
    return date.toLocaleString('es-SV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-SV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const generarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FARMACIAS SAN CUPERTINO', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('REGISTRO DE CAJA', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(12);
    doc.text(`FECHA: ${formatDate(turnoData.fecha)}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Tabla de Inicio de Turno
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INICIO DE TURNO', 14, yPos);
    yPos += 5;

    const aperturaData = turnoData.denominaciones_apertura.map((den) => [
      formatCurrency(den.denominacion),
      den.cantidad.toString(),
      formatCurrency(den.monto),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['DENOMINACIÓN', 'CANTIDAD', 'DINERO']],
      body: aperturaData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;
    
    // Total efectivo inicial
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL EFECTIVO INICIAL: ${formatCurrency(turnoData.caja_inicial)}`, 14, yPos);
    yPos += 15;

    // Tabla de Final de Turno
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FINAL DE TURNO', 14, yPos);
    yPos += 5;

    const cierreData = turnoData.denominaciones_cierre.map((den) => [
      formatCurrency(den.denominacion),
      den.cantidad.toString(),
      formatCurrency(den.monto),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['DENOMINACIÓN', 'CANTIDAD', 'DINERO']],
      body: cierreData,
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;
    
    // Total efectivo final
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL EFECTIVO FINAL: ${formatCurrency(turnoData.caja_final)}`, 14, yPos);
    yPos += 15;

    // Resumen de Recaudación
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE RECAUDACIÓN', 14, yPos);
    yPos += 8;

    const recaudacionData = [
      ['Total en Efectivo', formatCurrency(turnoData.total_efectivo)],
      ['Total en Transferencia', formatCurrency(turnoData.total_transferencia)],
      ['Total Apple Pay', formatCurrency(turnoData.total_apple_pay)],
      ['Total PayPal', formatCurrency(turnoData.total_paypal)],
      ['Total Western Union', formatCurrency(turnoData.total_western_union)],
      ['', ''],
      ['RECAUDACIÓN TOTAL DEL DÍA', formatCurrency(turnoData.recaudacion_total)],
    ];

    autoTable(doc, {
      startY: yPos,
      body: recaudacionData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'normal', cellWidth: 80 },
        1: { fontStyle: 'bold', halign: 'right', cellWidth: 50 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Detalles del Turno
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES DEL TURNO', 14, yPos);
    yPos += 8;

    const detallesData = [
      ['Caja Inicial', formatCurrency(turnoData.caja_inicial)],
      ['Hora de Inicio', formatDateTime(turnoData.hora_inicio)],
      ['Hora de Finalización', formatDateTime(turnoData.hora_cierre)],
    ];

    autoTable(doc, {
      startY: yPos,
      body: detallesData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'normal', cellWidth: 60 },
        1: { fontStyle: 'bold', cellWidth: 80 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Diferencia de Caja
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DIFERENCIA DE CAJA', 14, yPos);
    yPos += 8;

    const efectivoEsperado = turnoData.caja_inicial + turnoData.total_efectivo;
    const diferenciaTexto =
      turnoData.diferencia_caja > 0
        ? 'SOBRANTE DE CAJA'
        : turnoData.diferencia_caja < 0
        ? 'FALTANTE DE CAJA'
        : 'SIN DIFERENCIAS';

    const diferenciaData = [
      ['Efectivo Esperado', formatCurrency(efectivoEsperado)],
      ['Efectivo Contado', formatCurrency(turnoData.caja_final)],
      ['', ''],
      [diferenciaTexto, formatCurrency(Math.abs(turnoData.diferencia_caja))],
    ];

    autoTable(doc, {
      startY: yPos,
      body: diferenciaData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'normal', cellWidth: 60 },
        1: { fontStyle: 'bold', halign: 'right', cellWidth: 80 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Observaciones
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES/INCIDENTES', 14, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const observaciones = turnoData.observaciones || 'Sin observaciones';
    const splitObservaciones = doc.splitTextToSize(observaciones, pageWidth - 28);
    doc.text(splitObservaciones, 14, yPos);
    yPos += splitObservaciones.length * 5 + 10;

    // Firmas
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMAS', 14, yPos);
    yPos += 15;

    // Firma Empleado
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA DEL EMPLEADO', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${turnoData.nombre_empleado}`, 14, yPos);
    yPos += 15;

    // Línea para firma
    doc.setDrawColor(0);
    doc.line(14, yPos, 80, yPos);
    yPos += 5;
    doc.text('Firma', 14, yPos);
    yPos += 20;

    // Firma Supervisor
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('FIRMA DEL SUPERVISOR', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${turnoData.supervisor || 'Iliana Daniela Pineda Orellana'}`, 14, yPos);
    yPos += 15;

    // Línea para firma
    doc.setDrawColor(0);
    doc.line(14, yPos, 80, yPos);
    yPos += 5;
    doc.text('Firma', 14, yPos);

    // Guardar PDF
    doc.save(`Registro_Caja_${turnoData.id_turno}_${turnoData.fecha}.pdf`);
  };

  const handlePrint = () => {
    generarPDF();
    if (onClose) onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Imprimir Reporte
        </button>
      </div>

      {/* Vista previa del reporte */}
      <div
        ref={reportRef}
        className="bg-white p-8 border-2 border-gray-300 max-w-4xl mx-auto"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">FARMACIAS SAN CUPERTINO</h1>
          <h2 className="text-xl font-semibold text-gray-700 mt-2">REGISTRO DE CAJA</h2>
          <p className="text-lg text-gray-600 mt-1">FECHA: {formatDate(turnoData.fecha)}</p>
        </div>

        {/* Inicio de Turno */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-700 mb-3 border-b-2 border-blue-300 pb-1">
            INICIO DE TURNO
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-100">
                <th className="border border-gray-300 px-4 py-2 text-left">DENOMINACIÓN</th>
                <th className="border border-gray-300 px-4 py-2 text-center">CANTIDAD</th>
                <th className="border border-gray-300 px-4 py-2 text-right">DINERO</th>
              </tr>
            </thead>
            <tbody>
              {turnoData.denominaciones_apertura.map((den, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{formatCurrency(den.denominacion)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{den.cantidad}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(den.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-right">
            <span className="text-lg font-bold text-blue-700">
              TOTAL EFECTIVO INICIAL: {formatCurrency(turnoData.caja_inicial)}
            </span>
          </div>
        </div>

        {/* Final de Turno */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-green-700 mb-3 border-b-2 border-green-300 pb-1">
            FINAL DE TURNO
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-green-100">
                <th className="border border-gray-300 px-4 py-2 text-left">DENOMINACIÓN</th>
                <th className="border border-gray-300 px-4 py-2 text-center">CANTIDAD</th>
                <th className="border border-gray-300 px-4 py-2 text-right">DINERO</th>
              </tr>
            </thead>
            <tbody>
              {turnoData.denominaciones_cierre.map((den, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{formatCurrency(den.denominacion)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{den.cantidad}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(den.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-right">
            <span className="text-lg font-bold text-green-700">
              TOTAL EFECTIVO FINAL: {formatCurrency(turnoData.caja_final)}
            </span>
          </div>
        </div>

        {/* Resumen de Recaudación */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-400 pb-1">
            RESUMEN DE RECAUDACIÓN
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total en Efectivo:</span>
              <span className="font-semibold">{formatCurrency(turnoData.total_efectivo)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total en Transferencia:</span>
              <span className="font-semibold">{formatCurrency(turnoData.total_transferencia)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Apple Pay:</span>
              <span className="font-semibold">{formatCurrency(turnoData.total_apple_pay)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total PayPal:</span>
              <span className="font-semibold">{formatCurrency(turnoData.total_paypal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Western Union:</span>
              <span className="font-semibold">{formatCurrency(turnoData.total_western_union)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>RECAUDACIÓN TOTAL DEL DÍA:</span>
                <span className="text-blue-700">{formatCurrency(turnoData.recaudacion_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detalles del Turno */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-400 pb-1">
            DETALLES DEL TURNO
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Caja Inicial:</span>
              <span className="font-semibold">{formatCurrency(turnoData.caja_inicial)}</span>
            </div>
            <div className="flex justify-between">
              <span>Hora de Inicio:</span>
              <span className="font-semibold">{formatDateTime(turnoData.hora_inicio)}</span>
            </div>
            <div className="flex justify-between">
              <span>Hora de Finalización:</span>
              <span className="font-semibold">{formatDateTime(turnoData.hora_cierre)}</span>
            </div>
          </div>
        </div>

        {/* Diferencia de Caja */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-400 pb-1">
            DIFERENCIA DE CAJA
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Efectivo Esperado:</span>
              <span className="font-semibold">
                {formatCurrency(turnoData.caja_inicial + turnoData.total_efectivo)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Efectivo Contado:</span>
              <span className="font-semibold">{formatCurrency(turnoData.caja_final)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div
                className={`flex justify-between text-lg font-bold ${
                  turnoData.diferencia_caja > 0
                    ? 'text-green-700'
                    : turnoData.diferencia_caja < 0
                    ? 'text-red-700'
                    : 'text-gray-700'
                }`}
              >
                <span>
                  {turnoData.diferencia_caja > 0
                    ? 'SOBRANTE DE CAJA'
                    : turnoData.diferencia_caja < 0
                    ? 'FALTANTE DE CAJA'
                    : 'SIN DIFERENCIAS'}
                  :
                </span>
                <span>{formatCurrency(Math.abs(turnoData.diferencia_caja))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-400 pb-1">
            OBSERVACIONES/INCIDENTES
          </h3>
          <p className="text-gray-700 min-h-[60px] p-2 bg-gray-50 border border-gray-300 rounded">
            {turnoData.observaciones || 'Sin observaciones'}
          </p>
        </div>

        {/* Firmas */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-400 pb-1">
            FIRMAS
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-semibold mb-1">FIRMA DEL EMPLEADO</p>
              <p className="text-gray-700 mb-2">Nombre: {turnoData.nombre_empleado}</p>
              <div className="border-b-2 border-gray-400 h-12"></div>
              <p className="text-sm text-gray-500 mt-1">Firma</p>
            </div>
            <div>
              <p className="font-semibold mb-1">FIRMA DEL SUPERVISOR</p>
              <p className="text-gray-700 mb-2">
                Nombre: {turnoData.supervisor || 'Iliana Daniela Pineda Orellana'}
              </p>
              <div className="border-b-2 border-gray-400 h-12"></div>
              <p className="text-sm text-gray-500 mt-1">Firma</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteCaja;
