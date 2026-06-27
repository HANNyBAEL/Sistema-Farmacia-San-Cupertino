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
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
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
      console.error('Error al cargar recaudación:', error);
    } finally {
      setIsLoadingRecaudacion(false);
    }
  };

  const handleCantidadChange = (index: number, value: string) => {
    const cantidad = parseInt(value) || 0;
    const nuevasDenominaciones = [...denominaciones];
    nuevasDenominaciones[index] = {
      ...nuevasDenominaciones[index],
      cantidad,
      monto: cantidad * nuevasDenominaciones[index].valor,
    };
    setDenominaciones(nuevasDenominaciones);

    const total = nuevasDenominaciones.reduce((sum, d) => sum + d.monto, 0);
    setTotalFinal(total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const denominacionesData = denominaciones.map((d) => ({
        denominacion: d.valor,
        cantidad: d.cantidad,
      }));

      const response = await turnosService.cerrarTurno(
        turnoData.id_turno,
        denominacionesData,
        observaciones
      );

      // Obtener detalles completos del turno para el reporte
      const detallesTurno = await turnosService.obtenerDetallesTurno(turnoData.id_turno);
      setTurnoCerradoData(detallesTurno);
      setShowReport(true);
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      alert('Error al cerrar el turno. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
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
    const efectivoEsperado = turnoData.caja_inicial + recaudacion.total_efectivo;
    return totalFinal - efectivoEsperado;
  };

  const diferencia = calcularDiferencia();

  // Si ya se cerró el turno, mostrar el reporte
  if (showReport && turnoCerradoData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleReportClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Reporte de Caja
            </DialogTitle>
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Registro Final de Caja
          </DialogTitle>
          <DialogDescription>
            Registre la cantidad de monedas y billetes al finalizar el turno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Columna Izquierda: Conteo de Efectivo */}
            <Card>
              <CardHeader>
                <CardTitle>Conteo de Efectivo Final</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {denominaciones.map((denominacion, index) => (
                    <div key={denominacion.valor} className="space-y-2">
                      <Label htmlFor={`denom-${index}`}>
                        {denominacion.etiqueta}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`denom-${index}`}
                          type="number"
                          min="0"
                          value={denominacion.cantidad || ''}
                          onChange={(e) =>
                            handleCantidadChange(index, e.target.value)
                          }
                          placeholder="Cantidad"
                          className="flex-1"
                        />
                        <div className="flex items-center justify-center w-24 bg-gray-100 rounded px-2">
                          <span className="text-sm font-medium">
                            {formatCurrency(denominacion.monto)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">
                      Total Efectivo Final:
                    </span>
                    <span className="text-2xl font-bold text-green-700">
                      {formatCurrency(totalFinal)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Columna Derecha: Resumen */}
            <div className="space-y-4">
              {/* Resumen de Recaudación */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Recaudación</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRecaudacion ? (
                    <p className="text-gray-500">Cargando recaudación...</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total en Efectivo:</span>
                        <span className="font-semibold">
                          {formatCurrency(recaudacion.total_efectivo)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total en Transferencia:</span>
                        <span className="font-semibold">
                          {formatCurrency(recaudacion.total_transferencia)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Apple Pay:</span>
                        <span className="font-semibold">
                          {formatCurrency(recaudacion.total_apple_pay)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total PayPal:</span>
                        <span className="font-semibold">
                          {formatCurrency(recaudacion.total_paypal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Western Union:</span>
                        <span className="font-semibold">
                          {formatCurrency(recaudacion.total_western_union)}
                        </span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Recaudación Total:</span>
                          <span className="text-blue-700">
                            {formatCurrency(recaudacion.recaudacion_total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detalles del Turno */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalles del Turno</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Caja Inicial:</span>
                      <span className="font-semibold">
                        {formatCurrency(turnoData?.caja_inicial || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hora de Inicio:</span>
                      <span className="font-semibold">
                        {turnoData?.hora_inicio
                          ? new Date(
                              turnoData.hora_inicio
                            ).toLocaleTimeString('es-SV')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hora de Finalización:</span>
                      <span className="font-semibold">
                        {new Date().toLocaleTimeString('es-SV')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diferencia de Caja */}
              <Card>
                <CardHeader>
                  <CardTitle>Diferencia de Caja</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Efectivo Esperado:</span>
                      <span className="font-semibold">
                        {formatCurrency(
                          (turnoData?.caja_inicial || 0) +
                            recaudacion.total_efectivo
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efectivo Contado:</span>
                      <span className="font-semibold">
                        {formatCurrency(totalFinal)}
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div
                        className={`flex justify-between text-lg font-bold ${
                          diferencia > 0
                            ? 'text-green-700'
                            : diferencia < 0
                            ? 'text-red-700'
                            : 'text-gray-700'
                        }`}
                      >
                        <span>
                          {diferencia > 0
                            ? 'Sobrante de Caja'
                            : diferencia < 0
                            ? 'Faltante de Caja'
                            : 'Sin Diferencias'}
                          :
                        </span>
                        <span>{formatCurrency(Math.abs(diferencia))}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Observaciones */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Escriba cualquier observación relevante (ej: Error al entregar cambio, Cliente devolvió dinero, Billete deteriorado, etc.)"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Firmas */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Firmas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Empleado:</Label>
                  <p className="font-semibold mt-1">
                    {turnoData?.nombre_empleado || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label>Supervisor:</Label>
                  <p className="font-semibold mt-1">
                    Iliana Daniela Pineda Orellana
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isLoadingRecaudacion}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Procesando...' : 'Cerrar Caja e Imprimir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CierreCajaModal;
