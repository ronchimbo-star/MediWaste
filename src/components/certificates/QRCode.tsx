import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const modules = generateQRMatrix(value);
    const moduleCount = modules.length;
    const cellSize = size / moduleCount;

    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'black';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules[row][col]) {
          ctx.fillRect(
            Math.floor(col * cellSize),
            Math.floor(row * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block' }} />;
}

function generateQRMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

  drawFinderPattern(matrix, 0, 0);
  drawFinderPattern(matrix, 0, size - 7);
  drawFinderPattern(matrix, size - 7, 0);

  for (let i = 0; i < size; i++) {
    if (!isReserved(matrix, 6, i)) {
      matrix[6][i] = i % 2 === 0;
    }
    if (!isReserved(matrix, i, 6)) {
      matrix[i][6] = i % 2 === 0;
    }
  }

  const data = encodeText(text);
  let bitIndex = 0;
  let goingUp = true;
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = goingUp ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const actualCol = col - c;
        if (!isUsed(matrix, row, actualCol)) {
          const bit = bitIndex < data.length ? data[bitIndex] : false;
          matrix[row][actualCol] = bit;
          bitIndex++;
        }
      }
    }
    goingUp = !goingUp;
    col -= 2;
  }

  return matrix;
}

function drawFinderPattern(matrix: boolean[][], row: number, col: number) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = row + r;
      const mc = col + c;
      if (mr >= 0 && mr < matrix.length && mc >= 0 && mc < matrix[0].length) {
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          matrix[mr][mc] = false;
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          matrix[mr][mc] = true;
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          matrix[mr][mc] = true;
        } else {
          matrix[mr][mc] = false;
        }
      }
    }
  }
}

function isReserved(matrix: boolean[][], row: number, col: number): boolean {
  return matrix[row][col] !== false;
}

function isUsed(matrix: boolean[][], row: number, col: number): boolean {
  const size = matrix.length;
  if (row < 8 && col < 8) return true;
  if (row < 8 && col >= size - 8) return true;
  if (row >= size - 8 && col < 8) return true;
  if (row === 6 || col === 6) return true;
  return false;
}

function encodeText(text: string): boolean[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xFF);
  }

  const bits: boolean[] = [];

  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push(((val >> i) & 1) === 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  bytes.forEach(b => pushBits(b, 8));
  pushBits(0b0000, 4);

  while (bits.length % 8 !== 0) bits.push(false);

  const padBytes = [0b11101100, 0b00010001];
  let padIdx = 0;
  while (bits.length < 400) {
    const pb = padBytes[padIdx % 2];
    pushBits(pb, 8);
    padIdx++;
  }

  return bits;
}
