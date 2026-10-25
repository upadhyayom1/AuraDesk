/**
 * Shared Zod Schemas for AuraDesk (CommonJS & ESM compatible)
 */
const { z } = require('zod');

const WallpaperSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['unsplash', 'pexels', 'local']),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  thumbUrl: z.string().url(),
  photographer: z.string(),
  creditUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  localPath: z.string().optional()
});

const DiscoverySearchSchema = z.object({
  query: z.string().min(1),
  source: z.enum(['unsplash', 'pexels', 'all']).optional(),
  orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
  color: z.string().optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(50).default(20)
});

const CollectionCreateSchema = z.object({
  name: z.string().min(1).max(100).trim()
});

const RuleCreateSchema = z.object({
  name: z.string().min(1).max(100),
  conditionType: z.enum(['TIME_RANGE', 'WEATHER', 'DAY_PART']),
  conditionValue: z.union([z.string(), z.record(z.any())]),
  collectionId: z.string(),
  priority: z.number().int().default(1)
});

const RotationConfigSchema = z.object({
  intervalMinutes: z.number().int().min(1).default(30),
  shuffle: z.boolean().default(false),
  collectionIds: z.array(z.string()),
  enabled: z.boolean().default(true)
});

const WeatherSetLocationSchema = z.union([
  z.object({ city: z.string().min(1) }),
  z.object({ lat: z.number(), lon: z.number() })
]);

const AppSettingsSchema = z.object({
  rotationInterval: z.number().int().min(1).default(30),
  shuffleEnabled: z.boolean().default(false),
  autoAdaptEnabled: z.boolean().default(true),
  location: z.object({
    lat: z.number().optional(),
    lon: z.number().optional(),
    city: z.string().optional()
  }).default({}),
  launchOnStartup: z.boolean().default(false),
  sourcesEnabled: z.object({
    unsplash: z.boolean().default(true),
    pexels: z.boolean().default(true)
  }).default({ unsplash: true, pexels: true })
});

const AppSettingsPatchSchema = AppSettingsSchema.partial();

const DiscoveryBrowseSchema = z.object({
  source: z.enum(['unsplash', 'pexels', 'all']).optional().default('all'),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(50).default(20)
});

const DiscoveryGetSchema = z.object({
  wallpaperId: z.string().min(1)
});

const RuleUpdateSchema = z.object({
  id: z.string().min(1),
  patch: z.object({
    name: z.string().min(1).max(100).optional(),
    conditionType: z.enum(['TIME_RANGE', 'WEATHER', 'DAY_PART']).optional(),
    conditionValue: z.union([z.string(), z.record(z.any())]).optional(),
    collectionId: z.string().optional(),
    priority: z.number().int().optional(),
    enabled: z.boolean().optional()
  })
});

const RuleReorderSchema = z.object({
  ruleIds: z.array(z.string().min(1))
});

const CalendarUpcomingSchema = z.object({
  hours: z.number().min(1).max(168).default(24)
});

const CalendarBindingCreateSchema = z.object({
  matchType: z.enum(['KEYWORD', 'EVENT_ID']).default('KEYWORD'),
  matchValue: z.string().min(1).trim(),
  collectionId: z.string().min(1),
  priority: z.number().int().optional()
});

const OverrideSetSchema = z.object({
  wallpaperId: z.string().optional(),
  localPath: z.string().optional(),
  expiresAt: z.string().nullable().optional()
});

module.exports = {
  WallpaperSchema,
  DiscoverySearchSchema,
  DiscoveryBrowseSchema,
  DiscoveryGetSchema,
  CollectionCreateSchema,
  RuleCreateSchema,
  RuleUpdateSchema,
  RuleReorderSchema,
  RotationConfigSchema,
  WeatherSetLocationSchema,
  AppSettingsSchema,
  AppSettingsPatchSchema,
  CalendarUpcomingSchema,
  CalendarBindingCreateSchema,
  OverrideSetSchema
};
