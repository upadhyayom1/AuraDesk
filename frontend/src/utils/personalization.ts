import { Wallpaper, WallpaperCollection, PersonalizationRule, TimeOfDay, WeatherCondition, CalendarEvent } from '../types/wallpaper';

/**
 * Determines the current time of day bucket based on the 24-hour hour.
 * Dawn: 05:00 - 08:29
 * Day: 08:30 - 16:59
 * Golden Hour: 17:00 - 19:29
 * Night: 19:30 - 04:59
 */
export function determineTimeOfDay(hour: number, minute: number = 0): TimeOfDay {
  const totalMinutes = hour * 60 + minute;
  if (totalMinutes >= 300 && totalMinutes < 510) {
    return 'dawn';
  } else if (totalMinutes >= 510 && totalMinutes < 1020) {
    return 'day';
  } else if (totalMinutes >= 1020 && totalMinutes < 1170) {
    return 'goldenHour';
  } else {
    return 'night';
  }
}

/**
 * Checks if a calendar event is active given a specific time (HH:MM)
 */
export function isEventActive(event: CalendarEvent, currentTimeHHMM: string): boolean {
  const [curH, curM] = currentTimeHHMM.split(':').map(Number);
  const curTotal = curH * 60 + curM;

  const [startH, startM] = event.startTime.split(':').map(Number);
  const startTotal = startH * 60 + startM;

  const [endH, endM] = event.endTime.split(':').map(Number);
  const endTotal = endH * 60 + endM;

  if (startTotal <= endTotal) {
    return curTotal >= startTotal && curTotal <= endTotal;
  } else {
    // Crosses midnight
    return curTotal >= startTotal || curTotal <= endTotal;
  }
}

export interface ContextState {
  timeOfDay: TimeOfDay;
  weatherCondition: WeatherCondition;
  currentTimeHHMM: string;
  activeCalendarEvents: CalendarEvent[];
}

export interface RuleEvaluationResult {
  matchedRule: PersonalizationRule | null;
  targetCollectionId: string | null;
  reason: 'manual' | 'calendar' | 'weather' | 'time' | 'scheduler';
  description: string;
}

/**
 * Evaluates configured personalization rules against current context.
 * Rules are sorted by priority (1 is highest priority).
 */
export function evaluateContextRules(
  rules: PersonalizationRule[],
  context: ContextState,
  autoAdaptEnabled: boolean
): RuleEvaluationResult {
  if (!autoAdaptEnabled) {
    return {
      matchedRule: null,
      targetCollectionId: null,
      reason: 'scheduler',
      description: 'Context automation disabled. Standard collection rotation active.',
    };
  }

  const enabledRules = rules
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  // 1. Calendar event checks first (often highest priority)
  const activeEvent = context.activeCalendarEvents.find(e =>
    isEventActive(e, context.currentTimeHHMM)
  );

  for (const rule of enabledRules) {
    if (rule.conditionType === 'calendar' && activeEvent) {
      if (rule.conditionValue === activeEvent.category || rule.conditionValue === activeEvent.id || rule.conditionValue === 'any') {
        return {
          matchedRule: rule,
          targetCollectionId: rule.targetCollectionId || activeEvent.targetCollectionId,
          reason: 'calendar',
          description: `Calendar event "${activeEvent.title}" triggered rule "${rule.name}"`,
        };
      }
    }

    if (rule.conditionType === 'weather' && rule.conditionValue === context.weatherCondition) {
      return {
        matchedRule: rule,
        targetCollectionId: rule.targetCollectionId,
        reason: 'weather',
        description: `Weather (${context.weatherCondition}) triggered rule "${rule.name}"`,
      };
    }

    if (rule.conditionType === 'time' && rule.conditionValue === context.timeOfDay) {
      return {
        matchedRule: rule,
        targetCollectionId: rule.targetCollectionId,
        reason: 'time',
        description: `Time of day (${context.timeOfDay}) triggered rule "${rule.name}"`,
      };
    }
  }

  // If no rule explicitly matched but an active calendar event has a targetCollectionId
  if (activeEvent && activeEvent.targetCollectionId) {
    return {
      matchedRule: null,
      targetCollectionId: activeEvent.targetCollectionId,
      reason: 'calendar',
      description: `Active calendar schedule: "${activeEvent.title}"`,
    };
  }

  return {
    matchedRule: null,
    targetCollectionId: null,
    reason: 'scheduler',
    description: 'No rule triggered. Default collection rotation active.',
  };
}

/**
 * Filters wallpapers by collection and deduplicates recent history
 */
export function selectEligibleWallpapers(
  allWallpapers: Wallpaper[],
  targetCollection: WallpaperCollection | null,
  recentWallpaperIds: string[],
  avoidRecent: boolean
): Wallpaper[] {
  let candidates: Wallpaper[] = [];

  if (targetCollection && targetCollection.wallpaperIds.length > 0) {
    const idSet = new Set(targetCollection.wallpaperIds);
    candidates = allWallpapers.filter(w => idSet.has(w.id));
  }

  // Fallback to all wallpapers if collection is empty
  if (candidates.length === 0) {
    candidates = [...allWallpapers];
  }

  if (avoidRecent && recentWallpaperIds.length > 0) {
    const recentSet = new Set(recentWallpaperIds);
    const nonRecent = candidates.filter(w => !recentSet.has(w.id));
    if (nonRecent.length > 0) {
      return nonRecent;
    }
  }

  return candidates;
}

/**
 * Picks the next wallpaper given candidate pool, shuffle, and current wallpaper id.
 */
export function pickNextWallpaper(
  candidates: Wallpaper[],
  currentId: string | null,
  shuffle: boolean
): Wallpaper | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (shuffle) {
    // Pick random different from current
    const filtered = candidates.filter(w => w.id !== currentId);
    const pool = filtered.length > 0 ? filtered : candidates;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  } else {
    // Sequential
    const currentIndex = candidates.findIndex(w => w.id === currentId);
    if (currentIndex === -1 || currentIndex === candidates.length - 1) {
      return candidates[0];
    }
    return candidates[currentIndex + 1];
  }
}
