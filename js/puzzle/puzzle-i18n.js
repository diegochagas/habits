// puzzle-i18n.js: strings for the sort-puzzle page.

const EN = {
  puzzleTitle: "SORT PUZZLES",
  puzzleTagline: "Break-time brain teasers: sort the tubes, stack the coins.",
  skinTubes: "Magic tubes",
  skinCoins: "Coin stacks",
  level: "Level {level}",
  moves: "{moves} moves",
  undo: "Undo",
  restart: "Restart",
  newLevel: "Shuffle",
  nextLevel: "Next level",
  solved: "Sorted in {moves} moves!",
  howTubes: "Tap a tube, then another: the top ball moves if the colours match or the tube is empty.",
  howCoins: "Tap a stack, then another: the whole run of equal coins moves if the tops match.",
  tube: "Tube {n}",
  stack: "Stack {n}",
  backToArcas: "Arcas",
};

const PT = {
  puzzleTitle: "PUZZLES",
  puzzleTagline: "Quebra-cabeças da pausa: ordene os tubos, empilhe as moedas.",
  skinTubes: "Tubos mágicos",
  skinCoins: "Pilhas de moedas",
  level: "Nível {level}",
  moves: "{moves} jogadas",
  undo: "Desfazer",
  restart: "Reiniciar",
  newLevel: "Embaralhar",
  nextLevel: "Próximo nível",
  solved: "Ordenado em {moves} jogadas!",
  howTubes: "Toque num tubo e depois em outro: a bola de cima passa se as cores baterem ou o tubo estiver vazio.",
  howCoins: "Toque numa pilha e depois em outra: a sequência de moedas iguais passa se os topos baterem.",
  tube: "Tubo {n}",
  stack: "Pilha {n}",
  backToArcas: "Arcas",
};

const TABLES = { en: EN, pt: PT };

/**
 * @param {"en" | "pt"} lang
 * @param {string} key
 * @param {Record<string, string | number>} [values]
 * @returns {string}
 * @example puzzleText("pt", "level", { level: 3 }) // "Nível 3"
 */
export function puzzleText(lang, key, values = {}) {
  const template = TABLES[lang]?.[key] ?? EN[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}

/**
 * Static nodes: data-puzzle-i18n="key".
 * @param {ParentNode} root
 * @param {"en" | "pt"} lang
 */
export function applyPuzzleTranslations(root, lang) {
  for (const node of root.querySelectorAll("[data-puzzle-i18n]"))
    node.textContent = puzzleText(lang, node.getAttribute("data-puzzle-i18n") ?? "");
}

/** @returns {string[]} keys missing in one of the tables */
export function missingPuzzleKeys() {
  const en = new Set(Object.keys(EN));
  const pt = new Set(Object.keys(PT));
  return [...en, ...pt].filter((key) => !(en.has(key) && pt.has(key)));
}
