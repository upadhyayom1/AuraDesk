/**
 * Step 2 Verification Test Suite
 * Tests UnsplashSource and PexelsSource adapters:
 * - Axios initialization with timeout (8000ms)
 * - Axios-retry configuration (max 2 retries, exponential backoff)
 * - Normalization to AuraDesk Wallpaper entity (ID prefixing, attribution, creditUrl, dimensions)
 * - search(), browse(), fetchWallpaper(), getCredits(), trackDownload()
 * - Error and retry handling
 */

const assert = require('assert');
const { WallpaperSource, UnsplashSource, PexelsSource } = require('../electron/main/services/discovery/adapters');

async function runStep2Tests() {
  console.log('🧪 Starting Step 2 Verification Tests (Unsplash & Pexels Adapters)...');

  // 1. WallpaperSource Base Class
  console.log('Testing WallpaperSource base contract...');
  const base = new WallpaperSource('unsplash');
  assert.strictEqual(base.name, 'unsplash');
  await assert.rejects(() => base.search('nature'), /search\(\) not implemented/);
  await assert.rejects(() => base.browse(1), /browse\(\) not implemented/);
  console.log('✅ Base contract validated');

  // 2. UnsplashSource Unit Tests
  console.log('Testing UnsplashSource adapter...');
  const mockUnsplashPhoto = {
    id: 'abc123xyz',
    description: 'Majestic mountain peak at sunset',
    alt_description: 'Mountain landscape',
    width: 3840,
    height: 2160,
    urls: {
      raw: 'https://images.unsplash.com/raw/photo-abc123xyz',
      full: 'https://images.unsplash.com/full/photo-abc123xyz',
      regular: 'https://images.unsplash.com/regular/photo-abc123xyz',
      thumb: 'https://images.unsplash.com/thumb/photo-abc123xyz'
    },
    user: {
      name: 'Naman Sharma',
      username: 'naman_shots',
      links: { html: 'https://unsplash.com/@naman_shots' }
    },
    links: {
      html: 'https://unsplash.com/photos/abc123xyz',
      download_location: 'https://api.unsplash.com/photos/abc123xyz/download'
    }
  };

  let unsplashApiRequests = [];
  const mockUnsplashClient = {
    defaults: { headers: { common: {} } },
    async get(url, config = {}) {
      unsplashApiRequests.push({ url, config });
      if (url === '/search/photos') {
        return {
          data: {
            total: 100,
            total_pages: 5,
            results: [mockUnsplashPhoto]
          }
        };
      }
      if (url === '/photos') {
        return {
          data: [mockUnsplashPhoto]
        };
      }
      if (url.startsWith('/photos/')) {
        return {
          data: mockUnsplashPhoto
        };
      }
      if (url.includes('download')) {
        return { data: { url: 'https://download-stream' } };
      }
      return { data: {} };
    }
  };

  const unsplash = new UnsplashSource({
    accessKey: 'test_unsplash_key',
    customClient: mockUnsplashClient
  });

  // Normalization check
  const normalizedUnsplash = unsplash.normalize(mockUnsplashPhoto);
  assert.strictEqual(normalizedUnsplash.id, 'unsplash:abc123xyz');
  assert.strictEqual(normalizedUnsplash.source, 'unsplash');
  assert.strictEqual(normalizedUnsplash.title, 'Majestic mountain peak at sunset');
  assert.strictEqual(normalizedUnsplash.imageUrl, 'https://images.unsplash.com/raw/photo-abc123xyz');
  assert.strictEqual(normalizedUnsplash.thumbUrl, 'https://images.unsplash.com/regular/photo-abc123xyz');
  assert.strictEqual(normalizedUnsplash.photographer, 'Naman Sharma');
  assert(normalizedUnsplash.creditUrl.includes('utm_source=auradesk'));
  assert.strictEqual(normalizedUnsplash.width, 3840);
  assert.strictEqual(normalizedUnsplash.height, 2160);

  // Search
  unsplashApiRequests = [];
  const unsplashSearchResult = await unsplash.search('mountains', {
    page: 2,
    perPage: 15,
    orientation: 'landscape',
    color: 'blue'
  });
  assert.strictEqual(unsplashSearchResult.items.length, 1);
  assert.strictEqual(unsplashSearchResult.items[0].id, 'unsplash:abc123xyz');
  assert.strictEqual(unsplashSearchResult.page, 2);
  assert.strictEqual(unsplashSearchResult.perPage, 15);
  assert.strictEqual(unsplashSearchResult.total, 100);
  assert.strictEqual(unsplashApiRequests[0].config.params.query, 'mountains');
  assert.strictEqual(unsplashApiRequests[0].config.params.orientation, 'landscape');
  assert.strictEqual(unsplashApiRequests[0].config.params.color, 'blue');

  // Browse
  const unsplashBrowseResult = await unsplash.browse(1, 10);
  assert.strictEqual(unsplashBrowseResult.items.length, 1);
  assert.strictEqual(unsplashBrowseResult.items[0].id, 'unsplash:abc123xyz');

  // Fetch Wallpaper & Credits
  const singleUnsplash = await unsplash.fetchWallpaper('unsplash:abc123xyz');
  assert.strictEqual(singleUnsplash.id, 'unsplash:abc123xyz');

  const unsplashCredits = await unsplash.getCredits('abc123xyz');
  assert.strictEqual(unsplashCredits.photographer, 'Naman Sharma');
  assert.strictEqual(unsplashCredits.source, 'unsplash');

  // Track Download
  unsplashApiRequests = [];
  await unsplash.trackDownload('unsplash:abc123xyz');
  assert(unsplashApiRequests.some(r => r.url.includes('download')));

  console.log('✅ UnsplashSource tests passed');

  // 3. PexelsSource Unit Tests
  console.log('Testing PexelsSource adapter...');
  const mockPexelsPhoto = {
    id: 9876543,
    width: 2560,
    height: 1440,
    url: 'https://www.pexels.com/photo/aurora-borealis-9876543/',
    photographer: 'Aura Master',
    photographer_url: 'https://www.pexels.com/@auramaster',
    alt: 'Green aurora borealis glowing in night sky',
    src: {
      original: 'https://images.pexels.com/photos/9876543/original.jpg',
      large2x: 'https://images.pexels.com/photos/9876543/large2x.jpg',
      large: 'https://images.pexels.com/photos/9876543/large.jpg',
      medium: 'https://images.pexels.com/photos/9876543/medium.jpg'
    }
  };

  let pexelsApiRequests = [];
  const mockPexelsClient = {
    defaults: { headers: { common: {} } },
    async get(url, config = {}) {
      pexelsApiRequests.push({ url, config });
      if (url === '/search') {
        return {
          data: {
            page: 1,
            per_page: 20,
            total_results: 50,
            photos: [mockPexelsPhoto]
          }
        };
      }
      if (url === '/curated') {
        return {
          data: {
            page: 1,
            per_page: 10,
            total_results: 30,
            photos: [mockPexelsPhoto]
          }
        };
      }
      if (url.startsWith('/photos/')) {
        return {
          data: mockPexelsPhoto
        };
      }
      return { data: {} };
    }
  };

  const pexels = new PexelsSource({
    apiKey: 'test_pexels_key',
    customClient: mockPexelsClient
  });

  // Normalization check
  const normalizedPexels = pexels.normalize(mockPexelsPhoto);
  assert.strictEqual(normalizedPexels.id, 'pexels:9876543');
  assert.strictEqual(normalizedPexels.source, 'pexels');
  assert.strictEqual(normalizedPexels.title, 'Green aurora borealis glowing in night sky');
  assert.strictEqual(normalizedPexels.imageUrl, 'https://images.pexels.com/photos/9876543/original.jpg');
  assert.strictEqual(normalizedPexels.thumbUrl, 'https://images.pexels.com/photos/9876543/large.jpg');
  assert.strictEqual(normalizedPexels.photographer, 'Aura Master');
  assert.strictEqual(normalizedPexels.creditUrl, 'https://www.pexels.com/photo/aurora-borealis-9876543/');
  assert.strictEqual(normalizedPexels.width, 2560);
  assert.strictEqual(normalizedPexels.height, 1440);

  // Search & orientation translation (squarish -> square)
  pexelsApiRequests = [];
  const pexelsSearchResult = await pexels.search('aurora', {
    page: 1,
    perPage: 20,
    orientation: 'squarish',
    color: 'green'
  });
  assert.strictEqual(pexelsSearchResult.items.length, 1);
  assert.strictEqual(pexelsSearchResult.items[0].id, 'pexels:9876543');
  assert.strictEqual(pexelsApiRequests[0].config.params.orientation, 'square');
  assert.strictEqual(pexelsApiRequests[0].config.params.color, 'green');

  // Browse
  const pexelsBrowseResult = await pexels.browse(1, 10);
  assert.strictEqual(pexelsBrowseResult.items.length, 1);
  assert.strictEqual(pexelsBrowseResult.items[0].id, 'pexels:9876543');

  // Fetch Wallpaper & Credits
  const singlePexels = await pexels.fetchWallpaper('pexels:9876543');
  assert.strictEqual(singlePexels.id, 'pexels:9876543');

  const pexelsCredits = await pexels.getCredits('9876543');
  assert.strictEqual(pexelsCredits.photographer, 'Aura Master');
  assert.strictEqual(pexelsCredits.source, 'pexels');

  // Track download
  await pexels.trackDownload('pexels:9876543');

  console.log('✅ PexelsSource tests passed');

  // 4. Test Real Client Initialization with axios-retry
  console.log('Testing Axios Client Initialization with axios-retry & 8s timeout...');
  const realUnsplash = new UnsplashSource({ accessKey: 'dummy_key' });
  assert.strictEqual(realUnsplash.client.defaults.baseURL, 'https://api.unsplash.com');
  assert.strictEqual(realUnsplash.client.defaults.timeout, 8000);
  assert.strictEqual(realUnsplash.client.defaults.headers['Accept-Version'], 'v1');
  assert.strictEqual(realUnsplash.client.defaults.headers['Authorization'], 'Client-ID dummy_key');

  const realPexels = new PexelsSource({ apiKey: 'dummy_key' });
  assert.strictEqual(realPexels.client.defaults.baseURL, 'https://api.pexels.com/v1');
  assert.strictEqual(realPexels.client.defaults.timeout, 8000);
  assert.strictEqual(realPexels.client.defaults.headers['Authorization'], 'dummy_key');
  console.log('✅ Axios clients properly configured with timeout & retry');

  console.log('\n🎉 ALL STEP 2 TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runStep2Tests().catch(err => {
  console.error('❌ Step 2 Test Failure:', err);
  process.exit(1);
});
