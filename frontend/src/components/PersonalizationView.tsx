import React, { useState, useEffect, useCallback } from 'react';
import { useWallpaper } from '../context/WallpaperContext';
import {
  Sparkles,
  CloudSun,
  Clock,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Play,
  X,
  RefreshCw,
  Sliders,
  Power,
  ChevronRight,
  Sun,
  Moon,
  CloudRain,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { electronBridge, normalizeBackendWallpaper } from '../services/electronBridge';
import { WallpaperCollection, Wallpaper } from '../types/wallpaper';

interface RuleItem {
  id: string;
  name: string;
  conditionType: 'TIME_RANGE' | 'WEATHER' | 'DAY_PART';
  conditionValue: string | Record<string, any>;
  collectionId: string;
  priority: number;
  enabled: boolean | number;
}

interface CalendarBindingItem {
  id: string;
  matchType: 'KEYWORD' | 'EVENT_ID';
  matchValue: string;
  collectionId: string;
  priority: number;
}

interface PersonalizationViewProps {
  onOpenCollections?: () => void;
}

export const PersonalizationView: React.FC<PersonalizationViewProps> = ({ onOpenCollections }) => {
  const {
    collections,
    currentWallpaper,
    glassTheme,
    settings,
    updateSettings,
    refreshHistory,
  } = useWallpaper();

  const isWhitish = glassTheme === 'whitish';

  // Personalization State
  const [isEnabled, setIsEnabled] = useState<boolean>(settings.autoAdaptEnabled ?? true);
  const [activeRule, setActiveRule] = useState<any | null>(null);
  const [activeOverride, setActiveOverride] = useState<any | null>(null);
  const [contextSnapshot, setContextSnapshot] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Rules & Bindings
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [calendarBindings, setCalendarBindings] = useState<CalendarBindingItem[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean; account: string | null; lastSyncAt: string | null }>({
    connected: false,
    account: null,
    lastSyncAt: null,
  });

  // Modal States
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [isAddBindingModalOpen, setIsAddBindingModalOpen] = useState(false);

  // New Rule Form State
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleConditionType, setNewRuleConditionType] = useState<'TIME_RANGE' | 'WEATHER' | 'DAY_PART'>('TIME_RANGE');
  const [newRuleTimeFrom, setNewRuleTimeFrom] = useState('09:00');
  const [newRuleTimeTo, setNewRuleTimeTo] = useState('17:00');
  const [newRuleWeather, setNewRuleWeather] = useState('Clear');
  const [newRuleDayPart, setNewRuleDayPart] = useState('day');
  const [newRuleCollectionId, setNewRuleCollectionId] = useState(collections[0]?.id || '');
  const [newRulePriority, setNewRulePriority] = useState(1);

  // New Calendar Binding Form State
  const [newBindingKeyword, setNewBindingKeyword] = useState('');
  const [newBindingCollectionId, setNewBindingCollectionId] = useState(collections[0]?.id || '');
  const [newBindingPriority, setNewBindingPriority] = useState(1);

  // Test / Evaluation Diagnostics State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Helper notice banner
  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Load all personalization data from backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await electronBridge.getPersonalizationState();
      if (state) {
        setIsEnabled(state.enabled);
        setActiveRule(state.activeRule);
        setActiveOverride(state.override);
        setContextSnapshot(state.context);
      }

      const [loadedRules, loadedBindings, loadedCalStatus] = await Promise.all([
        electronBridge.listRules(),
        electronBridge.listCalendarBindings(),
        electronBridge.getCalendarStatus(),
      ]);

      setRules(Array.isArray(loadedRules) ? loadedRules : []);
      setCalendarBindings(Array.isArray(loadedBindings) ? loadedBindings : []);
      if (loadedCalStatus) {
        setCalendarStatus(loadedCalStatus);
      }
    } catch (err) {
      console.warn('[PersonalizationView] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for broadcast state updates
    const unsub = electronBridge.onPersonalizationState((state) => {
      if (state) {
        if (typeof state.activeRule !== 'undefined') setActiveRule(state.activeRule);
        if (typeof state.override !== 'undefined') setActiveOverride(state.override);
        if (typeof state.context !== 'undefined') setContextSnapshot(state.context);
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [loadData]);

  // Master switch handler
  const handleToggleMaster = async () => {
    const nextVal = !isEnabled;
    setIsEnabled(nextVal);
    updateSettings({ autoAdaptEnabled: nextVal });
    await electronBridge.setPersonalizationEnabled(nextVal);
    showNotice(nextVal ? 'Personalization engine enabled' : 'Personalization engine paused');
  };

  // Clear manual override
  const handleClearOverride = async () => {
    try {
      const ok = await electronBridge.clearOverride();
      if (ok) {
        setActiveOverride(null);
        showNotice('Manual override cleared. Restored rule-based wallpapers.');
        await loadData();
      }
    } catch (err: any) {
      showNotice(`Error: ${err.message}`);
    }
  };

  // Toggle rule enabled/disabled
  const handleToggleRule = async (rule: RuleItem) => {
    const currentEnabled = Boolean(rule.enabled);
    const newEnabled = !currentEnabled;
    try {
      await electronBridge.updateRule(rule.id, { enabled: newEnabled });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: newEnabled } : r));
      showNotice(`Rule "${rule.name}" ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      showNotice(`Failed to update rule: ${err.message}`);
    }
  };

  // Delete rule
  const handleDeleteRule = async (id: string, name: string) => {
    try {
      const ok = await electronBridge.deleteRule(id);
      if (ok) {
        setRules(prev => prev.filter(r => r.id !== id));
        showNotice(`Rule "${name}" deleted`);
      }
    } catch (err: any) {
      showNotice(`Failed to delete rule: ${err.message}`);
    }
  };

  // Create rule
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) {
      showNotice('Please enter a rule name');
      return;
    }

    let conditionValue: any = {};
    if (newRuleConditionType === 'TIME_RANGE') {
      conditionValue = { from: newRuleTimeFrom, to: newRuleTimeTo };
    } else if (newRuleConditionType === 'WEATHER') {
      conditionValue = newRuleWeather;
    } else if (newRuleConditionType === 'DAY_PART') {
      conditionValue = newRuleDayPart;
    }

    const colId = newRuleCollectionId || collections[0]?.id;
    if (!colId) {
      showNotice('Please create or select a wallpaper collection first');
      return;
    }

    try {
      const res = await electronBridge.createRule({
        name: newRuleName.trim(),
        conditionType: newRuleConditionType,
        conditionValue,
        collectionId: colId,
        priority: Number(newRulePriority) || 1,
      });

      if (res && res.id) {
        showNotice(`Rule "${res.name}" created successfully`);
        setIsAddRuleModalOpen(false);
        setNewRuleName('');
        await loadData();
      }
    } catch (err: any) {
      showNotice(`Failed to create rule: ${err.message}`);
    }
  };

  // Delete calendar binding
  const handleDeleteBinding = async (id: string, keyword: string) => {
    try {
      const ok = await electronBridge.deleteCalendarBinding(id);
      if (ok) {
        setCalendarBindings(prev => prev.filter(b => b.id !== id));
        showNotice(`Calendar binding "${keyword}" deleted`);
      }
    } catch (err: any) {
      showNotice(`Failed to delete binding: ${err.message}`);
    }
  };

  // Create calendar binding
  const handleCreateBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBindingKeyword.trim()) {
      showNotice('Please enter a keyword');
      return;
    }

    const colId = newBindingCollectionId || collections[0]?.id;
    if (!colId) {
      showNotice('Please select a collection');
      return;
    }

    try {
      const res = await electronBridge.createCalendarBinding({
        matchType: 'KEYWORD',
        matchValue: newBindingKeyword.trim(),
        collectionId: colId,
        priority: Number(newBindingPriority) || 1,
      });

      if (res && res.id) {
        showNotice(`Calendar binding for "${res.matchValue}" created`);
        setIsAddBindingModalOpen(false);
        setNewBindingKeyword('');
        await loadData();
      }
    } catch (err: any) {
      showNotice(`Failed to create binding: ${err.message}`);
    }
  };

  // Google Calendar OAuth loopback
  const handleConnectCalendar = async () => {
    showNotice('Initiating Google Calendar authentication...');
    try {
      const res = await electronBridge.connectCalendar();
      if (res && res.authUrl) {
        await electronBridge.openExternal(res.authUrl);
      }
      const updated = await electronBridge.getCalendarStatus();
      setCalendarStatus(updated);
    } catch (err: any) {
      showNotice(`Calendar auth error: ${err.message}`);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await electronBridge.disconnectCalendar();
      setCalendarStatus({ connected: false, account: null, lastSyncAt: null });
      showNotice('Google Calendar disconnected');
    } catch (err: any) {
      showNotice(`Error disconnecting calendar: ${err.message}`);
    }
  };

  // Dry run / Evaluate rules
  const handleEvaluateNow = async () => {
    setIsEvaluating(true);
    setEvalResult(null);
    try {
      const res = await electronBridge.evaluatePersonalization();
      setEvalResult(res);
      showNotice('Rules evaluated against current environment snapshot');
    } catch (err: any) {
      showNotice(`Evaluation error: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper to get collection name by ID
  const getCollectionName = (id: string) => {
    const found = collections.find(c => c.id === id);
    return found ? found.name : 'Unknown Collection';
  };

  // Format condition value nicely
  const formatConditionDisplay = (rule: RuleItem) => {
    let val = rule.conditionValue;
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val);
      } catch {
        // Leave as string
      }
    }

    if (rule.conditionType === 'TIME_RANGE') {
      if (val && typeof val === 'object' && val.from && val.to) {
        return `${val.from} – ${val.to}`;
      }
      return 'Time Window';
    }

    if (rule.conditionType === 'WEATHER') {
      const w = typeof val === 'object' ? val.condition : String(val);
      return `Weather: ${w}`;
    }

    if (rule.conditionType === 'DAY_PART') {
      const p = typeof val === 'object' ? val.part : String(val);
      return `Day Part: ${p}`;
    }

    return String(val || 'Custom');
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Notice Banner */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/90 text-white border border-white/20 shadow-2xl backdrop-blur-xl animate-fade-in text-xs font-medium">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Banner: Master Controller & Status */}
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-3xl border shrink-0 transition-all ${
          isWhitish
            ? 'mac-glass-whitish-card border-white/80 text-slate-800'
            : 'mac-glass-blackish-card border-white/15 text-slate-100 specular-sheen'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              isEnabled
                ? 'bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white border-white/30 shadow-md'
                : isWhitish
                ? 'bg-slate-200 border-slate-300 text-slate-500'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">
                Context-Aware Personalization
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold border ${
                  isEnabled
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                {isEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
              Automatically changes your desktop wallpaper based on live time, weather, and calendar events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={handleEvaluateNow}
            disabled={isEvaluating}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isWhitish
                ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs'
                : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/15'
            }`}
            title="Evaluate rules against current environmental snapshot without changing wallpaper"
          >
            <Play className={`w-3.5 h-3.5 text-cyan-400 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>Test My Rules</span>
          </button>

          <button
            onClick={handleToggleMaster}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isEnabled
                ? isWhitish
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white border border-white/25'
                : isWhitish
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isEnabled ? 'Engine Enabled' : 'Enable Engine'}</span>
          </button>
        </div>
      </div>

      {/* Manual Override Active Banner (if user manually set a wallpaper) */}
      {activeOverride && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border ${
            isWhitish
              ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-xs'
              : 'bg-amber-950/40 border-amber-600/30 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold">Manual Wallpaper Override Active</p>
              <p className="text-[11px] opacity-80 truncate">
                Rules are temporarily bypassed until {activeOverride.expiresAt ? new Date(activeOverride.expiresAt).toLocaleTimeString() : 'the override expires'}.
              </p>
            </div>
          </div>
          <button
            onClick={handleClearOverride}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors shrink-0"
          >
            Clear Override
          </button>
        </div>
      )}

      {/* Live Context Telemetry Grid */}
      <div>
        <h3 className={`text-xs font-mono uppercase tracking-wider mb-2.5 px-1 ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
          Live Environmental Context
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Time & Day Part */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
              isWhitish
                ? 'bg-white/70 border-white/90 text-slate-800 shadow-xs'
                : 'bg-white/5 border-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs opacity-75 mb-2">
              <span className="font-mono uppercase text-[10px]">Time & Phase</span>
              <Clock className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xl font-bold font-mono tracking-tight">
                {contextSnapshot?.now ? new Date(contextSnapshot.now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs capitalize font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                {contextSnapshot?.isDay ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{contextSnapshot?.weather?.dayPart || (contextSnapshot?.isDay ? 'Daytime' : 'Nighttime')}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Live Weather */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
              isWhitish
                ? 'bg-white/70 border-white/90 text-slate-800 shadow-xs'
                : 'bg-white/5 border-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs opacity-75 mb-2">
              <span className="font-mono uppercase text-[10px]">
                {contextSnapshot?.weather?.isFallback ? 'Weather (Unconfigured)' : 'Live Weather'}
              </span>
              <CloudSun className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="space-y-0.5">
              {contextSnapshot?.weather && !contextSnapshot.weather.isFallback && contextSnapshot.weather.tempC !== undefined ? (
                <div className="text-xl font-bold font-mono tracking-tight flex items-baseline gap-1">
                  <span>{Math.round(contextSnapshot.weather.tempC)}°C</span>
                  <span className="text-xs font-normal opacity-75 font-sans">
                    {contextSnapshot.weather.condition}
                  </span>
                </div>
              ) : (
                <div className="text-sm font-semibold opacity-80">
                  <span>No live weather data</span>
                </div>
              )}
              <p className={`text-[11px] truncate ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                {settings.location?.city && !contextSnapshot?.weather?.isFallback
                  ? settings.location.city
                  : 'Configure city in Settings'}
              </p>
            </div>
          </div>

          {/* Card 3: Google Calendar Event */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
              isWhitish
                ? 'bg-white/70 border-white/90 text-slate-800 shadow-xs'
                : 'bg-white/5 border-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs opacity-75 mb-2">
              <span className="font-mono uppercase text-[10px]">Google Calendar</span>
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-semibold truncate">
                {contextSnapshot?.activeEvent?.title || (calendarStatus.connected ? 'No active meeting' : 'Calendar not linked')}
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${calendarStatus.connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span className={isWhitish ? 'text-slate-600' : 'text-slate-400'}>
                  {calendarStatus.connected ? (calendarStatus.account || 'Connected') : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Current Adaptation Status */}
          <div
            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
              isWhitish
                ? 'bg-white/70 border-white/90 text-slate-800 shadow-xs'
                : 'bg-white/5 border-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs opacity-75 mb-2">
              <span className="font-mono uppercase text-[10px]">Active Decision</span>
              <ShieldCheck className="w-4 h-4 text-violet-400" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-semibold truncate text-violet-600 dark:text-violet-400">
                {activeOverride
                  ? 'Manual Override'
                  : activeRule
                  ? `Rule: ${activeRule.name}`
                  : 'Scheduled Rotation'}
              </div>
              <p className={`text-[11px] truncate ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
                {activeRule ? `Collection: ${getCollectionName(activeRule.collectionId)}` : 'Rotation playlist active'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rule Evaluation Result Panel (after clicking "Test My Rules") */}
      {evalResult && (
        <div
          className={`p-4 rounded-2xl border animate-fade-in ${
            isWhitish
              ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs'
              : 'bg-white/5 border-white/10 text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Rule Evaluation Result</span>
            </div>
            <button
              onClick={() => setEvalResult(null)}
              className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="opacity-70 text-[10px] uppercase font-mono block">Matched Trigger</span>
              <span className="font-semibold">{evalResult.trigger || 'ROTATION (Default)'}</span>
            </div>
            <div>
              <span className="opacity-70 text-[10px] uppercase font-mono block">Matched Rule</span>
              <span className="font-semibold">{evalResult.matchedRule?.name || 'None (Fallback to rotation)'}</span>
            </div>
            <div>
              <span className="opacity-70 text-[10px] uppercase font-mono block">Target Collection</span>
              <span className="font-semibold">{evalResult.collectionId ? getCollectionName(evalResult.collectionId) : 'Default Playlist'}</span>
            </div>
          </div>

          {evalResult.wallpaper && (
            <div className="mt-3 pt-3 border-t border-cyan-500/20 flex items-center gap-3">
              <img
                src={evalResult.wallpaper.imageUrl || evalResult.wallpaper.thumbUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-cyan-500/30 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{evalResult.wallpaper.title || 'Selected Wallpaper'}</p>
                <p className="text-[10px] opacity-75 truncate">{evalResult.wallpaper.photographer || evalResult.wallpaper.sourceCredit || 'AuraDesk Engine'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section: Personalization Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className={`text-sm font-bold tracking-tight ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              Environment Adaptation Rules
            </h3>
            <p className={`text-xs ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
              Rules are evaluated in order of priority (1 = highest). First matching rule takes effect.
            </p>
          </div>
          <button
            onClick={() => setIsAddRuleModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              isWhitish
                ? 'bg-slate-900 hover:bg-slate-800 text-white'
                : 'bg-white/15 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </div>

        {/* Rules Table / Card List */}
        <div className="space-y-2">
          {rules.length === 0 ? (
            <div
              className={`p-8 rounded-2xl border text-center ${
                isWhitish
                  ? 'bg-white/50 border-white/80 text-slate-500'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-500" />
              <p className="text-sm font-semibold">No Personalization Rules Configured</p>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Create a time or weather rule to adapt your wallpapers automatically throughout the day.
              </p>
              <button
                onClick={() => setIsAddRuleModalOpen(true)}
                className={`mt-4 px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isWhitish
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                }`}
              >
                Create First Rule
              </button>
            </div>
          ) : (
            rules.map((rule) => {
              const isRuleActive = activeRule?.id === rule.id && isEnabled;
              const isRuleEnabled = Boolean(rule.enabled);

              return (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isRuleActive
                      ? isWhitish
                        ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-xs'
                        : 'bg-emerald-950/25 border-emerald-500/40 text-emerald-100'
                      : isWhitish
                      ? 'bg-white/70 border-white/90 text-slate-800 shadow-xs hover:border-slate-300'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                        isWhitish ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      #{rule.priority}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs truncate">{rule.name}</span>
                        {isRuleActive && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                            Active Now
                          </span>
                        )}
                        {!isRuleEnabled && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-500/20 text-slate-500 dark:text-slate-400 font-medium">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] opacity-75">
                        <span className="font-mono">{formatConditionDisplay(rule)}</span>
                        <span>•</span>
                        <span className="truncate">Collection: {getCollectionName(rule.collectionId)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleRule(rule)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        isRuleEnabled
                          ? isWhitish
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-200'
                            : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30'
                          : isWhitish
                          ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                          : 'bg-white/10 border-white/15 text-slate-400 hover:bg-white/15'
                      }`}
                      title={isRuleEnabled ? 'Pause Rule' : 'Enable Rule'}
                    >
                      {isRuleEnabled ? 'Enabled' : 'Disabled'}
                    </button>

                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Section: Google Calendar Keyword Bindings */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className={`text-sm font-bold tracking-tight ${isWhitish ? 'text-slate-900' : 'text-white'}`}>
              Google Calendar Keyword Bindings
            </h3>
            <p className={`text-xs ${isWhitish ? 'text-slate-500' : 'text-slate-400'}`}>
              When an event containing a keyword starts, AuraDesk automatically switches to the linked collection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {calendarStatus.connected ? (
              <button
                onClick={handleDisconnectCalendar}
                className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
              >
                Disconnect Calendar
              </button>
            ) : (
              <button
                onClick={handleConnectCalendar}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isWhitish
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Link Google Calendar</span>
              </button>
            )}

            <button
              onClick={() => setIsAddBindingModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                isWhitish
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-white/15 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Keyword</span>
            </button>
          </div>
        </div>

        {/* Calendar Bindings List */}
        <div className="space-y-2">
          {calendarBindings.length === 0 ? (
            <div
              className={`p-6 rounded-2xl border text-center ${
                isWhitish
                  ? 'bg-white/50 border-white/80 text-slate-500'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <Calendar className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-emerald-500" />
              <p className="text-xs font-semibold">No Calendar Bindings</p>
              <p className="text-[11px] mt-0.5 opacity-75">
                Link keywords like &quot;Deep Work&quot;, &quot;Meeting&quot;, or &quot;Creative&quot; to special wallpaper collections.
              </p>
            </div>
          ) : (
            calendarBindings.map((b) => (
              <div
                key={b.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isWhitish
                    ? 'bg-white/70 border-white/90 text-slate-800 shadow-xs'
                    : 'bg-white/5 border-white/10 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                    isWhitish
                      ? 'bg-slate-100 text-slate-900 border-slate-200'
                      : 'bg-white/10 text-white border-white/15'
                  }`}>
                    &quot;{b.matchValue}&quot;
                  </span>
                  <span className="text-xs opacity-80 truncate">
                    → Collection: {getCollectionName(b.collectionId)}
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteBinding(b.id, b.matchValue)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Delete binding"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Modal: Create Personalization Rule                       */}
      {/* ======================================================== */}
      {isAddRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative ${
              isWhitish ? 'mac-modal-light text-slate-900' : 'mac-modal-dark text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm">Create Adaptation Rule</h3>
              </div>
              <button
                onClick={() => setIsAddRuleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              {/* Rule Name */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Evening Chill, Rainy Focus, Morning Glow"
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-all ${
                    isWhitish
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-black/40 border-white/15 text-white focus:border-cyan-400'
                  }`}
                  autoFocus
                />
              </div>

              {/* Condition Type */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Condition Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRuleConditionType('TIME_RANGE')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      newRuleConditionType === 'TIME_RANGE'
                        ? isWhitish
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white/25 text-white border-white/30 shadow-xs'
                        : isWhitish
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Time Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRuleConditionType('WEATHER')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      newRuleConditionType === 'WEATHER'
                        ? isWhitish
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white/25 text-white border-white/30 shadow-xs'
                        : isWhitish
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Weather
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRuleConditionType('DAY_PART')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      newRuleConditionType === 'DAY_PART'
                        ? isWhitish
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white/25 text-white border-white/30 shadow-xs'
                        : isWhitish
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Day Part
                  </button>
                </div>
              </div>

              {/* Condition Parameter inputs */}
              {newRuleConditionType === 'TIME_RANGE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] mb-1 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
                      From (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={newRuleTimeFrom}
                      onChange={(e) => setNewRuleTimeFrom(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono ${
                        isWhitish ? 'bg-white border-slate-300' : 'bg-black/40 border-white/15 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] mb-1 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
                      To (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={newRuleTimeTo}
                      onChange={(e) => setNewRuleTimeTo(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono ${
                        isWhitish ? 'bg-white border-slate-300' : 'bg-black/40 border-white/15 text-white'
                      }`}
                    />
                  </div>
                </div>
              )}

              {newRuleConditionType === 'WEATHER' && (
                <div>
                  <label className={`block text-[11px] mb-1 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
                    Weather Condition
                  </label>
                  <select
                    value={newRuleWeather}
                    onChange={(e) => setNewRuleWeather(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isWhitish ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-white/15 text-white'
                    }`}
                  >
                    <option value="Clear">Clear / Sunny</option>
                    <option value="Clouds">Cloudy / Overcast</option>
                    <option value="Rain">Rainy / Drizzle</option>
                    <option value="Thunderstorm">Thunderstorm</option>
                    <option value="Snow">Snow</option>
                    <option value="Mist">Mist / Fog</option>
                  </select>
                </div>
              )}

              {newRuleConditionType === 'DAY_PART' && (
                <div>
                  <label className={`block text-[11px] mb-1 ${isWhitish ? 'text-slate-600' : 'text-slate-400'}`}>
                    Day Part
                  </label>
                  <select
                    value={newRuleDayPart}
                    onChange={(e) => setNewRuleDayPart(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                      isWhitish ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-white/15 text-white'
                    }`}
                  >
                    <option value="dawn">Dawn (Morning twilight)</option>
                    <option value="day">Day (Broad daylight)</option>
                    <option value="dusk">Dusk (Golden hour)</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              )}

              {/* Target Collection */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Target Collection
                </label>
                <select
                  value={newRuleCollectionId}
                  onChange={(e) => setNewRuleCollectionId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    isWhitish ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-white/15 text-white'
                  }`}
                >
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name} ({col.wallpaperIds.length} wallpapers)
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Priority (1 = Highest)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newRulePriority}
                  onChange={(e) => setNewRulePriority(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono ${
                    isWhitish ? 'bg-white border-slate-300' : 'bg-black/40 border-white/15 text-white'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddRuleModalOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isWhitish ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-slate-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer ${
                    isWhitish
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                  }`}
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: Create Calendar Keyword Binding                  */}
      {/* ======================================================== */}
      {isAddBindingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative ${
              isWhitish ? 'mac-modal-light text-slate-900' : 'mac-modal-dark text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Add Calendar Keyword Binding</h3>
              </div>
              <button
                onClick={() => setIsAddBindingModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBinding} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Event Keyword
                </label>
                <input
                  type="text"
                  value={newBindingKeyword}
                  onChange={(e) => setNewBindingKeyword(e.target.value)}
                  placeholder="e.g. Focus, Sprint, Review, Standup"
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none transition-all ${
                    isWhitish
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-black/40 border-white/15 text-white focus:border-cyan-400'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Target Collection
                </label>
                <select
                  value={newBindingCollectionId}
                  onChange={(e) => setNewBindingCollectionId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none ${
                    isWhitish ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-white/15 text-white'
                  }`}
                >
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name} ({col.wallpaperIds.length} wallpapers)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isWhitish ? 'text-slate-700' : 'text-slate-300'}`}>
                  Priority (1 = Highest)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newBindingPriority}
                  onChange={(e) => setNewBindingPriority(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono ${
                    isWhitish ? 'bg-white border-slate-300' : 'bg-black/40 border-white/15 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddBindingModalOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    isWhitish ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-slate-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-colors cursor-pointer ${
                    isWhitish
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                  }`}
                >
                  Add Binding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

