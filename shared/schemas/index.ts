import { z } from 'zod';

export const WallpaperSchema = z.object({
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

export const DiscoverySearchSchema = z.object({
  query: z.string().min(1),
  source: z.enum(['unsplash', 'pexels', 'all']).optional(),
  orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
  color: z.string().optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(50).default(20)
});

export const CollectionCreateSchema = z.object({
  name: z.string().min(1).max(100).trim()
});

export const RuleCreateSchema = z.object({
  name: z.string().min(1).max(100),
  conditionType: z.enum(['TIME_RANGE', 'WEATHER', 'DAY_PART']),
  conditionValue: z.union([z.string(), z.record(z.any())]),
  collectionId: z.string().uuid(),
  priority: z.number().int().default(1)
});

export const RotationConfigSchema = z.object({
  intervalMinutes: z.number().int().min(1).default(30),
  shuffle: z.boolean().default(false),
  collectionIds: z.array(z.string().uuid()),
  enabled: z.boolean().default(true)
});

export const WeatherSetLocationSchema = z.union([
  z.object({ city: z.string().min(1) }),
  z.object({ lat: z.number(), lon: z.number() })
]);
