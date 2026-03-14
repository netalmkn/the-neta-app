"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { N, TYPES, toDateStr, PropChip, Ico, QuestionGrid } from "@/lib/shared";
import type { EventType, Task, Semester, SemesterSubject } from "@/lib/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Shared sidebar nav (inline to avoid server/client boundary issues) ───────

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard" },
  { href: "/tasks",     label: "Tasks"     },
  { href: "/homework",  label: "Homework"  },
  { href: "/exams",     label: "Exams"     },
  { href: "/calendar",  label: "Calendar"  },
] as const;

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/":         <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.55 5.45 21 6 21H9M19 10L21 12M19 10V20C19 20.55 18.55 21 18 21H15M9 21V15C9 15 9 15 12 15C15 15 15 15 15 21M9 21H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "/tasks":    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "/homework": <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 6.25V19.25M12 6.25C10.83 5.48 9.25 5 7.5 5C5.75 5 4.17 5.48 3 6.25V19.25C4.17 18.48 5.75 18 7.5 18C9.25 18 10.83 18.48 12 19.25M12 6.25C13.17 5.48 14.75 5 16.5 5C18.25 5 19.83 5.48 21 6.25V19.25C19.83 18.48 18.25 18 16.5 18C14.75 18 13.17 18.48 12 19.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "/exams":    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12H15M9 16H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "/calendar": <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M8 2V6M16 2V6M3 10H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M8 14H8.01M12 14H12.01M16 14H16.01M8 18H8.01M12 18H12.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
};

function Sidebar({ semesters, activeSemesterId, onSwitch, onDelete, onCreate, onClose }: {
  semesters: Semester[];
  activeSemesterId: string | null;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [semOpen, setSemOpen] = useState(false);
  const [hovId, setHovId] = useState<string | null>(null);
  const active = semesters.find((s) => s.id === activeSemesterId);

  return (
    <div className="flex flex-col h-full py-4 px-3" style={{ background: N.sidebar }}>
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
            style={{ background: N.accent, color: "white" }}>N</div>
          <span className="text-[13px] font-semibold" style={{ color: N.text }}>Neta&apos;s Study</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded transition-colors"
            style={{ color: N.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <Ico.x />
          </button>
        )}
      </div>

      <div className="px-1 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 px-1.5" style={{ color: N.muted }}>Semester</p>
        <button onClick={() => setSemOpen(!semOpen)}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors"
          style={{ color: N.text, background: semOpen ? N.hover : "transparent" }}
          onMouseEnter={(e) => { if (!semOpen) e.currentTarget.style.background = N.hover; }}
          onMouseLeave={(e) => { if (!semOpen) e.currentTarget.style.background = "transparent"; }}>
          <span className="truncate">{active ? active.name : "No semester"}</span>
          <span style={{ opacity: 0.5 }}><Ico.chevD /></span>
        </button>
        {semOpen && (
          <div className="mt-1 rounded-xl overflow-hidden py-1"
            style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 6px 20px rgba(0,0,0,0.10)" }}>
            {semesters.map((s) => (
              <div key={s.id} className="flex items-center"
                onMouseEnter={() => setHovId(s.id)} onMouseLeave={() => setHovId(null)}
                style={{ background: s.id === activeSemesterId ? N.selected : hovId === s.id ? N.hover : "transparent" }}>
                <button onClick={() => { onSwitch(s.id); setSemOpen(false); }}
                  className="flex-1 text-left px-3 py-2 text-[13px]" style={{ color: N.text }}>{s.name}</button>
                {hovId === s.id && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); setSemOpen(false); }}
                    className="px-2 py-2 transition-colors" style={{ color: N.muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
                    <Ico.trash />
                  </button>
                )}
              </div>
            ))}
            <div style={{ height: 1, background: N.border, margin: "4px 0" }} />
            <button onClick={() => { onCreate(); setSemOpen(false); }}
              className="w-full text-left px-3 py-2 text-[13px] transition-colors"
              style={{ color: N.accent }}
              onMouseEnter={(e) => (e.currentTarget.style.background = N.accentBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              + New Semester
            </button>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: N.border, margin: "0 4px 12px" }} />
      <nav className="space-y-0.5">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} onClick={onClose}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors"
              style={{ background: isActive ? N.selected : "transparent", color: isActive ? N.accent : N.muted, fontWeight: isActive ? 600 : 400 }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = N.hover; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? N.selected : "transparent"; }}>
              <span style={{ color: isActive ? N.accent : N.muted }}>{NAV_ICONS[href]}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div style={{ height: 1, background: N.border, marginBottom: 8 }} />
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-default"
          onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: N.accent, color: "white" }}>N</div>
          <span className="text-[13px]" style={{ color: N.text }}>Neta</span>
        </div>
      </div>
    </div>
  );
}

// ─── Add Task Modal ────────────────────────────────────────────────────────────

function AddTaskModal({ onClose, onAdd, subjects }: {
  onClose: () => void;
  onAdd: (t: Omit<Task, "id" | "done" | "created_at">) => Promise<void>;
  subjects: SemesterSubject[];
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("homework");
  const [deadline, setDeadline] = useState("");
  const [subject, setSubject] = useState(subjects[0]?.name ?? "");
  const [questions, setQuestions] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const q = parseInt(questions);
    await onAdd({ name: name.trim(), type, deadline: deadline || "No deadline", subject: subject || null, total_questions: q > 0 ? q : null, completed_questions: q > 0 ? 0 : null });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-5 py-5 pb-10 lg:pb-5 space-y-3">
          <h3 className="text-[17px] font-bold" style={{ color: N.text }}>New Task</h3>
          <input autoFocus type="text" placeholder="Title" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-full px-3 py-2.5 rounded-xl text-[14px] outline-none"
            style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />

          {subjects.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Subject</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setSubject("")}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                  style={{ background: subject === "" ? N.active : N.hover, color: N.muted, border: subject === "" ? `1.5px solid ${N.border}` : "1.5px solid transparent" }}>
                  None
                </button>
                {subjects.map((s) => (
                  <button key={s.id} onClick={() => setSubject(s.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    style={{ background: subject === s.name ? s.color + "40" : N.hover, color: subject === s.name ? N.text : N.muted, border: subject === s.name ? `1.5px solid ${s.color}` : "1.5px solid transparent" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Type</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPES) as EventType[]).map((k) => (
                <button key={k} onClick={() => setType(k)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                  style={{ background: type === k ? TYPES[k].bg : N.hover, color: type === k ? TYPES[k].text : N.muted, border: type === k ? `1.5px solid ${TYPES[k].accent}` : "1.5px solid transparent" }}>
                  {TYPES[k].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Due date</p>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
              style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>
              Questions <span style={{ opacity: 0.5, textTransform: "none", letterSpacing: "normal" }}>(optional)</span>
            </p>
            <input type="number" min="1" max="999" placeholder="How many questions?" value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
              style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
          </div>

          <button onClick={save} disabled={saving || !name.trim()}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-40"
            style={{ background: N.text, color: "white" }}>
            {saving ? "Saving…" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete, onUpdateQuestions, subjects }: {
  task: Task; onToggle: (id: string) => void; onDelete: (id: string) => void;
  onUpdateQuestions?: (id: string, n: number) => void; subjects: SemesterSubject[];
}) {
  const [hov, setHov] = useState(false);
  const t = TYPES[task.type] ?? TYPES.personal;
  const subColor = subjects.find((s) => s.name === task.subject)?.color;
  const hasQ = (task.total_questions ?? 0) > 0;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="px-3 py-2.5 rounded-xl transition-colors border"
      style={{ background: hov ? N.hover : N.bg, borderColor: N.border }}>
      <div className="flex items-center gap-2.5">
        <button onClick={() => onToggle(task.id)}
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
          style={task.done ? { background: N.muted, borderColor: N.muted } : { background: "transparent", borderColor: N.border }}>
          {task.done && <Ico.check />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] truncate" style={{ color: task.done ? N.muted : N.text, textDecoration: task.done ? "line-through" : "none" }}>
            {task.name}
          </p>
          {task.subject && (
            <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: N.muted }}>
              {subColor && <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: subColor }} />}
              {task.subject}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <PropChip bg={t.bg} color={t.text}>{t.label}</PropChip>
          {task.deadline && task.deadline !== "No deadline" && (
            <span className="text-[11px] hidden sm:flex items-center gap-1" style={{ color: N.muted }}>
              <Ico.clock />{task.deadline}
            </span>
          )}
          {hov && (
            <button onClick={() => onDelete(task.id)} className="transition-colors" style={{ color: N.border }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = N.border)}>
              <Ico.trash />
            </button>
          )}
        </div>
      </div>
      {hasQ && onUpdateQuestions && !task.done && (
        <div className="mt-1 ml-6">
          <QuestionGrid total={task.total_questions!} completed={task.completed_questions ?? 0} accent={t.accent} onChange={(n) => onUpdateQuestions(task.id, n)} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const today = toDateStr(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SemesterSubject[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("semesters").select("*").order("created_at").then(({ data }) => {
      if (data && data.length > 0) {
        setSemesters(data as Semester[]);
        setActiveSemesterId(data[data.length - 1].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!activeSemesterId) { setSubjects([]); return; }
    supabase.from("semester_subjects").select("*").eq("semester_id", activeSemesterId).order("created_at")
      .then(({ data }) => { if (data) setSubjects(data as SemesterSubject[]); });
  }, [activeSemesterId]);

  useEffect(() => {
    setLoading(true);
    const q = activeSemesterId
      ? supabase.from("tasks").select("*").eq("semester_id", activeSemesterId).order("created_at")
      : supabase.from("tasks").select("*").is("semester_id", null).order("created_at");
    q.then(({ data }) => { if (data) setTasks(data as Task[]); setLoading(false); });
  }, [activeSemesterId]);

  const deleteSemester = async (id: string) => {
    await supabase.from("semesters").delete().eq("id", id);
    setSemesters((p) => {
      const remaining = p.filter((s) => s.id !== id);
      if (activeSemesterId === id) {
        const next = remaining[remaining.length - 1] ?? null;
        setActiveSemesterId(next?.id ?? null);
        setTasks([]);
      }
      return remaining;
    });
  };

  const addTask = async (task: Omit<Task, "id" | "done" | "created_at">) => {
    const { data } = await supabase.from("tasks").insert({ ...task, done: false, semester_id: activeSemesterId }).select().single();
    if (data) setTasks((p) => [...p, data as Task]);
    setModal(false);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((p) => p.map((t) => t.id === id ? { ...t, done: newDone } : t));
    await supabase.from("tasks").update({ done: newDone }).eq("id", id);
  };

  const deleteTask = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const updateTaskQuestions = async (id: string, completed: number) => {
    setTasks((p) => p.map((t) => t.id === id ? { ...t, completed_questions: completed } : t));
    await supabase.from("tasks").update({ completed_questions: completed }).eq("id", id);
  };

  const filtered = useMemo(() =>
    filterSubject ? tasks.filter((t) => t.subject === filterSubject) : tasks,
    [tasks, filterSubject]
  );
  const undone = useMemo(() => filtered.filter((t) => !t.done), [filtered]);
  const done  = useMemo(() => filtered.filter((t) =>  t.done), [filtered]);

  const activeSemName = semesters.find((s) => s.id === activeSemesterId)?.name;

  const sidebarProps = {
    semesters, activeSemesterId,
    onSwitch: (id: string) => { setActiveSemesterId(id); setTasks([]); },
    onDelete: deleteSemester,
    onCreate: () => {},
  };

  return (
    <div className="flex min-h-screen" style={{ background: N.bg }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 z-20"
        style={{ background: N.sidebar, borderRight: `1px solid ${N.border}` }}>
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 z-40 flex flex-col drawer-enter"
            style={{ background: N.sidebar, borderRight: `1px solid ${N.border}` }}>
            <Sidebar {...sidebarProps} onClose={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      <main className="flex-1 lg:ml-56 min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-2 px-4 pt-12 pb-3" style={{ borderBottom: `1px solid ${N.border}` }}>
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded transition-colors" style={{ color: N.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <Ico.menu />
          </button>
          <span className="text-[15px] font-semibold" style={{ color: N.text }}>Tasks</span>
          {activeSemName && <span className="ml-auto text-[11px] px-2 py-0.5 rounded-md" style={{ background: N.hover, color: N.muted }}>{activeSemName}</span>}
        </div>

        <div className="max-w-3xl mx-auto px-4 lg:px-12 py-8 pb-28 lg:pb-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[24px] font-bold" style={{ color: N.text }}>All Tasks</h1>
              {activeSemName && <p className="text-[13px] mt-0.5" style={{ color: N.muted }}>{activeSemName}</p>}
            </div>
            <button onClick={() => setModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
              style={{ background: N.accent, color: "white", boxShadow: "0 2px 8px rgba(60,150,217,0.35)" }}>
              <Ico.plus /> New task
            </button>
          </div>

          {/* Subject filter pills */}
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              <button onClick={() => setFilterSubject(null)}
                className="px-3 py-1 rounded-full text-[12px] font-semibold transition-colors"
                style={{ background: filterSubject === null ? N.accent : N.hover, color: filterSubject === null ? "white" : N.muted }}>
                All
              </button>
              {subjects.map((s) => (
                <button key={s.id} onClick={() => setFilterSubject(filterSubject === s.name ? null : s.name)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-colors"
                  style={{ background: filterSubject === s.name ? s.color + "60" : N.hover, color: filterSubject === s.name ? N.text : N.muted, border: filterSubject === s.name ? `1.5px solid ${s.color}` : "1.5px solid transparent" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}
                </button>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total",     value: filtered.length,    bg: "#DBEAFE", num: "#1D4ED8" },
              { label: "Remaining", value: undone.length,      bg: "#FFF7ED", num: "#EA580C" },
              { label: "Done",      value: done.length,        bg: "#F0FDF4", num: "#16A34A" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl px-4 py-3" style={{ background: s.bg }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>{s.label}</p>
                <p className="text-[22px] font-bold leading-none" style={{ color: s.num }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Due today */}
          {undone.filter((t) => t.deadline === today).length > 0 && (
            <div className="mb-5 p-3 rounded-2xl" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#EA580C" }}>Due Today</p>
              <div className="space-y-2">
                {undone.filter((t) => t.deadline === today).map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} onUpdateQuestions={updateTaskQuestions} subjects={subjects} />
                ))}
              </div>
            </div>
          )}

          {/* Pending tasks */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold" style={{ color: N.text }}>
                Pending
                {undone.length > 0 && (
                  <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-md tabular-nums" style={{ background: N.hover, color: N.muted }}>{undone.length}</span>
                )}
              </span>
            </div>
            {loading ? (
              [1,2,3].map((i) => <div key={i} className="h-12 rounded-xl animate-pulse mb-2" style={{ background: N.hover }} />)
            ) : undone.length === 0 ? (
              <p className="text-[13px] py-6 text-center rounded-2xl" style={{ color: N.muted, background: N.hover }}>No pending tasks</p>
            ) : (
              <div className="space-y-2">
                {undone.filter((t) => t.deadline !== today).map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} onUpdateQuestions={updateTaskQuestions} subjects={subjects} />
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-1.5 text-[13px] font-semibold mb-3 transition-colors"
                style={{ color: N.muted }}>
                <span style={{ transform: showDone ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>
                  <Ico.chevR />
                </span>
                {done.length} completed
              </button>
              {showDone && (
                <div className="space-y-2 opacity-70">
                  {done.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} onUpdateQuestions={updateTaskQuestions} subjects={subjects} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {modal && <AddTaskModal onClose={() => setModal(false)} onAdd={addTask} subjects={subjects} />}
    </div>
  );
}
