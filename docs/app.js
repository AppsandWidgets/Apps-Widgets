const OWNER = "UImods";
const REPO = "AppsWidgets";
const TAG = "Apps";
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`;
const RELEASE_URL = `https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`;
const FALLBACK_CURRENT = `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/CurrentWeather.apk`;
const FALLBACK_VISUAL = `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/WeatherVisualsWidget.apk`;
const CACHE_KEY = "uimods-apps-release-cache-v1";

const els = {
  sync: document.querySelector("#sync-status"),
  currentMeta: document.querySelector("#current-meta"),
  visualMeta: document.querySelector("#visual-meta"),
  releaseMeta: document.querySelector("#release-meta"),
  currentDownload: document.querySelector("#current-download"),
  visualDownload: document.querySelector("#visual-download"),
  refresh: document.querySelector("#refresh-button"),
};

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
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit"
  }).format(d);
}

function findAsset(assets, type) {
  const candidates = assets.filter(a => String(a.name || "").toLowerCase().endsWith(".apk"));
  const matches = candidates.filter(a => {
    const name = String(a.name || "").toLowerCase().replace(/[\s_-]+/g, "");
    if (type === "current") return name.includes("currentweather");
    return name.includes("weathervisual") || name.includes("visualswidget");
  });
  return matches.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0] || null;
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
  const current = findAsset(assets, "current");
  const visual = findAsset(assets, "visual");

  els.currentDownload.href = current?.browser_download_url || FALLBACK_CURRENT;
  els.visualDownload.href = visual?.browser_download_url || FALLBACK_VISUAL;
  els.currentMeta.textContent = assetMeta(current, "Current Weather");
  els.visualMeta.textContent = assetMeta(visual, "Weather Visual Widget");

  const released = niceDate(data?.published_at || data?.updated_at);
  els.releaseMeta.textContent = released ? `Release tag: ${TAG} • updated ${released}` : `Release tag: ${TAG}`;
  els.sync.textContent = source === "cache" ? "Showing cached release data — downloads still use GitHub" : `Synced with GitHub Release “${TAG}”`;
}

async function refreshRelease() {
  els.sync.textContent = "Checking latest release…";
  els.refresh.disabled = true;
  try {
    const response = await fetch(`${API_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const data = await response.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    renderRelease(data, "live");
  } catch (error) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached) renderRelease(cached, "cache");
      else els.sync.textContent = "Could not read release metadata — direct download links are still available";
    } catch {
      els.sync.textContent = "Could not read release metadata — direct download links are still available";
    }
    console.warn("Release sync failed:", error);
  } finally {
    els.refresh.disabled = false;
  }
}

els.refresh.addEventListener("click", refreshRelease);
refreshRelease();
setInterval(refreshRelease, 5 * 60 * 1000);
