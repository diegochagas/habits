// stage-maps.js: one RPG Maker style tile map per Arca, written as ASCII so the layout is readable.
// Legend: "." floor/grass, "," path, "~" water, "T" tree, "t" bush, "#" wall, "R" roof, "D" door,
// "H" bookshelf, "o" table, "M" monitor, "S" hero start, "1".."3" minions, "B" boss.
// Each minion stands in the only gap of a barrier, so the Arca is fought in order.

export const TILE = 16;
export const SCREEN_W = 320;
export const SCREEN_H = 240;
const WALKABLE = new Set([".", ",", "S", "1", "2", "3", "B"]);
const SPAWN_INDEX = { 1: 0, 2: 1, 3: 2, B: 3 };

/**
 * @typedef {object} StageMap
 * @property {number} width tiles
 * @property {number} height tiles
 * @property {string[]} rows ASCII rows
 * @property {{ tx: number, ty: number }} start
 * @property {{ index: number, tx: number, ty: number }[]} spawns encounter index → tile
 * @property {boolean} outdoor grass floor instead of tiles
 */

/** @type {Record<string, { outdoor: boolean, rows: string[] }>} */
export const STAGE_LAYOUTS = {
  academia: {
    outdoor: true,
    rows: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "T.........T........~~~.......T.RRRRRRR.T",
      "T..RRRR...T........~~~.......T.RRRRRRR.T",
      "T..RRRR...T...t....~~~.......T.###D###.T",
      "T..#D##...T,,,,,,,,,2,,,,,,,,T....,....T",
      "T...,.....T,.......~~~......,T....,....T",
      "T...,.....T,.......~~~......,T....,....T",
      "T.S,,,,,,,1,.......~~~......,T....B....T",
      "T.........T........~~~......,T....,....T",
      "T.........T........~~~......,T....,....T",
      "T...t.....T........~~~......,3,,,,,....T",
      "T.........T........~~~.......T.........T",
      "T....tt...T........~~~.......T..t......T",
      "T.........T........~~~.......T.........T",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    ],
  },
  biblioteca: {
    outdoor: false,
    rows: [
      "########################################",
      "#..........H.........H.........H.......#",
      "#.HHHHHHH..H..HHHHH..H..HHHHHH.H..HHHH.#",
      "#..........H.........H.........H.......#",
      "#.,,,,,,,,,1,,,,,,,,,H.........H..o....#",
      "#.,........H........,H.........H.......#",
      "#.,........H........,H.........H.......#",
      "#.S........H........,2,,,,,,,,,3,,B....#",
      "#..........H........,H.........H.......#",
      "#..........H...o....,H.........H.......#",
      "#..........H........,H....o....H.......#",
      "#..........H.........H.........H.......#",
      "#.HHHHHHH..H..HHHHH..H..HHHHHH.H..HHHH.#",
      "#..........H.........H.........H.......#",
      "########################################",
    ],
  },
  pracaAlimentacao: {
    outdoor: false,
    rows: [
      "########################################",
      "#..RRRRR..#....RRRRR.#.....RRRRR.#.....#",
      "#..#DD##..#....##DD#.#.....#DD##.#.....#",
      "#.........#..........#.........,,3,,...#",
      "#..o...o..#..o...o...#..o..o...,.#..,..#",
      "#.........#..........#.........,.#..,..#",
      "#.........#.........,#.........,.#..,..#",
      "#.S,,,,,,,1,,,,,,,,,,#.........,.#..B..#",
      "#.........#.........,#.........,.#.....#",
      "#..o...o..#..o...o..,#..o..o...,.#..o..#",
      "#.........#.........,#.........,.#.....#",
      "#.........#.........,2,,,,,,,,,,.#.....#",
      "#..o...o..#..o...o...#..o..o.....#..o..#",
      "#.........#..........#...........#.....#",
      "########################################",
    ],
  },
  shopping: {
    outdoor: false,
    rows: [
      "########################################",
      "#.RRRRR..#RRRRRR..RR#.RRRRRRR...#RRRRR.#",
      "#.#DD##..##DD###..R##.##DD###...##DD##.#",
      "#........#.......,,,2,,.........#......#",
      "#........#.......,..#.........,.#......#",
      "#........#.......,..#.........,.#......#",
      "#..o.....#.......,..#..o......,.#..o...#",
      "#........#.......,..#.........,,3,,B...#",
      "#.S......#.......,..#.........,.#......#",
      "#.,......#.......,..#.........,.#......#",
      "#.,......#.......,..#....o....,.#......#",
      "#.,,,,,,,1,,,,,,,,..#.........,.#......#",
      "#.RRRRR..#RRRRRR..RR#.RRRRRRR...#RRRRR.#",
      "#.#DD##..#.#DD##..###.##DD###...#..##..#",
      "########################################",
    ],
  },
  torreScroll: {
    outdoor: false,
    rows: [
      "########################################",
      "#..M...M...#..M...M..#..M...M....#.....#",
      "#..........#.........#...........#.....#",
      "#..........#.........#...........#.....#",
      "#.S........#........,2,,,,,,,,,,.#..M..#",
      "#.,........#........,#.........,.#.....#",
      "#.,........#........,#.........,.#.....#",
      "#.,........#........,#.........,,3,,B..#",
      "#.,........#........,#...........#.....#",
      "#.,........#........,#...........#.....#",
      "#.,,,,,,,,,1,,,,,,,,,#...........#.....#",
      "#..........#.........#...........#.....#",
      "#..........#.........#...........#.....#",
      "#..M...M...#..M...M..#..M...M....#..M..#",
      "########################################",
    ],
  },
  arcaFinal: {
    outdoor: true,
    rows: [
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~.........~..........~..........~......~",
      "~..t......~..........~.....t....~......~",
      "~.........~.......,,,2,,,.......~......~",
      "~.........~.......,..~..,.......~......~",
      "~....t....~.......,..~..,.......~..t...~",
      "~.........~.......,..~..,.......~......~",
      "~.S,,,,,,,1,,,,,,,,..~..,.......~..B...~",
      "~.........~..........~..,.......~..,...~",
      "~.........~..........~..,.......~..,...~",
      "~...t.....~....t.....~..,.......~..,...~",
      "~.........~..........~..,,,,,,,,3,,,...~",
      "~.........~..........~..........~......~",
      "~.........~..........~..........~......~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
    ],
  },
};

/**
 * Parse a stage layout into a map with start and enemy spawns.
 * @param {string} stageId
 * @returns {StageMap}
 * @example buildStageMap("academia").spawns[0] // { index: 0, tx: 10, ty: 7 }
 */
export function buildStageMap(stageId) {
  const layout = STAGE_LAYOUTS[stageId];
  if (!layout) throw new Error(`stage "${stageId}": expected one of ${Object.keys(STAGE_LAYOUTS).join(", ")}`);
  const spawns = [];
  let start = { tx: 1, ty: 1 };
  layout.rows.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx += 1) {
      if (row[tx] === "S") start = { tx, ty };
      if (row[tx] in SPAWN_INDEX) spawns.push({ index: SPAWN_INDEX[row[tx]], tx, ty });
    }
  });
  spawns.sort((a, b) => a.index - b.index);
  return {
    width: layout.rows[0].length,
    height: layout.rows.length,
    rows: layout.rows,
    start,
    spawns,
    outdoor: layout.outdoor,
  };
}

/**
 * @param {StageMap} map
 * @param {number} tx
 * @param {number} ty
 * @returns {string} tile char, "#" outside the map
 */
export function tileAt(map, tx, ty) {
  return map.rows[ty]?.[tx] ?? "#";
}

/**
 * Whether the hero can stand on a tile (ignores enemies; see stage-walk.js for those).
 * @param {StageMap} map
 * @param {number} tx
 * @param {number} ty
 * @returns {boolean}
 */
export function isWalkable(map, tx, ty) {
  return WALKABLE.has(tileAt(map, tx, ty));
}
