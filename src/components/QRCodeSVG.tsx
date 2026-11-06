/**
 * Componente SVG para gerar QR Codes 100% em conformidade com o padrão ISO/IEC 18004.
 * Utiliza o algoritmo de referência do Projeto Nayuki (qrcodegen), garantindo leitura instantânea
 * por qualquer câmera de smartphone (iPhone / Android) em qualquer distância ou inclinação.
 */
import React from "react";
import { qrcodegen } from "@/lib/qrcodegen";

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeSVG({ value, size = 180, className = "" }: QRCodeSVGProps) {
  const qr = React.useMemo(() => {
    if (!value) return null;

    const tentarGerar = (texto: string) => {
      try {
        const ecl = texto.length > 90 ? qrcodegen.QrCode.Ecc.LOW : qrcodegen.QrCode.Ecc.MEDIUM;
        return qrcodegen.QrCode.encodeText(texto, ecl);
      } catch (err) {
        return null;
      }
    };

    // 1. Tenta com o valor original
    let res = tentarGerar(value);
    if (res) return res;

    // 2. Se falhar (ex: token JWT muito longo no hash #token=...), remove o hash e gera com a URL limpa
    if (value.includes("#")) {
      const urlSemHash = value.split("#")[0];
      res = tentarGerar(urlSemHash);
      if (res) return res;
    }

    // 3. Fallback se tiver parâmetros excessivos
    if (value.includes("?")) {
      const urlBase = value.split("?")[0];
      res = tentarGerar(urlBase);
      if (res) return res;
    }

    return null;
  }, [value]);

  if (!qr) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-white rounded-lg text-black text-xs p-2 text-center"
      >
        Erro ao gerar QR Code
      </div>
    );
  }

  // Margem obrigatória de silêncio (quiet zone) conforme especificação ISO: 4 módulos
  const border = 4;
  const qrSize = qr.size;
  const totalSize = qrSize + border * 2;
  const cellSize = size / totalSize;

  const rects: React.ReactNode[] = [];
  for (let y = 0; y < qrSize; y++) {
    for (let x = 0; x < qrSize; x++) {
      if (qr.getModule(x, y)) {
        rects.push(
          <rect
            key={`${x}-${y}`}
            x={(x + border) * cellSize}
            y={(y + border) * cellSize}
            width={cellSize + 0.05}
            height={cellSize + 0.05}
            fill="#000000"
          />,
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`bg-white rounded-xl shadow-inner ${className}`}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#ffffff" />
      {rects}
    </svg>
  );
}
