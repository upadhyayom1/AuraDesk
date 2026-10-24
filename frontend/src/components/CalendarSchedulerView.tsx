import React, { useState } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { CalendarEvent } from '../types/wallpaper';

export const CalendarSchedulerView: React.FC = () => {
  const {
    calendarEvents,
    addCalendarEvent,
    deleteCalendarEvent,
    collections,
    currentTimeString,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('15:00');
  const [targetCollectionId, setTargetCollectionId] = useState(collections[0]?.id || '');
  const [category, setCategory] = useState<'work' | 'meeting' | 'relaxation' | 'creative'>('work');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addCalendarEvent({
      title: title.trim(),
      startTime,
      endTime,
      targetCollectionId,
      category,
    });
    setTitle('');
    setIsAddingEvent(false);
  };

  const isCurrentTimeInEvent = (start: string, end: string) => {
    return currentTimeString >= start && currentTimeString <= end;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl border shrink-0 transition-all ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/80 text-slate-800'
            : 'mac-glass-blackish-card border-white/18 text-slate-100 specular-sheen'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <Calendar className={`w-5 h-5 ${isWhitish ? 'text-blue-600' : 'text-cyan-300'}`} />
            <h2 className={`text-base font-bold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              Calendar-Based Wallpaper Scheduling
            </h2>
          </div>
          <p className={`text-xs mt-0.5 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
            Synchronizes your desktop vibe with upcoming Google Calendar meetings, coding sessions,
            and relaxation intervals.
          </p>
        </div>

        <button
          onClick={() => setIsAddingEvent(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-xs font-medium transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Scheduled Block</span>
        </button>
      </div>

      {/* Events Timeline List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white tracking-wide">
          Today's Schedule & Collections ({calendarEvents.length})
        </h3>

        <div className="space-y-2.5">
          {calendarEvents.map(event => {
            const isActive = isCurrentTimeInEvent(event.startTime, event.endTime);
            const targetCol = collections.find(c => c.id === event.targetCollectionId);

            return (
              <div
                key={event.id}
                className={`p-4 rounded-2xl mac-glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  isActive
                    ? 'border-cyan-400/50 bg-cyan-950/20 shadow-xl ring-1 ring-cyan-400/30'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono text-[11px] font-bold shrink-0 border ${
                      isActive
                        ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-200'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    <span>{event.startTime}</span>
                    <span className="text-[9px] opacity-60">to</span>
                    <span>{event.endTime}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white truncate">{event.title}</h4>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono">
                          Active Now
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="capitalize text-slate-300">{event.category}</span>
                      <span>·</span>
                      <span className="text-cyan-300 truncate">
                        Linked to: {targetCol?.name || 'Default Collection'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => deleteCalendarEvent(event.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {isAddingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md mac-glass-panel-dark rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Calendar Schedule</h3>
              <button
                type="button"
                onClick={() => setIsAddingEvent(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Design Critique or Deep Work"
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                >
                  <option value="work">Deep Focus / Work Block</option>
                  <option value="meeting">Team Meeting / Presentation</option>
                  <option value="creative">Creative Studio Session</option>
                  <option value="relaxation">Relaxation / Evening Rest</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Collection</label>
                <select
                  value={targetCollectionId}
                  onChange={e => setTargetCollectionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                >
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingEvent(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-100 border border-cyan-400/30 font-medium text-xs shadow-md"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
