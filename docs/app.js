const OWNER = "UImods";
const REPO = "AppsWidgets";
const TAG = "Apps";
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`;
const CACHE_KEY = "uimods-apps-release-cache-v2";

const APPS = [
  {
    key: "current",
    friendly: "Current Weather",
    aliases: ["currentweather"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/CurrentWeather.apk`,
  },
  {
    key: "visual",
    friendly: "Weather Visual Widget",
    aliases: ["weathervisualswidget", "weathervisualwidget", "visualswidget"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/WeatherVisualsWidget.apk`,
  },
  {
    key: "dynamic",
    friendly: "Dynamic Walls",
    aliases: ["dynamicwalls"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/DynamicWalls.apk`,
  },
  {
    key: "soundcloud",
    friendly: "KWGT SoundCloud Player",
    aliases: ["kwgtsoundcloudplayer", "soundcloudplayer"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/KWGT-SoundCloudPlayer.apk`,
  },
  {
    key: "retro",
    friendly: "KWGT Retro Player",
    aliases: ["kwgtretroplayer"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/KWGTRetroPlayer.apk`,
  },
  {
    key: "other",
    friendly: "Other Widgets",
    aliases: ["otherwidgets", "kwgtotherwidgets"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/Other%20Widgets.apk`,
  },
  {
    key: "vinyl",
    friendly: "Vinyl Retro Player",
    aliases: ["vinylretroplayer", "kwgtvinylretroplayer"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/VinylRetroPlayer.apk`,
  },
];

const els = {
  sync: document.querySelector("#sync-status"),
  releaseMeta: document.querySelector("#release-meta"),
};

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.apk$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function bytesToSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

function niceDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function findAsset(assets, aliases) {
  const apkAssets = assets.filter(asset => String(asset.name || "").toLowerCase().endsWith(".apk"));

  for (const alias of aliases) {
    const exact = apkAssets.find(asset => normalizeName(asset.name) === alias);
    if (exact) return exact;
  }

  for (const alias of aliases) {
    const partial = apkAssets.find(asset => normalizeName(asset.name).includes(alias));
    if (partial) return partial;
  }

  return null;
}

function assetMeta(asset, fallbackName) {
  if (!asset) return "Latest release asset";
  const label = String(asset.label || "").trim();
  const display = label && label !== asset.name ? label : fallbackName;
  const size = bytesToSize(asset.size);
  const date = niceDate(asset.updated_at || asset.created_at);
  return [display, size, date ? `updated ${date}` : ""].filter(Boolean).join(" • ");
}

function renderRelease(data, source = "live") {
  const assets = Array.isArray(data?.assets) ? data.assets : [];

  for (const app of APPS) {
    const asset = findAsset(assets, app.aliases);
    const download = document.querySelector(`#${app.key}-download`);
    const meta = document.querySelector(`#${app.key}-meta`);

    if (download) download.href = asset?.browser_download_url || app.fallback;
    if (meta) meta.textContent = assetMeta(asset, app.friendly);
  }

  const released = niceDate(data?.published_at || data?.updated_at);
  els.releaseMeta.textContent = released
    ? `Release tag: ${TAG} • updated ${released}`
    : `Release tag: ${TAG}`;

  els.sync.textContent = source === "cache"
    ? "Showing cached release data — downloads still use GitHub"
    : `Synced automatically with GitHub Release “${TAG}”`;
}

async function refreshRelease() {
  els.sync.textContent = "Checking latest release…";

  try {
    const response = await fetch(`${API_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const data = await response.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    renderRelease(data, "live");
  } catch (error) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached) {
        renderRelease(cached, "cache");
      } else {
        els.sync.textContent = "Could not read release metadata — direct download links are still available";
      }
    } catch {
      els.sync.textContent = "Could not read release metadata — direct download links are still available";
    }
    console.warn("Release sync failed:", error);
  }
}

refreshRelease();
setInterval(refreshRelease, 5 * 60 * 1000);
