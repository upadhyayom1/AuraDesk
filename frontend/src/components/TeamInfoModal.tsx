import React from 'react';
import { X, Users, Award, Code, Cpu, Database, CloudRain, Layers, Terminal } from 'lucide-react';

interface TeamInfoModalProps {
  onClose: () => void;
}

export const TeamInfoModal: React.FC<TeamInfoModalProps> = ({ onClose }) => {
  const members = [
    {
      name: 'Naman Kumar',
      regNo: '20253167',
      branch: 'CSE',
      discord: 'krnaman2007',
      role: 'Core Architect & Image Processing Pipeline',
    },
    {
      name: 'Om Upadhyay',
      regNo: '20253181',
      branch: 'CSE',
      discord: 'upadhyayom1_37905',
      role: 'Frontend UI/UX & Glassmorphic macOS Engine',
    },
    {
      name: 'Adya Tripathi',
      regNo: '20253026',
      branch: 'CSE',
      discord: 'adya_tripathi',
      role: 'Context Personalization & Calendar Synchronization',
    },
  ];

  const techStack = [
    { name: 'Electron + React', desc: 'Cross-platform native window, tray, and glass rendering shell' },
    { name: 'Node.js & Sharp', desc: 'Asynchronous event runtime & high-speed image scaling/cropping' },
    { name: 'SQLite (better-sqlite3)', desc: 'Transactional local persistence for collections, rules, and history' },
    { name: 'Unsplash & Pexels APIs', desc: 'Curated 5K/4K wallpaper discovery and photographer credit normalization' },
    { name: 'OpenWeatherMap API', desc: 'Dynamic weather-based wallpaper rules (rain, snow, clear)' },
    { name: 'Google Calendar API', desc: 'Upcoming events integration to schedule focus collections' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto mac-glass-panel-dark rounded-3xl p-6 border border-white/20 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-300">Softablitz 2026</span>
                <span className="text-slate-500">·</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-white">
                  Team ID: 220
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Team: The Three Musketeers — AuraDesk
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Members Cards */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Team Members
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {members.map(member => (
              <div
                key={member.regNo}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-300">{member.branch}</span>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {member.regNo}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{member.name}</h4>
                <p className="text-[10px] font-mono text-indigo-300">@{member.discord}</p>
                <p className="text-[11px] text-slate-400 pt-1 leading-snug">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Problem & Solution Summary */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-slate-300 leading-relaxed">
          <h4 className="font-semibold text-white text-xs">Project Vision & Problem Statement</h4>
          <p>
            Traditional desktop wallpaper customization requires users to search multiple platforms,
            download images manually, and repeatedly change desktop settings. Existing solutions
            often lack unified collection management and intelligent automation.
          </p>
          <p className="text-slate-400">
            <strong>AuraDesk</strong> delivers a unified desktop personalization experience:
            discovering wallpapers from external image sources, previewing with automatic scaling and
            cropping, organizing custom collections, scheduled shuffling, and context-aware
            adaptation driven by local time, weather conditions, and calendar events.
          </p>
        </div>

        {/* Technical Architecture */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Core Engineering Architecture & Libraries
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {techStack.map(stack => (
              <div
                key={stack.name}
                className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5"
              >
                <span className="font-mono text-cyan-300 text-xs font-medium block">
                  {stack.name}
                </span>
                <span className="text-slate-400 text-[11px] leading-tight block">
                  {stack.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 font-medium text-xs transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
