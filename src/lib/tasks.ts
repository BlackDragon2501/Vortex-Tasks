// Vórtex Tasks — lógica de datos (100% local, sin backend).
export type Priority = 1 | 2 | 3 | 4;

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string | null; // YYYY-MM-DD
  priority: Priority;
  projectId: string | null; // null = Bandeja de entrada
  subtasks: Subtask[];
  done: boolean;
  createdAt: string;
  completedAt?: string | null;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface TasksData {
  version: 1;
  tasks: Task[];
  projects: Project[];
}

export const STORAGE_KEY = "vortex-tasks-v1";

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#3b82f6",
  4: "#6b7280",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "P1 · Urgente",
  2: "P2 · Alta",
  3: "P3 · Media",
  4: "P4 · Baja",
};

export const PROJECT_COLORS = [
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#22c55e",
  "#eab308",
  "#ef4444",
];

const DAYS_NORM = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  );
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function addDaysStr(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}

export interface ParsedQuick {
  title: string;
  due: string | null;
  priority: Priority;
  projectId: string | null;
  newProjectName: string | null;
}

// Parser del añadido rápido, estilo Todoist:
//   "Enviar informe #Trabajo !p1 mañana"
//   "Llamar al dentista hoy !p2"
//   "Comprar regalo 25/12 !p3"
export function parseQuickAdd(raw: string, projects: Project[]): ParsedQuick {
  let title = raw;
  let due: string | null = null;
  let priority: Priority = 4;
  let projectId: string | null = null;
  let newProjectName: string | null = null;
  const today = todayStr();

  // Prioridad: !p1..!p4 (o !1..!4)
  const prRe = /(^|\s)!(?:p)?([1-4])(?=\s|$)/i;
  const mPr = title.match(prRe);
  if (mPr) {
    priority = Number(mPr[2]) as Priority;
    title = title.replace(prRe, " ");
  }

  // Proyecto: #Nombre (existente o nuevo)
  const prjRe = /(^|\s)#([\p{L}\p{N}_-]+)/u;
  const mPrj = title.match(prjRe);
  if (mPrj) {
    const name = mPrj[2].trim();
    const found = projects.find(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (found) projectId = found.id;
    else newProjectName = name;
    title = title.replace(prjRe, " ");
  }

  // Fecha: hoy / mañana / día de la semana / dd-mm o dd/mm
  const dateRe =
    /(^|\s)(hoy|manana|mañana|lunes|martes|miercoles|mi[eé]rcoles|jueves|viernes|sabado|s[áa]bado|domingo|(\d{1,2})[\/\-](\d{1,2}))(?=\s|$)/i;
  const mD = title.match(dateRe);
  if (mD) {
    const token = stripAccents(mD[2].toLowerCase());
    if (token === "hoy") {
      due = today;
    } else if (token === "manana") {
      due = addDaysStr(today, 1);
    } else if (mD[3] && mD[4]) {
      const dd = Number(mD[3]);
      const mm = Number(mD[4]);
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
        const y = new Date().getFullYear();
        let iso = `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        if (iso < today) iso = `${y + 1}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        due = iso;
      }
    } else {
      const di = DAYS_NORM.findIndex((d) => d === token);
      if (di >= 0) {
        const diff = (di - new Date().getDay() + 7) % 7;
        due = addDaysStr(today, diff);
      }
    }
    title = title.replace(dateRe, " ");
  }

  return {
    title: title.replace(/\s+/g, " ").trim(),
    due,
    priority,
    projectId,
    newProjectName,
  };
}

export function formatDue(
  iso: string,
  today = todayStr()
): { label: string; overdue: boolean; isToday: boolean } {
  const overdue = iso < today;
  const isToday = iso === today;
  const isTomorrow = iso === addDaysStr(today, 1);
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = new Intl.DateTimeFormat("es", { weekday: "short" }).format(dt);
  const dm = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(dt);
  let label: string;
  if (isToday) label = "Hoy";
  else if (isTomorrow) label = "Mañana";
  else if (overdue) label = `Vencida · ${dm}`;
  else label = `${wd.charAt(0).toUpperCase() + wd.slice(1).replace(".", "")} ${dm}`;
  return { label, overdue, isToday };
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function seedTasks(): TasksData {
  const personal: Project = { id: uid(), name: "Personal", color: "#14b8a6" };
  const trabajo: Project = { id: uid(), name: "Trabajo", color: "#f97316" };
  const t = todayStr();
  const now = new Date().toISOString();
  return {
    version: 1,
    projects: [personal, trabajo],
    tasks: [
      {
        id: uid(),
        title: "¡Bienvenido a Vórtex Tasks!",
        notes:
          "Escribe una tarea arriba y pulsa Enter. Usa #Proyecto para asignarla, !p1..!p4 para prioridad y fechas como: hoy, mañana, lunes o 25/12.",
        due: t,
        priority: 1,
        projectId: null,
        subtasks: [],
        done: false,
        createdAt: now,
        completedAt: null,
      },
      {
        id: uid(),
        title: "Crear tu primer proyecto",
        due: addDaysStr(t, 1),
        priority: 3,
        projectId: personal.id,
        subtasks: [
          { id: uid(), title: "Pensar un nombre", done: true },
          { id: uid(), title: "Elegir un color", done: false },
        ],
        done: false,
        createdAt: now,
        completedAt: null,
      },
      {
        id: uid(),
        title: "Explorar los filtros: Hoy y Próximos 7 días",
        due: addDaysStr(t, 3),
        priority: 4,
        projectId: trabajo.id,
        subtasks: [],
        done: false,
        createdAt: now,
        completedAt: null,
      },
    ],
  };
}

export function loadTasks(): TasksData {
  if (typeof window === "undefined") return seedTasks();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTasks();
    const d = JSON.parse(raw) as TasksData;
    if (!d || !Array.isArray(d.tasks) || !Array.isArray(d.projects)) return seedTasks();
    return d;
  } catch {
    return seedTasks();
  }
}

export function saveTasks(d: TasksData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    // almacenamiento no disponible (modo privado); la app sigue funcionando en memoria
  }
}

export function exportJson(d: TasksData): void {
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vortex-tasks.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function parseImport(text: string): TasksData | null {
  try {
    const d = JSON.parse(text) as TasksData;
    if (d && Array.isArray(d.tasks) && Array.isArray(d.projects)) {
      return { version: 1, tasks: d.tasks, projects: d.projects };
    }
    return null;
  } catch {
    return null;
  }
}
