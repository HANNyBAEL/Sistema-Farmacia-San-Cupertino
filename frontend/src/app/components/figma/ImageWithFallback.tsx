import React, { useState } from 'react';

// SVG de respaldo (imagen por defecto cuando la original falla)
const ERROR_IMG_SRC = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4K';

function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  // Estado para saber si la imagen original falló
  const [didError, setDidError] = useState(false);

  // Función que se ejecuta cuando la imagen no se puede cargar
  const handleError = () => {
    setDidError(true);
  };

  // Extraemos las props que nos interesan
  const { src, alt, style, className, ...rest } = props;

  // Si hubo error, mostramos la imagen de respaldo
  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={ERROR_IMG_SRC}
            alt="Error loading image"
            {...rest}
            data-original-url={src}
          />
        </div>
      </div>
    );
  }

  // Si no hubo error, mostramos la imagen original
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}  // Si falla, se ejecuta handleError
    />
  );
}

// Exportación por defecto (importante para que funcione con import ImageWithFallback from ...)
export default ImageWithFallback;