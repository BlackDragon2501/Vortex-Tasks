"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  Flag,
  Inbox,
  ListTodo,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  addDaysStr,
  exportJson,
  formatDue,
  loadTasks,
  parseImport,
  parseQuickAdd,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  PROJECT_COLORS,
  saveTasks,
  seedTasks,
  sortTasks,
  todayStr,
  uid,
  type Priority,
  type Project,
  type Task,
  type TasksData,
} from "@/lib/tasks";

type SmartView = "inbox" | "hoy" | "prox" | "p1" | "todas" | "completadas";
type Filter = { kind: "smart"; id: SmartView } | { kind: "project"; id: string };

function SwirlLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="#14b8a6" strokeWidth="3.5" />
      <path
        d="M24 10a14 14 0 1 1-9.9 4.1"
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M24 17a7 7 0 1 0 7 7"
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="3" fill="#2dd4bf" />
    </svg>
  );
}

function Btn({
  onClick,
  icon: Icon,
  label,
  short,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  short?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#2b2b31] bg-[#1e1e22] px-2.5 py-1.5 text-xs font-medium text-[#ececf1] transition hover:border-[#3a3a42] hover:bg-[#26262b]"
    >
      <Icon size={15} />
      <span className={short ? "hidden sm:inline" : ""}>{label}</span>
    </button>
  );
}

function NavItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
  color,
  onDelete,
}: {
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
  onDelete?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition ${
        active ? "bg-[#14b8a6]/15 text-[#2dd4bf]" : "text-[#c6c6cd] hover:bg-[#1e1e22]"
      }`}
    >
      {color ? (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        Icon && (
          <Icon size={16} className={active ? "text-[#2dd4bf]" : "text-[#9b9ba4]"} />
        )
      )}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {onDelete && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Eliminar proyecto (las tareas pasan a la Bandeja)"
          className="hidden shrink-0 text-[#9b9ba4] hover:text-red-400 group-hover:block"
        >
          <X size={13} />
        </span>
      )}
      {count > 0 && (
        <span className="shrink-0 text-[11px] tabular-nums text-[#6f6f78]">{count}</span>
      )}
    </button>
  );
}

const SMART_VIEWS: {
  id: SmartView;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}[] = [
  { id: "inbox", label: "Bandeja de entrada", icon: Inbox },
  { id: "hoy", label: "Hoy", icon: Sun },
  { id: "prox", label: "Próximos 7 días", icon: CalendarDays },
  { id: "p1", label: "Prioridad P1", icon: Flag },
  { id: "todas", label: "Todas", icon: ListTodo },
  { id: "completadas", label: "Completadas", icon: CheckCircle2 },
];

const VIEW_TITLES: Record<SmartView, string> = {
  inbox: "Bandeja de entrada",
  hoy: "Hoy",
  prox: "Próximos 7 días",
  p1: "Prioridad P1",
  todas: "Todas las tareas",
  completadas: "Completadas",
};

const EMPTY_MSGS: Record<SmartView, string> = {
  inbox: "La bandeja está vacía. Añade una tarea sin proyecto.",
  hoy: "Todo despejado para hoy. ¡Disfruta tu día!",
  prox: "Nada programado para los próximos 7 días.",
  p1: "Sin tareas urgentes. Buen trabajo.",
  todas: "No hay tareas pendientes. Añade una arriba.",
  completadas: "Aún no has completado ninguna tarea.",
};

export default function TasksApp() {
  const [data, setData] = useState<TasksData | null>(null);
  const [filter, setFilter] = useState<Filter>({ kind: "smart", id: "hoy" });
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quick, setQuick] = useState("");
  const [newProject, setNewProject] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const quickRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setData(loadTasks());
  }, []);

  useEffect(() => {
    if (data) saveTasks(data);
  }, [data]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const today = todayStr();

  const counts = useMemo(() => {
    const t = data?.tasks ?? [];
    const limit7 = addDaysStr(today, 7);
    return {
      inbox: t.filter((x) => !x.done && !x.projectId).length,
      hoy: t.filter((x) => !x.done && x.due === today).length,
      prox: t.filter((x) => !x.done && x.due && x.due <= limit7).length,
      p1: t.filter((x) => !x.done && x.priority === 1).length,
      todas: t.filter((x) => !x.done).length,
      completadas: t.filter((x) => x.done).length,
    };
  }, [data, today]);

  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];

  const viewTitle =
    filter.kind === "project"
      ? projects.find((p) => p.id === filter.id)?.name ?? "Proyecto"
      : VIEW_TITLES[filter.id];

  const visible = useMemo(() => {
    let list: Task[];
    if (filter.kind === "project") {
      list = tasks.filter((t) => t.projectId === filter.id);
    } else {
      const limit7 = addDaysStr(today, 7);
      switch (filter.id) {
        case "inbox":
          list = tasks.filter((t) => !t.projectId);
          break;
        case "hoy":
          list = tasks.filter((t) => !t.done && t.due === today);
          break;
        case "prox":
          list = tasks.filter((t) => !t.done && t.due && t.due <= limit7);
          break;
        case "p1":
          list = tasks.filter((t) => !t.done && t.priority === 1);
          break;
        case "completadas":
          list = tasks.filter((t) => t.done);
          break;
        default:
          list = tasks.filter((t) => !t.done);
      }
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes ?? "").toLowerCase().includes(q) ||
          t.subtasks.some((s) => s.title.toLowerCase().includes(q))
      );
    }
    if (filter.kind === "smart" && filter.id === "completadas") {
      return [...list].sort((a, b) =>
        (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
      );
    }
    return sortTasks(list);
  }, [tasks, filter, query, today]);

  const doneToday = tasks.filter((t) => t.due === today && t.done).length;
  const totalToday = counts.hoy + doneToday;
  const pct = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);

  const addQuick = () => {
    if (!quick.trim() || !data) return;
    const parsed = parseQuickAdd(quick, data.projects);
    if (!parsed.title) {
      showToast("Escribe el nombre de la tarea");
      return;
    }
    let projectsNow = data.projects;
    let projectId = parsed.projectId;
    if (parsed.newProjectName) {
      const p: Project = {
        id: uid(),
        name: parsed.newProjectName,
        color: PROJECT_COLORS[projectsNow.length % PROJECT_COLORS.length],
      };
      projectsNow = [...projectsNow, p];
      projectId = p.id;
    }
    const t: Task = {
      id: uid(),
      title: parsed.title,
      notes: "",
      due: parsed.due,
      priority: parsed.priority,
      projectId,
      subtasks: [],
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setData({ ...data, projects: projectsNow, tasks: [t, ...data.tasks] });
    setQuick("");
    if (parsed.newProjectName) showToast(`Proyecto "${parsed.newProjectName}" creado`);
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    if (!data) return;
    setData({
      ...data,
      tasks: data.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  };

  const toggleDone = (id: string) => {
    if (!data) return;
    setData({
      ...data,
      tasks: data.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              done: !t.done,
              completedAt: !t.done ? new Date().toISOString() : null,
            }
          : t
      ),
    });
  };

  const deleteTask = (id: string) => {
    if (!data) return;
    setData({ ...data, tasks: data.tasks.filter((t) => t.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  const duplicateTask = (id: string) => {
    if (!data) return;
    const src = data.tasks.find((t) => t.id === id);
    if (!src) return;
    const copy: Task = {
      ...src,
      id: uid(),
      title: src.title,
      done: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      subtasks: src.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
    };
    setData({ ...data, tasks: [copy, ...data.tasks] });
    showToast("Tarea duplicada");
  };

  const addSubtask = (taskId: string, title: string) => {
    if (!title.trim() || !data) return;
    const t = data.tasks.find((x) => x.id === taskId);
    if (!t) return;
    updateTask(taskId, {
      subtasks: [...t.subtasks, { id: uid(), title: title.trim(), done: false }],
    });
  };

  const toggleSub = (taskId: string, subId: string) => {
    if (!data) return;
    const t = data.tasks.find((x) => x.id === taskId);
    if (!t) return;
    updateTask(taskId, {
      subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
    });
  };

  const delSub = (taskId: string, subId: string) => {
    if (!data) return;
    const t = data.tasks.find((x) => x.id === taskId);
    if (!t) return;
    updateTask(taskId, { subtasks: t.subtasks.filter((s) => s.id !== subId) });
  };

  const clearCompleted = () => {
    if (!data) return;
    setData({ ...data, tasks: data.tasks.filter((t) => !t.done) });
    showToast("Completadas eliminadas");
  };

  const addProject = () => {
    const name = newProject.trim();
    if (!name || !data) return;
    const p: Project = {
      id: uid(),
      name,
      color: PROJECT_COLORS[data.projects.length % PROJECT_COLORS.length],
    };
    setData({ ...data, projects: [...data.projects, p] });
    setNewProject("");
    setShowNewProject(false);
  };

  const deleteProject = (id: string) => {
    if (!data) return;
    setData({
      ...data,
      projects: data.projects.filter((p) => p.id !== id),
      tasks: data.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
    });
    if (filter.kind === "project" && filter.id === id) {
      setFilter({ kind: "smart", id: "todas" });
    }
  };

  const onImportFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      const d = parseImport(String(r.result));
      if (d) {
        setData(d);
        showToast("Datos importados");
      } else {
        showToast("Archivo no válido");
      }
    };
    r.readAsText(f);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (!typing && (e.key === "q" || e.key === "/")) {
        e.preventDefault();
        quickRef.current?.focus();
      }
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!data) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-[#9b9ba4]">
        Cargando Vórtex Tasks…
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Barra superior */}
      <header className="flex items-center gap-3 border-b border-[#2b2b31] bg-[#17171a] px-4 py-2.5">
        <SwirlLogo />
        <div className="mr-2">
          <div className="text-sm font-bold tracking-wide">Vórtex Tasks</div>
          <div className="hidden text-[11px] text-[#9b9ba4] sm:block">
            Organiza tu día, sin límites · 100% local
          </div>
        </div>
        <div className="relative ml-auto">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9b9ba4]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tareas…"
            className="w-36 rounded-md border border-[#2b2b31] bg-[#1e1e22] py-1.5 pl-8 pr-2 text-xs text-[#ececf1] outline-none focus:border-[#14b8a6] sm:w-56"
          />
        </div>
        <Btn onClick={() => exportJson(data)} icon={Download} label="Exportar" short />
        <Btn
          onClick={() => importRef.current?.click()}
          icon={Upload}
          label="Importar"
          short
        />
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.currentTarget.value = "";
          }}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Barra lateral */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#2b2b31] bg-[#17171a] md:flex">
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6f6f78]">
              Vistas
            </div>
            {SMART_VIEWS.map((v) => {
              const active = filter.kind === "smart" && filter.id === v.id;
              return (
                <NavItem
                  key={v.id}
                  icon={v.icon}
                  label={v.label}
                  count={counts[v.id]}
                  active={active}
                  onClick={() => setFilter({ kind: "smart", id: v.id })}
                />
              );
            })}
            <div className="flex items-center justify-between px-2 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[#6f6f78]">
              Proyectos
              <button
                onClick={() => setShowNewProject((s) => !s)}
                title="Nuevo proyecto"
                className="rounded p-0.5 text-[#9b9ba4] hover:bg-[#1e1e22] hover:text-[#2dd4bf]"
              >
                <Plus size={13} />
              </button>
            </div>
            {showNewProject && (
              <input
                autoFocus
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addProject();
                  if (e.key === "Escape") setShowNewProject(false);
                }}
                onBlur={addProject}
                placeholder="Nombre del proyecto + Enter"
                className="mb-1 w-full rounded-md border border-[#2b2b31] bg-[#1e1e22] px-2.5 py-1.5 text-xs outline-none focus:border-[#14b8a6]"
              />
            )}
            {projects.map((p) => (
              <NavItem
                key={p.id}
                label={p.name}
                color={p.color}
                count={tasks.filter((t) => !t.done && t.projectId === p.id).length}
                active={filter.kind === "project" && filter.id === p.id}
                onClick={() => setFilter({ kind: "project", id: p.id })}
                onDelete={() => deleteProject(p.id)}
              />
            ))}
          </nav>
          <div className="border-t border-[#2b2b31] p-3">
            <div className="flex items-center justify-between text-xs text-[#9b9ba4]">
              <span>Progreso de hoy</span>
              <span className="tabular-nums">
                {doneToday}/{totalToday}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#26262b]">
              <div
                className="h-full rounded-full bg-[#14b8a6] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-[#6f6f78]">
              {counts.todas} pendientes · {counts.completadas} completadas
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* Filtros móviles */}
          <div className="flex gap-1.5 overflow-x-auto px-4 pt-3 md:hidden">
            {SMART_VIEWS.map((v) => {
              const active = filter.kind === "smart" && filter.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setFilter({ kind: "smart", id: v.id })}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? "border-[#14b8a6]/60 bg-[#14b8a6]/15 text-[#2dd4bf]"
                      : "border-[#2b2b31] text-[#9b9ba4]"
                  }`}
                >
                  {v.label} ({counts[v.id]})
                </button>
              );
            })}
          </div>

          <div className="mx-auto max-w-3xl px-4 pt-4">
            <h1 className="text-xl font-bold">{viewTitle}</h1>
            <div className="relative mt-3">
              <Plus
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#14b8a6]"
              />
              <input
                ref={quickRef}
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addQuick();
                }}
                placeholder='Añadir tarea… ej: "Enviar informe #Trabajo !p1 mañana"  (pulsa Q para enfocar)'
                className="w-full rounded-lg border border-[#2b2b31] bg-[#17171a] py-2.5 pl-9 pr-3 text-sm text-[#ececf1] outline-none placeholder:text-[#6f6f78] focus:border-[#14b8a6]"
              />
            </div>
          </div>

          <div className="mx-auto max-w-3xl pb-10 pt-2">
            {visible.length === 0 ? (
              <div className="mt-10 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 size={36} className="text-[#3a3a42]" />
                <p className="text-sm text-[#9b9ba4]">
                  {query.trim()
                    ? "Sin resultados para tu búsqueda."
                    : filter.kind === "project"
                      ? "No hay tareas en este proyecto."
                      : EMPTY_MSGS[filter.kind === "smart" ? filter.id : "todas"]}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#2b2b31] bg-[#121214]">
                {visible.map((t) => {
                  const project = projects.find((p) => p.id === t.projectId);
                  const expanded = expandedId === t.id;
                  const dateInfo = t.due ? formatDue(t.due, today) : null;
                  const subDone = t.subtasks.filter((s) => s.done).length;
                  return (
                    <div
                      key={t.id}
                      className="group border-b border-[#232328] px-4 py-3 transition last:border-b-0 hover:bg-[#141417]"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleDone(t.id)}
                          title={t.done ? "Marcar como pendiente" : "Completar"}
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition hover:scale-110"
                          style={{
                            borderColor: PRIORITY_COLORS[t.priority],
                            backgroundColor: t.done
                              ? PRIORITY_COLORS[t.priority]
                              : "transparent",
                          }}
                        >
                          {t.done && <Check size={12} className="text-white" />}
                        </button>
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setExpandedId(expanded ? null : t.id)}
                        >
                          <div
                            className={`break-words text-sm ${
                              t.done ? "text-[#6f6f78] line-through" : "text-[#ececf1]"
                            }`}
                          >
                            {t.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            {dateInfo && (
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  dateInfo.overdue
                                    ? "font-medium text-red-400"
                                    : dateInfo.isToday
                                      ? "font-medium text-[#2dd4bf]"
                                      : "text-[#9b9ba4]"
                                }`}
                              >
                                <CalendarDays size={11} />
                                {dateInfo.label}
                              </span>
                            )}
                            {project && (
                              <span className="inline-flex items-center gap-1 text-[#9b9ba4]">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: project.color }}
                                />
                                {project.name}
                              </span>
                            )}
                            {t.priority < 4 && (
                              <span
                                className="inline-flex items-center gap-1"
                                style={{ color: PRIORITY_COLORS[t.priority] }}
                              >
                                <Flag size={11} />
                                P{t.priority}
                              </span>
                            )}
                            {t.subtasks.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[#9b9ba4]">
                                <CheckCircle2 size={11} />
                                {subDone}/{t.subtasks.length} subtareas
                              </span>
                            )}
                            {t.notes && (
                              <span className="inline-flex items-center gap-1 text-[#9b9ba4]">
                                <StickyNote size={11} />
                                Nota
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => setExpandedId(expanded ? null : t.id)}
                            title="Editar"
                            className="rounded p-1 text-[#9b9ba4] hover:bg-[#1e1e22] hover:text-[#2dd4bf]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteTask(t.id)}
                            title="Eliminar"
                            className="rounded p-1 text-[#9b9ba4] hover:bg-[#1e1e22] hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="mt-3 space-y-2.5 rounded-lg border border-[#2b2b31] bg-[#17171a] p-3">
                          <input
                            value={t.title}
                            onChange={(e) => updateTask(t.id, { title: e.target.value })}
                            className="w-full rounded-md border border-[#2b2b31] bg-[#1e1e22] px-2.5 py-1.5 text-sm outline-none focus:border-[#14b8a6]"
                          />
                          <textarea
                            value={t.notes ?? ""}
                            onChange={(e) => updateTask(t.id, { notes: e.target.value })}
                            placeholder="Notas o descripción…"
                            rows={2}
                            className="w-full resize-y rounded-md border border-[#2b2b31] bg-[#1e1e22] px-2.5 py-1.5 text-sm outline-none focus:border-[#14b8a6]"
                          />
                          <div className="flex flex-wrap gap-2 text-xs">
                            <input
                              type="date"
                              value={t.due ?? ""}
                              onChange={(e) =>
                                updateTask(t.id, { due: e.target.value || null })
                              }
                              className="rounded-md border border-[#2b2b31] bg-[#1e1e22] px-2 py-1.5 outline-none focus:border-[#14b8a6]"
                            />
                            <select
                              value={String(t.priority)}
                              onChange={(e) =>
                                updateTask(t.id, {
                                  priority: Number(e.target.value) as Priority,
                                })
                              }
                              className="rounded-md border border-[#2b2b31] bg-[#1e1e22] px-2 py-1.5 outline-none focus:border-[#14b8a6]"
                            >
                              {([1, 2, 3, 4] as Priority[]).map((p) => (
                                <option key={p} value={p}>
                                  {PRIORITY_LABELS[p]}
                                </option>
                              ))}
                            </select>
                            <select
                              value={t.projectId ?? ""}
                              onChange={(e) =>
                                updateTask(t.id, { projectId: e.target.value || null })
                              }
                              className="rounded-md border border-[#2b2b31] bg-[#1e1e22] px-2 py-1.5 outline-none focus:border-[#14b8a6]"
                            >
                              <option value="">Bandeja de entrada</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {t.subtasks.length > 0 && (
                            <div className="space-y-1">
                              {t.subtasks.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 text-sm">
                                  <button
                                    onClick={() => toggleSub(t.id, s.id)}
                                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#3a3a42] transition hover:border-[#14b8a6]"
                                  >
                                    {s.done && <Check size={10} className="text-[#2dd4bf]" />}
                                  </button>
                                  <span
                                    className={`min-w-0 flex-1 ${
                                      s.done ? "text-[#6f6f78] line-through" : "text-[#c6c6cd]"
                                    }`}
                                  >
                                    {s.title}
                                  </span>
                                  <button
                                    onClick={() => delSub(t.id, s.id)}
                                    title="Eliminar subtarea"
                                    className="text-[#6f6f78] hover:text-red-400"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <input
                            placeholder="Añadir subtarea + Enter"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addSubtask(t.id, e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                            className="w-full rounded-md border border-[#2b2b31] bg-[#1e1e22] px-2.5 py-1.5 text-xs outline-none focus:border-[#14b8a6]"
                          />

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={() => duplicateTask(t.id)}
                              className="rounded-md border border-[#2b2b31] px-2.5 py-1 text-xs text-[#c6c6cd] transition hover:bg-[#1e1e22]"
                            >
                              Duplicar
                            </button>
                            <button
                              onClick={() => deleteTask(t.id)}
                              className="rounded-md border border-red-900/60 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-950/40"
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => setExpandedId(null)}
                              className="rounded-md border border-[#14b8a6]/60 bg-[#14b8a6]/10 px-2.5 py-1 text-xs text-[#2dd4bf] transition hover:bg-[#14b8a6]/20"
                            >
                              Cerrar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {filter.kind === "smart" && filter.id === "completadas" && counts.completadas > 0 && (
              <div className="mt-3 text-center">
                <button
                  onClick={clearCompleted}
                  className="rounded-md border border-red-900/60 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-950/40"
                >
                  Limpiar completadas ({counts.completadas})
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Marca */}
      <footer className="border-t border-[#2b2b31] bg-[#0f0f10] px-4 py-1.5 text-center text-[11px] text-[#6f6f78]">
        Vórtex Tasks · Derechos Reservados © 2026 Vortex Company · Soporte:
        vortexmusic.soporte.app@gmail.com · Gratis, sin anuncios
      </footer>

      {toast && (
        <div className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#2b2b31] bg-[#1e1e22] px-4 py-1.5 text-xs text-[#ececf1] shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
