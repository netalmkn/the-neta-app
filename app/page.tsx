"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "homework" | "exam" | "personal" | "project";

interface Task {
  id: string;
  name: string;
  type: EventType;
  deadline: string;
  done: boolean;
  semester_id?: string | null;
  created_at?: string;
}

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  start_time: string;
  end_time: string;
  type: EventType;
  created_at?: string;
}

interface StudyLog {
  id: string;
  subject: string;
  hours: number;
  date: string;
  semester_id?: string | null;
  created_at?: string;
}

interface Semester {
  id: string;
  name: string;
  year: number;
  semester: number;
  created_at?: string;
}

interface SemesterSubject {
  id: string;
  semester_id: string;
  name: string;
  target_hours: number;
  color: string;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getWeekDays(offset: number): Date[] {
  const today = new Date();
  const sun = new Date(today);
  sun.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return d;
  });
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtPomodoro(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 24; h++)
  for (let m = 0; m < 60; m += 30)
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

const DAY3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPES: Record<EventType, { label: string; bg: string; text: string; accent: string; dot: string }> = {
  homework: { label: "Homework", bg: "#EFF6FF", text: "#1D4ED8", accent: "#3B82F6", dot: "#3B82F6" },
  exam:     { label: "Exam",     bg: "#FFF7ED", text: "#C2410C", accent: "#F97316", dot: "#F97316" },
  personal: { label: "Personal", bg: "#F0FDF4", text: "#166534", accent: "#22C55E", dot: "#22C55E" },
  project:  { label: "Project",  bg: "#F5F3FF", text: "#6D28D9", accent: "#8B5CF6", dot: "#8B5CF6" },
};

const SUBJECT_COLORS = [
  "#93C5FD", "#C4B5FD", "#86EFAC", "#FCA5A5", "#FDE68A",
  "#A5F3FC", "#FBCFE8", "#D9F99D", "#FED7AA", "#E9D5FF",
];

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
const CARD_HOVER  = "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)";

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = {
  home:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.55 5.45 21 6 21H9M19 10L21 12M19 10V20C19 20.55 18.55 21 18 21H15M9 21V15C9 15 9 15 12 15C15 15 15 15 15 21M9 21H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  tasks:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  exam:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12H15M9 16H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  notes:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 5H6C4.9 5 4 5.9 4 7V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V13M18.5 2.5C19.3 1.7 20.7 1.7 21.5 2.5C22.3 3.3 22.3 4.7 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check:    () => <svg width="9" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 3L3.5 5.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  menu:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  x:        () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  trash:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M8 6V4H16V6M19 6L18.1 19.1C18 20.2 17.1 21 16 21H8C6.9 21 6 20.2 5.9 19.1L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  play:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 5L19 12L8 19V5Z" fill="currentColor"/></svg>,
  pause:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" fill="currentColor"/></svg>,
  reset:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 4V10H7M20.49 9C19.24 5.46 15.87 3 12 3C7.21 3 3.47 6.81 3.05 11.5M3.51 15C4.76 18.54 8.13 21 12 21C16.79 21 20.53 17.19 20.95 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  fire:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2C12 2 8 7 8 12C8 14.5 9.5 16.5 12 17C14.5 16.5 16 14.5 16 12C16 9 14 6 13 5C13 6.5 12.5 8 11 9C11 7 11.5 4.5 12 2Z" fill="#F97316"/></svg>,
  plusSm:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  chevDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  book:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 6.25C10.83 5.47 9.25 5 7.5 5C5.75 5 4.17 5.47 3 6.25V19.25C4.17 18.47 5.75 18 7.5 18C9.25 18 10.83 18.47 12 19.25M12 6.25C13.17 5.47 14.75 5 16.5 5C18.25 5 19.83 5.47 21 6.25V19.25C19.83 18.47 18.25 18 16.5 18C14.75 18 13.17 18.47 12 19.25M12 6.25V19.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clock:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7V12.5L15 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  trophy:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 21H16M12 17V21M7 4H17L16 11C16 13.2 14.2 15 12 15C9.8 15 8 13.2 8 11L7 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 7H4C4 9 5 11 7 11M17 7H20C20 9 19 11 17 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
};

// ─── Semester Picker (restyled for light sidebar) ─────────────────────────────

function SemesterPicker({ semesters, activeSemesterId, onSwitch, onCreate }: {
  semesters: Semester[];
  activeSemesterId: string | null;
  onSwitch: (id: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = semesters.find((s) => s.id === activeSemesterId);

  return (
    <div className="relative mx-3 mb-4">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors"
        style={{ background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4F46E5" }} />
          <span className="truncate">{active ? active.name : "No semester"}</span>
        </div>
        <span style={{ color: "#9CA3AF", flexShrink: 0, marginLeft: 6 }}><Icon.chevDown /></span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 py-1"
          style={{ background: "white", border: "1px solid #E5E7EB", boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}>
          {semesters.length === 0 && (
            <p className="px-3 py-2 text-[11px]" style={{ color: "#9CA3AF" }}>No semesters yet</p>
          )}
          {semesters.map((s) => (
            <button key={s.id} onClick={() => { onSwitch(s.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[12px] font-medium transition-colors"
              style={{
                background: s.id === activeSemesterId ? "#EEF2FF" : "transparent",
                color: s.id === activeSemesterId ? "#4F46E5" : "#374151",
              }}>
              {s.name}
            </button>
          ))}
          <div style={{ borderTop: "1px solid #F3F4F6", marginTop: 2, paddingTop: 2 }}>
            <button onClick={() => { onCreate(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[12px] font-semibold transition-colors"
              style={{ color: "#4F46E5" }}>
              + New Semester
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/",        label: "Dashboard", icon: Icon.home  },
  { href: "/tasks",   label: "Tasks",     icon: Icon.tasks },
  { href: "/homework",label: "Homework",  icon: Icon.notes },
  { href: "/exams",   label: "Exams",     icon: Icon.exam  },
] as const;

function SidebarContent({ semesters, activeSemesterId, onSwitchSemester, onCreateSemester, onClose }: {
  semesters: Semester[];
  activeSemesterId: string | null;
  onSwitchSemester: (id: string) => void;
  onCreateSemester: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full py-5" style={{ borderRight: "1px solid #F3F4F6" }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#4F46E5" }}>
            <Icon.book />
          </div>
          <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "#111827" }}>StudyPlan</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors lg:hidden" style={{ color: "#6B7280" }}>
            <Icon.x />
          </button>
        )}
      </div>

      {/* Semester picker */}
      <SemesterPicker
        semesters={semesters}
        activeSemesterId={activeSemesterId}
        onSwitch={onSwitchSemester}
        onCreate={onCreateSemester}
      />

      {/* Section label */}
      <p className="px-5 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#C4C4C4" }}>Menu</p>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Ic }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: active ? "#EEF2FF" : "transparent",
                color: active ? "#4F46E5" : "#6B7280",
              }}>
              <span className={active ? "" : "opacity-60"}><Ic /></span>
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#4F46E5" }} />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="mx-3 mt-4 p-3 rounded-xl flex items-center gap-3" style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: "#4F46E5", color: "white" }}>
          N
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-none truncate" style={{ color: "#111827" }}>Neta</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>Student</p>
        </div>
      </div>
    </div>
  );
}

// ─── Create Semester Modal ────────────────────────────────────────────────────

function CreateSemesterModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, year: number, semester: number, subjects: { name: string; target_hours: number; color: string }[]) => Promise<void>;
}) {
  const [year, setYear] = useState(1);
  const [sem, setSem] = useState(1);
  const [subjects, setSubjects] = useState([
    { name: "", target_hours: 4, color: SUBJECT_COLORS[0] },
    { name: "", target_hours: 4, color: SUBJECT_COLORS[1] },
    { name: "", target_hours: 4, color: SUBJECT_COLORS[2] },
  ]);
  const [saving, setSaving] = useState(false);

  const semName = `Year ${year} · Semester ${sem}`;

  const update = (i: number, field: string, value: string | number) =>
    setSubjects((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const handleCreate = async () => {
    const valid = subjects.filter((s) => s.name.trim());
    setSaving(true);
    await onCreate(semName, year, sem, valid);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-lg bg-white rounded-t-3xl lg:rounded-2xl px-5 pt-5 pb-10 lg:pb-6 shadow-2xl overflow-y-auto" style={{ maxHeight: "92vh" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5 lg:hidden" style={{ background: "#E5E7EB" }} />
        <h3 className="text-[20px] font-bold" style={{ color: "#111827" }}>New Semester</h3>
        <p className="text-[13px] mb-5 font-semibold" style={{ color: "#4F46E5" }}>{semName}</p>

        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#9CA3AF" }}>Year</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((y) => (
              <button key={y} onClick={() => setYear(y)}
                className="flex-1 py-2.5 rounded-xl text-[14px] font-bold transition active:scale-95"
                style={{ background: year === y ? "#4F46E5" : "#F3F4F6", color: year === y ? "white" : "#6B7280" }}>
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#9CA3AF" }}>Semester</p>
          <div className="flex gap-2">
            {[1, 2].map((s) => (
              <button key={s} onClick={() => setSem(s)}
                className="flex-1 py-2.5 rounded-xl text-[14px] font-bold transition active:scale-95"
                style={{ background: sem === s ? "#4F46E5" : "#F3F4F6", color: sem === s ? "white" : "#6B7280" }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#9CA3AF" }}>Subjects</p>
        <div className="space-y-2 mb-3">
          {subjects.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{ background: s.color }} />
                <select value={s.color} onChange={(e) => update(i, "color", e.target.value)}
                  className="absolute inset-0 opacity-0 w-full cursor-pointer">
                  {SUBJECT_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input type="text" placeholder={`Subject ${i + 1}`} value={s.name}
                onChange={(e) => update(i, "name", e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-[13px] outline-none"
                style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }} />
              <input type="number" min="1" max="20" value={s.target_hours}
                onChange={(e) => update(i, "target_hours", Number(e.target.value))}
                className="w-14 rounded-xl px-2 py-2 text-[13px] text-center outline-none"
                style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }} />
              <span className="text-[10px] w-4 flex-shrink-0" style={{ color: "#9CA3AF" }}>cr</span>
              <button onClick={() => setSubjects((p) => p.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <Icon.x />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setSubjects((p) => [...p, { name: "", target_hours: 4, color: SUBJECT_COLORS[p.length % SUBJECT_COLORS.length] }])}
          className="w-full py-2 rounded-xl text-[12px] font-semibold mb-5 transition border-dashed border-2"
          style={{ borderColor: "#E5E7EB", color: "#9CA3AF" }}>
          + Add Subject
        </button>

        <button onClick={handleCreate} disabled={saving}
          className="w-full py-3.5 rounded-xl text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
          style={{ background: "#4F46E5", color: "white" }}>
          {saving ? "Creating…" : "Create Semester"}
        </button>
      </div>
    </div>
  );
}

// ─── Pomodoro Timer ───────────────────────────────────────────────────────────

function PomodoroTimer() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<"focus" | "short" | "long">("focus");
  const DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [active]);

  const setMode_ = (m: typeof mode) => { setMode(m); setActive(false); setSeconds(DURATIONS[m]); };
  const pct = ((DURATIONS[mode] - seconds) / DURATIONS[mode]) * 100;
  const r = 36;
  const circ = 2 * Math.PI * r;

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold" style={{ color: "#111827" }}>Focus Timer</h3>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "#F3F4F6" }}>
          {(["focus","short","long"] as const).map((m) => (
            <button key={m} onClick={() => setMode_(m)}
              className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all"
              style={{ background: mode === m ? "white" : "transparent", color: mode === m ? "#4F46E5" : "#9CA3AF", boxShadow: mode === m ? CARD_SHADOW : "none" }}>
              {m === "focus" ? "25m" : m === "short" ? "5m" : "15m"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={r} fill="none" stroke="#F3F4F6" strokeWidth="5"/>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#4F46E5" strokeWidth="5"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[16px] font-bold tabular-nums" style={{ color: "#111827" }}>{fmtPomodoro(seconds)}</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-[12px] mb-2" style={{ color: "#6B7280" }}>
            {active ? "Stay focused…" : "Ready to focus?"}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setActive(!active)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
              style={{ background: "#4F46E5", color: "white" }}>
              {active ? <><Icon.pause />Pause</> : <><Icon.play />Start</>}
            </button>
            <button onClick={() => { setActive(false); setSeconds(DURATIONS[mode]); }}
              className="w-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
              style={{ background: "#F3F4F6", color: "#6B7280" }}>
              <Icon.reset />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────

function WeeklyBarChart({ studyLogs }: { studyLogs: StudyLog[] }) {
  const today = new Date();
  // Build Mon–Sun for current week
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });

  const hoursByDay = days.map((d) => {
    const ds = toDateStr(d);
    return studyLogs
      .filter((l) => l.date === ds)
      .reduce((sum, l) => sum + l.hours, 0);
  });

  const maxH = Math.max(...hoursByDay, 1);
  const todayStr = toDateStr(today);

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold" style={{ color: "#111827" }}>Weekly Activity</h3>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
          {hoursByDay.reduce((a, b) => a + b, 0).toFixed(1)}cr this week
        </span>
      </div>
      <div className="flex items-end gap-2" style={{ height: 72 }}>
        {days.map((d, i) => {
          const ds = toDateStr(d);
          const isToday = ds === todayStr;
          const h = hoursByDay[i];
          const barPct = h / maxH;
          const barH = Math.max(barPct * 56, h > 0 ? 6 : 3);
          return (
            <div key={ds} className="flex-1 flex flex-col items-center gap-1.5 justify-end" style={{ height: 72 }}>
              <div className="w-full rounded-t-md transition-all duration-500 flex-shrink-0"
                style={{
                  height: barH,
                  background: isToday ? "#4F46E5" : h > 0 ? "#C7D2FE" : "#F3F4F6",
                  borderRadius: 4,
                }} />
              <span className="text-[10px] font-semibold" style={{ color: isToday ? "#4F46E5" : "#9CA3AF" }}>
                {["M","T","W","T","F","S","S"][i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Study Progress (subjects) ────────────────────────────────────────────────

function StudyProgress({ subjects, weeklyHours, onLogStudy }: {
  subjects: SemesterSubject[];
  weeklyHours: Record<string, number>;
  onLogStudy: () => void;
}) {
  const totalLogged = subjects.reduce((sum, s) => sum + (weeklyHours[s.name] ?? 0), 0);
  const totalTarget = subjects.reduce((sum, s) => sum + s.target_hours, 0);
  const pct = totalTarget > 0 ? Math.min((totalLogged / totalTarget) * 100, 100) : 0;
  const r = 28; const circ = 2 * Math.PI * r;

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold" style={{ color: "#111827" }}>Study Progress</h3>
        <button onClick={onLogStudy}
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95"
          style={{ background: "#EEF2FF", color: "#4F46E5" }}>
          <Icon.plusSm /> Log
        </button>
      </div>

      {subjects.length === 0 ? (
        <p className="text-[12px] text-center py-3" style={{ color: "#D1D5DB" }}>Create a semester to track progress</p>
      ) : (
        <>
          {/* Goal circle + total */}
          <div className="flex items-center gap-4 mb-4 pb-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <div className="relative flex-shrink-0">
              <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="34" cy="34" r={r} fill="none" stroke="#F3F4F6" strokeWidth="5"/>
                <circle cx="34" cy="34" r={r} fill="none" stroke="#4F46E5" strokeWidth="5"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[13px] font-bold" style={{ color: "#111827" }}>{Math.round(pct)}%</span>
              </div>
            </div>
            <div>
              <p className="text-[22px] font-extrabold leading-none" style={{ color: "#111827" }}>{totalLogged.toFixed(1)}<span className="text-[13px] font-semibold ml-0.5" style={{ color: "#9CA3AF" }}>cr</span></p>
              <p className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>of {totalTarget}cr weekly goal</p>
            </div>
          </div>

          {/* Per-subject bars */}
          <div className="space-y-2.5">
            {subjects.map((s) => {
              const logged = weeklyHours[s.name] ?? 0;
              const sPct = Math.min((logged / s.target_hours) * 100, 100);
              return (
                <div key={s.id}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1.5 min-w-0 mr-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[12px] font-medium truncate" style={{ color: "#374151" }}>{s.name}</span>
                    </div>
                    <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: "#9CA3AF" }}>{logged}h</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${sPct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Log Study Modal ──────────────────────────────────────────────────────────

function LogStudyModal({ subjects, onClose, onLog }: {
  subjects: SemesterSubject[];
  onClose: () => void;
  onLog: (subject: string, hours: number, date: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState(subjects[0]?.name ?? "");
  const [hours, setHours] = useState("1");
  const [date, setDate] = useState(toDateStr(new Date()));
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    const h = parseFloat(hours);
    if (!subject || !h || h <= 0) return;
    setSaving(true);
    await onLog(subject, h, date);
    setSaving(false);
  };

  if (subjects.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
        <div className="overlay-enter absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="modal-enter relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-2xl px-5 pt-5 pb-10 lg:pb-6 shadow-2xl">
          <div className="w-10 h-1 rounded-full mx-auto mb-6 lg:hidden" style={{ background: "#E5E7EB" }} />
          <p className="text-[16px] font-semibold text-center py-6" style={{ color: "#6B7280" }}>
            No subjects yet — create a semester first.
          </p>
          <button onClick={onClose} className="w-full py-3 rounded-xl text-[14px] font-semibold" style={{ background: "#F3F4F6", color: "#374151" }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-2xl px-5 pt-5 pb-10 lg:pb-6 shadow-2xl overflow-y-auto" style={{ maxHeight: "90vh" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-6 lg:hidden" style={{ background: "#E5E7EB" }} />
        <h3 className="text-[20px] font-bold mb-5" style={{ color: "#111827" }}>Log Study Session</h3>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9CA3AF" }}>Subject</p>
            <div className="grid grid-cols-1 gap-1.5">
              {subjects.map((s) => (
                <button key={s.id} onClick={() => setSubject(s.name)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-left transition active:scale-95"
                  style={{
                    background: subject === s.name ? s.color + "30" : "#F9FAFB",
                    border: subject === s.name ? `2px solid ${s.color}` : "2px solid transparent",
                    color: "#111827",
                  }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  {s.name}
                  <span className="ml-auto text-[11px]" style={{ color: "#9CA3AF" }}>goal: {s.target_hours}cr/wk</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9CA3AF" }}>Credits studied</p>
            <div className="flex items-center gap-2">
              {[0.5, 1, 1.5, 2, 3].map((h) => (
                <button key={h} onClick={() => setHours(String(h))}
                  className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition active:scale-95"
                  style={{ background: hours === String(h) ? "#4F46E5" : "#F3F4F6", color: hours === String(h) ? "white" : "#6B7280" }}>
                  {h}cr
                </button>
              ))}
            </div>
            <input type="number" min="0.1" max="12" step="0.1" placeholder="Custom…" value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="mt-2 w-full rounded-xl px-4 py-2.5 text-[13px] outline-none"
              style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9CA3AF" }}>Date</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none"
              style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }} />
          </div>
          <button onClick={handleLog} disabled={saving || !subject || !hours || parseFloat(hours) <= 0}
            className="w-full py-3.5 rounded-xl text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "#4F46E5", color: "white" }}>
            {saving ? "Saving…" : "Log Session"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string) => void; onDelete?: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const t = TYPES[task.type] ?? TYPES.personal;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: "white",
        boxShadow: hovered ? CARD_HOVER : CARD_SHADOW,
        opacity: task.done ? 0.6 : 1,
      }}>
      {/* Checkbox */}
      <button onClick={() => onToggle(task.id)}
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all active:scale-90"
        style={task.done ? { background: "#22C55E", borderColor: "#22C55E" } : { borderColor: "#D1D5DB" }}>
        {task.done && <Icon.check />}
      </button>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate"
          style={{ color: task.done ? "#9CA3AF" : "#111827", textDecoration: task.done ? "line-through" : "none" }}>
          {task.name}
        </p>
        {task.deadline !== "No deadline" && (
          <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "#9CA3AF" }}>
            <Icon.clock />{task.deadline}
          </p>
        )}
      </div>
      {/* Badge */}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: t.bg, color: t.text }}>
        {t.label}
      </span>
      {/* Delete */}
      {onDelete && (
        <button onClick={() => onDelete(task.id)}
          className="opacity-0 transition-opacity flex-shrink-0"
          style={{ opacity: hovered ? 1 : 0, color: "#D1D5DB" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#D1D5DB")}>
          <Icon.trash />
        </button>
      )}
    </div>
  );
}

// ─── Weekly Calendar Strip ────────────────────────────────────────────────────

function WeekStrip({ weekOffset, setWeekOffset, selectedDate, onSelectDate, eventCounts }: {
  weekOffset: number; setWeekOffset: (n: number) => void;
  selectedDate: string; onSelectDate: (d: string) => void;
  eventCounts: Record<string, number>;
}) {
  const todayStr = toDateStr(new Date());
  const days = getWeekDays(weekOffset);
  return (
    <div className="bg-white rounded-2xl p-4" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-bold" style={{ color: "#111827" }}>
          {MON3[days[0].getMonth()]} {days[0].getDate()} – {MON3[days[6].getMonth()]} {days[6].getDate()}
        </p>
        <div className="flex gap-1">
          {[-1, 1].map((dir) => (
            <button key={dir} onClick={() => setWeekOffset(weekOffset + dir)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: "#9CA3AF" }}>
              {dir === -1
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const ds = toDateStr(day);
          const isToday = ds === todayStr;
          const isSel = ds === selectedDate;
          const count = eventCounts[ds] ?? 0;
          return (
            <button key={ds} onClick={() => onSelectDate(ds)}
              className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-90"
              style={{ background: isSel ? "#4F46E5" : isToday ? "#EEF2FF" : "transparent" }}>
              <span className="text-[10px] font-semibold uppercase"
                style={{ color: isSel ? "rgba(255,255,255,0.7)" : "#9CA3AF" }}>
                {DAY3[day.getDay()].slice(0, 1)}
              </span>
              <span className="text-[15px] font-bold"
                style={{ color: isSel ? "white" : isToday ? "#4F46E5" : "#374151" }}>
                {day.getDate()}
              </span>
              {count > 0 ? (
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isSel ? "rgba(255,255,255,0.6)" : "#4F46E5" }} />
              ) : <span className="w-1.5 h-1.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── FAB ──────────────────────────────────────────────────────────────────────

function FAB({ onAddTask, onAddExam, onAddEvent }: { onAddTask: () => void; onAddExam: () => void; onAddEvent: () => void }) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: "Add Task",  color: "#3B82F6", action: onAddTask },
    { label: "Add Exam",  color: "#F97316", action: onAddExam },
    { label: "Add Event", color: "#8B5CF6", action: onAddEvent },
  ];
  return (
    <div className="fixed right-5 z-40 flex flex-col-reverse items-end gap-2" style={{ bottom: "calc(80px + 1rem)" }}>
      {open && options.map((opt, i) => (
        <div key={opt.label} className="fab-option flex items-center gap-2" style={{ animationDelay: `${i * 40}ms` }}>
          <span className="text-[12px] font-semibold bg-white px-3 py-1.5 rounded-full"
            style={{ color: "#374151", boxShadow: CARD_SHADOW }}>
            {opt.label}
          </span>
          <button onClick={() => { opt.action(); setOpen(false); }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90"
            style={{ background: opt.color, boxShadow: "0 2px 10px rgba(0,0,0,0.18)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      ))}
      <button onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
        style={{ background: "#4F46E5", boxShadow: "0 4px 20px rgba(79,70,229,0.40)", transform: open ? "rotate(45deg)" : "none" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function AddTaskModal({ onClose, onAdd, defaultType = "homework" }: {
  onClose: () => void;
  onAdd: (t: Omit<Task, "id" | "done" | "created_at">) => Promise<void>;
  defaultType?: EventType;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>(defaultType);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd({ name: name.trim(), type, deadline: deadline.trim() || "No deadline" });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-2xl px-5 pt-5 pb-10 lg:pb-6 shadow-2xl">
        <div className="w-10 h-1 rounded-full mx-auto mb-6 lg:hidden" style={{ background: "#E5E7EB" }} />
        <h3 className="text-[20px] font-bold mb-5" style={{ color: "#111827" }}>New Task</h3>
        <div className="space-y-3">
          <input autoFocus type="text" placeholder="Task name" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-full rounded-xl px-4 py-3 text-[14px] outline-none"
            style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }} />
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPES) as EventType[]).map((k) => (
              <button key={k} onClick={() => setType(k)}
                className="py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition active:scale-95"
                style={{ background: TYPES[k].bg, color: TYPES[k].text,
                  border: type === k ? `2px solid ${TYPES[k].accent}` : "2px solid transparent",
                  opacity: type === k ? 1 : 0.5 }}>
                {TYPES[k].label}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Deadline (e.g. Friday 5 PM)" value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-[14px] outline-none"
            style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }} />
          <button onClick={handleAdd} disabled={saving || !name.trim()}
            className="w-full py-3.5 rounded-xl text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "#4F46E5", color: "white" }}>
            {saving ? "Saving…" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddEventModal({ date, onClose, onAdd }: {
  date: string;
  onClose: () => void;
  onAdd: (e: Omit<CalendarEvent, "id" | "created_at">) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("personal");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md bg-white rounded-t-3xl lg:rounded-2xl px-5 pt-5 pb-10 lg:pb-6 shadow-2xl">
        <div className="w-10 h-1 rounded-full mx-auto mb-6 lg:hidden" style={{ background: "#E5E7EB" }} />
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#9CA3AF" }}>{label}</p>
        <h3 className="text-[20px] font-bold mb-5" style={{ color: "#111827" }}>New Event</h3>
        <div className="space-y-3">
          <input autoFocus type="text" placeholder="Event title" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-[14px] outline-none"
            style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }} />
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPES) as EventType[]).map((k) => (
              <button key={k} onClick={() => setType(k)}
                className="py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition active:scale-95"
                style={{ background: TYPES[k].bg, color: TYPES[k].text,
                  border: type === k ? `2px solid ${TYPES[k].accent}` : "2px solid transparent",
                  opacity: type === k ? 1 : 0.5 }}>
                {TYPES[k].label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([["Start", startTime, setStartTime], ["End", endTime, setEndTime]] as const).map(([lbl, val, set]) => (
              <div key={lbl}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#9CA3AF" }}>{lbl}</p>
                <select value={val} onChange={(e) => set(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                  style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", color: "#111827" }}>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={async () => { if (!title.trim()) return; setSaving(true); await onAdd({ date, title: title.trim(), start_time: startTime, end_time: endTime, type }); setSaving(false); }}
            disabled={saving || !title.trim()}
            className="w-full py-3.5 rounded-xl text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "#4F46E5", color: "white" }}>
            {saving ? "Saving…" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SemesterSubject[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);

  const [tasksLoading, setTasksLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<null | "task" | "exam" | "event" | "study" | "semester">(null);

  useEffect(() => {
    supabase.from("semesters").select("*").order("created_at", { ascending: true })
      .then(({ data }) => {
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
    setTasksLoading(true);
    const q = activeSemesterId
      ? supabase.from("tasks").select("*").eq("semester_id", activeSemesterId).order("created_at")
      : supabase.from("tasks").select("*").is("semester_id", null).order("created_at");
    q.then(({ data }) => { if (data) setTasks(data as Task[]); setTasksLoading(false); });
  }, [activeSemesterId]);

  useEffect(() => {
    if (!activeSemesterId) { setStudyLogs([]); return; }
    supabase.from("study_logs").select("*").eq("semester_id", activeSemesterId).order("date", { ascending: false })
      .then(({ data }) => { if (data) setStudyLogs(data as StudyLog[]); });
  }, [activeSemesterId]);

  useEffect(() => {
    supabase.from("calendar_entries").select("*").order("start_time")
      .then(({ data }) => { if (data) setEvents(data as CalendarEvent[]); });
  }, []);

  const switchSemester = (id: string) => {
    setActiveSemesterId(id);
    setTasks([]);
    setStudyLogs([]);
  };

  const createSemester = async (
    name: string, year: number, semester: number,
    newSubjects: { name: string; target_hours: number; color: string }[]
  ) => {
    const { data: semData } = await supabase.from("semesters").insert({ name, year, semester }).select().single();
    if (!semData) return;
    const sem = semData as Semester;
    setSemesters((p) => [...p, sem]);
    setActiveSemesterId(sem.id);
    setTasks([]);
    setStudyLogs([]);
    if (newSubjects.length > 0) {
      const { data: subData } = await supabase.from("semester_subjects")
        .insert(newSubjects.map((s) => ({ ...s, semester_id: sem.id }))).select();
      if (subData) setSubjects(subData as SemesterSubject[]);
    }
    setModal(null);
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    await supabase.from("tasks").update({ done: newDone }).eq("id", id);
  };

  const addTask = async (task: Omit<Task, "id" | "done" | "created_at">) => {
    const { data } = await supabase.from("tasks")
      .insert({ ...task, done: false, semester_id: activeSemesterId }).select().single();
    if (data) setTasks((p) => [...p, data as Task]);
    setModal(null);
  };

  const deleteTask = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const addEvent = async (event: Omit<CalendarEvent, "id" | "created_at">) => {
    const { data } = await supabase.from("calendar_entries").insert(event).select().single();
    if (data) setEvents((p) => [...p, data as CalendarEvent].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setModal(null);
  };

  const deleteEvent = async (id: string) => {
    setEvents((p) => p.filter((e) => e.id !== id));
    await supabase.from("calendar_entries").delete().eq("id", id);
  };

  const addStudyLog = async (subject: string, hours: number, date: string) => {
    const { data } = await supabase.from("study_logs")
      .insert({ subject, hours, date, semester_id: activeSemesterId }).select().single();
    if (data) setStudyLogs((p) => [data as StudyLog, ...p]);
    setModal(null);
  };

  // ── Derived ──
  const undoneTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const doneTasks   = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const exams       = useMemo(() => tasks.filter((t) => t.type === "exam" && !t.done), [tasks]);
  const homework    = useMemo(() => tasks.filter((t) => t.type === "homework" && !t.done), [tasks]);

  const eventCounts = useMemo(() => {
    const m: Record<string, number> = {};
    events.forEach((e) => { m[e.date] = (m[e.date] ?? 0) + 1; });
    return m;
  }, [events]);

  const selectedEvents = useMemo(
    () => events.filter((e) => e.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [events, selectedDate]
  );

  const tasksDoneThisWeek = doneTasks.length;

  const weeklyHours = useMemo(() => {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    const map: Record<string, number> = {};
    studyLogs.forEach((l) => {
      const d = new Date(l.date + "T12:00:00");
      if (d >= mon && d <= sun) map[l.subject] = (map[l.subject] ?? 0) + l.hours;
    });
    return map;
  }, [studyLogs]);

  const streak = useMemo(() => {
    const days = new Set(studyLogs.map((l) => l.date));
    let count = 0;
    const d = new Date();
    if (!days.has(toDateStr(d))) d.setDate(d.getDate() - 1);
    while (days.has(toDateStr(d))) { count++; d.setDate(d.getDate() - 1); }
    return count;
  }, [studyLogs]);

  const activeSemesterName = semesters.find((s) => s.id === activeSemesterId)?.name;

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selObj = new Date(selY, selM - 1, selD);

  // ── Stat cards config ──
  const stats = [
    { label: "Tasks Remaining", value: undoneTasks.length, icon: <Icon.tasks />, bg: "#EEF2FF", color: "#4F46E5" },
    { label: "Done This Week",  value: tasksDoneThisWeek,  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>, bg: "#F0FDF4", color: "#16A34A" },
    { label: "Upcoming Exams",  value: exams.length,       icon: <Icon.trophy />, bg: "#FFF7ED", color: "#EA580C" },
    { label: "Day Streak",      value: streak,             icon: <Icon.fire />,   bg: "#FFF1F2", color: "#E11D48" },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "#F7F7F7" }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 z-20 bg-white">
        <SidebarContent
          semesters={semesters}
          activeSemesterId={activeSemesterId}
          onSwitchSemester={switchSemester}
          onCreateSemester={() => setModal("semester")}
        />
      </aside>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden overlay-enter" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 z-40 flex flex-col lg:hidden drawer-enter bg-white">
            <SidebarContent
              semesters={semesters}
              activeSemesterId={activeSemesterId}
              onSwitchSemester={switchSemester}
              onCreateSemester={() => { setModal("semester"); setDrawerOpen(false); }}
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 lg:ml-60 min-h-screen overflow-x-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 pt-12 pb-3 bg-white" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: "#374151" }}>
            <Icon.menu />
          </button>
          <span className="text-[16px] font-extrabold tracking-tight" style={{ color: "#111827" }}>StudyPlan</span>
          {activeSemesterName && (
            <span className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
              {activeSemesterName}
            </span>
          )}
        </div>

        <div className="p-4 lg:p-6 xl:p-8 pb-28 lg:pb-8 max-w-7xl mx-auto">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#9CA3AF" }}>
                {today.toLocaleDateString("en-US", { weekday: "long" })}, {today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <h1 className="text-[26px] lg:text-[30px] font-extrabold tracking-tight leading-tight" style={{ color: "#111827" }}>
                {greet()}, <span style={{ color: "#4F46E5" }}>Neta</span> 👋
              </h1>
            </div>
            {semesters.length === 0 && (
              <button onClick={() => setModal("semester")}
                className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
                style={{ background: "#4F46E5", color: "white" }}>
                <Icon.plusSm /> New Semester
              </button>
            )}
          </div>

          {/* ── No semester banner ── */}
          {semesters.length === 0 && (
            <div className="rounded-2xl p-5 mb-6 flex items-center justify-between"
              style={{ background: "white", border: "2px dashed #E5E7EB", boxShadow: CARD_SHADOW }}>
              <div>
                <p className="text-[14px] font-bold" style={{ color: "#111827" }}>No semester yet</p>
                <p className="text-[12px] mt-0.5" style={{ color: "#9CA3AF" }}>Create one to start tracking your courses and study progress</p>
              </div>
              <button onClick={() => setModal("semester")} className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ background: "#4F46E5", color: "white" }}>
                <Icon.plusSm /> New Semester
              </button>
            </div>
          )}

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 transition-all duration-200"
                style={{ boxShadow: CARD_SHADOW }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = CARD_HOVER)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = CARD_SHADOW)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                </div>
                <p className="text-[28px] font-extrabold leading-none mb-1" style={{ color: "#111827" }}>{s.value}</p>
                <p className="text-[12px] font-medium" style={{ color: "#9CA3AF" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Featured CTA card ── */}
          <div className="rounded-2xl p-5 mb-5 flex items-center justify-between gap-4"
            style={{ background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)", boxShadow: "0 4px 20px rgba(79,70,229,0.30)" }}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                {activeSemesterName ?? "Get started"}
              </p>
              <h2 className="text-[18px] font-extrabold text-white mb-1">Ready to study?</h2>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                Log a session to track your weekly progress
              </p>
            </div>
            <button onClick={() => setModal("study")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1.5px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}>
              <Icon.plusSm /> Log Session
            </button>
          </div>

          {/* ── Main grid: left content + right panel ── */}
          <div className="flex flex-col xl:flex-row gap-5">

            {/* LEFT: Tasks + Calendar + Events */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Tasks section */}
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold" style={{ color: "#111827" }}>Tasks</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                      {undoneTasks.length} remaining
                    </span>
                    <button onClick={() => setModal("task")}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                      style={{ background: "#F3F4F6", color: "#374151" }}>
                      <Icon.plusSm /> Add
                    </button>
                  </div>
                </div>

                {tasksLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "#F9FAFB" }} />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active tasks */}
                    {undoneTasks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#C4C4C4" }}>To do</p>
                        <div className="space-y-2">
                          {undoneTasks.map((t) => <TaskCard key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)}
                        </div>
                      </div>
                    )}
                    {undoneTasks.length === 0 && (
                      <div className="text-center py-6 rounded-xl" style={{ background: "#F9FAFB" }}>
                        <p className="text-[13px]" style={{ color: "#9CA3AF" }}>All done! 🎉</p>
                      </div>
                    )}
                    {/* Done tasks */}
                    {doneTasks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#C4C4C4" }}>Completed</p>
                        <div className="space-y-2">
                          {doneTasks.map((t) => <TaskCard key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Calendar strip */}
              <WeekStrip
                weekOffset={weekOffset} setWeekOffset={setWeekOffset}
                selectedDate={selectedDate} onSelectDate={setSelectedDate}
                eventCounts={eventCounts}
              />

              {/* Events for selected day */}
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold" style={{ color: "#111827" }}>
                    {selObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </h2>
                  <button onClick={() => setModal("event")}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                    style={{ background: "#F3F4F6", color: "#374151" }}>
                    <Icon.plusSm /> Event
                  </button>
                </div>
                {selectedEvents.length === 0 ? (
                  <div className="text-center py-5 rounded-xl" style={{ background: "#F9FAFB" }}>
                    <p className="text-[13px]" style={{ color: "#9CA3AF" }}>No events for this day</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((ev) => {
                      const t = TYPES[ev.type] ?? TYPES.personal;
                      return (
                        <div key={ev.id}
                          className="flex items-center gap-3 p-3 rounded-xl group transition-all"
                          style={{ background: t.bg }}>
                          <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: t.accent }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate" style={{ color: "#111827" }}>{ev.title}</p>
                            <p className="text-[11px]" style={{ color: "#6B7280" }}>
                              {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ""}
                            </p>
                          </div>
                          <button onClick={() => deleteEvent(ev.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: "#9CA3AF" }}>
                            <Icon.trash />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Homework section */}
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold" style={{ color: "#111827" }}>Assignments</h2>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
                    {homework.length}
                  </span>
                </div>
                {homework.length === 0 ? (
                  <div className="text-center py-5 rounded-xl" style={{ background: "#F9FAFB" }}>
                    <p className="text-[13px]" style={{ color: "#9CA3AF" }}>No assignments 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {homework.map((t) => <TaskCard key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT PANEL */}
            <div className="xl:w-[300px] flex-shrink-0 space-y-4">

              {/* Exams panel */}
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold" style={{ color: "#111827" }}>Upcoming Exams</h2>
                  <button onClick={() => setModal("exam")}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                    style={{ background: "#FFF7ED", color: "#EA580C" }}>
                    <Icon.plusSm /> Add
                  </button>
                </div>
                {exams.length === 0 ? (
                  <div className="text-center py-5 rounded-xl" style={{ background: "#FFF7ED" }}>
                    <p className="text-[13px]" style={{ color: "#D97706" }}>No upcoming exams</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exams.map((t) => {
                      // Try to parse deadline for countdown
                      const deadlineText = t.deadline !== "No deadline" ? t.deadline : null;
                      return (
                        <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl group transition-all"
                          style={{ background: "#FFF7ED" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF3C7")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFF7ED")}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: "#F97316" }}>
                            <Icon.trophy />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate" style={{ color: "#111827" }}>{t.name}</p>
                            {deadlineText && (
                              <p className="text-[11px] mt-0.5 font-medium" style={{ color: "#EA580C" }}>{deadlineText}</p>
                            )}
                          </div>
                          <button onClick={() => deleteTask(t.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: "#D97706" }}>
                            <Icon.trash />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pomodoro */}
              <PomodoroTimer />

              {/* Weekly bar chart */}
              <WeeklyBarChart studyLogs={studyLogs} />

              {/* Study progress */}
              <StudyProgress
                subjects={subjects}
                weeklyHours={weeklyHours}
                onLogStudy={() => setModal("study")}
              />

            </div>
          </div>
        </div>
      </main>

      {/* ── FAB (mobile) ── */}
      <div className="lg:hidden">
        <FAB
          onAddTask={() => setModal("task")}
          onAddExam={() => setModal("exam")}
          onAddEvent={() => setModal("event")}
        />
      </div>

      {/* ── Modals ── */}
      {modal === "semester" && <CreateSemesterModal onClose={() => setModal(null)} onCreate={createSemester} />}
      {modal === "task"     && <AddTaskModal onClose={() => setModal(null)} onAdd={addTask} defaultType="homework" />}
      {modal === "exam"     && <AddTaskModal onClose={() => setModal(null)} onAdd={addTask} defaultType="exam" />}
      {modal === "event"    && <AddEventModal date={selectedDate} onClose={() => setModal(null)} onAdd={addEvent} />}
      {modal === "study"    && <LogStudyModal subjects={subjects} onClose={() => setModal(null)} onLog={addStudyLog} />}
    </div>
  );
}
