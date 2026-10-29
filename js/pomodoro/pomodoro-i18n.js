// pomodoro-i18n.js: strings for the Pomodoro panel and the free-time gate on the play pages.

const EN = {
  pomodoroTitle: "Pomodoro",
  modeWork: "Pomodoro",
  modeShort: "Short break",
  modeLong: "Long break",
  start: "Start",
  pause: "Pause",
  reset: "Reset",
  workingOn: "Working on",
  noItem: "— pick an item from the list —",
  musicLabel: "Focus music (YouTube link)",
  musicPlaceholder: "https://www.youtube.com/watch?v=...",
  musicSave: "Save",
  musicClear: "Clear",
  musicError: "That is not a YouTube link.",
  mute: "Mute",
  unmute: "Unmute",
  completedToday: "{count} today",
  freeTime: "Free time",
  freeTimeHint: "Each finished Pomodoro earns its break as play time.",
  workDone: "Pomodoro done! +1 XP and +{minutes} min of free time.",
  breakDone: "Break over. Back to work!",
  playArcas: "Play Arcas",
  playPuzzles: "Sort puzzles",
  startPomodoro: "Pomodoro",
  freeTimeOver: "Free time is over!",
  freeTimeOverHint: "Finish a Pomodoro on the Habits page to earn a break, then come back.",
  backToHabits: "Back to Habits",
};

const PT = {
  pomodoroTitle: "Pomodoro",
  modeWork: "Pomodoro",
  modeShort: "Pausa curta",
  modeLong: "Pausa longa",
  start: "Iniciar",
  pause: "Pausar",
  reset: "Zerar",
  workingOn: "Trabalhando em",
  noItem: "— escolha um item da lista —",
  musicLabel: "Música de foco (link do YouTube)",
  musicPlaceholder: "https://www.youtube.com/watch?v=...",
  musicSave: "Salvar",
  musicClear: "Limpar",
  musicError: "Isso não é um link do YouTube.",
  mute: "Silenciar",
  unmute: "Som",
  completedToday: "{count} hoje",
  freeTime: "Tempo livre",
  freeTimeHint: "Cada Pomodoro concluído rende a pausa como tempo de jogo.",
  workDone: "Pomodoro concluído! +1 XP e +{minutes} min de tempo livre.",
  breakDone: "Fim da pausa. De volta ao trabalho!",
  playArcas: "Jogar Arcas",
  playPuzzles: "Puzzles de ordenar",
  startPomodoro: "Pomodoro",
  freeTimeOver: "Acabou o tempo livre!",
  freeTimeOverHint: "Conclua um Pomodoro na página Habits para ganhar uma pausa e volte.",
  backToHabits: "Voltar ao Habits",
};

const TABLES = { en: EN, pt: PT };

/**
 * @param {"en" | "pt"} lang
 * @param {string} key
 * @param {Record<string, string | number>} [values]
 * @returns {string}
 * @example pomodoroText("pt", "completedToday", { count: 2 }) // "2 hoje"
 */
export function pomodoroText(lang, key, values = {}) {
  const template = TABLES[lang]?.[key] ?? EN[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}

/**
 * Static nodes: data-pomodoro-i18n="key".
 * @param {ParentNode} root
 * @param {"en" | "pt"} lang
 */
export function applyPomodoroTranslations(root, lang) {
  for (const node of root.querySelectorAll("[data-pomodoro-i18n]"))
    node.textContent = pomodoroText(lang, node.getAttribute("data-pomodoro-i18n") ?? "");
}

/** @returns {string[]} keys missing in one of the tables */
export function missingPomodoroKeys() {
  const en = new Set(Object.keys(EN));
  const pt = new Set(Object.keys(PT));
  return [...en, ...pt].filter((key) => !(en.has(key) && pt.has(key)));
}
