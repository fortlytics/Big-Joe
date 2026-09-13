import type { MetadataRoute } from 'next';
import { getAllCars } from '@/lib/inventory';
import { getSiteUrl } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const cars = await getAllCars().catch(() => []);

  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/inventory`, changeFrequency: 'daily', priority: 0.9 },
    ...cars.map((c) => ({
      url: `${base}/inventory/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
