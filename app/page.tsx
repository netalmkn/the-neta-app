"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

const TYPES: Record<EventType, { label: string; bg: string; text: string; accent: string }> = {
  homework: { label: "Homework", bg: "#EFF6FF", text: "#1D4ED8", accent: "#3B82F6" },
  exam:     { label: "Exam",     bg: "#FFF7ED", text: "#C2410C", accent: "#F97316" },
  personal: { label: "Personal", bg: "#F0FDF4", text: "#166534", accent: "#22C55E" },
  project:  { label: "Project",  bg: "#F5F3FF", text: "#6D28D9", accent: "#8B5CF6" },
};

const SHADOW = "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)";

// Dummy study data
const STUDY_SUBJECTS = [
  { name: "Mathematics",       hours: 3.5, target: 5,  color: "#3B82F6" },
  { name: "Computer Science",  hours: 2.0, target: 4,  color: "#8B5CF6" },
  { name: "History",           hours: 1.5, target: 3,  color: "#F97316" },
  { name: "Biology",           hours: 0.5, target: 4,  color: "#22C55E" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = {
  home: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.55 5.45 21 6 21H9M19 10L21 12M19 10V20C19 20.55 18.55 21 18 21H15M9 21V15C9 15 9 15 12 15C15 15 15 15 15 21M9 21H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  tasks: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  exam: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15M9 5C9 5.55 9.45 6 10 6H14C14.55 6 15 5.55 15 5M9 5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5M9 12H15M9 16H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  notes: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11 5H6C4.9 5 4 5.9 4 7V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V13M18.5 2.5C19.3 1.7 20.7 1.7 21.5 2.5C22.3 3.3 22.3 4.7 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15C19.1 15.7 19.3 16.5 19.9 17.1L19.9 17.1C20.7 17.9 20.7 19.1 19.9 19.9C19.1 20.7 17.9 20.7 17.1 19.9L17.1 19.9C16.5 19.3 15.7 19.1 15 19.4C14.3 19.7 13.8 20.4 13.8 21.1V21C13.8 22.1 12.9 23 11.8 23H12.2C11.1 23 10.2 22.1 10.2 21V21.1C10.2 20.4 9.7 19.7 9 19.4C8.3 19.1 7.5 19.3 6.9 19.9L6.9 19.9C6.1 20.7 4.9 20.7 4.1 19.9C3.3 19.1 3.3 17.9 4.1 17.1L4.1 17.1C4.7 16.5 4.9 15.7 4.6 15C4.3 14.3 3.6 13.8 2.9 13.8H3C1.9 13.8 1 12.9 1 11.8V12.2C1 11.1 1.9 10.2 3 10.2H2.9C3.6 10.2 4.3 9.7 4.6 9C4.9 8.3 4.7 7.5 4.1 6.9L4.1 6.9C3.3 6.1 3.3 4.9 4.1 4.1C4.9 3.3 6.1 3.3 6.9 4.1L6.9 4.1C7.5 4.7 8.3 4.9 9 4.6C9.7 4.3 10.2 3.6 10.2 2.9V3C10.2 1.9 11.1 1 12.2 1H11.8C12.9 1 13.8 1.9 13.8 3V2.9C13.8 3.6 14.3 4.3 15 4.6C15.7 4.9 16.5 4.7 17.1 4.1L17.1 4.1C17.9 3.3 19.1 3.3 19.9 4.1C20.7 4.9 20.7 6.1 19.9 6.9L19.9 6.9C19.3 7.5 19.1 8.3 19.4 9C19.7 9.7 20.4 10.2 21.1 10.2H21C22.1 10.2 23 11.1 23 12.2V11.8C23 12.9 22.1 13.8 21 13.8H21.1C20.4 13.8 19.7 14.3 19.4 15Z" stroke="currentColor" strokeWidth="1.8"/></svg>,
  plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  plusSm: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  check: () => <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 3L3.5 5.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  clock: () => <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5V8.5L10.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  menu: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  x: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 5L19 12L8 19V5Z" fill="currentColor"/></svg>,
  pause: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" fill="currentColor"/></svg>,
  reset: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 4V10H7M23 20V14H17M20.49 9C19.24 5.46 15.87 3 12 3C7.21 3 3.47 6.81 3.05 11.5M3.51 15C4.76 18.54 8.13 21 12 21C16.79 21 20.53 17.19 20.95 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  fire: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C12 2 8 7 8 12C8 14.5 9.5 16.5 12 17C14.5 16.5 16 14.5 16 12C16 9 14 6 13 5C13 6.5 12.5 8 11 9C11 7 11.5 4.5 12 2Z" fill="#F97316"/><path d="M12 17C12 17 9 15 9 12.5C9 14 10 15.5 12 17Z" fill="#FBBF24"/></svg>,
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Icon.home },
  { href: "/tasks", label: "Tasks", icon: Icon.tasks },
  { href: "/homework", label: "Homework", icon: Icon.notes },
  { href: "/exams", label: "Exams", icon: Icon.exam },
] as const;

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full px-3 py-6">
      {/* Logo */}
      <div className="flex items-center justify-between px-3 mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#6366F1" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" opacity="0.9"/><path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-[15px] font-bold text-white">StudyPlan</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <Icon.x />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Ic }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all active:scale-95"
              style={{
                background: active ? "#6366F1" : "transparent",
                color: active ? "white" : "#9CA3AF",
              }}>
              <Ic />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 rounded-xl flex items-center gap-3" style={{ background: "#1F2937" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: "#6366F1", color: "white" }}>
          N
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white leading-none">Neta</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>Student</p>
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

  const setMode_ = (m: typeof mode) => {
    setMode(m);
    setActive(false);
    setSeconds(DURATIONS[m]);
  };

  const pct = ((DURATIONS[mode] - seconds) / DURATIONS[mode]) * 100;

  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: "#F3F4F6" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>Focus Timer</p>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-4 bg-gray-50 rounded-lg p-1">
        {(["focus","short","long"] as const).map((m) => (
          <button key={m} onClick={() => setMode_(m)}
            className="flex-1 py-1 rounded-md text-[11px] font-semibold capitalize transition-all"
            style={{ background: mode === m ? "white" : "transparent", color: mode === m ? "#6366F1" : "#9CA3AF", boxShadow: mode === m ? SHADOW : "none" }}>
            {m === "focus" ? "25m" : m === "short" ? "5m" : "15m"}
          </button>
        ))}
      </div>

      {/* Circular progress */}
      <div className="flex justify-center mb-4">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#F3F4F6" strokeWidth="6"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#6366F1" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[22px] font-bold tabular-nums" style={{ color: "#111827" }}>
              {fmtPomodoro(seconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button onClick={() => setActive(!active)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
          style={{ background: "#6366F1", color: "white" }}>
          {active ? <Icon.pause /> : <Icon.play />}
          {active ? "Pause" : "Start"}
        </button>
        <button onClick={() => { setActive(false); setSeconds(DURATIONS[mode]); }}
          className="w-10 flex items-center justify-center rounded-xl transition-all active:scale-95"
          style={{ background: "#F3F4F6", color: "#6B7280" }}>
          <Icon.reset />
        </button>
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ tasksDoneThisWeek }: { tasksDoneThisWeek: number }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PomodoroTimer />

      {/* Study progress */}
      <div className="px-5 py-4 border-b" style={{ borderColor: "#F3F4F6" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
          Weekly Study Progress
        </p>
        <div className="space-y-3">
          {STUDY_SUBJECTS.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-medium" style={{ color: "#374151" }}>{s.name}</span>
                <span className="text-[11px] tabular-nums" style={{ color: "#9CA3AF" }}>{s.hours}h / {s.target}h</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "#F3F4F6" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(s.hours / s.target) * 100}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
          Quick Stats
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F0FDF4" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#22C55E" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <p className="text-[18px] font-bold leading-none" style={{ color: "#166534" }}>{tasksDoneThisWeek}</p>
              <p className="text-[11px]" style={{ color: "#166534", opacity: 0.7 }}>tasks done this week</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FFF7ED" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F97316" }}>
              <Icon.fire />
            </div>
            <div>
              <p className="text-[18px] font-bold leading-none" style={{ color: "#C2410C" }}>5</p>
              <p className="text-[11px]" style={{ color: "#C2410C", opacity: 0.7 }}>day streak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string) => void; onDelete?: (id: string) => void }) {
  const t = TYPES[task.type] ?? TYPES.personal;
  return (
    <div className="flex items-center gap-2.5 py-2 px-1 rounded-lg transition-colors hover:bg-gray-50 group">
      <button onClick={() => onToggle(task.id)}
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all active:scale-90"
        style={task.done ? { background: "#22C55E", borderColor: "#22C55E" } : { borderColor: "#D1D5DB" }}>
        {task.done && <Icon.check />}
      </button>
      <span className="flex-1 text-[13px] font-medium min-w-0 truncate"
        style={{ color: task.done ? "#9CA3AF" : "#111827", textDecoration: task.done ? "line-through" : "none" }}>
        {task.name}
      </span>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
        style={{ background: t.bg, color: t.text }}>
        {t.label}
      </span>
      {task.deadline !== "No deadline" && (
        <span className="text-[10px] flex-shrink-0 hidden sm:block" style={{ color: "#9CA3AF" }}>
          {task.deadline}
        </span>
      )}
      {onDelete && (
        <button onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 flex-shrink-0">
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
    <div className="bg-white rounded-2xl p-4" style={{ boxShadow: SHADOW }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
          Week of {MON3[days[0].getMonth()]} {days[0].getDate()}
        </p>
        <div className="flex gap-1">
          {[-1,1].map((dir) => (
            <button key={dir} onClick={() => setWeekOffset(weekOffset + dir)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
              style={{ background: "#F9FAFB" }}>
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
              className="flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all active:scale-90"
              style={{ background: isSel ? "#6366F1" : isToday ? "#EEF2FF" : "transparent" }}>
              <span className="text-[10px] font-semibold uppercase"
                style={{ color: isSel ? "rgba(255,255,255,0.7)" : "#9CA3AF" }}>
                {DAY3[day.getDay()].slice(0, 2)}
              </span>
              <span className="text-[15px] font-bold"
                style={{ color: isSel ? "white" : isToday ? "#6366F1" : "#374151" }}>
                {day.getDate()}
              </span>
              {count > 0 && (
                <span className="text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: isSel ? "rgba(255,255,255,0.2)" : "#EEF2FF", color: isSel ? "white" : "#6366F1" }}>
                  {count}
                </span>
              )}
              {count === 0 && <span className="w-4 h-4" />}
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
          <span className="text-[12px] font-semibold bg-white px-3 py-1.5 rounded-full shadow-md" style={{ color: "#374151" }}>
            {opt.label}
          </span>
          <button onClick={() => { opt.action(); setOpen(false); }}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md active:scale-90 transition"
            style={{ background: opt.color }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      ))}
      <button onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all duration-200"
        style={{ background: "#6366F1", boxShadow: "0 4px 24px rgba(99,102,241,0.45)", transform: open ? "rotate(45deg)" : "none" }}>
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
            style={{ background: "#6366F1", color: "white" }}>
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
          <button onClick={async () => { if (!title.trim()) return; setSaving(true); await onAdd({ date, title: title.trim(), start_time: startTime, end_time: endTime, type }); setSaving(false); }}
            disabled={saving || !title.trim()}
            className="w-full py-3.5 rounded-xl text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "#6366F1", color: "white" }}>
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
  const [tasksLoading, setTasksLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<null | "task" | "exam" | "event">(null);

  useEffect(() => {
    supabase.from("tasks").select("*").order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setTasks(data as Task[]); setTasksLoading(false); });
  }, []);

  useEffect(() => {
    supabase.from("calendar_entries").select("*").order("start_time", { ascending: true })
      .then(({ data }) => { if (data) setEvents(data as CalendarEvent[]); });
  }, []);

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    await supabase.from("tasks").update({ done: newDone }).eq("id", id);
  };

  const addTask = async (task: Omit<Task, "id" | "done" | "created_at">) => {
    const { data } = await supabase.from("tasks").insert({ ...task, done: false }).select().single();
    if (data) setTasks((p) => [...p, data as Task]);
    setModal(null);
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

  // Derived data
  const undoneTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const exams = useMemo(() => tasks.filter((t) => t.type === "exam" && !t.done), [tasks]);
  const homework = useMemo(() => tasks.filter((t) => t.type === "homework" && !t.done), [tasks]);
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

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selObj = new Date(selY, selM - 1, selD);

  return (
    <div className="flex min-h-screen" style={{ background: "#F9FAFB" }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 z-20" style={{ background: "#111827" }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden overlay-enter" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 z-40 flex flex-col lg:hidden drawer-enter" style={{ background: "#111827" }}>
            <SidebarContent onClose={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* ── Center Content ── */}
      <main className="flex-1 lg:ml-60 lg:mr-[280px] min-h-screen overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 pt-12 pb-4 bg-white border-b" style={{ borderColor: "#F3F4F6" }}>
          <button onClick={() => setDrawerOpen(true)} className="p-1" style={{ color: "#374151" }}>
            <Icon.menu />
          </button>
          <span className="text-[16px] font-bold" style={{ color: "#111827" }}>StudyPlan</span>
        </div>

        <div className="p-4 lg:p-6 space-y-4 pb-28 lg:pb-6">

          {/* Greeting */}
          <div className="bg-white rounded-2xl px-5 py-5" style={{ boxShadow: SHADOW }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#9CA3AF" }}>
              {today.toLocaleDateString("en-US", { weekday: "long" })}, {today.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </p>
            <h1 className="text-[22px] lg:text-[26px] font-extrabold leading-tight" style={{ color: "#111827" }}>
              {greet()}, <span style={{ color: "#6366F1" }}>Neta</span> 👋
            </h1>
            <p className="text-[13px] mt-1" style={{ color: "#6B7280" }}>
              {undoneTasks.length} task{undoneTasks.length !== 1 ? "s" : ""} remaining
              {exams.length > 0 && ` · ${exams.length} exam${exams.length !== 1 ? "s" : ""} coming up`}
            </p>
          </div>

          {/* Two-column: Tasks + Exams */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Today's Tasks */}
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: SHADOW }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-bold" style={{ color: "#111827" }}>Today's Tasks</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EEF2FF", color: "#6366F1" }}>
                  {undoneTasks.length} left
                </span>
              </div>
              <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: 240 }}>
                {tasksLoading ? (
                  [1,2,3].map((i) => <div key={i} className="h-9 rounded-lg animate-pulse mb-1" style={{ background: "#F9FAFB" }} />)
                ) : undoneTasks.length === 0 ? (
                  <p className="text-[13px] text-center py-6" style={{ color: "#D1D5DB" }}>All done! 🎉</p>
                ) : (
                  undoneTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} />)
                )}
                {doneTasks.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px" style={{ background: "#F3F4F6" }} />
                      <span className="text-[10px] font-semibold uppercase" style={{ color: "#D1D5DB" }}>Done</span>
                      <div className="flex-1 h-px" style={{ background: "#F3F4F6" }} />
                    </div>
                    {doneTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} />)}
                  </>
                )}
              </div>
            </div>

            {/* Upcoming Exams */}
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: SHADOW }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-bold" style={{ color: "#111827" }}>Upcoming Exams</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FFF7ED", color: "#C2410C" }}>
                  {exams.length}
                </span>
              </div>
              <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: 240 }}>
                {exams.length === 0 ? (
                  <p className="text-[13px] text-center py-6" style={{ color: "#D1D5DB" }}>No upcoming exams</p>
                ) : (
                  exams.map((t) => (
                    <div key={t.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg" style={{ background: "#FFF7ED" }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#F97316" }} />
                      <span className="flex-1 text-[13px] font-medium min-w-0 truncate" style={{ color: "#111827" }}>{t.name}</span>
                      {t.deadline !== "No deadline" && (
                        <span className="text-[10px] flex-shrink-0" style={{ color: "#9CA3AF" }}>{t.deadline}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Weekly Calendar Strip */}
          <WeekStrip
            weekOffset={weekOffset} setWeekOffset={setWeekOffset}
            selectedDate={selectedDate} onSelectDate={setSelectedDate}
            eventCounts={eventCounts}
          />

          {/* Selected Day Events */}
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: SHADOW }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold" style={{ color: "#111827" }}>
                {selObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </h2>
              <button onClick={() => setModal("event")}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition active:scale-95"
                style={{ background: "#EEF2FF", color: "#6366F1" }}>
                <Icon.plusSm /> Event
              </button>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="text-[13px] text-center py-4" style={{ color: "#D1D5DB" }}>
                No events — tap + Event to add one
              </p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((ev) => {
                  const t = TYPES[ev.type] ?? TYPES.personal;
                  return (
                    <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl group" style={{ background: t.bg }}>
                      <div className="w-1.5 h-full min-h-[32px] rounded-full flex-shrink-0" style={{ background: t.accent }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "#111827" }}>{ev.title}</p>
                        <p className="text-[11px]" style={{ color: "#6B7280" }}>
                          {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ""}
                        </p>
                      </div>
                      <button onClick={() => deleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#9CA3AF" }}>
                        <Icon.trash />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: SHADOW }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold" style={{ color: "#111827" }}>Assignments</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
                {homework.length}
              </span>
            </div>
            {homework.length === 0 ? (
              <p className="text-[13px] text-center py-4" style={{ color: "#D1D5DB" }}>No assignments 🎉</p>
            ) : (
              <div className="space-y-0.5">
                {homework.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} />)}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Right Panel (desktop only) ── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 right-0 w-[280px] bg-white border-l z-20 overflow-hidden"
        style={{ borderColor: "#F3F4F6" }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: "#F3F4F6" }}>
          <p className="text-[14px] font-bold" style={{ color: "#111827" }}>Focus Panel</p>
        </div>
        <RightPanel tasksDoneThisWeek={tasksDoneThisWeek} />
      </aside>

      {/* ── FAB ── */}
      <FAB
        onAddTask={() => setModal("task")}
        onAddExam={() => setModal("exam")}
        onAddEvent={() => setModal("event")}
      />

      {/* ── Modals ── */}
      {modal === "task" && <AddTaskModal onClose={() => setModal(null)} onAdd={addTask} defaultType="homework" />}
      {modal === "exam" && <AddTaskModal onClose={() => setModal(null)} onAdd={addTask} defaultType="exam" />}
      {modal === "event" && <AddEventModal date={selectedDate} onClose={() => setModal(null)} onAdd={addEvent} />}
    </div>
  );
}
