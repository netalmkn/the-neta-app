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
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getWeekDays(offset: number): Date[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const TIME_OPTIONS: string[] = [];
for (let h = 6; h < 24; h++)
  for (let m = 0; m < 60; m += 30)
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Subject color palette ────────────────────────────────────────────────────

const TYPES: Record<EventType, { label: string; bg: string; text: string; accent: string; ring: string }> = {
  homework: { label: "Homework", bg: "#EFF6FF", text: "#1D4ED8", accent: "#3B82F6", ring: "#BFDBFE" },
  exam:     { label: "Exam",     bg: "#FFF1F2", text: "#BE123C", accent: "#F43F5E", ring: "#FECDD3" },
  personal: { label: "Personal", bg: "#F0FDF4", text: "#166534", accent: "#22C55E", ring: "#BBF7D0" },
  project:  { label: "Project",  bg: "#F5F3FF", text: "#6D28D9", accent: "#8B5CF6", ring: "#DDD6FE" },
};

// ─── Shared card shadow ───────────────────────────────────────────────────────

const CARD_SHADOW = "0 1px 3px rgba(99,102,241,0.06), 0 1px 2px rgba(99,102,241,0.04)";

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevL = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ChevR = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Check = () => (
  <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
    <path d="M1 3L3.5 5.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const Clock = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 5V8.5L10.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const PlusLg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const PlusSm = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const X = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ─── Week Strip ───────────────────────────────────────────────────────────────

function WeekStrip({
  weekOffset, setWeekOffset, selectedDate, onSelectDate, eventDates,
}: {
  weekOffset: number; setWeekOffset: (n: number) => void;
  selectedDate: string; onSelectDate: (d: string) => void;
  eventDates: Set<string>;
}) {
  const todayStr = toDateStr(new Date());
  const days = getWeekDays(weekOffset);
  const label = (() => {
    const a = days[0], b = days[6];
    return a.getMonth() === b.getMonth()
      ? `${MONTH_SHORT[a.getMonth()]} ${a.getFullYear()}`
      : `${MONTH_SHORT[a.getMonth()]} – ${MONTH_SHORT[b.getMonth()]} ${b.getFullYear()}`;
  })();

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F3F4FF" }}>
        <button onClick={() => setWeekOffset(weekOffset - 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition active:scale-90"
          style={{ color: "#818CF8", background: "#F5F3FF" }}>
          <ChevL />
        </button>
        <span className="text-[13px] font-700 tracking-tight" style={{ color: "#1E1B4B" }}>
          {label}
        </span>
        <button onClick={() => setWeekOffset(weekOffset + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition active:scale-90"
          style={{ color: "#818CF8", background: "#F5F3FF" }}>
          <ChevR />
        </button>
      </div>

      <div className="grid grid-cols-7 px-1 py-3">
        {days.map((day) => {
          const ds = toDateStr(day);
          const isToday = ds === todayStr;
          const isSel = ds === selectedDate;
          const hasEv = eventDates.has(ds);

          return (
            <button key={ds} onClick={() => onSelectDate(ds)}
              className="flex flex-col items-center gap-[5px]">
              <span className="text-[9.5px] font-semibold uppercase tracking-wide"
                style={{ color: isSel ? "#6366F1" : "#9CA3AF" }}>
                {DAY_SHORT[day.getDay()]}
              </span>
              <div className="w-9 h-9 flex items-center justify-center rounded-full text-[14px] font-semibold transition-all active:scale-90"
                style={{
                  background: isSel ? "#6366F1" : isToday ? "#EEF2FF" : "transparent",
                  color: isSel ? "white" : isToday ? "#6366F1" : "#374151",
                  fontWeight: isToday || isSel ? 700 : 500,
                }}>
                {day.getDate()}
              </div>
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background: isSel ? "#A5B4FC" : "#6366F1", opacity: hasEv ? 1 : 0 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Row ────────────────────────────────────────────────────────────────

function EventRow({ event, onDelete }: { event: CalendarEvent; onDelete: (id: string) => void }) {
  const t = TYPES[event.type] ?? TYPES.personal;
  const timeStr = event.end_time
    ? `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
    : formatTime(event.start_time);

  return (
    <div className="card-enter flex items-center gap-3 bg-white rounded-xl px-4 py-3.5"
      style={{ boxShadow: CARD_SHADOW }}>
      {/* Color dot */}
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.accent }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold leading-tight" style={{ color: "#111827" }}>
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-medium tabular-nums" style={{ color: "#6B7280" }}>
            {timeStr}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: t.bg, color: t.text }}>
            {t.label}
          </span>
        </div>
      </div>

      <button onClick={() => onDelete(event.id)}
        className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 active:scale-90 transition"
        style={{ color: "#D1D5DB", background: "#F9FAFB" }}>
        <X />
      </button>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, index, onToggle }: { task: Task; index: number; onToggle: (id: string) => void }) {
  const t = TYPES[task.type] ?? TYPES.personal;
  return (
    <div className="card-enter flex items-center gap-3 bg-white rounded-xl px-4 py-3.5"
      style={{ boxShadow: CARD_SHADOW, animationDelay: `${index * 40}ms`, opacity: task.done ? 0.5 : 1, transition: "opacity 0.3s" }}>

      <button onClick={() => onToggle(task.id)}
        className="w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
        style={task.done ? { background: t.accent, borderColor: t.accent } : { borderColor: t.ring }}>
        {task.done && <Check />}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium leading-tight"
          style={{ color: task.done ? "#9CA3AF" : "#111827", textDecoration: task.done ? "line-through" : "none" }}>
          {task.name}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: t.bg, color: t.text }}>
            {t.label}
          </span>
          {task.deadline !== "No deadline" && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "#9CA3AF" }}>
              <Clock /> {task.deadline}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add Event Modal ──────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="overlay-enter absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="modal-enter relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        style={{ maxHeight: "92dvh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "#E5E7EB" }} />

        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#9CA3AF" }}>
          {label}
        </p>
        <h3 className="text-[22px] font-800 mb-6" style={{ color: "#1E1B4B" }}>
          New Event
        </h3>

        <div className="space-y-3.5">
          <input autoFocus type="text" placeholder="Event title"
            value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !saving && title.trim() && (async () => { setSaving(true); await onAdd({ date, title: title.trim(), start_time: startTime, end_time: endTime, type }); setSaving(false); })()}
            className="w-full rounded-xl px-4 py-3.5 text-[14px] font-medium outline-none transition placeholder-[#D1D5DB]"
            style={{ background: "#F9FAFB", border: "1.5px solid #F3F4F6", color: "#111827" }}
          />

          {/* Type grid */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPES) as EventType[]).map((k) => (
              <button key={k} onClick={() => setType(k)}
                className="py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition active:scale-95"
                style={{
                  background: TYPES[k].bg,
                  color: TYPES[k].text,
                  border: type === k ? `2px solid ${TYPES[k].accent}` : `2px solid transparent`,
                  opacity: type === k ? 1 : 0.55,
                }}>
                {TYPES[k].label}
              </button>
            ))}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-2">
            {([["Start", startTime, setStartTime], ["End", endTime, setEndTime]] as const).map(([label, val, set]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 px-0.5" style={{ color: "#9CA3AF" }}>
                  {label}
                </p>
                <select value={val} onChange={(e) => set(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-3 text-[14px] font-medium outline-none"
                  style={{ background: "#F9FAFB", border: "1.5px solid #F3F4F6", color: "#111827" }}>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button onClick={async () => { if (!title.trim()) return; setSaving(true); await onAdd({ date, title: title.trim(), start_time: startTime, end_time: endTime, type }); setSaving(false); }}
            disabled={saving || !title.trim()}
            className="w-full py-4 rounded-2xl text-[14px] font-semibold tracking-wide transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "#6366F1", color: "white" }}>
            {saving ? "Saving…" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Task Modal ───────────────────────────────────────────────────────────

function AddTaskModal({ onClose, onAdd }: {
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
      <div className="overlay-enter absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="modal-enter relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        style={{ maxHeight: "90dvh", overflowY: "auto" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "#E5E7EB" }} />
        <h3 className="text-[22px] font-800 mb-6" style={{ color: "#1E1B4B" }}>New Task</h3>

        <div className="space-y-3.5">
          <input autoFocus type="text" placeholder="What do you need to do?"
            value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-full rounded-xl px-4 py-3.5 text-[14px] font-medium outline-none placeholder-[#D1D5DB]"
            style={{ background: "#F9FAFB", border: "1.5px solid #F3F4F6", color: "#111827" }}
          />
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPES) as EventType[]).map((k) => (
              <button key={k} onClick={() => setType(k)}
                className="py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition active:scale-95"
                style={{
                  background: TYPES[k].bg, color: TYPES[k].text,
                  border: type === k ? `2px solid ${TYPES[k].accent}` : "2px solid transparent",
                  opacity: type === k ? 1 : 0.55,
                }}>
                {TYPES[k].label}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Deadline — e.g. Monday 5 PM"
            value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-[14px] font-medium outline-none placeholder-[#D1D5DB]"
            style={{ background: "#F9FAFB", border: "1.5px solid #F3F4F6", color: "#111827" }}
          />
          <button onClick={handleAdd} disabled={saving || !name.trim()}
            className="w-full py-4 rounded-2xl text-[14px] font-semibold tracking-wide transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "#6366F1", color: "white" }}>
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
    setShowTaskModal(false);
  };

  const addEvent = async (event: Omit<CalendarEvent, "id" | "created_at">) => {
    const { data } = await supabase.from("calendar_entries").insert(event).select().single();
    if (data) setEvents((p) => [...p, data as CalendarEvent].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setShowEventModal(false);
  };

  const deleteEvent = async (id: string) => {
    setEvents((p) => p.filter((e) => e.id !== id));
    await supabase.from("calendar_entries").delete().eq("id", id);
  };

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const remaining = total - done;

  const eventDates = useMemo(() => new Set(events.map((e) => e.date)), [events]);
  const selectedEvents = useMemo(
    () => events.filter((e) => e.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [events, selectedDate]
  );
  const sortedTasks = useMemo(
    () => [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)],
    [tasks]
  );

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const selObj = new Date(selY, selM - 1, selD);
  const selLabel = selObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const isSelectedToday = selectedDate === todayStr;

  return (
    <div className="min-h-screen" style={{ background: "#F3F4FF" }}>

      {/* ── Header ── */}
      <div className="px-5 pt-14 pb-6" style={{ background: "white" }}>
        {/* Greeting */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] mb-1" style={{ color: "#A5B4FC" }}>
          {greeting()}
        </p>
        <h1 className="text-[28px] font-extrabold leading-tight mb-4" style={{ color: "#1E1B4B" }}>
          {today.toLocaleDateString("en-US", { weekday: "long" })},{" "}
          <span style={{ color: "#6366F1" }}>
            {today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </h1>

        {/* Stat chips */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#3B82F6" }} />
            {remaining} task{remaining !== 1 ? "s" : ""} left
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{ background: "#F5F3FF", color: "#6D28D9" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8B5CF6" }} />
            {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""} today
          </div>
          {total > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: "#F0FDF4", color: "#166534" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} />
              {Math.round((done / total) * 100)}% done
            </div>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-4 rounded-full h-1.5 overflow-hidden" style={{ background: "#F3F4FF" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(done / total) * 100}%`, background: "linear-gradient(90deg, #6366F1, #818CF8)" }} />
          </div>
        )}
      </div>

      {/* Thin divider */}
      <div style={{ height: 1, background: "#EEF2FF" }} />

      {/* ── Content ── */}
      <div className="px-4 pt-4 pb-32 space-y-4">

        {/* Week strip */}
        <WeekStrip
          weekOffset={weekOffset} setWeekOffset={setWeekOffset}
          selectedDate={selectedDate} onSelectDate={setSelectedDate}
          eventDates={eventDates}
        />

        {/* Events section */}
        <div>
          <div className="flex items-center justify-between px-0.5 mb-2.5">
            <div>
              <span className="text-[14px] font-bold" style={{ color: "#1E1B4B" }}>
                {isSelectedToday ? "Today" : selObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {selectedEvents.length > 0 && (
                <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "#F5F3FF", color: "#6D28D9" }}>
                  {selectedEvents.length}
                </span>
              )}
            </div>
            <button onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition active:scale-95"
              style={{ background: "#EEF2FF", color: "#6366F1" }}>
              <PlusSm /> Event
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="rounded-2xl px-4 py-5 text-center" style={{ border: "1.5px dashed #E0E7FF" }}>
              <p className="text-[13px]" style={{ color: "#C7D2FE" }}>
                No events — tap <span style={{ color: "#6366F1", fontWeight: 600 }}>+ Event</span> to add one
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => <EventRow key={e.id} event={e} onDelete={deleteEvent} />)}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#EEF2FF", margin: "0 2px" }} />

        {/* Tasks section */}
        <div>
          <div className="flex items-center justify-between px-0.5 mb-2.5">
            <span className="text-[14px] font-bold" style={{ color: "#1E1B4B" }}>Tasks</span>
            <span className="text-[12px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: "#F9FAFB", color: "#9CA3AF" }}>
              {remaining} left
            </span>
          </div>

          {tasksLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl h-[66px] animate-pulse mb-2"
                style={{ boxShadow: CARD_SHADOW }} />
            ))
          ) : sortedTasks.length === 0 ? (
            <div className="rounded-2xl px-4 py-5 text-center" style={{ border: "1.5px dashed #E0E7FF" }}>
              <p className="text-[13px]" style={{ color: "#C7D2FE" }}>
                All clear — tap <span style={{ color: "#6366F1", fontWeight: 600 }}>+</span> to add a task
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTasks.map((task, i) => (
                <TaskRow key={task.id} task={task} index={i} onToggle={toggleTask} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <button onClick={() => setShowTaskModal(true)}
        className="fixed right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-150"
        style={{
          bottom: "calc(80px + 1.25rem)",
          background: "#6366F1",
          boxShadow: "0 4px 24px rgba(99,102,241,0.45)",
        }}
        aria-label="Add task">
        <PlusLg />
      </button>

      {showTaskModal && <AddTaskModal onClose={() => setShowTaskModal(false)} onAdd={addTask} />}
      {showEventModal && <AddEventModal date={selectedDate} onClose={() => setShowEventModal(false)} onAdd={addEvent} />}
    </div>
  );
}
