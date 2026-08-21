const OWNER = "UImods";
const REPO = "AppsWidgets";
const TAG = "Apps";
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`;
const CACHE_KEY = "uimods-apps-release-cache-v2";
const PASSWORD_SALT = "c55722663bb95bac785f338a24bf2b9c";
const PASSWORD_HASH = "6f5eb71df0cd524cf736738722b3b57fa15d17b859d1cecc4456865340999332";
const PASSWORD_ITERATIONS = 250000;

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
    aliases: ["kwgtsoundcloudplayerprotected"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/KWGT-SoundCloudPlayer-Protected.zip`,
    protected: true,
  },
  {
    key: "retro",
    friendly: "KWGT Retro Player",
    aliases: ["kwgtretroplayerprotected"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/KWGTRetroPlayer-Protected.zip`,
    protected: true,
  },
  {
    key: "other",
    friendly: "Other Widgets",
    aliases: ["otherwidgetsprotected"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/Other-Widgets-Protected.zip`,
    protected: true,
  },
  {
    key: "vinyl",
    friendly: "Vinyl Retro Player",
    aliases: ["vinylretroplayerprotected"],
    fallback: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/VinylRetroPlayer-Protected.zip`,
    protected: true,
  },
];

const els = {
  sync: document.querySelector("#sync-status"),
  releaseMeta: document.querySelector("#release-meta"),
};

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.(apk|zip)$/i, "")
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
  const downloadableAssets = assets.filter(asset => /\.(apk|zip)$/i.test(String(asset.name || "")));

  for (const alias of aliases) {
    const exact = downloadableAssets.find(asset => normalizeName(asset.name) === alias);
    if (exact) return exact;
  }

  for (const alias of aliases) {
    const partial = downloadableAssets.find(asset => normalizeName(asset.name).includes(alias));
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

    if (download && app.protected) {
      download.dataset.downloadUrl = asset?.browser_download_url || app.fallback;
    } else if (download) {
      download.href = asset?.browser_download_url || app.fallback;
    }
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

const passwordModal = document.querySelector("#protected-download-modal");
const passwordForm = document.querySelector("#protected-download-form");
const passwordTitle = document.querySelector("#protected-modal-title");
const passwordInput = document.querySelector("#protected-password");
const passwordError = document.querySelector("#protected-password-error");
const passwordToggle = document.querySelector("#toggle-protected-password");
const passwordCancel = document.querySelector("#cancel-protected-download");
let pendingProtectedDownload = null;

function resetPasswordModal() {
  passwordForm.reset();
  passwordInput.type = "password";
  passwordToggle.textContent = "Show";
  passwordToggle.setAttribute("aria-pressed", "false");
  passwordError.textContent = "";
}

function closePasswordModal() {
  passwordModal.close();
  pendingProtectedDownload = null;
  resetPasswordModal();
}

function hexToBytes(value) {
  return new Uint8Array(value.match(/.{2}/g).map(byte => Number.parseInt(byte, 16)));
}

async function hashPassword(value) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBytes(PASSWORD_SALT),
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(derivedBits), byte => byte.toString(16).padStart(2, "0")).join("");
}

document.querySelectorAll(".protected-download").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    pendingProtectedDownload = button.dataset.downloadUrl;
    passwordTitle.textContent = button.dataset.appName;
    resetPasswordModal();
    passwordModal.showModal();
    passwordInput.focus();
  });
});

passwordToggle.addEventListener("click", () => {
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  passwordToggle.textContent = showing ? "Show" : "Hide";
  passwordToggle.setAttribute("aria-pressed", String(!showing));
  passwordInput.focus();
});

passwordCancel.addEventListener("click", closePasswordModal);
passwordModal.addEventListener("cancel", event => {
  event.preventDefault();
  closePasswordModal();
});

passwordModal.addEventListener("click", event => {
  if (event.target === passwordModal) closePasswordModal();
});

passwordForm.addEventListener("submit", async event => {
  event.preventDefault();
  const attemptHash = await hashPassword(passwordInput.value);
  if (attemptHash !== PASSWORD_HASH) {
    passwordError.textContent = "Incorrect password";
    passwordInput.select();
    return;
  }

  const downloadUrl = pendingProtectedDownload;
  closePasswordModal();
  if (downloadUrl) window.location.assign(downloadUrl);
});
