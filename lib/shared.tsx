"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType = "homework" | "exam" | "personal" | "project" | "school";

export interface Task {
  id: string;
  name: string;
  type: EventType;
  deadline: string;
  done: boolean;
  subject?: string | null;
  semester_id?: string | null;
  total_questions?: number | null;
  completed_questions?: number | null;
  grade?: string | null;
  created_at?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  type: EventType;
  created_at?: string;
}

export interface StudyLog {
  id: string;
  subject: string;
  hours: number;
  date: string;
  semester_id?: string | null;
  created_at?: string;
}

export interface Semester {
  id: string;
  name: string;
  year: number;
  semester: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
}

export interface SemesterSubject {
  id: string;
  semester_id: string;
  name: string;
  target_hours: number;
  color: string;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

export const N = {
  bg:       "#FAFAF9",
  sidebar:  "#F5F2EC",
  text:     "#1C1C1E",
  muted:    "#9B9894",
  border:   "#E8E4DA",
  hover:    "#F0EDE5",
  active:   "#E8E2D8",
  selected: "#EEF2FF",
  accent:   "#6366F1",
  accentBg: "#EEF2FF",
};

// ─── Type config ──────────────────────────────────────────────────────────────

export const TYPES: Record<EventType, { label: string; bg: string; text: string; accent: string }> = {
  homework: { label: "Homework", bg: "#EFF6FF", text: "#1D4ED8", accent: "#3B82F6" },
  exam:     { label: "Exam",     bg: "#FFF7ED", text: "#C2410C", accent: "#F97316" },
  personal: { label: "Personal", bg: "#F0FDF4", text: "#166534", accent: "#22C55E" },
  project:  { label: "Project",  bg: "#F5F3FF", text: "#6D28D9", accent: "#8B5CF6" },
  school:   { label: "School",   bg: "#FFF0FA", text: "#BE185D", accent: "#EC4899" },
};

export const SUBJECT_COLORS = [
  "#93C5FD","#BAE6FD","#A5F3FC","#6EE7B7","#86EFAC",
  "#D9F99D","#FDE68A","#FCA5A5","#FBCFE8","#C4B5FD",
  "#DDD6FE","#E9D5FF","#FED7AA","#FECACA","#A7F3D0",
  "#BFDBFE","#F9A8D4","#BBF7D0","#F0ABFC","#FEF08A",
];

export const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 24; h++)
  for (let m = 0; m < 60; m += 30)
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

// ─── Nav items ────────────────────────────────────────────────────────────────

export const NAV_ITEMS = [
  { href: "/",         label: "Dashboard" },
  { href: "/tasks",    label: "Tasks"     },
  { href: "/homework", label: "Homework"  },
  { href: "/exams",    label: "Exams"     },
  { href: "/calendar", label: "Calendar"  },
] as const;

// ─── Icons ────────────────────────────────────────────────────────────────────

export const Ico = {
  check:  () => <svg width="9" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 3L3.5 5.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  trash:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M8 6V4H16V6M19 6L18.1 19.1C18 20.2 17.1 21 16 21H8C6.9 21 6 20.2 5.9 19.1L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  menu:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  x:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chevR:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chevD:  () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  clock:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7V12.5L15 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  home:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.55 5.45 21 6 21H9M19 10L21 12M19 10V20C19 20.55 18.55 21 18 21H15M9 21V15C9 15 9 15 12 15C15 15 15 15 15 21M9 21H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  tasks:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  book:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 6.25V19.25M12 6.25C10.83 5.48 9.25 5 7.5 5C5.75 5 4.17 5.48 3 6.25V19.25C4.17 18.48 5.75 18 7.5 18C9.25 18 10.83 18.48 12 19.25M12 6.25C13.17 5.48 14.75 5 16.5 5C18.25 5 19.83 5.48 21 6.25V19.25C19.83 18.48 18.25 18 16.5 18C14.75 18 13.17 18.48 12 19.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  exam:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12H15M9 16H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cal:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M8 2V6M16 2V6M3 10H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M8 14H8.01M12 14H12.01M16 14H16.01M8 18H8.01M12 18H12.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
};

const NAV_ICONS: Record<string, () => React.ReactElement> = {
  "/":         Ico.home,
  "/tasks":    Ico.tasks,
  "/homework": Ico.book,
  "/exams":    Ico.exam,
  "/calendar": Ico.cal,
};

// ─── PropChip ─────────────────────────────────────────────────────────────────

export function QuestionGrid({ total, completed, accent, onChange }: {
  total: number; completed: number; accent: string; onChange: (n: number) => void;
}) {
  const cap = Math.min(total, 50);
  return (
    <div className="flex items-center flex-wrap gap-0.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
      {Array.from({ length: cap }).map((_, i) => {
        const done = i < completed;
        return (
          <button key={i} onClick={() => onChange(done ? i : i + 1)}
            className="w-3.5 h-3.5 rounded-sm transition-all active:scale-90"
            style={{ background: done ? accent : "transparent", border: `1.5px solid ${done ? accent : N.border}` }} />
        );
      })}
      {total > 50 && <span className="text-[10px] ml-0.5" style={{ color: N.muted }}>+{total - 50}</span>}
      <span className="text-[11px] ml-1.5 tabular-nums font-medium" style={{ color: completed >= total && total > 0 ? accent : N.muted }}>
        {completed}/{total}
      </span>
    </div>
  );
}

export function PropChip({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium"
      style={{ background: bg, color }}>
      {children}
    </span>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

export function TaskRow({ task, onToggle, onDelete, subjects }: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  subjects?: SemesterSubject[];
}) {
  const [hov, setHov] = useState(false);
  const t = TYPES[task.type] ?? TYPES.personal;
  const subjectColor = subjects?.find((s) => s.name === task.subject)?.color;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors"
      style={{ background: hov ? N.hover : "transparent" }}>
      <button onClick={() => onToggle(task.id)}
        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
        style={task.done
          ? { background: N.muted, borderColor: N.muted }
          : { background: "transparent", borderColor: N.border }}>
        {task.done && <Ico.check />}
      </button>
      <span className="flex-1 text-[13px] min-w-0 truncate"
        style={{ color: task.done ? N.muted : N.text, textDecoration: task.done ? "line-through" : "none" }}>
        {task.name}
      </span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {subjectColor && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: subjectColor }} />
        )}
        {task.subject && (
          <span className="text-[11px] hidden sm:block" style={{ color: N.muted }}>{task.subject}</span>
        )}
        <PropChip bg={t.bg} color={t.text}>{t.label}</PropChip>
        {task.deadline && task.deadline !== "No deadline" && (
          <span className="text-[11px] flex items-center gap-1 hidden sm:flex" style={{ color: N.muted }}>
            <Ico.clock />{task.deadline}
          </span>
        )}
        {onDelete && hov && (
          <button onClick={() => onDelete(task.id)} className="transition-colors" style={{ color: N.border }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = N.border)}>
            <Ico.trash />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav({
  semesters, activeSemesterId, onSwitchSemester, onCreateSemester, onDeleteSemester, onClose,
}: {
  semesters: Semester[];
  activeSemesterId: string | null;
  onSwitchSemester: (id: string) => void;
  onCreateSemester: () => void;
  onDeleteSemester: (id: string) => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [semOpen, setSemOpen] = useState(false);
  const [hoveredSemId, setHoveredSemId] = useState<string | null>(null);
  const activeSem = semesters.find((s) => s.id === activeSemesterId);

  return (
    <div className="flex flex-col h-full py-4 px-3" style={{ background: N.sidebar }}>
      {/* Workspace header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: N.accent, color: "white" }}>N</div>
          <span className="text-[13px] font-semibold" style={{ color: N.text }}>Neta&apos;s Study</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded transition-colors lg:hidden"
            style={{ color: N.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <Ico.x />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="space-y-0.5 mb-4">
        {NAV_ITEMS.map(({ href, label }) => {
          const IconComp = NAV_ICONS[href];
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={onClose}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors"
              style={{
                background: active ? N.selected : "transparent",
                color: active ? N.accent : N.muted,
                fontWeight: active ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = N.hover; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ color: active ? N.accent : N.muted }}><IconComp /></span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: N.border, margin: "0 4px 12px" }} />

      {/* Semester picker */}
      <div className="relative px-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 px-1.5" style={{ color: N.muted }}>
          Semester
        </p>
        <button onClick={() => setSemOpen(!semOpen)}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors"
          style={{ color: N.text, background: semOpen ? N.hover : "transparent" }}
          onMouseEnter={(e) => { if (!semOpen) e.currentTarget.style.background = N.hover; }}
          onMouseLeave={(e) => { if (!semOpen) e.currentTarget.style.background = "transparent"; }}>
          <span className="truncate">{activeSem ? activeSem.name : "No semester"}</span>
          <span style={{ opacity: 0.5, flexShrink: 0 }}><Ico.chevD /></span>
        </button>

        {semOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 py-1"
            style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 6px 20px rgba(0,0,0,0.10)" }}>
            {semesters.length === 0 && (
              <p className="px-3 py-2 text-[12px]" style={{ color: N.muted }}>No semesters yet</p>
            )}
            {semesters.map((s) => (
              <div key={s.id} className="flex items-center group"
                onMouseEnter={() => setHoveredSemId(s.id)}
                onMouseLeave={() => setHoveredSemId(null)}
                style={{ background: s.id === activeSemesterId ? N.selected : hoveredSemId === s.id ? N.hover : "transparent" }}>
                <button onClick={() => { onSwitchSemester(s.id); setSemOpen(false); }}
                  className="flex-1 text-left px-3 py-2 text-[13px]"
                  style={{ color: N.text }}>
                  {s.name}
                </button>
                {hoveredSemId === s.id && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteSemester(s.id); setSemOpen(false); }}
                    className="px-2 py-2 transition-colors" style={{ color: N.muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
                    <Ico.trash />
                  </button>
                )}
              </div>
            ))}
            <div style={{ height: 1, background: N.border, margin: "4px 0" }} />
            <button onClick={() => { onCreateSemester(); setSemOpen(false); }}
              className="w-full text-left px-3 py-2 text-[13px] transition-colors"
              style={{ color: N.accent }}
              onMouseEnter={(e) => (e.currentTarget.style.background = N.accentBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              + New Semester
            </button>
          </div>
        )}
      </div>

      {/* User at bottom */}
      <div className="mt-auto pt-3">
        <div style={{ height: 1, background: N.border, marginBottom: 8 }} />
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-default"
          onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: N.accent, color: "white" }}>N</div>
          <span className="text-[13px]" style={{ color: N.text }}>Neta</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page shell (sidebar + main) ──────────────────────────────────────────────

export function PageShell({
  title, semesters, activeSemesterId, onSwitchSemester, onCreateSemester, onDeleteSemester,
  drawerOpen, setDrawerOpen, onCreateSemesterModal, children,
}: {
  title: string;
  semesters: Semester[];
  activeSemesterId: string | null;
  onSwitchSemester: (id: string) => void;
  onCreateSemester: () => void;
  onDeleteSemester: (id: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  onCreateSemesterModal?: () => void;
  children: React.ReactNode;
}) {
  const activeSemName = semesters.find((s) => s.id === activeSemesterId)?.name;
  const sidebarProps = {
    semesters, activeSemesterId,
    onSwitchSemester, onCreateSemester: onCreateSemesterModal ?? onCreateSemester,
    onDeleteSemester,
  };

  return (
    <div className="flex min-h-screen" style={{ background: N.bg }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 z-20"
        style={{ background: N.sidebar, borderRight: `1px solid ${N.border}` }}>
        <SidebarNav {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 z-40 flex flex-col lg:hidden drawer-enter"
            style={{ background: N.sidebar, borderRight: `1px solid ${N.border}` }}>
            <SidebarNav {...sidebarProps} onClose={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-56 min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-2 px-4 pt-12 pb-3"
          style={{ borderBottom: `1px solid ${N.border}` }}>
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded transition-colors"
            style={{ color: N.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <Ico.menu />
          </button>
          <span className="text-[15px] font-semibold" style={{ color: N.text }}>{title}</span>
          {activeSemName && (
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded-md" style={{ background: N.hover, color: N.muted }}>
              {activeSemName}
            </span>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}

// ─── Add Task Modal (with subject + date) ─────────────────────────────────────

export function AddTaskModal({ onClose, onAdd, defaultType = "homework", subjects }: {
  onClose: () => void;
  onAdd: (t: Omit<Task, "id" | "done" | "created_at">) => Promise<void>;
  defaultType?: EventType;
  subjects?: SemesterSubject[];
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>(defaultType);
  const [deadline, setDeadline] = useState("");
  const [subject, setSubject] = useState(subjects?.[0]?.name ?? "");
  const [saving, setSaving] = useState(false);

  const title = defaultType === "exam" ? "New Exam" : defaultType === "homework" ? "New Assignment" : "New Task";

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd({
      name: name.trim(),
      type,
      deadline: deadline || "No deadline",
      subject: subject || null,
      semester_id: undefined,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-5 py-5 pb-10 lg:pb-5">
          <h3 className="text-[17px] font-bold mb-4" style={{ color: N.text }}>{title}</h3>
          <div className="space-y-3">
            {/* Name */}
            <input autoFocus type="text" placeholder="Title" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full px-3 py-2.5 rounded-xl text-[14px] outline-none"
              style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />

            {/* Subject picker */}
            {subjects && subjects.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Subject</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setSubject("")}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    style={{
                      background: subject === "" ? N.active : N.hover,
                      color: subject === "" ? N.text : N.muted,
                      border: subject === "" ? `1.5px solid ${N.border}` : "1.5px solid transparent",
                    }}>
                    None
                  </button>
                  {subjects.map((s) => (
                    <button key={s.id} onClick={() => setSubject(s.name)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                      style={{
                        background: subject === s.name ? s.color + "40" : N.hover,
                        color: subject === s.name ? N.text : N.muted,
                        border: subject === s.name ? `1.5px solid ${s.color}` : "1.5px solid transparent",
                      }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Type</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(TYPES) as EventType[]).map((k) => (
                  <button key={k} onClick={() => setType(k)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    style={{
                      background: type === k ? TYPES[k].bg : N.hover,
                      color: type === k ? TYPES[k].text : N.muted,
                      border: type === k ? `1.5px solid ${TYPES[k].accent}` : "1.5px solid transparent",
                    }}>
                    {TYPES[k].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Due date</p>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
            </div>

            <button onClick={handleAdd} disabled={saving || !name.trim()}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: N.text, color: "white" }}>
              {saving ? "Saving…" : `Add ${defaultType === "exam" ? "Exam" : "Assignment"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
