// i18n.js: every visible string in EN and PT. The toggle swaps `data-i18n` nodes in place.

/** @typedef {"en" | "pt"} Lang */

const STRINGS = {
  en: {
    title: "MANGA HABITS",
    tagline: "Chapter by chapter, one habit at a time.",
    export: "Export",
    import: "Import",
    reset: "Reset to sheet",
    resetConfirm: "Throw away your changes and reload the original sheet list?",
    addTitle: "New item!",
    fieldName: "Name",
    fieldCategory: "Category",
    fieldDescription: "Description (URLs become links)",
    addButton: "ADD!",
    errorName: "Give it a name first!",
    errorCategory: "Pick a category!",
    searchPlaceholder: "Search...",
    statusAll: "All",
    statusTodo: "To do",
    statusDone: "Done",
    empty: "Nothing here... yet.",
    footer: "Saved in this browser only. Export to keep a copy.",
    markDone: "Done",
    markTodo: "Undo",
    remove: "Remove",
    removeConfirm: "Remove this item?",
    importError: "That file is not a valid export.",
    counter: "{shown} of {total} items",
    categoryAll: "All",
    categoryRead: "Read",
    categoryWatch: "Watch",
    categorySideHustle: "Side Hustle",
    categoryPersonal: "Personal",
  },
  pt: {
    title: "MANGA HABITS",
    tagline: "Capítulo a capítulo, um hábito de cada vez.",
    export: "Exportar",
    import: "Importar",
    reset: "Voltar à planilha",
    resetConfirm: "Descartar suas mudanças e recarregar a lista original da planilha?",
    addTitle: "Novo item!",
    fieldName: "Nome",
    fieldCategory: "Categoria",
    fieldDescription: "Descrição (URLs viram links)",
    addButton: "ADICIONAR!",
    errorName: "Dê um nome primeiro!",
    errorCategory: "Escolha uma categoria!",
    searchPlaceholder: "Buscar...",
    statusAll: "Todos",
    statusTodo: "A fazer",
    statusDone: "Feitos",
    empty: "Nada aqui... ainda.",
    footer: "Salvo só neste navegador. Exporte para guardar uma cópia.",
    markDone: "Feito",
    markTodo: "Desfazer",
    remove: "Remover",
    removeConfirm: "Remover este item?",
    importError: "Esse arquivo não é uma exportação válida.",
    counter: "{shown} de {total} itens",
    categoryAll: "Todos",
    categoryRead: "Ler",
    categoryWatch: "Assistir",
    categorySideHustle: "Side Hustle",
    categoryPersonal: "Pessoal",
  },
};

/**
 * Look up a string, filling `{placeholders}` from `values`.
 * @param {Lang} lang
 * @param {string} key
 * @param {Record<string, string | number>} [values]
 * @returns {string}
 * @example translate("pt", "counter", { shown: 3, total: 10 }) // "3 de 10 itens"
 */
export function translate(lang, key, values = {}) {
  const table = STRINGS[lang] ?? STRINGS.en;
  const template = table[key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}

/**
 * The language to show after a toggle.
 * @param {Lang} current
 * @returns {Lang}
 */
export function nextLang(current) {
  return current === "en" ? "pt" : "en";
}

/**
 * Apply `data-i18n` / `data-i18n-placeholder` strings to a DOM tree.
 * @param {ParentNode} root
 * @param {Lang} lang
 * @returns {void}
 */
export function applyTranslations(root, lang) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = translate(lang, node.getAttribute("data-i18n") ?? "");
  }
  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) {
    node.setAttribute("placeholder", translate(lang, node.getAttribute("data-i18n-placeholder") ?? ""));
  }
}

/**
 * Every string key that exists in EN, so tests can check PT parity.
 * @returns {string[]}
 */
export function stringKeys() {
  return Object.keys(STRINGS.en);
}

/**
 * Keys present in one language table but missing in the other.
 * @returns {string[]}
 */
export function missingTranslationKeys() {
  const en = new Set(Object.keys(STRINGS.en));
  const pt = new Set(Object.keys(STRINGS.pt));
  return [...en, ...pt].filter((key) => !(en.has(key) && pt.has(key)));
}
