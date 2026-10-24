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

module.exports = {
  WallpaperSchema,
  DiscoverySearchSchema,
  CollectionCreateSchema,
  RuleCreateSchema,
  RotationConfigSchema,
  WeatherSetLocationSchema,
  AppSettingsSchema,
  AppSettingsPatchSchema
};
