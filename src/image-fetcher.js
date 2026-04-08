/**
 * image-fetcher.js
 * VIDEO HARNESS PRO — Multi-source Image Fetcher
 *
 * Priority chain:
 *   1. Local override  (/output/images/{sceneId}.jpg)
 *   2. Unsplash API    (3 candidates, best-match selection)
 *   3. Pexels API      (secondary)
 *   4. Picsum          (content-aware seed fallback)
 *
 * Features:
 *   - Construction-specific keyword enhancement
 *   - Korean-to-English query translation
 *   - Dual-layer cache (in-memory Map + sessionStorage)
 *   - Relevance-based candidate selection from Unsplash
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const UNSPLASH_KEY = typeof import.meta !== "undefined"
  ? (import.meta.env?.VITE_UNSPLASH_KEY || "")
  : "";

const PEXELS_KEY = typeof import.meta !== "undefined"
  ? (import.meta.env?.VITE_PEXELS_KEY || "")
  : "";

const FETCH_TIMEOUT_MS = 5000;
const UNSPLASH_CANDIDATES = 3;
const SESSION_CACHE_PREFIX = "vhp_img_";

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const memoryCache = new Map();

// ---------------------------------------------------------------------------
// Korean-to-English translation map (construction domain)
// ---------------------------------------------------------------------------

const KO_EN_MAP = {
  // Structural
  "\uCCA0\uADFC": "steel rebar reinforcement",
  "\uAC70\uD478\uC9D1": "formwork",
  "\uCF58\uD06C\uB9AC\uD2B8": "concrete",
  "\uD0C0\uC124": "concrete pouring",
  "\uC591\uC0DD": "concrete curing",
  "\uAE30\uCD08": "foundation",
  "\uD30C\uC77C": "pile foundation",
  "\uD56D\uD0C0": "pile driving",
  "\uAD74\uCC29": "excavation",
  "\uD1A0\uACF5": "earthwork",
  "\uC2DC\uACF5": "construction work",
  "\uD604\uC7A5": "construction site",
  "\uACF5\uC0AC": "construction project",
  "\uAC74\uCD95": "building construction",
  "\uAD6C\uC870\uBB3C": "structure",
  "\uACE8\uC870": "steel frame structure",
  "\uCCA0\uACE8": "steel structure",
  "\uBE44\uACC4": "scaffolding",
  "\uD615\uD2C0": "formwork frame",

  // Equipment
  "\uD06C\uB808\uC778": "crane construction",
  "\uD3EC\uD074\uB808\uC778": "tower crane",
  "\uAD74\uC0AD\uAE30": "excavator",
  "\uB364\uD504\uD2B8\uB7ED": "dump truck",
  "\uB808\uBBF8\uCF58": "ready-mix concrete truck",
  "\uD38C\uD504\uCE74": "concrete pump truck",
  "\uBD88\uB3C4\uC800": "bulldozer",
  "\uB85C\uB354": "wheel loader",

  // Safety / people
  "\uC548\uC804": "safety",
  "\uC548\uC804\uBAA8": "hard hat safety helmet",
  "\uC548\uC804\uC7A5\uBE44": "safety equipment PPE",
  "\uADFC\uB85C\uC790": "construction worker",
  "\uC791\uC5C5\uC790": "worker on site",
  "\uAC10\uB3C5": "site supervisor",

  // Materials
  "\uCCA0\uADFC": "steel rebar",
  "\uC2DC\uBA58\uD2B8": "cement",
  "\uBAA8\uB798": "sand aggregate",
  "\uC790\uAC08": "gravel aggregate",
  "\uBCBD\uB3CC": "brick masonry",

  // Process / phases
  "\uC124\uACC4": "engineering design blueprint",
  "\uCE21\uB7C9": "surveying measurement",
  "\uAC80\uC218": "quality inspection",
  "\uC900\uACF5": "project completion",
  "\uCC29\uACF5": "groundbreaking ceremony",
  "\uC0C1\uB7C9": "topping out ceremony",
};

// ---------------------------------------------------------------------------
// Construction keyword enhancer
// ---------------------------------------------------------------------------

const CONSTRUCTION_ENHANCERS = {
  formwork:         "concrete formwork construction site real photo",
  rebar:            "steel rebar reinforcement construction close up",
  "concrete pouring": "concrete pump truck pouring construction site workers",
  "concrete pour":  "concrete pump truck pouring construction site workers",
  excavation:       "excavator digging construction site earthwork",
  crane:            "tower crane construction site aerial",
  scaffold:         "scaffolding construction building exterior",
  scaffolding:      "scaffolding construction building facade workers",
  foundation:       "foundation construction concrete footing rebar",
  pile:             "pile driving foundation construction site",
  welding:          "steel welding construction sparks worker",
  survey:           "surveying construction site engineer equipment",
  demolition:       "building demolition excavator construction",
  blueprint:        "construction blueprint engineering plan",
  safety:           "construction safety PPE hard hat workers",
  inspection:       "quality inspection construction site engineer",
  steel:            "steel structure construction erection",
  brick:            "bricklaying masonry construction wall",
  plumbing:         "plumbing pipe installation construction",
  electrical:       "electrical wiring installation construction",
  roofing:          "roofing construction workers building",
  paving:           "road paving asphalt construction",
  bridge:           "bridge construction engineering structure",
  tunnel:           "tunnel construction boring machine",
  dam:              "dam construction concrete massive",
  building:         "building construction site progress",
  apartment:        "apartment building construction high rise",
  highway:          "highway road construction heavy equipment",
};

/**
 * Enhance a query with construction-specific terms.
 * If the raw query partially matches a known keyword, use the enhanced version.
 * Otherwise append generic construction context.
 */
function enhanceQuery(rawQuery) {
  const lower = rawQuery.toLowerCase().trim();

  for (const [keyword, enhanced] of Object.entries(CONSTRUCTION_ENHANCERS)) {
    if (lower.includes(keyword)) {
      return enhanced;
    }
  }

  // Generic enhancement for anything that seems construction-related
  const constructionSignals = [
    "construction", "build", "site", "concrete", "steel",
    "worker", "equipment", "engineer", "project",
  ];
  const alreadyHasContext = constructionSignals.some((s) => lower.includes(s));
  if (alreadyHasContext) {
    return `${rawQuery} real photo professional`;
  }

  return `${rawQuery} construction site real photo`;
}

// ---------------------------------------------------------------------------
// Korean query translator
// ---------------------------------------------------------------------------

const KOREAN_CHAR_RANGE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

function translateQuery(query) {
  if (!KOREAN_CHAR_RANGE.test(query)) {
    return query;
  }

  let translated = query;
  // Sort by length descending so longer matches take priority
  const entries = Object.entries(KO_EN_MAP).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [ko, en] of entries) {
    if (translated.includes(ko)) {
      translated = translated.replaceAll(ko, en);
    }
  }

  // Strip any remaining Korean characters (untranslatable particles, etc.)
  translated = translated.replace(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/g, " ");
  return translated.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Content-aware Picsum seed mapping
// ---------------------------------------------------------------------------

const PICSUM_CONTENT_SEEDS = {
  // Scene types -> curated Picsum image IDs that look like construction/industrial
  opening:  [1067, 1076, 366],   // city skylines, architecture
  headline: [1029, 1031, 1048],  // buildings, urban, structures
  data:     [1015, 1018, 1024],  // geometric, charts-feel, modern
  analysis: [1042, 1044, 1062],  // office, professional, detail
  expert:   [1025, 1027, 1074],  // portrait-style, professional
  field:    [1080, 1084, 993],   // outdoor, landscape, industrial
  closing:  [1039, 1043, 1055],  // panoramic, wide, conclusive
};

// Keyword-to-seed for construction queries (hand-picked Picsum IDs that
// resemble construction/industrial/urban imagery)
const QUERY_SEED_MAP = {
  construction: 1067,
  building:     1029,
  concrete:     1076,
  steel:        1048,
  crane:        1080,
  bridge:       366,
  road:         1015,
  worker:       1025,
  safety:       1074,
  excavation:   1084,
  foundation:   1031,
  site:         993,
  engineer:     1027,
  equipment:    1042,
  industrial:   1062,
};

function getPicsumUrl(query, sceneType, sceneIdx) {
  const lower = (query || "").toLowerCase();

  // Try keyword match first for more relevant Picsum results
  for (const [keyword, seedId] of Object.entries(QUERY_SEED_MAP)) {
    if (lower.includes(keyword)) {
      // Add sceneIdx offset to avoid duplicates across scenes
      return `https://picsum.photos/id/${seedId + sceneIdx}/960/540`;
    }
  }

  // Fall back to scene-type seeds
  const seeds = PICSUM_CONTENT_SEEDS[sceneType] || [1067, 1029, 366];
  const seed = seeds[sceneIdx % seeds.length];
  return `https://picsum.photos/id/${seed}/960/540`;
}

// ---------------------------------------------------------------------------
// SessionStorage helpers
// ---------------------------------------------------------------------------

function getSessionCache(key) {
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
    return raw || null;
  } catch {
    return null;
  }
}

function setSessionCache(key, url) {
  try {
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${key}`, url);
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

// ---------------------------------------------------------------------------
// Unsplash: fetch multiple candidates and pick the best match
// ---------------------------------------------------------------------------

function scoreRelevance(photo, originalQuery) {
  const lower = originalQuery.toLowerCase();
  const description = (photo.description || "").toLowerCase();
  const altDescription = (photo.alt_description || "").toLowerCase();
  const tags = (photo.tags || []).map((t) => (t.title || "").toLowerCase());

  let score = 0;
  const queryWords = lower.split(/\s+/).filter((w) => w.length > 2);

  for (const word of queryWords) {
    if (description.includes(word)) score += 3;
    if (altDescription.includes(word)) score += 2;
    if (tags.some((t) => t.includes(word))) score += 2;
  }

  // Bonus for landscape orientation
  if (photo.width > photo.height) score += 1;

  return score;
}

async function fetchFromUnsplash(query) {
  if (!UNSPLASH_KEY) return null;

  try {
    const params = new URLSearchParams({
      query,
      orientation: "landscape",
      content_filter: "high",
      per_page: String(UNSPLASH_CANDIDATES),
      client_id: UNSPLASH_KEY,
    });

    const res = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) return null;

    // Score each candidate and pick the best
    const scored = results.map((photo) => ({
      url: photo.urls?.regular || photo.urls?.full,
      score: scoreRelevance(photo, query),
      photo,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].url || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pexels
// ---------------------------------------------------------------------------

async function fetchFromPexels(query) {
  if (!PEXELS_KEY) return null;

  try {
    const params = new URLSearchParams({
      query,
      orientation: "landscape",
      size: "medium",
      per_page: "1",
    });

    const res = await fetch(
      `https://api.pexels.com/v1/search?${params}`,
      {
        headers: { Authorization: PEXELS_KEY },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const photo = data.photos?.[0];
    return photo?.src?.large || photo?.src?.original || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Local override check
// ---------------------------------------------------------------------------

async function checkLocalOverride(sceneId) {
  if (!sceneId) return null;

  const localPath = `/output/images/${sceneId}.jpg`;
  try {
    const res = await fetch(localPath, {
      method: "HEAD",
      signal: AbortSignal.timeout(1000),
    });
    return res.ok ? localPath : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main export: fetchSceneImage
// ---------------------------------------------------------------------------

/**
 * Fetch the best-matching background image for a scene.
 *
 * @param {string} query      - unsplash_query field (keywords, may be Korean)
 * @param {string} sceneType  - scene type (opening, headline, data, etc.)
 * @param {number} sceneIdx   - scene index (fallback seed)
 * @param {string} [sceneId]  - optional scene ID for local override lookup
 * @returns {Promise<string>} image URL
 */
export async function fetchSceneImage(query, sceneType, sceneIdx = 0, sceneId = "") {
  const cacheKey = `${query}_${sceneType}_${sceneIdx}`;

  // 1. Memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  // 2. SessionStorage cache
  const sessionHit = getSessionCache(cacheKey);
  if (sessionHit) {
    memoryCache.set(cacheKey, sessionHit);
    return sessionHit;
  }

  let url = null;

  // 3. Local file override
  url = await checkLocalOverride(sceneId);
  if (url) {
    memoryCache.set(cacheKey, url);
    setSessionCache(cacheKey, url);
    return url;
  }

  // Prepare search query: translate Korean, then enhance with construction terms
  const translated = translateQuery(query || sceneType);
  const enhanced = enhanceQuery(translated);

  // 4. Unsplash (3 candidates, best-match)
  url = await fetchFromUnsplash(enhanced);

  // 5. Pexels (secondary)
  if (!url) {
    url = await fetchFromPexels(enhanced);
  }

  // 6. Picsum (content-aware fallback)
  if (!url) {
    url = getPicsumUrl(query || sceneType, sceneType, sceneIdx);
  }

  memoryCache.set(cacheKey, url);
  setSessionCache(cacheKey, url);
  return url;
}

// ---------------------------------------------------------------------------
// loadImage
// ---------------------------------------------------------------------------

/**
 * Load a URL into an HTMLImageElement (crossOrigin-enabled).
 *
 * @param {string} url - image URL
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${url}`));
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// preloadSceneImages
// ---------------------------------------------------------------------------

/**
 * Preload images for all scenes in parallel.
 *
 * @param {Array} scenes - array of scene objects with unsplash_query, type, id
 * @returns {Promise<Map<number, HTMLImageElement>>}
 */
export async function preloadSceneImages(scenes) {
  const results = new Map();

  const promises = scenes.map(async (sc, i) => {
    try {
      const url = await fetchSceneImage(
        sc.unsplash_query || sc.type,
        sc.type,
        i,
        sc.id || ""
      );
      const img = await loadImage(url);
      results.set(i, img);
    } catch {
      // Continue without image for this scene
    }
  });

  await Promise.allSettled(promises);
  return results;
}
