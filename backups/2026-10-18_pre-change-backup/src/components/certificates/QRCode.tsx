import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface Props {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    QRCodeLib.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block' }} />;
}
