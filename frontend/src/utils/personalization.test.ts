import test from 'node:test';
import assert from 'node:assert/strict';
import {
  determineTimeOfDay,
  isEventActive,
  evaluateContextRules,
  selectEligibleWallpapers,
  pickNextWallpaper,
  ContextState,
} from './personalization';
import { Wallpaper, WallpaperCollection, PersonalizationRule, CalendarEvent } from '../types/wallpaper';

test('determineTimeOfDay returns appropriate bucket across 24h', () => {
  assert.equal(determineTimeOfDay(6, 0), 'dawn');
  assert.equal(determineTimeOfDay(7, 30), 'dawn');
  assert.equal(determineTimeOfDay(10, 0), 'day');
  assert.equal(determineTimeOfDay(14, 15), 'day');
  assert.equal(determineTimeOfDay(17, 30), 'goldenHour');
  assert.equal(determineTimeOfDay(18, 59), 'goldenHour');
  assert.equal(determineTimeOfDay(21, 0), 'night');
  assert.equal(determineTimeOfDay(2, 0), 'night');
});

test('isEventActive accurately checks time bounds including crossing midnight', () => {
  const event1: CalendarEvent = {
    id: 'e1',
    title: 'Standup',
    startTime: '09:00',
    endTime: '10:00',
    targetCollectionId: 'c1',
    category: 'work',
  };

  assert.equal(isEventActive(event1, '09:30'), true);
  assert.equal(isEventActive(event1, '08:59'), false);
  assert.equal(isEventActive(event1, '10:01'), false);

  const nightShift: CalendarEvent = {
    id: 'e2',
    title: 'Night Hackathon',
    startTime: '23:00',
    endTime: '02:00',
    targetCollectionId: 'c2',
    category: 'creative',
  };

  assert.equal(isEventActive(nightShift, '23:45'), true);
  assert.equal(isEventActive(nightShift, '01:15'), true);
  assert.equal(isEventActive(nightShift, '12:00'), false);
});

test('evaluateContextRules respects priority order and autoAdapt switch', () => {
  const rules: PersonalizationRule[] = [
    {
      id: 'r-weather',
      name: 'Rainy Moody Mood',
      conditionType: 'weather',
      conditionValue: 'rain',
      targetCollectionId: 'c-rain',
      priority: 2,
      enabled: true,
    },
    {
      id: 'r-time',
      name: 'Deep Night OLED',
      conditionType: 'time',
      conditionValue: 'night',
      targetCollectionId: 'c-night',
      priority: 3,
      enabled: true,
    },
    {
      id: 'r-calendar',
      name: 'Deep Work Focus',
      conditionType: 'calendar',
      conditionValue: 'work',
      targetCollectionId: 'c-focus',
      priority: 1,
      enabled: true,
    },
  ];

  const activeEvent: CalendarEvent = {
    id: 'cal-1',
    title: 'Code Review Sprint',
    startTime: '14:00',
    endTime: '16:00',
    targetCollectionId: 'c-focus',
    category: 'work',
  };

  const context: ContextState = {
    timeOfDay: 'night',
    weatherCondition: 'rain',
    currentTimeHHMM: '15:00',
    activeCalendarEvents: [activeEvent],
  };

  // With autoAdapt true: calendar has priority 1, so it should trigger first
  const result = evaluateContextRules(rules, context, true);
  assert.equal(result.reason, 'calendar');
  assert.equal(result.targetCollectionId, 'c-focus');

  // When disabled
  const disabledResult = evaluateContextRules(rules, context, false);
  assert.equal(disabledResult.reason, 'scheduler');
  assert.equal(disabledResult.targetCollectionId, null);
});

test('selectEligibleWallpapers excludes recent history when avoidRecent is true', () => {
  const mockWallpapers: Wallpaper[] = [
    { id: 'w1', title: 'Mountain Lake', imageUrl: '', sourceCredit: '', category: 'nature', width: 3840, height: 2160, aspectRatio: '16:9', tags: [] },
    { id: 'w2', title: 'Cyber City', imageUrl: '', sourceCredit: '', category: 'cyberpunk', width: 3840, height: 2160, aspectRatio: '16:9', tags: [] },
    { id: 'w3', title: 'Desert Sunset', imageUrl: '', sourceCredit: '', category: 'nature', width: 3840, height: 2160, aspectRatio: '16:9', tags: [] },
  ];

  const collection: WallpaperCollection = {
    id: 'c1',
    name: 'Favorites',
    description: '',
    createdAt: '2026-01-01',
    wallpaperIds: ['w1', 'w2', 'w3'],
  };

  // Avoid recent with 'w1' and 'w2' in recent history
  const eligible = selectEligibleWallpapers(mockWallpapers, collection, ['w1', 'w2'], true);
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].id, 'w3');

  // When all are recent, it gracefully falls back without breaking
  const fallback = selectEligibleWallpapers(mockWallpapers, collection, ['w1', 'w2', 'w3'], true);
  assert.equal(fallback.length, 3);
});

test('pickNextWallpaper handles sequential and shuffle correctly', () => {
  const mockWallpapers: Wallpaper[] = [
    { id: 'w1', title: 'One', imageUrl: '', sourceCredit: '', category: 'nature', width: 1920, height: 1080, aspectRatio: '16:9', tags: [] },
    { id: 'w2', title: 'Two', imageUrl: '', sourceCredit: '', category: 'space', width: 1920, height: 1080, aspectRatio: '16:9', tags: [] },
    { id: 'w3', title: 'Three', imageUrl: '', sourceCredit: '', category: 'minimalist', width: 1920, height: 1080, aspectRatio: '16:9', tags: [] },
  ];

  // Sequential from w1 -> w2
  const nextSeq = pickNextWallpaper(mockWallpapers, 'w1', false);
  assert.equal(nextSeq?.id, 'w2');

  // Sequential wraps around from w3 -> w1
  const wrapSeq = pickNextWallpaper(mockWallpapers, 'w3', false);
  assert.equal(wrapSeq?.id, 'w1');

  // Single wallpaper
  const single = pickNextWallpaper([mockWallpapers[0]], 'w1', true);
  assert.equal(single?.id, 'w1');
});
