import React, { useState } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  CloudSun,
  Sun,
  Moon,
  Sunset,
  Sunrise,
  CloudRain,
  CloudLightning,
  Cloud,
  Snowflake,
  Plus,
  Trash2,
  Check,
  Power,
  Sliders,
  Sparkles,
  X,
  Clock,
} from 'lucide-react';
import { PersonalizationRule, WeatherCondition, TimeOfDay } from '../types/wallpaper';

export const ContextRulesView: React.FC = () => {
  const {
    rules,
    toggleRule,
    addRule,
    deleteRule,
    collections,
    settings,
    updateSettings,
    weatherCondition,
    setWeatherCondition,
    timeOfDay,
    simulatedHour,
    setSimulatedHour,
    isLiveClock,
    setIsLiveClock,
    currentTimeString,
    activeRuleStatus,
    rotateNext,
    glassTheme,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [conditionType, setConditionType] = useState<'time' | 'weather' | 'calendar'>('weather');
  const [conditionValue, setConditionValue] = useState('rain');
  const [targetCollectionId, setTargetCollectionId] = useState(collections[0]?.id || '');
  const [priority, setPriority] = useState(2);

  const weatherOptions: { id: WeatherCondition; label: string; icon: any }[] = [
    { id: 'clear', label: 'Clear & Sunny', icon: Sun },
    { id: 'clouds', label: 'Cloudy / Overcast', icon: Cloud },
    { id: 'rain', label: 'Rain & Drizzle', icon: CloudRain },
    { id: 'thunderstorm', label: 'Thunderstorm', icon: CloudLightning },
    { id: 'snow', label: 'Snow & Frost', icon: Snowflake },
    { id: 'mist', label: 'Mist & Fog', icon: Cloud },
  ];

  const timeOptions: { id: TimeOfDay; label: string; hour: number; icon: any }[] = [
    { id: 'dawn', label: 'Dawn (06:30)', hour: 6, icon: Sunrise },
    { id: 'day', label: 'Day (12:00)', hour: 12, icon: Sun },
    { id: 'goldenHour', label: 'Golden Hour (18:00)', hour: 18, icon: Sunset },
    { id: 'night', label: 'Night (22:00)', hour: 22, icon: Moon },
  ];

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    addRule({
      name: ruleName.trim(),
      conditionType,
      conditionValue,
      targetCollectionId,
      priority,
      enabled: true,
    });
    setRuleName('');
    setIsAddingRule(false);
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
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <h2 className={`text-base font-bold tracking-wide ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              Context-Aware Personalization Engine
            </h2>
          </div>
          <p className={`text-xs mt-0.5 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
            Dynamically shifts your desktop environment based on local time, weather patterns, and
            calendar focus modes.
          </p>
        </div>

        {/* Master Auto-Adapt Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateSettings({ autoAdaptEnabled: !settings.autoAdaptEnabled })}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
              settings.autoAdaptEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30 shadow-lg'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{settings.autoAdaptEnabled ? 'Auto-Adapt Active' : 'Auto-Adapt Disabled'}</span>
          </button>

          <button
            onClick={() => setIsAddingRule(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-xs font-medium transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      {/* Interactive Context Simulator Bar */}
      <div
        className={`p-4 rounded-2xl border space-y-4 transition-all ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/80 text-slate-800'
            : 'mac-glass-blackish-card border-white/18 text-slate-100 specular-sheen'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-300" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Live Context Simulator
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiveClock(!isLiveClock)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                isLiveClock
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {isLiveClock ? '✓ Live System Clock' : 'Simulated Time'}
            </button>
          </div>
        </div>

        {/* Time of Day & Weather Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Time Preset Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-medium">Time of Day (Current: {timeOfDay})</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {timeOptions.map(t => {
                const Icon = t.icon;
                const isSelected = timeOfDay === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setIsLiveClock(false);
                      setSimulatedHour(t.hour);
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-white/20 text-white border-white/30 shadow-md'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weather Condition Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-medium">Simulated Weather (Current: {weatherCondition})</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {weatherOptions.map(w => {
                const Icon = w.icon;
                const isSelected = weatherCondition === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setWeatherCondition(w.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 shadow-md'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                    title={w.label}
                  >
                    <Icon className="w-3.5 h-3.5 mb-1" />
                    <span className="capitalize text-[10px] truncate max-w-full">{w.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Active Evaluation Feedback Banner */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span className="text-xs text-slate-300 font-medium">{activeRuleStatus.description}</span>
          </div>

          <button
            onClick={() => rotateNext(true)}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          >
            Apply Context Wallpaper Now
          </button>
        </div>
      </div>

      {/* Rules Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white tracking-wide">Configured Rules ({rules.length})</h3>

        <div className="space-y-2">
          {rules.map(rule => {
            const targetCol = collections.find(c => c.id === rule.targetCollectionId);
            return (
              <div
                key={rule.id}
                className={`p-3.5 rounded-2xl mac-glass-card flex items-center justify-between gap-4 transition-all ${
                  rule.enabled ? 'border-white/15' : 'opacity-60 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold shrink-0">
                    #{rule.priority}
                  </span>

                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{rule.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="capitalize text-cyan-300 font-mono">
                        {rule.conditionType}: {rule.conditionValue}
                      </span>
                      <span>→</span>
                      <span className="text-slate-300 truncate">
                        Collection: {targetCol?.name || 'Default'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      rule.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Rule Modal */}
      {isAddingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <form
            onSubmit={handleAddRule}
            className="w-full max-w-md mac-glass-panel-dark rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Personalization Rule</h3>
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={e => setRuleName(e.target.value)}
                  placeholder="e.g. Rainy Mood Auto-Switch"
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Condition Trigger Type</label>
                <select
                  value={conditionType}
                  onChange={e => {
                    const val = e.target.value as any;
                    setConditionType(val);
                    if (val === 'weather') setConditionValue('rain');
                    if (val === 'time') setConditionValue('night');
                    if (val === 'calendar') setConditionValue('work');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                >
                  <option value="weather">Weather Condition</option>
                  <option value="time">Time of Day</option>
                  <option value="calendar">Calendar Event Category</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Trigger Condition Value</label>
                {conditionType === 'weather' && (
                  <select
                    value={conditionValue}
                    onChange={e => setConditionValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                  >
                    <option value="clear">Clear / Sunny</option>
                    <option value="rain">Rain / Drizzle</option>
                    <option value="clouds">Clouds / Overcast</option>
                    <option value="thunderstorm">Thunderstorm</option>
                    <option value="snow">Snow</option>
                    <option value="mist">Mist / Fog</option>
                  </select>
                )}

                {conditionType === 'time' && (
                  <select
                    value={conditionValue}
                    onChange={e => setConditionValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                  >
                    <option value="dawn">Dawn (Morning Sunrise)</option>
                    <option value="day">Day (Standard Bright)</option>
                    <option value="goldenHour">Golden Hour (Twilight Dusk)</option>
                    <option value="night">Night (Dark OLED)</option>
                  </select>
                )}

                {conditionType === 'calendar' && (
                  <select
                    value={conditionValue}
                    onChange={e => setConditionValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white"
                  >
                    <option value="work">Work / Deep Focus</option>
                    <option value="meeting">Meeting / Presentation</option>
                    <option value="creative">Creative Brainstorm</option>
                    <option value="relaxation">Relaxation / Evening Wind Down</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Collection to Apply</label>
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

              <div>
                <label className="block text-slate-300 font-medium mb-1">Priority Rank (1 = Highest)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={e => setPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-100 border border-cyan-400/30 font-medium text-xs shadow-md"
              >
                Save Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
