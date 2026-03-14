"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "homework" | "exam" | "personal" | "project" | "school" | "class" | "errands" | "workout";

interface Task {
  id: string;
  name: string;
  type: EventType;
  deadline: string;
  done: boolean;
  subject?: string | null;
  semester_id?: string | null;
  total_questions?: number | null;
  completed_questions?: number | null;
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
  subject_id: string | null;
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
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
}

interface SemesterSubject {
  id: string;
  semester_id: string;
  name: string;
  credits: number;
  color: string;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(s: string) {
  if (!s || s === "No deadline") return "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

// ─── Notion design tokens ─────────────────────────────────────────────────────

const N = {
  bg:       "#F8F9FA",
  sidebar:  "#FFFFFF",
  text:     "#1E293B",
  muted:    "#7A8FA3",
  border:   "#E2E8EF",
  hover:    "#F1F5F9",
  active:   "#E2ECF5",
  selected: "#D1E4F0",
  accent:   "#3C96D9",
  accentBg: "#EDF5FB",
};

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPES: Record<EventType, { label: string; bg: string; text: string; accent: string }> = {
  homework: { label: "Homework", bg: "#EFF6FF", text: "#1D4ED8", accent: "#3B82F6" },
  exam:     { label: "Exam",     bg: "#FFF0F0", text: "#B91C1C", accent: "#F87171" },
  personal: { label: "Personal", bg: "#F0FDF4", text: "#15803D", accent: "#22C55E" },
  project:  { label: "Project",  bg: "#F5F3FF", text: "#6D28D9", accent: "#8B5CF6" },
  school:   { label: "School",   bg: "#F0F9FF", text: "#0369A1", accent: "#0EA5E9" },
  class:    { label: "Class",    bg: "#EFF6FF", text: "#1E40AF", accent: "#60A5FA" },
  errands:  { label: "Errands",  bg: "#FFF7ED", text: "#C2410C", accent: "#F97316" },
  workout:  { label: "Workout",  bg: "#F0FDF4", text: "#166534", accent: "#4ADE80" },
};

const CAL_TYPES: EventType[] = ["personal", "school", "exam", "class", "errands", "workout"];

const SUBJECT_COLORS = [
  "#93C5FD","#BAE6FD","#A5F3FC","#6EE7B7","#86EFAC",
  "#D9F99D","#FDE68A","#FCA5A5","#FBCFE8","#C4B5FD",
  "#DDD6FE","#E9D5FF","#FED7AA","#FECACA","#A7F3D0",
  "#BFDBFE","#F9A8D4","#BBF7D0","#F0ABFC","#FEF08A",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-full border-2 transition-all"
        style={{ background: value, borderColor: open ? N.accent : "transparent", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-50 p-2 rounded-xl"
            style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", width: 172 }}>
            <div className="grid grid-cols-5 gap-1.5">
              {SUBJECT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: value === c ? `2px solid ${N.accent}` : "2px solid transparent", outlineOffset: 2 }} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Notion-style primitives ──────────────────────────────────────────────────

/** A thin divider exactly like Notion's */
function Divider() {
  return <div style={{ height: 1, background: N.border, margin: "2px 0" }} />;
}

function SectionTitle({ label, count, action }: { label: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap flex-shrink-0" style={{ color: N.muted }}>
        {label}{count !== undefined && count > 0 ? ` · ${count}` : ""}
      </span>
      <div className="flex-1 h-px" style={{ background: N.border }} />
      {action}
    </div>
  );
}

/** Tiny ghost button, Notion-style */
function GhostBtn({ children, onClick, danger }: { children: React.ReactNode; onClick?: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium transition-colors"
      style={{ background: hov ? (danger ? "#FFF1F2" : N.hover) : "transparent", color: danger ? (hov ? "#E11D48" : N.muted) : N.muted }}>
      {children}
    </button>
  );
}

/** Small property chip */
function PropChip({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium"
      style={{ background: bg, color }}>
      {children}
    </span>
  );
}

// ─── Icons (minimal line icons) ───────────────────────────────────────────────

const Ico = {
  check:  () => <svg width="9" height="7"  viewBox="0 0 10 7" fill="none"><path d="M1 3L3.5 5.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  trash:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M8 6V4H16V6M19 6L18.1 19.1C18 20.2 17.1 21 16 21H8C6.9 21 6 20.2 5.9 19.1L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  menu:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  x:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  play:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M8 5L19 12L8 19V5Z" fill="currentColor"/></svg>,
  pause:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" fill="currentColor"/></svg>,
  reset:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M1 4V10H7M20.49 9C19.24 5.46 15.87 3 12 3C7.21 3 3.47 6.81 3.05 11.5M3.51 15C4.76 18.54 8.13 21 12 21C16.79 21 20.53 17.19 20.95 12.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevD:  () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chevL:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chevR:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  clock:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7V12.5L15 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
};

function QuestionGrid({ total, completed, accent, onChange }: {
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

// ─── Semester Picker ──────────────────────────────────────────────────────────

function SemesterPicker({ semesters, activeSemesterId, onSwitch, onCreate, onDelete, onEdit }: {
  semesters: Semester[];
  activeSemesterId: string | null;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onEdit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const active = semesters.find((s) => s.id === activeSemesterId);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[12px] font-medium transition-colors"
        style={{ color: N.muted, background: open ? N.hover : "transparent" }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = N.hover; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">{active ? active.name : "No semester"}</span>
        </div>
        <span style={{ opacity: 0.5, flexShrink: 0 }}><Ico.chevD /></span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-0.5 rounded-lg overflow-hidden z-50 py-1"
          style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
          {semesters.length === 0 && (
            <p className="px-3 py-1.5 text-[12px]" style={{ color: N.muted }}>No semesters yet</p>
          )}
          {semesters.map((s) => (
            <div key={s.id} className="flex items-center group"
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ background: s.id === activeSemesterId ? N.selected : hoveredId === s.id ? N.hover : "transparent" }}>
              <button onClick={() => { onSwitch(s.id); setOpen(false); }}
                className="flex-1 text-left px-3 py-1.5 text-[13px]"
                style={{ color: N.text }}>
                {s.name}
              </button>
              {hoveredId === s.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); setOpen(false); }}
                  className="px-2 py-1.5 transition-colors"
                  style={{ color: N.muted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}
                  title="Delete semester">
                  <Ico.trash />
                </button>
              )}
            </div>
          ))}
          <Divider />
          {onEdit && activeSemesterId && (
            <button onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[13px] transition-colors flex items-center gap-1.5"
              style={{ color: N.muted }}
              onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Edit courses
            </button>
          )}
          <button onClick={() => { onCreate(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-[13px] transition-colors"
            style={{ color: N.accent }}
            onMouseEnter={(e) => (e.currentTarget.style.background = N.accentBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            + New Semester
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard" },
  { href: "/tasks",     label: "Tasks"     },
  { href: "/homework",  label: "Homework"  },
  { href: "/exams",     label: "Exams"     },
  { href: "/calendar",  label: "Calendar"  },
] as const;

const NAV_ICONS_MAP: Record<string, React.ReactNode> = {
  "/":         <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.55 5.45 21 6 21H9M19 10L21 12M19 10V20C19 20.55 18.55 21 18 21H15M9 21V15C9 15 9 15 12 15C15 15 15 15 15 21M9 21H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "/tasks":    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "/homework": <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 6.25V19.25M12 6.25C10.83 5.48 9.25 5 7.5 5C5.75 5 4.17 5.48 3 6.25V19.25C4.17 18.48 5.75 18 7.5 18C9.25 18 10.83 18.48 12 19.25M12 6.25C13.17 5.48 14.75 5 16.5 5C18.25 5 19.83 5.48 21 6.25V19.25C19.83 18.48 18.25 18 16.5 18C14.75 18 13.17 18.48 12 19.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "/exams":    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12H15M9 16H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  "/calendar": <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M8 2V6M16 2V6M3 10H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M8 14H8.01M12 14H12.01M16 14H16.01M8 18H8.01M12 18H12.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>,
};

function SidebarContent({ semesters, activeSemesterId, onSwitchSemester, onCreateSemester, onDeleteSemester, onEditSemester, onClose }: {
  semesters: Semester[];
  activeSemesterId: string | null;
  onSwitchSemester: (id: string) => void;
  onCreateSemester: () => void;
  onDeleteSemester: (id: string) => void;
  onEditSemester?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full py-4 px-3" style={{ background: N.sidebar }}>
      {/* Workspace header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
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

      {/* Semester picker */}
      <div className="px-1 mb-3">
        <div className="flex items-center justify-between mb-1.5 px-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: N.muted }}>Semester</p>
          {activeSemesterId && onEditSemester && (
            <button onClick={onEditSemester}
              className="p-1 rounded transition-colors"
              style={{ color: N.muted }}
              title="Edit courses"
              onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        <SemesterPicker
          semesters={semesters}
          activeSemesterId={activeSemesterId}
          onSwitch={onSwitchSemester}
          onCreate={onCreateSemester}
          onDelete={onDeleteSemester}
          onEdit={onEditSemester}
        />
      </div>

      <div style={{ height: 1, background: N.border, margin: "0 4px 12px" }} />
      <nav className="space-y-0.5">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={onClose}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all"
              style={{ background: active ? N.accent : "transparent", color: active ? "white" : N.muted, fontWeight: active ? 600 : 400, boxShadow: active ? `0 2px 8px ${N.accent}40` : "none" }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = N.hover; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ color: active ? "white" : N.muted }}>{NAV_ICONS_MAP[href]}</span>
              {label}
            </Link>
          );
        })}
      </nav>

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

// ─── Create Semester Modal ────────────────────────────────────────────────────

function CreateSemesterModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, year: number, semester: number, subjects: { name: string; credits: number; color: string }[], startDate: string, endDate: string) => Promise<void>;
}) {
  const [year, setYear] = useState(1);
  const [sem, setSem] = useState(1);
  const [subjects, setSubjects] = useState([
    { name: "", credits: 4, color: SUBJECT_COLORS[0] },
    { name: "", credits: 4, color: SUBJECT_COLORS[1] },
    { name: "", credits: 4, color: SUBJECT_COLORS[2] },
  ]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const semName = `Year ${year} · Semester ${sem}`;
  const update = (i: number, field: string, value: string | number) =>
    setSubjects((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const handleCreate = async () => {
    const valid = subjects.filter((s) => s.name.trim());
    setSaving(true);
    await onCreate(semName, year, sem, valid, startDate, endDate);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-lg rounded-t-2xl lg:rounded-xl overflow-y-auto"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)", maxHeight: "92vh" }}>
        {/* Handle (mobile) */}
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-6 py-5">
          
          <h3 className="text-[18px] font-bold mb-1" style={{ color: N.text }}>New Semester</h3>
          <p className="text-[13px] mb-5" style={{ color: N.muted }}>{semName}</p>

          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Year</p>
          <div className="flex gap-2 mb-4">
            {[1,2,3,4].map((y) => (
              <button key={y} onClick={() => setYear(y)}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors"
                style={{ background: year === y ? N.text : N.hover, color: year === y ? "white" : N.muted }}>
                {y}
              </button>
            ))}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Semester</p>
          <div className="flex gap-2 mb-5">
            {[1,2].map((s) => (
              <button key={s} onClick={() => setSem(s)}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors"
                style={{ background: sem === s ? N.text : N.hover, color: sem === s ? "white" : N.muted }}>
                {s}
              </button>
            ))}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Dates</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {([["Start", startDate, setStartDate], ["End", endDate, setEndDate]] as const).map(([lbl, val, set]) => (
              <div key={lbl}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>{lbl}</p>
                <input type="date" value={val} onChange={(e) => (set as (v: string) => void)(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg text-[13px] outline-none"
                  style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
              </div>
            ))}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Courses</p>
          <div className="space-y-2 mb-3">
            {subjects.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <ColorPicker value={s.color} onChange={(c) => update(i, "color", c)} />
                <input type="text" placeholder={`Course ${i + 1}`} value={s.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[13px] outline-none"
                  style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
                <input type="number" min="1" max="20" value={s.credits}
                  onChange={(e) => update(i, "credits", Number(e.target.value))}
                  className="w-12 px-2 py-1.5 rounded-lg text-[12px] text-center outline-none"
                  style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
                <span className="text-[10px]" style={{ color: N.muted }}>cr</span>
                <button onClick={() => setSubjects((p) => p.filter((_, idx) => idx !== i))}
                  className="transition-colors" style={{ color: N.muted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
                  <Ico.x />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setSubjects((p) => [...p, { name: "", credits: 4, color: SUBJECT_COLORS[p.length % SUBJECT_COLORS.length] }])}
            className="w-full py-1.5 rounded-lg text-[12px] mb-5 transition-colors border-dashed border"
            style={{ borderColor: N.border, color: N.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            + Add course
          </button>

          <button onClick={handleCreate} disabled={saving}
            className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50"
            style={{ background: N.text, color: "white" }}>
            {saving ? "Creating…" : "Create Semester"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Semester Modal ──────────────────────────────────────────────────────

function EditSemesterModal({ semesterName, activeSemester, existingSubjects, onClose, onAddSubjects, onUpdateDates, onUpdateSubject, onDeleteSubject }: {
  semesterName: string;
  activeSemester: Semester;
  existingSubjects: SemesterSubject[];
  onClose: () => void;
  onAddSubjects: (subjects: { name: string; credits: number; color: string }[]) => Promise<void>;
  onUpdateDates: (startDate: string, endDate: string) => Promise<void>;
  onUpdateSubject: (id: string, name: string, credits: number, color: string) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
}) {
  const [editSubjects, setEditSubjects] = useState(existingSubjects.map((s) => ({ ...s })));
  const [newSubjects, setNewSubjects] = useState([
    { name: "", credits: 4, color: SUBJECT_COLORS[existingSubjects.length % SUBJECT_COLORS.length] },
  ]);
  const [startDate, setStartDate] = useState(activeSemester.start_date ?? "");
  const [endDate, setEndDate] = useState(activeSemester.end_date ?? "");
  const [savingDates, setSavingDates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSubjectId, setSavingSubjectId] = useState<string | null>(null);

  const updateEdit = (id: string, field: string, value: string | number) =>
    setEditSubjects((p) => p.map((s) => s.id === id ? { ...s, [field]: value } : s));

  const saveSubject = async (s: typeof editSubjects[0]) => {
    setSavingSubjectId(s.id);
    await onUpdateSubject(s.id, s.name, s.credits, s.color);
    setSavingSubjectId(null);
  };

  const update = (i: number, field: string, value: string | number) =>
    setNewSubjects((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const handleSave = async () => {
    const valid = newSubjects.filter((s) => s.name.trim());
    if (!valid.length) return;
    setSaving(true);
    await onAddSubjects(valid);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-lg rounded-t-2xl lg:rounded-xl overflow-y-auto"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)", maxHeight: "92vh" }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-6 py-5">
          <h3 className="text-[18px] font-bold mb-1" style={{ color: N.text }}>Edit Semester</h3>
          <p className="text-[13px] mb-5" style={{ color: N.muted }}>{semesterName}</p>

          {/* Semester dates */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Semester Dates</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {([["Start", startDate, setStartDate], ["End", endDate, setEndDate]] as const).map(([lbl, val, set]) => (
                <div key={lbl}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>{lbl}</p>
                  <input type="date" value={val} onChange={(e) => (set as (v: string) => void)(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-[13px] outline-none"
                    style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
                </div>
              ))}
            </div>
            <button onClick={async () => { setSavingDates(true); await onUpdateDates(startDate, endDate); setSavingDates(false); }}
              disabled={savingDates}
              className="w-full py-1.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: N.hover, color: N.text }}>
              {savingDates ? "Saving…" : "Save dates"}
            </button>
          </div>

          {/* Existing subjects — editable */}
          {editSubjects.length > 0 && (
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Current Courses</p>
              <div className="space-y-2">
                {editSubjects.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <ColorPicker value={s.color} onChange={(c) => updateEdit(s.id, "color", c)} />
                    <input type="text" value={s.name} onChange={(e) => updateEdit(s.id, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg text-[13px] outline-none"
                      style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
                    <input type="number" min="1" max="20" value={s.credits}
                      onChange={(e) => updateEdit(s.id, "credits", Number(e.target.value))}
                      className="w-12 px-2 py-1.5 rounded-lg text-[12px] text-center outline-none"
                      style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
                    <span className="text-[10px]" style={{ color: N.muted }}>cr</span>
                    <button onClick={() => saveSubject(s)} disabled={savingSubjectId === s.id}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                      style={{ background: N.accentBg, color: N.accent }}>
                      {savingSubjectId === s.id ? "…" : "Save"}
                    </button>
                    <button onClick={() => onDeleteSubject(s.id)} className="transition-colors" style={{ color: N.muted }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
                      <Ico.trash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new subjects */}
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Add Courses</p>
          <div className="space-y-2 mb-3">
            {newSubjects.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <ColorPicker value={s.color} onChange={(c) => update(i, "color", c)} />
                <input type="text" placeholder={`Course name`} value={s.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[13px] outline-none"
                  style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
                <input type="number" min="1" max="20" value={s.credits}
                  onChange={(e) => update(i, "credits", Number(e.target.value))}
                  className="w-12 px-2 py-1.5 rounded-lg text-[12px] text-center outline-none"
                  style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
                <span className="text-[10px]" style={{ color: N.muted }}>cr</span>
                <button onClick={() => setNewSubjects((p) => p.filter((_, idx) => idx !== i))}
                  className="transition-colors" style={{ color: N.muted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
                  <Ico.x />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setNewSubjects((p) => [...p, { name: "", credits: 4, color: SUBJECT_COLORS[(existingSubjects.length + p.length) % SUBJECT_COLORS.length] }])}
            className="w-full py-1.5 rounded-lg text-[12px] mb-5 transition-colors border-dashed border"
            style={{ borderColor: N.border, color: N.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            + Add course
          </button>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
              style={{ background: N.hover, color: N.text }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !newSubjects.some((s) => s.name.trim())}
              className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: N.text, color: "white" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
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
  const r = 20; const circ = 2 * Math.PI * r;

  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: N.hover, border: `1px solid ${N.border}` }}>
      <div className="flex items-center gap-3">
        {/* Tiny ring */}
        <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="22" cy="22" r={r} fill="none" stroke={N.border} strokeWidth="3"/>
            <circle cx="22" cy="22" r={r} fill="none" stroke={N.text} strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[9px] font-bold tabular-nums" style={{ color: N.text }}>{fmtPomodoro(seconds)}</span>
          </div>
        </div>
        {/* Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1.5">
            {(["focus","short","long"] as const).map((m) => (
              <button key={m} onClick={() => setMode_(m)}
                className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
                style={{ background: mode === m ? N.text : "transparent", color: mode === m ? "white" : N.muted }}>
                {m === "focus" ? "25m" : m === "short" ? "5m" : "15m"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setActive(!active)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
              style={{ background: N.text, color: "white" }}>
              {active ? <><Ico.pause />Pause</> : <><Ico.play />Start</>}
            </button>
            <button onClick={() => { setActive(false); setSeconds(DURATIONS[mode]); }}
              className="p-1 rounded transition-colors"
              style={{ color: N.muted }}
              onMouseEnter={(e) => (e.currentTarget.style.background = N.active)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <Ico.reset />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Log Study Modal ──────────────────────────────────────────────────────────

function LogStudyModal({ subjects, onClose, onLog }: {
  subjects: SemesterSubject[];
  onClose: () => void;
  onLog: (subjectId: string, hours: number, date: string) => Promise<void>;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [hours, setHours] = useState("1");
  const [date, setDate] = useState(toDateStr(new Date()));
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    const h = parseFloat(hours);
    if (!subjectId || !h || h <= 0) return;
    setSaving(true);
    await onLog(subjectId, h, date);
    setSaving(false);
  };

  if (subjects.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
        <div className="modal-enter relative rounded-xl px-6 py-5 w-80"
          style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
          <p className="text-[14px] text-center py-4" style={{ color: N.muted }}>
            No courses yet — create a semester first.
          </p>
          <button onClick={onClose} className="w-full py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: N.hover, color: N.text }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md rounded-t-2xl lg:rounded-xl overflow-y-auto"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)", maxHeight: "90vh" }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-5 py-5">
          
          <h3 className="text-[17px] font-bold mb-4" style={{ color: N.text }}>Log Study Session</h3>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Course</p>
              <div className="space-y-1">
                {subjects.map((s) => (
                  <button key={s.id} onClick={() => setSubjectId(s.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
                    style={{ background: subjectId === s.id ? N.selected : "transparent", color: N.text }}
                    onMouseEnter={(e) => { if (subjectId !== s.id) e.currentTarget.style.background = N.hover; }}
                    onMouseLeave={(e) => { if (subjectId !== s.id) e.currentTarget.style.background = "transparent"; }}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Hours studied</p>
              <div className="flex gap-1.5 mb-2">
                {[0.5,1,1.5,2,3].map((h) => (
                  <button key={h} onClick={() => setHours(String(h))}
                    className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
                    style={{ background: hours === String(h) ? N.text : N.hover, color: hours === String(h) ? "white" : N.muted }}>
                    {h}h
                  </button>
                ))}
              </div>
              <input type="number" min="0.1" max="12" step="0.1" placeholder="Custom…" value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-[13px] outline-none"
                style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: N.muted }}>Date</p>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg text-[13px] outline-none"
                style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
            </div>
            <button onClick={handleLog} disabled={saving || !subjectId || parseFloat(hours) <= 0}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: N.text, color: "white" }}>
              {saving ? "Saving…" : "Log Session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Row (Notion database style) ────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete, onUpdateQuestions, subjects }: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateQuestions?: (id: string, n: number) => void;
  subjects?: SemesterSubject[];
}) {
  const [hov, setHov] = useState(false);
  const t = TYPES[task.type] ?? TYPES.personal;
  const hasQ = (task.total_questions ?? 0) > 0;
  const subColor = subjects?.find((s) => s.name === task.subject)?.color ?? t.accent;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="py-3 transition-colors group"
      style={{ borderBottom: `1px solid ${N.border}` }}>
      <div className="flex items-center gap-3">
        {/* Subject color dot */}
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: subColor }} />

        {/* Checkbox */}
        <button onClick={() => onToggle(task.id)}
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
          style={task.done
            ? { background: subColor, borderColor: subColor }
            : { background: "transparent", borderColor: N.border }}>
          {task.done && <Ico.check />}
        </button>

        {/* Name */}
        <span className="flex-1 text-[14px] min-w-0 truncate"
          style={{ color: task.done ? N.muted : N.text, textDecoration: task.done ? "line-through" : "none" }}>
          {task.name}
        </span>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.subject && (
            <span className="text-[12px] hidden sm:block" style={{ color: N.muted }}>{task.subject}</span>
          )}
          <PropChip bg={t.bg} color={t.text}>{t.label}</PropChip>
          {task.deadline !== "No deadline" && (
            <span className="text-[12px] hidden sm:block" style={{ color: N.muted }}>{shortDate(task.deadline)}</span>
          )}
          {onDelete && hov && (
            <button onClick={() => onDelete(task.id)} className="transition-colors opacity-0 group-hover:opacity-100" style={{ color: N.muted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
              <Ico.trash />
            </button>
          )}
        </div>
      </div>

      {/* Question grid */}
      {hasQ && onUpdateQuestions && !task.done && (
        <div className="ml-10 mt-1">
          <QuestionGrid
            total={task.total_questions!}
            completed={task.completed_questions ?? 0}
            accent={subColor}
            onChange={(n) => onUpdateQuestions(task.id, n)}
          />
        </div>
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px]" style={{ color: N.muted }}>
          {MON3[days[0].getMonth()]} {days[0].getDate()} – {MON3[days[6].getMonth()]} {days[6].getDate()}
        </span>
        <div className="flex gap-0.5">
          {[-1,1].map((dir) => (
            <button key={dir} onClick={() => setWeekOffset(weekOffset + dir)}
              className="w-6 h-6 flex items-center justify-center rounded transition-colors"
              style={{ color: N.muted }}
              onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              {dir === -1 ? <Ico.chevL /> : <Ico.chevR />}
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
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors"
              style={{ background: isSel ? N.text : isToday ? N.active : "transparent" }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = N.hover; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = isToday ? N.active : "transparent"; }}>
              <span className="text-[9px] font-semibold uppercase" style={{ color: isSel ? "rgba(255,255,255,0.6)" : N.muted }}>
                {DAY3[day.getDay()].slice(0,1)}
              </span>
              <span className="text-[14px] font-semibold" style={{ color: isSel ? "white" : isToday ? N.text : N.text }}>
                {day.getDate()}
              </span>
              <span className="w-1 h-1 rounded-full" style={{ background: count > 0 ? (isSel ? "rgba(255,255,255,0.5)" : N.accent) : "transparent" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────

function WeeklyBarChart({ studyLogs }: { studyLogs: StudyLog[] }) {
  const today = new Date();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d;
  });

  const hoursByDay = days.map((d) =>
    studyLogs.filter((l) => l.date === toDateStr(d)).reduce((sum, l) => sum + l.hours, 0)
  );
  const maxH = Math.max(...hoursByDay, 0.1);
  const todayStr = toDateStr(today);
  const totalCr = hoursByDay.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <span className="text-[12px]" style={{ color: N.muted }}>Weekly activity</span>
        <span className="text-[12px] font-semibold" style={{ color: N.text }}>{totalCr.toFixed(1)}h</span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 48 }}>
        {days.map((d, i) => {
          const ds = toDateStr(d);
          const isToday = ds === todayStr;
          const h = hoursByDay[i];
          const barH = Math.max((h / maxH) * 36, h > 0 ? 4 : 2);
          return (
            <div key={ds} className="flex-1 flex flex-col items-center gap-1 justify-end" style={{ height: 48 }}>
              <div className="w-full rounded-sm transition-all duration-500"
                style={{ height: barH, background: isToday ? N.text : h > 0 ? "#C4C3BF" : N.border, borderRadius: 3 }} />
              <span className="text-[9px] font-medium" style={{ color: isToday ? N.text : N.muted }}>
                {["M","T","W","T","F","S","S"][i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FAB ──────────────────────────────────────────────────────────────────────

function FAB({ onAddTask, onAddExam, onAddEvent, onLogStudy }: {
  onAddTask: () => void; onAddExam: () => void; onAddEvent: () => void; onLogStudy: () => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: "Log study session", action: onLogStudy },
    { label: "New event",         action: onAddEvent },
    { label: "New exam",          action: onAddExam  },
    { label: "New task",          action: onAddTask  },
  ];
  return (
    <div className="fixed right-5 z-40 flex flex-col-reverse items-end gap-2"
      style={{ bottom: "calc(80px + 1rem)" }}>
      {open && options.map((opt, i) => (
        <button key={opt.label}
          onClick={() => { opt.action(); setOpen(false); }}
          className="fab-option text-[12px] font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
          style={{
            background: "white",
            color: N.text,
            border: `1px solid ${N.border}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
            animationDelay: `${i * 35}ms`,
          }}>
          {opt.label}
        </button>
      ))}
      <button onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90"
        style={{ background: N.accent, boxShadow: `0 4px 16px ${N.accent}50`, transform: open ? "rotate(45deg)" : "none" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function AddTaskModal({ onClose, onAdd, defaultType = "homework", subjects }: {
  onClose: () => void;
  onAdd: (t: Omit<Task, "id" | "done" | "created_at">) => Promise<void>;
  defaultType?: EventType;
  subjects?: SemesterSubject[];
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>(defaultType);
  const [deadline, setDeadline] = useState("");
  const [subject, setSubject] = useState(subjects?.[0]?.name ?? "");
  const [questions, setQuestions] = useState("");
  const [saving, setSaving] = useState(false);

  const modalTitle = defaultType === "exam" ? "New Exam" : defaultType === "homework" ? "New Assignment" : "New Task";

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const q = parseInt(questions);
    await onAdd({
      name: name.trim(), type,
      deadline: deadline || "No deadline",
      subject: subject || null,
      total_questions: q > 0 ? q : null,
      completed_questions: q > 0 ? 0 : null,
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
          <h3 className="text-[17px] font-bold mb-4" style={{ color: N.text }}>{modalTitle}</h3>
          <div className="space-y-3">
            <input autoFocus type="text" placeholder="Title" value={name}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full px-3 py-2.5 rounded-xl text-[14px] outline-none"
              style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />

            {subjects && subjects.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: N.muted }}>Subject</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setSubject("")}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    style={{ background: subject === "" ? N.active : N.hover, color: subject === "" ? N.text : N.muted, border: subject === "" ? `1.5px solid ${N.border}` : "1.5px solid transparent" }}>
                    None
                  </button>
                  {subjects.map((s) => (
                    <button key={s.id} onClick={() => setSubject(s.name)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                      style={{ background: subject === s.name ? s.color + "40" : N.hover, color: subject === s.name ? N.text : N.muted, border: subject === s.name ? `1.5px solid ${s.color}` : "1.5px solid transparent" }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      {s.name}
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
      <div className="overlay-enter absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="modal-enter relative w-full lg:max-w-md rounded-t-2xl lg:rounded-xl"
        style={{ background: N.bg, border: `1px solid ${N.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 lg:hidden" style={{ background: N.border }} />
        <div className="px-5 py-5 pb-10 lg:pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>{label}</p>
          <h3 className="text-[17px] font-bold mb-4" style={{ color: N.text }}>New Event</h3>
          <div className="space-y-3">
            <input autoFocus type="text" placeholder="Event title" value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[14px] outline-none"
              style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }} />
            <div className="flex flex-wrap gap-1.5">
              {CAL_TYPES.map((k) => (
                <button key={k} onClick={() => setType(k)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                  style={{ background: type === k ? TYPES[k].bg : N.hover, color: type === k ? TYPES[k].text : N.muted, border: type === k ? `1.5px solid ${TYPES[k].accent}` : `1.5px solid transparent` }}>
                  {TYPES[k].label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([["Start", startTime, setStartTime], ["End", endTime, setEndTime]] as const).map(([lbl, val, set]) => (
                <div key={lbl}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: N.muted }}>{lbl}</p>
                  <select value={val} onChange={(e) => set(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-[13px] outline-none"
                    style={{ background: N.hover, border: `1px solid ${N.border}`, color: N.text }}>
                    {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={async () => { if (!title.trim()) return; setSaving(true); await onAdd({ date, title: title.trim(), start_time: startTime, end_time: endTime, type }); setSaving(false); }}
              disabled={saving || !title.trim()}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: N.text, color: "white" }}>
              {saving ? "Saving…" : "Add Event"}
            </button>
          </div>
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
  const [modal, setModal] = useState<null | "task" | "exam" | "event" | "study" | "semester" | "editSemester">(null);
  const [showDone, setShowDone] = useState(false);

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

  const switchSemester = (id: string) => { setActiveSemesterId(id); setTasks([]); setStudyLogs([]); };

  const createSemester = async (name: string, year: number, semester: number, newSubjects: { name: string; credits: number; color: string }[], startDate: string, endDate: string) => {
    const { data: semData } = await supabase.from("semesters").insert({ name, year, semester, start_date: startDate || null, end_date: endDate || null }).select().single();
    if (!semData) return;
    const sem = semData as Semester;
    setSemesters((p) => [...p, sem]);
    setActiveSemesterId(sem.id);
    setTasks([]); setStudyLogs([]);
    if (newSubjects.length > 0) {
      const { data: subData } = await supabase.from("semester_subjects").insert(newSubjects.map((s) => ({ ...s, semester_id: sem.id }))).select();
      if (subData) setSubjects(subData as SemesterSubject[]);
    }
    setModal(null);
  };

  const updateSemesterDates = async (startDate: string, endDate: string) => {
    if (!activeSemesterId) return;
    await supabase.from("semesters").update({ start_date: startDate || null, end_date: endDate || null }).eq("id", activeSemesterId);
    setSemesters((p) => p.map((s) => s.id === activeSemesterId ? { ...s, start_date: startDate || null, end_date: endDate || null } : s));
    setModal(null);
  };

  const addSubjectsToSemester = async (newSubjects: { name: string; credits: number; color: string }[]) => {
    if (!activeSemesterId) return;
    const { data } = await supabase.from("semester_subjects")
      .insert(newSubjects.map((s) => ({ ...s, semester_id: activeSemesterId }))).select();
    if (data) setSubjects((p) => [...p, ...(data as SemesterSubject[])]);
    setModal(null);
  };

  const updateSubject = async (id: string, name: string, credits: number, color: string) => {
    await supabase.from("semester_subjects").update({ name, credits, color }).eq("id", id);
    setSubjects((p) => p.map((s) => s.id === id ? { ...s, name, credits, color } : s));
  };

  const deleteSubject = async (id: string) => {
    await supabase.from("semester_subjects").delete().eq("id", id);
    setSubjects((p) => p.filter((s) => s.id !== id));
  };

  const deleteSemester = async (id: string) => {
    await supabase.from("semesters").delete().eq("id", id);
    setSemesters((p) => {
      const remaining = p.filter((s) => s.id !== id);
      if (activeSemesterId === id) {
        const next = remaining[remaining.length - 1] ?? null;
        setActiveSemesterId(next?.id ?? null);
        setTasks([]); setStudyLogs([]);
      }
      return remaining;
    });
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    await supabase.from("tasks").update({ done: newDone }).eq("id", id);
  };

  const addTask = async (task: Omit<Task, "id" | "done" | "created_at">) => {
    const { data } = await supabase.from("tasks").insert({ ...task, done: false, semester_id: activeSemesterId }).select().single();
    if (data) setTasks((p) => [...p, data as Task]);
    setModal(null);
  };

  const deleteTask = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const updateTaskQuestions = async (id: string, completed: number) => {
    setTasks((p) => p.map((t) => t.id === id ? { ...t, completed_questions: completed } : t));
    await supabase.from("tasks").update({ completed_questions: completed }).eq("id", id);
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

  const addStudyLog = async (subjectId: string, hours: number, date: string) => {
    const { data } = await supabase.from("study_logs").insert({ subject_id: subjectId, hours, date, semester_id: activeSemesterId }).select().single();
    if (data) setStudyLogs((p) => [data as StudyLog, ...p]);
    setModal(null);
  };

  // ── Date bounds ──
  const endOfWeekStr = (() => {
    const d = new Date(today);
    d.setDate(today.getDate() + (7 - today.getDay()));
    return toDateStr(d);
  })();
  const in7DaysStr = (() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 7);
    return toDateStr(d);
  })();

  const isThisWeek = (t: Task) =>
    !t.done && t.type !== "exam" &&
    (t.deadline === "No deadline" || (t.deadline >= todayStr && t.deadline <= endOfWeekStr));

  const isUpcomingExam = (t: Task) =>
    !t.done && t.type === "exam" &&
    t.deadline !== "No deadline" && t.deadline >= todayStr && t.deadline <= in7DaysStr;

  const undoneTasks = useMemo(() => tasks.filter(isThisWeek), [tasks]);
  const doneTasks   = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const exams       = useMemo(() => tasks.filter(isUpcomingExam), [tasks]);
  const homework    = useMemo(() => tasks.filter((t) => t.type === "homework" && isThisWeek(t)), [tasks]);
  const tasksOnly   = useMemo(() => tasks.filter((t) => isThisWeek(t) && t.type !== "homework"), [tasks]);
  const todayTasks  = useMemo(() => tasks.filter((t) => !t.done && t.type !== "exam" && t.deadline === todayStr), [tasks, todayStr]);

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
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
    const map: Record<string, number> = {};
    studyLogs.forEach((l) => {
      if (!l.subject_id) return;
      const d = new Date(l.date + "T12:00:00");
      if (d >= mon && d <= sun) map[l.subject_id] = (map[l.subject_id] ?? 0) + l.hours;
    });
    return map;
  }, [studyLogs]);

  const streak = useMemo(() => {
    const days = new Set(studyLogs.map((l) => l.date));
    let count = 0; const d = new Date();
    if (!days.has(toDateStr(d))) d.setDate(d.getDate() - 1);
    while (days.has(toDateStr(d))) { count++; d.setDate(d.getDate() - 1); }
    return count;
  }, [studyLogs]);

  const recommendedSubject = useMemo(() => {
    if (!subjects.length) return null;
    const pending: Record<string, number> = {};
    undoneTasks.forEach((t) => { if (t.subject) pending[t.subject] = (pending[t.subject] ?? 0) + 1; });
    const withWork = subjects.filter((s) => (pending[s.name] ?? 0) > 0);
    if (withWork.length > 0)
      return withWork.reduce((a, b) => (pending[a.name] ?? 0) >= (pending[b.name] ?? 0) ? a : b);
    // fallback: least studied subject this week
    return subjects.reduce((a, b) => (weeklyHours[a.id] ?? 0) <= (weeklyHours[b.id] ?? 0) ? a : b);
  }, [subjects, undoneTasks, weeklyHours]);

  const activeSemesterName = semesters.find((s) => s.id === activeSemesterId)?.name;
  const totalHrsThisWeek = Object.values(weeklyHours).reduce((a, b) => a + b, 0);

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selObj = new Date(selY, selM - 1, selD);

  return (
    <div className="flex min-h-screen" style={{ background: N.bg }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 z-20"
        style={{ background: N.sidebar, borderRight: `1px solid ${N.border}` }}>
        <SidebarContent
          semesters={semesters} activeSemesterId={activeSemesterId}
          onSwitchSemester={switchSemester} onCreateSemester={() => setModal("semester")}
          onDeleteSemester={deleteSemester} onEditSemester={() => setModal("editSemester")}
        />
      </aside>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20 lg:hidden overlay-enter" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 z-40 flex flex-col lg:hidden drawer-enter"
            style={{ background: N.sidebar, borderRight: `1px solid ${N.border}` }}>
            <SidebarContent
              semesters={semesters} activeSemesterId={activeSemesterId}
              onSwitchSemester={switchSemester}
              onCreateSemester={() => { setModal("semester"); setDrawerOpen(false); }}
              onDeleteSemester={deleteSemester}
              onEditSemester={() => { setModal("editSemester"); setDrawerOpen(false); }}
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      {/* ── Main ── */}
      <main className="flex-1 lg:ml-56 min-h-screen">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-2 px-4 pt-12 pb-3"
          style={{ borderBottom: `1px solid ${N.border}`, background: N.bg }}>
          <button onClick={() => setDrawerOpen(true)} className="p-1 rounded transition-colors"
            style={{ color: N.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = N.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <Ico.menu />
          </button>
          <span className="text-[14px] font-semibold" style={{ color: N.text }}>Dashboard</span>
          {activeSemesterName && (
            <span className="ml-auto text-[11px] px-2.5 py-1 rounded-lg" style={{ background: N.hover, color: N.muted }}>
              {activeSemesterName}
            </span>
          )}
        </div>

        <div className="px-5 lg:px-10 py-8 pb-32 lg:pb-12 max-w-5xl mx-auto">

          {/* ── Greeting ── */}
          <div className="flex items-start justify-between gap-4 mb-10">
            <div>
              <h1 className="text-[28px] lg:text-[34px] font-bold tracking-tight leading-tight" style={{ color: N.text }}>
                {greet()}, Neta
              </h1>
              <p className="text-[14px] mt-1" style={{ color: N.muted }}>
                {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {activeSemesterName && <> · <span style={{ color: N.accent }}>{activeSemesterName}</span></>}
              </p>
              {(undoneTasks.length > 0 || exams.length > 0 || totalHrsThisWeek > 0) && (
                <p className="text-[12px] mt-2 flex items-center gap-3" style={{ color: N.muted }}>
                  {undoneTasks.length > 0 && <span>{undoneTasks.length} tasks this week</span>}
                  {exams.length > 0 && <><span style={{ color: N.border }}>·</span><span>{exams.length} exam{exams.length > 1 ? "s" : ""}</span></>}
                  {totalHrsThisWeek > 0 && <><span style={{ color: N.border }}>·</span><span>{totalHrsThisWeek.toFixed(1)}h studied</span></>}
                  {streak > 0 && <><span style={{ color: N.border }}>·</span><span>{streak} day streak 🔥</span></>}
                </p>
              )}
            </div>
            <button onClick={() => setModal("study")}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 hidden sm:flex items-center gap-1.5"
              style={{ background: N.accent, color: "white", boxShadow: `0 4px 14px ${N.accent}40` }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Log Study
            </button>
          </div>

          {/* ── No semester ── */}
          {semesters.length === 0 && (
            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl mb-8"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <span className="text-lg">💡</span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold" style={{ color: "#92400E" }}>Start by creating a semester</p>
                <p className="text-[12px] mt-0.5" style={{ color: "#B45309" }}>Add your courses to track tasks, exams, and study time.</p>
              </div>
              <button onClick={() => setModal("semester")}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold flex-shrink-0"
                style={{ background: "#F59E0B", color: "white" }}>
                Create
              </button>
            </div>
          )}

          {/* ── Today's Focus ── */}
          <div className="mb-10">
            <SectionTitle label="Today's Focus"
              action={
                <button onClick={() => setModal("task")}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: N.accent }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = N.accentBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <Ico.plus /> Add task
                </button>
              }
            />
            {tasksLoading ? (
              [1,2].map((i) => <div key={i} className="h-12 rounded-xl animate-pulse mb-2" style={{ background: N.hover }} />)
            ) : todayTasks.length === 0 ? (
              <p className="text-[15px] py-2" style={{ color: N.muted }}>
                {undoneTasks.length === 0 ? "Nothing due — enjoy your day ✨" : "No tasks due today — check this week below"}
              </p>
            ) : (
              <div>
                {todayTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask}
                    onUpdateQuestions={updateTaskQuestions} subjects={subjects} />
                ))}
              </div>
            )}
          </div>

          {/* ── Recommended Study ── */}
          {recommendedSubject && (
            <div className="mb-10 flex items-center gap-4 px-5 py-4 rounded-2xl"
              style={{ background: "white", border: `1px solid ${N.border}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: recommendedSubject.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: N.muted }}>
                  Recommended Study
                </p>
                <p className="text-[16px] font-bold truncate" style={{ color: N.text }}>{recommendedSubject.name}</p>
              </div>
              <button onClick={() => setModal("study")}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
                style={{ background: N.accent, color: "white" }}>
                Start →
              </button>
            </div>
          )}

          {/* ── 2-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* ── Left: This week's tasks + assignments ── */}
            <div className="lg:col-span-3 space-y-10">

              {/* This Week */}
              <div>
                <SectionTitle label="This Week" count={undoneTasks.length}
                  action={
                    <button onClick={() => setModal("task")}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                      style={{ color: N.accent }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = N.accentBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <Ico.plus /> Add
                    </button>
                  }
                />
                {tasksLoading ? (
                  [1,2,3].map((i) => <div key={i} className="h-12 rounded-xl animate-pulse mb-2" style={{ background: N.hover }} />)
                ) : undoneTasks.length === 0 ? (
                  <p className="text-[14px] py-2" style={{ color: N.muted }}>All caught up for the week 🎉</p>
                ) : (
                  <div>
                    {undoneTasks.map((t) => (
                      <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask}
                        onUpdateQuestions={updateTaskQuestions} subjects={subjects} />
                    ))}
                  </div>
                )}
                {doneTasks.length > 0 && (
                  <>
                    <button onClick={() => setShowDone(!showDone)}
                      className="flex items-center gap-1.5 py-2 mt-1 text-[12px] font-medium transition-colors"
                      style={{ color: N.muted }}>
                      <span style={{ transform: showDone ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>
                        <Ico.chevR />
                      </span>
                      {doneTasks.length} completed
                    </button>
                    {showDone && doneTasks.map((t) => (
                      <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} subjects={subjects} />
                    ))}
                  </>
                )}
              </div>

              {/* Subjects overview */}
              {subjects.length > 0 && (
                <div>
                  <SectionTitle label="Subjects" />
                  <div className="space-y-1">
                    {subjects.map((s) => {
                      const pending = undoneTasks.filter((t) => t.subject === s.name).length;
                      const hrs = weeklyHours[s.id] ?? 0;
                      const subExam = exams.find((e) => e.subject === s.name);
                      return (
                        <div key={s.id} className="flex items-center gap-3 py-3 group"
                          style={{ borderBottom: `1px solid ${N.border}` }}>
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span className="text-[14px] font-medium flex-1" style={{ color: N.text }}>{s.name}</span>
                          <div className="flex items-center gap-3 text-[12px]" style={{ color: N.muted }}>
                            {pending > 0 && (
                              <span>{pending} pending</span>
                            )}
                            {subExam && (
                              <span style={{ color: "#C2410C" }}>exam {shortDate(subExam.deadline)}</span>
                            )}
                            {hrs > 0 && (
                              <span style={{ color: N.accent, fontWeight: 600 }}>{hrs.toFixed(1)}h</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* ── Right: Exams + Calendar + Study + Timer ── */}
            <div className="lg:col-span-2 space-y-10">

              {/* Upcoming Exams */}
              <div>
                <SectionTitle label="Upcoming Exams" count={exams.length}
                  action={
                    <button onClick={() => setModal("exam")}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                      style={{ color: N.accent }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = N.accentBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <Ico.plus /> Add
                    </button>
                  }
                />
                {exams.length === 0 ? (
                  <p className="text-[14px] py-2" style={{ color: N.muted }}>No exams this week</p>
                ) : (
                  <div>
                    {exams.map((exam) => {
                      const [ey, em, ed] = exam.deadline.split("-").map(Number);
                      const daysLeft = Math.ceil((new Date(ey, em - 1, ed).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const subColor = subjects.find((s) => s.name === exam.subject)?.color;
                      const urgentColor = daysLeft <= 1 ? "#EF4444" : daysLeft <= 3 ? "#F97316" : N.accent;
                      return (
                        <div key={exam.id} className="flex items-center gap-3 py-3"
                          style={{ borderBottom: `1px solid ${N.border}` }}>
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: subColor ?? urgentColor }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium truncate" style={{ color: N.text }}>{exam.name}</p>
                            {exam.subject && (
                              <p className="text-[12px] mt-0.5" style={{ color: N.muted }}>{exam.subject}</p>
                            )}
                          </div>
                          <span className="text-[12px] font-bold flex-shrink-0" style={{ color: urgentColor }}>
                            {daysLeft === 0 ? "Today!" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Calendar */}
              <div>
                <SectionTitle label="Calendar"
                  action={
                    <button onClick={() => setModal("event")}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                      style={{ color: N.accent }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = N.accentBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <Ico.plus /> Event
                    </button>
                  }
                />
                <WeekStrip
                  weekOffset={weekOffset} setWeekOffset={setWeekOffset}
                  selectedDate={selectedDate} onSelectDate={setSelectedDate}
                  eventCounts={eventCounts}
                />
                {selectedEvents.length > 0 ? (
                  <div className="mt-3">
                    {selectedEvents.map((ev) => {
                      const t = TYPES[ev.type] ?? TYPES.personal;
                      return (
                        <div key={ev.id} className="flex items-center gap-3 py-2.5 group"
                          style={{ borderBottom: `1px solid ${N.border}` }}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.accent }} />
                          <span className="flex-1 text-[13px] truncate" style={{ color: N.text }}>{ev.title}</span>
                          <span className="text-[11px] flex-shrink-0" style={{ color: N.muted }}>
                            {ev.start_time ? formatTime(ev.start_time) : "All day"}
                          </span>
                          <button onClick={() => deleteEvent(ev.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: N.muted }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = N.muted)}>
                            <Ico.trash />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] mt-3" style={{ color: N.muted }}>
                    No events · {selObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>

              {/* Study Progress */}
              <div>
                <SectionTitle label="Study Progress"
                  action={
                    <button onClick={() => setModal("study")}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                      style={{ color: N.accent }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = N.accentBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <Ico.plus /> Log
                    </button>
                  }
                />
                <WeeklyBarChart studyLogs={studyLogs} />
                {subjects.length > 0 && (
                  <div className="mt-4 space-y-0">
                    {subjects.map((s) => {
                      const logged = weeklyHours[s.id] ?? 0;
                      return (
                        <div key={s.id} className="flex items-center gap-3 py-2.5"
                          style={{ borderBottom: `1px solid ${N.border}` }}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span className="text-[13px] flex-1 truncate" style={{ color: N.text }}>{s.name}</span>
                          <span className="text-[13px] font-semibold tabular-nums"
                            style={{ color: logged > 0 ? N.accent : N.muted }}>
                            {logged > 0 ? `${logged.toFixed(1)}h` : "—"}
                          </span>
                        </div>
                      );
                    })}
                    {totalHrsThisWeek > 0 && (
                      <p className="text-[12px] pt-3" style={{ color: N.muted }}>
                        {totalHrsThisWeek.toFixed(1)}h total this week
                      </p>
                    )}
                  </div>
                )}
                {subjects.length === 0 && (
                  <p className="text-[13px] mt-2" style={{ color: N.muted }}>Create a semester to track study time</p>
                )}
              </div>

              {/* Focus Timer */}
              <div>
                <SectionTitle label="Focus Timer" />
                <PomodoroTimer />
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ── FAB ── */}
      <FAB
        onAddTask={() => setModal("task")}
        onAddExam={() => setModal("exam")}
        onAddEvent={() => setModal("event")}
        onLogStudy={() => setModal("study")}
      />

      {/* ── Modals ── */}
      {modal === "semester"     && <CreateSemesterModal onClose={() => setModal(null)} onCreate={createSemester} />}
      {modal === "editSemester" && activeSemesterId && (
        <EditSemesterModal
          semesterName={activeSemesterName ?? ""}
          activeSemester={semesters.find((s) => s.id === activeSemesterId)!}
          existingSubjects={subjects}
          onClose={() => setModal(null)}
          onAddSubjects={addSubjectsToSemester}
          onUpdateDates={updateSemesterDates}
          onUpdateSubject={updateSubject}
          onDeleteSubject={deleteSubject}
        />
      )}
      {modal === "task"     && <AddTaskModal onClose={() => setModal(null)} onAdd={addTask} defaultType="homework" subjects={subjects} />}
      {modal === "exam"     && <AddTaskModal onClose={() => setModal(null)} onAdd={addTask} defaultType="exam" subjects={subjects} />}
      {modal === "event"    && <AddEventModal date={selectedDate} onClose={() => setModal(null)} onAdd={addEvent} />}
      {modal === "study"    && <LogStudyModal subjects={subjects} onClose={() => setModal(null)} onLog={addStudyLog} />}
    </div>
  );
}
