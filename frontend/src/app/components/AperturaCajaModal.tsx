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
    }
  }, [isOpen]);

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
    setTotalInicial(total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      alert('Error al abrir el turno. Por favor, intente nuevamente.');
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Registro de Caja Inicial
          </DialogTitle>
          <DialogDescription>
            Registre la cantidad de monedas y billetes recibidos como caja chica.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Conteo de Efectivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">
                    Total Efectivo Inicial:
                  </span>
                  <span className="text-2xl font-bold text-blue-700">
                    {formatCurrency(totalInicial)}
                  </span>
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
              disabled={isLoading || totalInicial === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Procesando...' : 'Abrir Caja'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AperturaCajaModal;
