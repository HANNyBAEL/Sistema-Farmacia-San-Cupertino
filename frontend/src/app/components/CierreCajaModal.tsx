import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { turnosService } from '../../services/turnos';
import { ReporteCaja } from './ReporteCaja';

interface Denominacion {
  valor: number;
  etiqueta: string;
  cantidad: number;
  monto: number;
}

interface Recaudacion {
  total_efectivo: number;
  total_transferencia: number;
  total_apple_pay: number;
  total_paypal: number;
  total_western_union: number;
  recaudacion_total: number;
}

interface CierreCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (turnoData: any) => void;
  turnoData: any;
}

export const CierreCajaModal: React.FC<CierreCajaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  turnoData,
}) => {
  const [denominaciones, setDenominaciones] = useState<Denominacion[]>([]);
  const [totalFinal, setTotalFinal] = useState(0);
  const [recaudacion, setRecaudacion] = useState<Recaudacion>({
    total_efectivo: 0,
    total_transferencia: 0,
    total_apple_pay: 0,
    total_paypal: 0,
    total_western_union: 0,
    recaudacion_total: 0,
  });
  const [observaciones, setObservaciones] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecaudacion, setIsLoadingRecaudacion] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDiferenciaDialog, setShowDiferenciaDialog] = useState(false);
  const [aceptarDiferencia, setAceptarDiferencia] = useState(false);
  const [turnoCerradoData, setTurnoCerradoData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && turnoData) {
      const denoms = turnosService.getDenominaciones().map((d) => ({
        valor: d.valor,
        etiqueta: d.etiqueta,
        cantidad: 0,
        monto: 0,
      }));
      setDenominaciones(denoms);
      setTotalFinal(0);
      setObservaciones('');
      setAceptarDiferencia(false);
      setShowDiferenciaDialog(false);
      cargarRecaudacion();
    }
  }, [isOpen, turnoData]);

  const cargarRecaudacion = async () => {
    if (!turnoData?.id_turno) return;

    setIsLoadingRecaudacion(true);
    try {
      const data = await turnosService.obtenerRecaudacion(turnoData.id_turno);
      setRecaudacion(data);
    } catch (error) {
      console.error('Error al cargar recaudacion:', error);
    } finally {
      setIsLoadingRecaudacion(false);
    }
  };

  const handleCantidadChange = (index: number, value: string) => {
    const cantidad = Math.max(0, parseInt(value, 10) || 0);
    const nuevasDenominaciones = [...denominaciones];
    nuevasDenominaciones[index] = {
      ...nuevasDenominaciones[index],
      cantidad,
      monto: Math.round(cantidad * nuevasDenominaciones[index].valor * 100) / 100,
    };
    setDenominaciones(nuevasDenominaciones);
    setTotalFinal(nuevasDenominaciones.reduce((sum, d) => sum + d.monto, 0));
  };

  const cerrarTurno = async (observacionesFinales: string) => {
    setIsLoading(true);

    try {
      const denominacionesData = denominaciones.map((d) => ({
        denominacion: d.valor,
        cantidad: d.cantidad,
      }));

      await turnosService.cerrarTurno(turnoData.id_turno, denominacionesData, observacionesFinales);
      const detallesTurno = await turnosService.obtenerDetallesTurno(turnoData.id_turno);
      setTurnoCerradoData(detallesTurno);
      setShowReport(true);
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      const mensaje =
        (error as any)?.response?.data?.error ||
        'Error al cerrar el turno. Por favor, intente nuevamente.';
      alert(mensaje);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Math.abs(diferencia) >= 0.01 && !aceptarDiferencia) {
      setShowDiferenciaDialog(true);
      return;
    }

    await cerrarTurno(prepararObservaciones());
  };

  const prepararObservaciones = () => {
    const diferenciaActual = calcularDiferencia();
    if (Math.abs(diferenciaActual) < 0.01) return observaciones;

    const tipo = diferenciaActual < 0 ? 'faltante' : 'sobrante';
    const textoAutomatico = `El cajero decidio cerrar la caja con un ${tipo} de ${formatCurrency(Math.abs(diferenciaActual))}.`;
    return [observaciones.trim(), textoAutomatico].filter(Boolean).join('\n');
  };

  const handleImprimirAsi = async () => {
    setAceptarDiferencia(true);
    setShowDiferenciaDialog(false);
    await cerrarTurno(prepararObservaciones());
  };

  const handleReportClose = () => {
    setShowReport(false);
    onSuccess(turnoCerradoData);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calcularDiferencia = () => {
    const efectivoEsperado = (Number(turnoData?.caja_inicial) || 0) + recaudacion.total_efectivo;
    return Math.round((totalFinal - efectivoEsperado) * 100) / 100;
  };

  const efectivoEsperado = (Number(turnoData?.caja_inicial) || 0) + recaudacion.total_efectivo;
  const diferencia = calcularDiferencia();
  const diferenciaClass =
    diferencia > 0 ? 'text-emerald-700' : diferencia < 0 ? 'text-red-700' : 'text-slate-700';

  if (showReport && turnoCerradoData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleReportClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Reporte de Caja</DialogTitle>
            <DialogDescription>
              El turno ha sido cerrado exitosamente. Puede imprimir el reporte.
            </DialogDescription>
          </DialogHeader>
          <ReporteCaja turnoData={turnoCerradoData} onClose={handleReportClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="border-b bg-slate-50 px-6 py-5">
            <DialogTitle className="text-xl font-semibold text-slate-950">
              Cierre de caja
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Ingrese el conteo fisico final y revise la diferencia antes de cerrar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex max-h-[calc(92vh-96px)] flex-col">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1.1fr)_360px]">
              <div className="px-6 py-5">
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Denominacion</th>
                        <th className="px-4 py-3 text-center font-semibold">Cantidad</th>
                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {denominaciones.map((denominacion, index) => (
                        <tr key={denominacion.valor} className="border-t border-slate-200">
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            {denominacion.etiqueta}
                          </td>
                          <td className="px-4 py-2.5">
                            <Input
                              id={`denom-cierre-${index}`}
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={denominacion.cantidad || ''}
                              onChange={(e) => handleCantidadChange(index, e.target.value)}
                              placeholder="0"
                              className="mx-auto h-9 w-28 text-center"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                            {formatCurrency(denominacion.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="border-t bg-white px-6 py-5 lg:border-l lg:border-t-0">
                <div className="space-y-4">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                      Total efectivo contado
                    </div>
                    <div className="mt-1 text-3xl font-bold tabular-nums text-emerald-900">
                      {formatCurrency(totalFinal)}
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200">
                    <div className="border-b bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
                      Resumen del turno
                    </div>
                    <div className="divide-y text-sm">
                      <SummaryRow label="Caja inicial" value={formatCurrency(turnoData?.caja_inicial || 0)} />
                      <SummaryRow label="Ventas efectivo" value={formatCurrency(recaudacion.total_efectivo)} />
                      <SummaryRow label="Transferencia" value={formatCurrency(recaudacion.total_transferencia)} />
                      <SummaryRow label="Apple Pay" value={formatCurrency(recaudacion.total_apple_pay)} />
                      <SummaryRow label="PayPal" value={formatCurrency(recaudacion.total_paypal)} />
                      <SummaryRow label="Western Union" value={formatCurrency(recaudacion.total_western_union)} />
                      <SummaryRow label="Recaudacion total" value={isLoadingRecaudacion ? 'Cargando...' : formatCurrency(recaudacion.recaudacion_total)} strong />
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200">
                    <div className="border-b bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
                      Diferencia de caja
                    </div>
                    <div className="space-y-2 px-4 py-3 text-sm">
                      <SummaryRow label="Caja esperada" value={formatCurrency(efectivoEsperado)} />
                      <SummaryRow label="Caja contada" value={formatCurrency(totalFinal)} />
                      <div className={`flex items-center justify-between border-t pt-2 text-base font-bold ${diferenciaClass}`}>
                        <span>{diferencia > 0 ? 'Sobrante' : diferencia < 0 ? 'Faltante' : 'Sin diferencias'}</span>
                        <span className="tabular-nums">{formatCurrency(Math.abs(diferencia))}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900" htmlFor="observaciones-cierre">
                      Observaciones
                    </label>
                    <Textarea
                      id="observaciones-cierre"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Detalle cualquier incidente o aclaracion del cierre."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
              </aside>
            </div>

            <div className="border-t bg-white px-6 py-4">
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || isLoadingRecaudacion}>
                  {isLoading ? 'Procesando...' : 'Cerrar caja e imprimir'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiferenciaDialog} onOpenChange={setShowDiferenciaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se detecto una diferencia de caja.</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>Revise el conteo antes de cerrar el turno.</p>
                <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                  <SummaryRow label="Caja esperada" value={formatCurrency(efectivoEsperado)} />
                  <SummaryRow label="Caja contada" value={formatCurrency(totalFinal)} />
                  <div className="flex justify-between border-t pt-2">
                    <span>Diferencia:</span>
                    <strong className={diferenciaClass}>
                      {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
                    </strong>
                  </div>
                </div>
                <p>Desea volver a contar el dinero o cerrar la caja con esta diferencia?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiferenciaDialog(false)}>
              Volver a contar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleImprimirAsi}>
              Imprimir asi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2 ${strong ? 'font-bold text-slate-950' : 'text-slate-700'}`}>
      <span>{label}</span>
      <span className="text-right tabular-nums text-slate-950">{value}</span>
    </div>
  );
}

export default CierreCajaModal;
