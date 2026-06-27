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
import { turnosService } from '../../services/turnos';

interface Denominacion {
  valor: number;
  etiqueta: string;
  cantidad: number;
  monto: number;
}

interface AperturaCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (turnoData: any) => void;
}

export const AperturaCajaModal: React.FC<AperturaCajaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [denominaciones, setDenominaciones] = useState<Denominacion[]>([]);
  const [totalInicial, setTotalInicial] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const denoms = turnosService.getDenominaciones().map((d) => ({
        valor: d.valor,
        etiqueta: d.etiqueta,
        cantidad: 0,
        monto: 0,
      }));
      setDenominaciones(denoms);
      setTotalInicial(0);
      setError('');
    }
  }, [isOpen]);

  const handleCantidadChange = (index: number, value: string) => {
    const cantidad = Math.max(0, parseInt(value, 10) || 0);
    const nuevasDenominaciones = [...denominaciones];
    nuevasDenominaciones[index] = {
      ...nuevasDenominaciones[index],
      cantidad,
      monto: Math.round(cantidad * nuevasDenominaciones[index].valor * 100) / 100,
    };
    setDenominaciones(nuevasDenominaciones);
    setTotalInicial(nuevasDenominaciones.reduce((sum, d) => sum + d.monto, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const denominacionesData = denominaciones.map((d) => ({
        denominacion: d.valor,
        cantidad: d.cantidad,
      }));

      const response = await turnosService.abrirTurno(denominacionesData);
      onSuccess(response);
      onClose();
    } catch (error) {
      console.error('Error al abrir turno:', error);
      const mensaje =
        (error as any)?.response?.data?.error ||
        'Error al abrir el turno. Por favor, intente nuevamente.';
      setError(mensaje);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="border-b bg-slate-50 px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-slate-950">
            Apertura de caja
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Ingrese el conteo fisico recibido para iniciar el turno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(92vh-96px)] flex-col">
          <div className="overflow-y-auto px-6 py-5">
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-1/3 px-4 py-3 text-left font-semibold">Denominacion</th>
                    <th className="w-1/3 px-4 py-3 text-center font-semibold">Cantidad</th>
                    <th className="w-1/3 px-4 py-3 text-right font-semibold">Total</th>
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
                          id={`denom-apertura-${index}`}
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

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="border-t bg-white px-6 py-4">
            <div className="mb-4 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
              <span className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                Total efectivo recibido
              </span>
              <span className="text-2xl font-bold tabular-nums text-blue-900">
                {formatCurrency(totalInicial)}
              </span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || totalInicial === 0}>
                {isLoading ? 'Procesando...' : 'Abrir caja'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AperturaCajaModal;
