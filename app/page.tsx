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

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE: Record<
  TaskType,
  { label: string; bg: string; text: string; accent: string }
> = {
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

function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (task: Omit<Task, "id" | "done" | "created_at">) => Promise<void> }) {
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
      <div className="modal-enter relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl" style={{ maxHeight: "90dvh", overflowY: "auto" }}>
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Load tasks from Supabase
  useEffect(() => {
    async function loadTasks() {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setTasks(data as Task[]);
      setLoading(false);
    }
    loadTasks();
  }, []);

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: newDone } : t)));
    await supabase.from("tasks").update({ done: newDone }).eq("id", id);
  };

  const addTask = async (task: Omit<Task, "id" | "done" | "created_at">) => {
    const { data } = await supabase
      .from("tasks")
      .insert({ ...task, done: false })
      .select()
      .single();
    if (data) setTasks((prev) => [...prev, data as Task]);
    setShowModal(false);
  };

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

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

      {/* ── Task list ── */}
      <div className="px-4 pt-5 pb-32 space-y-2.5">
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>
            Today's Tasks
          </span>
          <span className="text-[11px]" style={{ fontFamily: "var(--font-outfit)", color: "#8A93B8" }}>
            {tasks.filter((t) => !t.done).length} remaining
          </span>
        </div>

        {loading ? (
          // Skeleton cards
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl px-4 py-4 h-[76px] animate-pulse" style={{ borderLeft: "3px solid #E2E8F0" }} />
          ))
        ) : sorted.length === 0 ? (
          <div className="text-center py-20" style={{ fontFamily: "var(--font-outfit)", color: "#9CA3AF" }}>
            <p className="text-3xl mb-3">✓</p>
            <p className="text-sm">All clear — tap + to add a task.</p>
          </div>
        ) : (
          sorted.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} onToggle={toggleTask} />
          ))
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowModal(true)}
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

      {/* ── Modal ── */}
      {showModal && <AddTaskModal onClose={() => setShowModal(false)} onAdd={addTask} />}
    </div>
  );
}
