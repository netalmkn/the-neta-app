"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskType = "homework" | "exam" | "personal" | "project";

interface Task {
  id: string;
  name: string;
  type: TaskType;
  deadline: string;
  done: boolean;
  created_at?: string;
}

interface CalendarEntry {
  id: string;
  date: string; // YYYY-MM-DD
  note: string;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE: Record<TaskType, { label: string; bg: string; text: string; accent: string }> = {
  homework: { label: "Homework", bg: "#FEF3C7", text: "#92400E", accent: "#F59E0B" },
  exam:     { label: "Exam",     bg: "#FFE4E6", text: "#9F1239", accent: "#F43F5E" },
  personal: { label: "Personal", bg: "#CCFBF1", text: "#0F766E", accent: "#14B8A6" },
  project:  { label: "Project",  bg: "#EDE9FE", text: "#4C1D95", accent: "#8B5CF6" },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="11" height="8" viewBox="0 0 11 8" fill="none" aria-hidden="true">
      <path d="M1 3.5L4 6.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5V8.5L10.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5V19M5 12H19" stroke="#0B1437" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MiniCalendar({
  entryDates,
  selectedDate,
  onSelectDate,
}: {
  entryDates: Set<string>;
  selectedDate: string;
  onSelectDate: (d: string) => void;
}) {
  const todayStr = toDateStr(new Date());
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  return (
    <div className="bg-white rounded-2xl px-4 pt-4 pb-3 shadow-sm">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-[#EEF1F8]"
          style={{ color: "#4A5B9A" }}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </button>
        <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-outfit)", color: "#0B1437" }}>
          {monthLabel}
        </span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:bg-[#EEF1F8]"
          style={{ color: "#4A5B9A" }}
          aria-label="Next month"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((l) => (
          <div
            key={l}
            className="text-center text-[10px] font-semibold py-1"
            style={{ fontFamily: "var(--font-outfit)", color: "#A0ABBB" }}
          >
            {l}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const day = parseInt(dateStr.split("-")[2]);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasEntry = entryDates.has(dateStr);

          let bg = "transparent";
          let color = "#0B1437";
          if (isSelected) { bg = "#0B1437"; color = "white"; }
          else if (isToday) { bg = "#F5C518"; color = "#0B1437"; }

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className="flex flex-col items-center justify-center py-0.5"
            >
              <div
                className="w-8 h-8 flex items-center justify-center rounded-full text-[13px] font-medium transition-all active:opacity-70"
                style={{ backgroundColor: bg, color, fontFamily: "var(--font-outfit)" }}
              >
                {day}
              </div>
              <div
                className="w-1 h-1 rounded-full mt-0.5 transition-opacity"
                style={{
                  backgroundColor: isSelected ? "#6B7FBF" : "#F5C518",
                  opacity: hasEntry ? 1 : 0,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, onDelete }: { entry: CalendarEntry; onDelete: (id: string) => void }) {
  const time = entry.created_at
    ? new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  return (
    <div
      className="card-enter bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-start gap-3"
      style={{ borderLeft: "3px solid #F5C518" }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium leading-snug" style={{ fontFamily: "var(--font-outfit)", color: "#0B1437" }}>
          {entry.note}
        </p>
        {time && (
          <p className="text-[10px] mt-1" style={{ fontFamily: "var(--font-outfit)", color: "#A0ABBB" }}>
            {time}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 active:scale-90 transition-transform mt-0.5"
        style={{ color: "#CBD5E1" }}
        aria-label="Delete entry"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Add Entry Modal ──────────────────────────────────────────────────────────

function AddEntryModal({
  date,
  onClose,
  onAdd,
}: {
  date: string;
  onClose: () => void;
  onAdd: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!note.trim()) return;
    setSaving(true);
    await onAdd(note.trim());
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="overlay-enter absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="modal-enter relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        style={{ maxHeight: "90dvh", overflowY: "auto" }}
      >
        <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-5" />
        <p
          className="text-[10.5px] font-semibold uppercase tracking-[0.18em] mb-1"
          style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}
        >
          {formatDayLabel(date)}
        </p>
        <h3 className="text-xl font-semibold text-[#0B1437] mb-5" style={{ fontFamily: "var(--font-playfair)" }}>
          Log Entry
        </h3>
        <div className="space-y-3.5">
          <textarea
            placeholder="Write something — a note, a thought, anything…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-sm text-[#0B1437] placeholder-[#CBD5E1] outline-none focus:border-[#6B7FBF] transition-colors resize-none"
            style={{ fontFamily: "var(--font-outfit)" }}
            autoFocus
          />
          <button
            onClick={handleAdd}
            disabled={saving || !note.trim()}
            className="w-full bg-[#0B1437] text-white py-4 rounded-2xl text-sm font-semibold tracking-wide active:scale-[0.98] transition-all disabled:opacity-50"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, index, onToggle }: { task: Task; index: number; onToggle: (id: string) => void }) {
  const badge = BADGE[task.type];
  return (
    <div
      className="card-enter bg-white rounded-2xl px-4 py-4 flex items-start gap-3.5 shadow-sm"
      style={{
        borderLeft: `3px solid ${badge.accent}`,
        animationDelay: `${index * 55}ms`,
        opacity: task.done ? 0.55 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <button
        onClick={() => onToggle(task.id)}
        className="mt-0.5 w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90"
        style={task.done ? { backgroundColor: badge.accent, borderColor: badge.accent } : { borderColor: "#CBD5E1" }}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
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
            className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
            style={{ fontFamily: "var(--font-outfit)", backgroundColor: badge.bg, color: badge.text }}
          >
            {badge.label}
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
  onAdd: (task: Omit<Task, "id" | "done" | "created_at">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TaskType>("homework");
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
      <div
        className="modal-enter relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        style={{ maxHeight: "90dvh", overflowY: "auto" }}
      >
        <div className="w-10 h-1 bg-[#E2E8F0] rounded-full mx-auto mb-5" />
        <h3 className="text-xl font-semibold text-[#0B1437] mb-5" style={{ fontFamily: "var(--font-playfair)" }}>
          New Task
        </h3>
        <div className="space-y-3.5">
          <input
            type="text"
            placeholder="What do you need to do?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-sm text-[#0B1437] placeholder-[#CBD5E1] outline-none focus:border-[#6B7FBF] transition-colors"
            style={{ fontFamily: "var(--font-outfit)" }}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(BADGE) as TaskType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="py-3 rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all active:scale-95"
                style={{
                  fontFamily: "var(--font-outfit)",
                  backgroundColor: BADGE[t].bg,
                  color: BADGE[t].text,
                  border: type === t ? `2px solid ${BADGE[t].accent}` : "2px solid transparent",
                  opacity: type === t ? 1 : 0.65,
                }}
              >
                {BADGE[t].label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Deadline — e.g. Today, 5:00 PM"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-sm text-[#0B1437] placeholder-[#CBD5E1] outline-none focus:border-[#6B7FBF] transition-colors"
            style={{ fontFamily: "var(--font-outfit)" }}
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full bg-[#0B1437] text-white py-4 rounded-2xl text-sm font-semibold tracking-wide active:scale-[0.98] transition-all disabled:opacity-60"
            style={{ fontFamily: "var(--font-outfit)" }}
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

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Calendar entries
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showEntryModal, setShowEntryModal] = useState(false);

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

  // Load calendar entries
  useEffect(() => {
    supabase
      .from("calendar_entries")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setEntries(data as CalendarEntry[]);
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

  const addEntry = async (note: string) => {
    const { data } = await supabase
      .from("calendar_entries")
      .insert({ date: selectedDate, note })
      .select()
      .single();
    if (data) setEntries((prev) => [...prev, data as CalendarEntry]);
    setShowEntryModal(false);
  };

  const deleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("calendar_entries").delete().eq("id", id);
  };

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const entryDates = new Set(entries.map((e) => e.date));
  const selectedEntries = entries.filter((e) => e.date === selectedDate);
  const sorted = [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)];

  return (
    <div className="min-h-screen" style={{ background: "#EEF1F8" }}>
      {/* ── Header ── */}
      <div className="px-6 pt-12 pb-8 relative overflow-hidden" style={{ background: "#0B1437" }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.06]" style={{ background: "#F5C518" }} />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-[0.04]" style={{ background: "#6B7FBF" }} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ fontFamily: "var(--font-outfit)", color: "#4A5B9A" }}>
          {dayName}
        </p>
        <h1 className="text-[2.6rem] font-semibold leading-[1.1] text-white mb-7" style={{ fontFamily: "var(--font-playfair)" }}>
          {dateStr}
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-full h-1" style={{ background: "#1A2654" }}>
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, background: "#F5C518" }} />
          </div>
          <span className="text-[11px] whitespace-nowrap tabular-nums" style={{ fontFamily: "var(--font-outfit)", color: "#4A5B9A" }}>
            {done} / {total} done
          </span>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32 space-y-5">
        {/* ── Calendar ── */}
        <div>
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>
              Calendar
            </span>
          </div>
          <MiniCalendar
            entryDates={entryDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        {/* ── Day entries ── */}
        <div>
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>
              {formatDayLabel(selectedDate)}
            </span>
            <button
              onClick={() => setShowEntryModal(true)}
              className="text-[11px] font-semibold active:opacity-60 transition-opacity"
              style={{ fontFamily: "var(--font-outfit)", color: "#F5C518" }}
            >
              + Log entry
            </button>
          </div>

          {selectedEntries.length === 0 ? (
            <div
              className="text-center py-6 rounded-2xl bg-white/60"
              style={{ fontFamily: "var(--font-outfit)", color: "#CBD5E1", fontSize: 13 }}
            >
              Nothing logged — tap + Log entry
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} onDelete={deleteEntry} />
              ))}
            </div>
          )}
        </div>

        {/* ── Task list ── */}
        <div>
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>
              Today's Tasks
            </span>
            <span className="text-[11px]" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>
              {tasks.filter((t) => !t.done).length} remaining
            </span>
          </div>

          {tasksLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-4 h-[76px] animate-pulse mb-2.5" style={{ borderLeft: "3px solid #E2E8F0" }} />
            ))
          ) : sorted.length === 0 ? (
            <div className="text-center py-12" style={{ fontFamily: "var(--font-outfit)", color: "#9CA3AF" }}>
              <p className="text-3xl mb-3">✓</p>
              <p className="text-sm">All clear — tap + to add a task.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sorted.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} onToggle={toggleTask} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowTaskModal(true)}
        className="fixed right-5 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform duration-150"
        style={{
          bottom: "calc(80px + 1.25rem)",
          background: "#F5C518",
          boxShadow: "0 4px 20px rgba(245, 197, 24, 0.45)",
        }}
        aria-label="Add new task"
      >
        <PlusIcon />
      </button>

      {/* ── Modals ── */}
      {showTaskModal && <AddTaskModal onClose={() => setShowTaskModal(false)} onAdd={addTask} />}
      {showEntryModal && (
        <AddEntryModal date={selectedDate} onClose={() => setShowEntryModal(false)} onAdd={addEntry} />
      )}
    </div>
  );
}
