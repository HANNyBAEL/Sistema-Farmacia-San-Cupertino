import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera } from 'lucide-react';

interface Props {
  onDetected: (codigo: string) => void;
  onClose: () => void;
}

const EscanerCodigoBarras = ({ onDetected, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState("");
  const [escaneando, setEscaneando] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.listVideoInputDevices().then(devices => {
      if (devices.length === 0) {
        setError("No se encontró ninguna cámara.");
        return;
      }
      const deviceId = devices[devices.length - 1].deviceId; // preferir cámara trasera
      setEscaneando(true);
      reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
        if (result) {
          onDetected(result.getText());
          reader.reset();
        }
        if (err && !(err instanceof NotFoundException)) {
          console.error(err);
        }
      });
    }).catch(() => {
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    });

    return () => {
      readerRef.current?.reset();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-[#0a4b7a]"/>
            <h2 className="font-semibold text-[#1e1e1e] text-sm">Escanear código de barras</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="relative bg-black">
          <video ref={videoRef} className="w-full" style={{ height: 280, objectFit: 'cover' }} />
          {/* Guía visual */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-[#0a4b7a] rounded-lg w-56 h-28 opacity-70"/>
          </div>
          {escaneando && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">Apunta al código de barras</span>
            </div>
          )}
        </div>
        {error && (
          <div className="px-4 py-3 text-sm text-red-600 bg-red-50 flex items-center gap-2">
            <X size={14}/>{error}
          </div>
        )}
        <div className="px-4 py-3">
          <button onClick={onClose} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default EscanerCodigoBarras;