// pixel-painter.js: the only place that touches the canvas 2D API. Everything draws in logical
// pixels; the painter scales them so sprites stay crisp (image-rendering: pixelated in CSS).

/**
 * @typedef {object} Painter
 * @property {(x: number, y: number, w: number, h: number, color: string) => void} rect
 * @property {(x: number, y: number, color: string) => void} dot
 * @property {(x: number, y: number, rows: string[], palette: Record<string, string>) => void} map
 * @property {(x: number, y: number, w: number, h: number, color: string, every?: number) => void} halftone
 * @property {number} scale
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} scale logical pixel size in canvas pixels
 * @returns {Painter}
 */
export function createPainter(ctx, scale) {
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x * scale), Math.round(y * scale), Math.round(w * scale), Math.round(h * scale));
  };
  return {
    scale,
    rect,
    dot: (x, y, color) => rect(x, y, 1, 1, color),
    map: (x, y, rows, palette) => paintMap(rect, x, y, rows, palette),
    halftone: (x, y, w, h, color, every = 3) => paintHalftone(rect, x, y, w, h, color, every),
  };
}

/**
 * Paint a string pixel map: each char is a palette key, "." is transparent.
 * @param {Painter["rect"]} rect
 * @param {number} x
 * @param {number} y
 * @param {string[]} rows
 * @param {Record<string, string>} palette
 */
function paintMap(rect, x, y, rows, palette) {
  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      const color = palette[row[column]];
      if (color) rect(x + column, y + rowIndex, 1, 1, color);
    }
  });
}

/**
 * Screentone dots, the manga shading trick.
 * @param {Painter["rect"]} rect
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} color
 * @param {number} every
 */
function paintHalftone(rect, x, y, w, h, color, every) {
  for (let row = 0; row < h; row += every) {
    const offset = (row / every) % 2 === 0 ? 0 : Math.floor(every / 2);
    for (let column = offset; column < w; column += every) rect(x + column, y + row, 1, 1, color);
  }
}

/**
 * Mirror a pixel map horizontally (enemies face left, the hero faces right).
 * @param {string[]} rows
 * @returns {string[]}
 */
export function mirrorMap(rows) {
  return rows.map((row) => [...row].reverse().join(""));
}
