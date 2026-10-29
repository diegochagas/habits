// i18n.js: every visible string in EN and PT. The toggle swaps `data-i18n` nodes in place.

/** @typedef {"en" | "pt"} Lang */

const STRINGS = {
  en: {
    title: "HABITS",
    tagline: "Chapter by chapter, one habit at a time.",
    play: "Play",
    puzzles: "Puzzles",
    tabList: "List",
    syncButton: "Sync",
    syncTitle: "Google Sheets sync",
    syncHelp: "Deploy sheets-sync/Code.gs as a web app (see the README) and paste its URL and secret word.",
    syncUrl: "Web app URL",
    syncToken: "Secret word",
    syncSave: "Save",
    syncNow: "Sync now",
    syncDisconnect: "Disconnect",
    syncOff: "Not connected: the list lives only in this browser.",
    syncIdle: "Connected. Waiting for the first sync.",
    syncOk: "Synced with the sheet: {count} items.",
    syncError: "Sync failed: {error}",
    syncPending: "{count} change(s) waiting",
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
    daily: "Today habit: on the Today tab, comes back each morning",
    fieldTrack: "Track",
    fieldXp: "XP per day (1–3)",
    "track.poder": "Poder",
    "track.habilidade": "Habilidade",
    "track.resistencia": "Resistência",
    edit: "Edit",
    editSave: "Save",
    editCancel: "Cancel",
    fieldDate: "Date",
    doneToday: "Already done today",
    errorDate: "The date must be yyyy-mm-dd.",
    footerServer: "Saved on the home server. Export to keep a copy.",
    removeConfirm: "Remove this item?",
    importError: "That file is not a valid export.",
    counter: "{shown} of {total} items",
    categoryAll: "All",
    categoryRead: "Read",
    categoryWatch: "Watch",
    categorySideHustle: "Side Hustle",
    categoryToday: "Today",
  },
  pt: {
    title: "HABITS",
    tagline: "Capítulo a capítulo, um hábito de cada vez.",
    play: "Jogar",
    puzzles: "Puzzles",
    tabList: "Lista",
    syncButton: "Sync",
    syncTitle: "Sincronizar com o Google Sheets",
    syncHelp: "Publique sheets-sync/Code.gs como web app (veja o README) e cole a URL e a palavra secreta.",
    syncUrl: "URL do web app",
    syncToken: "Palavra secreta",
    syncSave: "Salvar",
    syncNow: "Sincronizar agora",
    syncDisconnect: "Desconectar",
    syncOff: "Sem conexão: a lista vive só neste navegador.",
    syncIdle: "Conectado. Aguardando a primeira sincronização.",
    syncOk: "Sincronizado com a planilha: {count} itens.",
    syncError: "Falha ao sincronizar: {error}",
    syncPending: "{count} mudança(s) na fila",
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
    daily: "Hábito de hoje: fica na aba Hoje e volta toda manhã",
    fieldTrack: "Trilha",
    fieldXp: "XP por dia (1–3)",
    "track.poder": "Poder",
    "track.habilidade": "Habilidade",
    "track.resistencia": "Resistência",
    edit: "Editar",
    editSave: "Salvar",
    editCancel: "Cancelar",
    fieldDate: "Data",
    doneToday: "Já feito hoje",
    errorDate: "A data precisa ser aaaa-mm-dd.",
    footerServer: "Salvo no servidor de casa. Exporte para guardar uma cópia.",
    removeConfirm: "Remover este item?",
    importError: "Esse arquivo não é uma exportação válida.",
    counter: "{shown} de {total} itens",
    categoryAll: "Todos",
    categoryRead: "Ler",
    categoryWatch: "Assistir",
    categorySideHustle: "Side Hustle",
    categoryToday: "Hoje",
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
