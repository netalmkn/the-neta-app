"use client";

import { useState, useEffect, useMemo } from "react";
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
  date: string;       // "YYYY-MM-DD"
  title: string;
  start_time: string; // "HH:MM" 24h
  end_time: string;   // "HH:MM" 24h
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
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getWeekDays(weekOffset: number): Date[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Color config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<EventType, { label: string; bg: string; text: string; accent: string }> = {
  homework: { label: "Homework", bg: "#FEF3C7", text: "#92400E", accent: "#F59E0B" },
  exam:     { label: "Exam",     bg: "#FFE4E6", text: "#9F1239", accent: "#F43F5E" },
  personal: { label: "Personal", bg: "#CCFBF1", text: "#0F766E", accent: "#14B8A6" },
  project:  { label: "Project",  bg: "#EDE9FE", text: "#4C1D95", accent: "#8B5CF6" },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
      <path d="M1 3.5L4 6.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5V8.5L10.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function PlusSmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 5V19M5 12H19" stroke="#0B1437" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Week Strip ───────────────────────────────────────────────────────────────

function WeekStrip({
  weekOffset,
  setWeekOffset,
  selectedDate,
  onSelectDate,
  eventDates,
}: {
  weekOffset: number;
  setWeekOffset: (n: number) => void;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  eventDates: Set<string>;
}) {
  const todayStr = toDateStr(new Date());
  const days = getWeekDays(weekOffset);
  const firstDay = days[0];
  const lastDay = days[6];

  const monthLabel =
    firstDay.getMonth() === lastDay.getMonth()
      ? `${MONTH_SHORT[firstDay.getMonth()]} ${firstDay.getFullYear()}`
      : `${MONTH_SHORT[firstDay.getMonth()]} – ${MONTH_SHORT[lastDay.getMonth()]} ${lastDay.getFullYear()}`;

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(11,20,55,0.08)" }}>
      {/* Month row */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-[#F4F6FD]"
          style={{ color: "#4A5B9A" }}
        >
          <ChevronLeft />
        </button>
        <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-outfit)", color: "#0B1437" }}>
          {monthLabel}
        </span>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-[#F4F6FD]"
          style={{ color: "#4A5B9A" }}
        >
          <ChevronRight />
        </button>
      </div>

      {/* Days row */}
      <div className="grid grid-cols-7 px-2 pb-3">
        {days.map((day) => {
          const dateStr = toDateStr(day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasEvents = eventDates.has(dateStr);

          let circleBg = "transparent";
          let circleColor = "#3D4F7C";
          if (isSelected) { circleBg = "#0B1437"; circleColor = "white"; }
          else if (isToday) { circleBg = "#F5C518"; circleColor = "#0B1437"; }

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span
                className="text-[10px] font-semibold uppercase"
                style={{
                  fontFamily: "var(--font-outfit)",
                  color: isSelected ? "#0B1437" : "#A0ABBB",
                }}
              >
                {DAY_SHORT[day.getDay()]}
              </span>
              <div
                className="w-9 h-9 flex items-center justify-center rounded-full text-[14px] font-semibold transition-all active:scale-90"
                style={{
                  backgroundColor: circleBg,
                  color: circleColor,
                  fontFamily: "var(--font-outfit)",
                }}
              >
                {day.getDate()}
              </div>
              <div
                className="w-1.5 h-1.5 rounded-full transition-opacity"
                style={{
                  backgroundColor: isSelected ? "#6B7FBF" : "#F5C518",
                  opacity: hasEvents ? 1 : 0,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, onDelete }: { event: CalendarEvent; onDelete: (id: string) => void }) {
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.personal;
  const timeLabel = event.end_time
    ? `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
    : formatTime(event.start_time);

  return (
    <div
      className="card-enter flex gap-3 bg-white rounded-2xl px-4 py-3.5"
      style={{ boxShadow: "0 1px 4px rgba(11,20,55,0.07)", borderLeft: `3px solid ${cfg.accent}` }}
    >
      {/* Time column */}
      <div className="flex-shrink-0 w-[72px]">
        <p className="text-[11px] font-semibold tabular-nums leading-none" style={{ fontFamily: "var(--font-outfit)", color: cfg.accent }}>
          {formatTime(event.start_time)}
        </p>
        {event.end_time && (
          <p className="text-[10px] tabular-nums mt-0.5" style={{ fontFamily: "var(--font-outfit)", color: "#A0ABBB" }}>
            {formatTime(event.end_time)}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium leading-snug" style={{ fontFamily: "var(--font-outfit)", color: "#0B1437" }}>
          {event.title}
        </p>
        <span
          className="inline-block mt-1.5 text-[9.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ backgroundColor: cfg.bg, color: cfg.text, fontFamily: "var(--font-outfit)" }}
        >
          {cfg.label}
        </span>
      </div>

      <button
        onClick={() => onDelete(event.id)}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full self-start active:scale-90 transition-transform mt-0.5"
        style={{ color: "#CBD5E1" }}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────

function AddEventModal({
  date,
  onClose,
  onAdd,
}: {
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
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onAdd({ date, title: title.trim(), start_time: startTime, end_time: endTime, type });
    setSaving(false);
  };

  const selectStyle = {
    fontFamily: "var(--font-outfit)",
    fontSize: 14,
    color: "#0B1437",
    background: "#F4F6FD",
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    width: "100%",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    outline: "none",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="overlay-enter absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="modal-enter relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        style={{ maxHeight: "92dvh", overflowY: "auto" }}
      >
        <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-5" />
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] mb-1" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>
          {dateLabel}
        </p>
        <h3 className="text-[1.4rem] font-semibold text-[#0B1437] mb-5" style={{ fontFamily: "var(--font-playfair)" }}>
          New Event
        </h3>

        <div className="space-y-3">
          {/* Title */}
          <input
            type="text"
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
            className="w-full rounded-xl px-4 py-3.5 text-sm text-[#0B1437] placeholder-[#CBD5E1] outline-none transition-colors"
            style={{ fontFamily: "var(--font-outfit)", background: "#F4F6FD", border: "none" }}
          />

          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_CONFIG) as EventType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="py-3 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all active:scale-95"
                style={{
                  fontFamily: "var(--font-outfit)",
                  backgroundColor: TYPE_CONFIG[t].bg,
                  color: TYPE_CONFIG[t].text,
                  border: type === t ? `2px solid ${TYPE_CONFIG[t].accent}` : "2px solid transparent",
                  opacity: type === t ? 1 : 0.6,
                }}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 px-1" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>Start</p>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)} style={selectStyle}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 px-1" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>End</p>
              <select value={endTime} onChange={(e) => setEndTime(e.target.value)} style={selectStyle}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="w-full text-white py-4 rounded-2xl text-sm font-semibold tracking-wide active:scale-[0.98] transition-all disabled:opacity-50 mt-1"
            style={{ fontFamily: "var(--font-outfit)", background: "#0B1437" }}
          >
            {saving ? "Saving…" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, index, onToggle }: { task: Task; index: number; onToggle: (id: string) => void }) {
  const cfg = TYPE_CONFIG[task.type];
  return (
    <div
      className="card-enter bg-white rounded-2xl px-4 py-4 flex items-start gap-3.5"
      style={{
        animationDelay: `${index * 55}ms`,
        opacity: task.done ? 0.5 : 1,
        transition: "opacity 0.3s ease",
        borderLeft: `3px solid ${cfg.accent}`,
        boxShadow: "0 1px 4px rgba(11,20,55,0.07)",
      }}
    >
      <button
        onClick={() => onToggle(task.id)}
        className="mt-0.5 w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90"
        style={task.done ? { backgroundColor: cfg.accent, borderColor: cfg.accent } : { borderColor: "#CBD5E1" }}
      >
        {task.done && <CheckIcon />}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className="text-[13.5px] font-medium leading-snug mb-2"
          style={{
            fontFamily: "var(--font-outfit)",
            color: task.done ? "#9CA3AF" : "#0B1437",
            textDecoration: task.done ? "line-through" : "none",
          }}
        >
          {task.name}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[9.5px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
            style={{ fontFamily: "var(--font-outfit)", backgroundColor: cfg.bg, color: cfg.text }}
          >
            {cfg.label}
          </span>
          <span className="flex items-center gap-1 text-[11px]" style={{ fontFamily: "var(--font-outfit)", color: "#A0ABBB" }}>
            <ClockIcon />
            {task.deadline}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Add Task Modal ───────────────────────────────────────────────────────────

function AddTaskModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: Omit<Task, "id" | "done" | "created_at">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("homework");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd({ name: name.trim(), type, deadline: deadline.trim() || "No deadline" });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="overlay-enter absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="modal-enter relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl" style={{ maxHeight: "90dvh", overflowY: "auto" }}>
        <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-5" />
        <h3 className="text-[1.4rem] font-semibold text-[#0B1437] mb-5" style={{ fontFamily: "var(--font-playfair)" }}>
          New Task
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="What do you need to do?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
            className="w-full rounded-xl px-4 py-3.5 text-sm text-[#0B1437] placeholder-[#CBD5E1] outline-none"
            style={{ fontFamily: "var(--font-outfit)", background: "#F4F6FD" }}
          />
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_CONFIG) as EventType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="py-3 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all active:scale-95"
                style={{
                  fontFamily: "var(--font-outfit)",
                  backgroundColor: TYPE_CONFIG[t].bg,
                  color: TYPE_CONFIG[t].text,
                  border: type === t ? `2px solid ${TYPE_CONFIG[t].accent}` : "2px solid transparent",
                  opacity: type === t ? 1 : 0.6,
                }}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Deadline — e.g. Today, 5:00 PM"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm text-[#0B1437] placeholder-[#CBD5E1] outline-none"
            style={{ fontFamily: "var(--font-outfit)", background: "#F4F6FD" }}
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full text-white py-4 rounded-2xl text-sm font-semibold tracking-wide active:scale-[0.98] transition-all disabled:opacity-60"
            style={{ fontFamily: "var(--font-outfit)", background: "#0B1437" }}
          >
            {saving ? "Saving…" : "Add Task"}
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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Load tasks
  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setTasks(data as Task[]);
        setTasksLoading(false);
      });
  }, []);

  // Load calendar events
  useEffect(() => {
    supabase
      .from("calendar_entries")
      .select("*")
      .order("start_time", { ascending: true })
      .then(({ data }) => {
        if (data) setEvents(data as CalendarEvent[]);
      });
  }, []);

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    await supabase.from("tasks").update({ done: newDone }).eq("id", id);
  };

  const addTask = async (task: Omit<Task, "id" | "done" | "created_at">) => {
    const { data } = await supabase.from("tasks").insert({ ...task, done: false }).select().single();
    if (data) setTasks((prev) => [...prev, data as Task]);
    setShowTaskModal(false);
  };

  const addEvent = async (event: Omit<CalendarEvent, "id" | "created_at">) => {
    const { data } = await supabase.from("calendar_entries").insert(event).select().single();
    if (data) setEvents((prev) => [...prev, data as CalendarEvent].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setShowEventModal(false);
  };

  const deleteEvent = async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("calendar_entries").delete().eq("id", id);
  };

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  const eventDates = useMemo(() => new Set(events.map((e) => e.date)), [events]);
  const selectedEvents = useMemo(
    () => events.filter((e) => e.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [events, selectedDate]
  );
  const sortedTasks = [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)];

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selectedDateObj = new Date(selY, selM - 1, selD);
  const selectedLabel = `${DAY_FULL[selectedDateObj.getDay()]}, ${MONTH_SHORT[selectedDateObj.getMonth()]} ${selD}`;

  return (
    <div className="min-h-screen" style={{ background: "#F4F6FD" }}>
      {/* ── Header ── */}
      <div
        className="px-6 pt-12 pb-7 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0D1640 0%, #0B1437 60%, #101D4A 100%)" }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,197,24,0.12) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-12 -left-10 w-44 h-44 rounded-full" style={{ background: "radial-gradient(circle, rgba(107,127,191,0.1) 0%, transparent 70%)" }} />

        <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] mb-1.5" style={{ fontFamily: "var(--font-outfit)", color: "#4A5B9A" }}>
          {today.toLocaleDateString("en-US", { weekday: "long" })}
        </p>
        <h1 className="text-[2.5rem] font-semibold leading-[1.1] text-white mb-6" style={{ fontFamily: "var(--font-playfair)" }}>
          {today.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
        </h1>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-full h-[3px]" style={{ background: "#1A2654" }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #F5C518, #FFD84D)" }}
            />
          </div>
          <span className="text-[11px] whitespace-nowrap tabular-nums font-medium" style={{ fontFamily: "var(--font-outfit)", color: "#4A5B9A" }}>
            {done}/{total} tasks
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-32 space-y-4">
        {/* ── Week strip ── */}
        <WeekStrip
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          eventDates={eventDates}
        />

        {/* ── Day events ── */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2.5">
            <div>
              <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-outfit)", color: "#0B1437" }}>
                {selectedLabel}
              </span>
              {selectedEvents.length > 0 && (
                <span className="ml-2 text-[11px]" style={{ fontFamily: "var(--font-outfit)", color: "#A0ABBB" }}>
                  {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95"
              style={{ fontFamily: "var(--font-outfit)", background: "#0B1437", color: "#F5C518" }}
            >
              <PlusSmIcon />
              Event
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <div
              className="rounded-2xl px-4 py-6 text-center"
              style={{ background: "rgba(255,255,255,0.6)", border: "1.5px dashed #E2E8F0" }}
            >
              <p className="text-[13px]" style={{ fontFamily: "var(--font-outfit)", color: "#C4CEDE" }}>
                No events — tap <span style={{ color: "#F5C518", fontWeight: 600 }}>+ Event</span> to add one
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <EventCard key={event.id} event={event} onDelete={deleteEvent} />
              ))}
            </div>
          )}
        </div>

        {/* ── Tasks ── */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2.5">
            <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-outfit)", color: "#0B1437" }}>
              Tasks
            </span>
            <span className="text-[11px]" style={{ fontFamily: "var(--font-outfit)", color: "#A0ABBB" }}>
              {tasks.filter((t) => !t.done).length} remaining
            </span>
          </div>

          {tasksLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-[74px] animate-pulse mb-2" style={{ boxShadow: "0 1px 4px rgba(11,20,55,0.07)" }} />
            ))
          ) : sortedTasks.length === 0 ? (
            <div
              className="rounded-2xl px-4 py-6 text-center"
              style={{ background: "rgba(255,255,255,0.6)", border: "1.5px dashed #E2E8F0" }}
            >
              <p className="text-[13px]" style={{ fontFamily: "var(--font-outfit)", color: "#C4CEDE" }}>
                All clear — tap <span style={{ color: "#F5C518", fontWeight: 600 }}>+</span> to add a task
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} onToggle={toggleTask} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowTaskModal(true)}
        className="fixed right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-150"
        style={{
          bottom: "calc(80px + 1.25rem)",
          background: "#F5C518",
          boxShadow: "0 4px 24px rgba(245,197,24,0.5)",
        }}
        aria-label="Add new task"
      >
        <PlusIcon />
      </button>

      {/* ── Modals ── */}
      {showTaskModal && <AddTaskModal onClose={() => setShowTaskModal(false)} onAdd={addTask} />}
      {showEventModal && (
        <AddEventModal date={selectedDate} onClose={() => setShowEventModal(false)} onAdd={addEvent} />
      )}
    </div>
  );
}
