import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalog = fs.readFileSync(path.join(root, "src/domain/catalog.ts"), "utf8");
const outDir = path.join(root, "public/exercises");
const manifestPath = path.join(root, "src/domain/exerciseClips.json");

const exercises = catalog
  .split(/\n  ex\(/)
  .slice(1)
  .map((chunk) => {
    const id = chunk.match(/^"([^"]+)"/)?.[1];
    const name = chunk.match(/^"[^"]+",\s*"([^"]+)"/)?.[1];
    const aliasBlock = chunk.match(/aliases:\s*\[([^\]]+)\]/)?.[1] ?? "";
    const aliases = [...aliasBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    return { id, name, aliases };
  })
  .filter((exercise) => exercise.id && exercise.name);

const IGNORE = new Set(["m", "f", "male", "female", "on", "the", "a", "an"]);

const PREFERRED = {
  "wall-push-up": "Push-up (wall)",
  "knee-push-up": "Push up (on knees)",
  "wide-push-up": "Wide Hand Push up",
  "one-arm-push-up": "Single Arm Push up",
  "one-arm-push-up-negative": "Single Arm Push up",
  "planche": "Full planche",
  "planche-lean": "Lean planche",
  "bodyweight-squat": "Squat",
  "glute-bridge": "Glute Bridge Two Legs on Floor",
  "pistol-squat": "Single Leg Squat (pistol)",
  "assisted-pistol": "Assisted Pistol Squat",
  "calf-raise": "Bodyweight Standing Calf Raise",
  "single-leg-calf-raise": "One Leg Floor Calf Raise",
  "dead-hang": "Dead Hang Stretch",
  "toes-to-bar": "Hanging Toes to Bar",
  "freestanding-handstand": "Handstand",
  "wall-handstand-hold": "Handstand Hold on Wall",
  "hspu-negative": "Handstand Push Up",
  "l-sit-on-floor": "L-Sit on Floor",
  "tucked-l-sit": "L-sit",
  "side-plank": "Side Plank",
  "gymnastic-bridge": "Bridge",
  "nordic-curl-negative": "Nordic Hamstring Curl",
  "negative-pull-up": "Pull up (negative)",
  "muscle-up-negative": "Muscle Up",
  "bar-muscle-up": "Muscle Up",
  "dragon-flag-tuck": "Dragon Flag",
  "jumping-pull-up": "Jumping Pull up",
  "wide-grip-pull-up": "Wide Grip Pull Up",
  "chest-to-bar": "Chest to Bar Pull up",
  "scapular-push-up": "Scapula Push-Up",
  "close-grip-push-up": "Close-Grip Push-up",
  "hindu-push-up": "Modified Hindu Push-up",
  "bench-dip": "Bench dip on floor",
  "good-morning": "Bodyweight Good Morning",
  "wall-sit": "Wall sit (narrow stance)",
  "dragon-flag-tuck": "Negative Dragon Flag",
  "crunch": "Crunch (arms straight)",
  "incline-push-up": "Incline Push-up",
  "elevated-pike-push-up": "Pike Push up (on Bench)",
  "dip-negative": "Chest Dip",
  "parallel-bar-dip": "Chest Dip",
  "ring-muscle-up": "Muscle Up",
  "one-arm-chin-up": "One Arm Chin Up",
  "hanging-knee-raise": "Hanging Knee Raise",
  "hanging-leg-raise": "Hanging Leg Raise",
  "reverse-lunge": "Reverse Lunge",
  "walking-lunge": "Walking Lunge",
  "step-up": "Step up",
  "squat-jump": "Squat Jump",
  "jump-rope": "Jump Rope",
  "plank": "Plank",
  "knee-plank": "Kneeling plank",
  "crow-stand": "Crane Pose Bakasana",
  "single-leg-bridge": "Glute Bridge One Leg on Floor",
  "bent-knee-inverted-row": "Parallel Bars Bent Knee Inverted Row",
};

const EXTRA_QUERIES = {
  "l-sit-on-floor": ["l-sit"],
  "tucked-l-sit": ["l-sit"],
  "parallel-bar-l-sit": ["l-sit"],
  "v-sit": ["v-sit"],
  "scapular-push-up": ["push-up"],
  "close-grip-push-up": ["push-up"],
  "hindu-push-up": ["hindu push"],
  "archer-push-up": ["archer push"],
  "pseudo-planche-push-up": ["pseudo planche"],
  "bench-dip": ["bench dip"],
  "good-morning": ["bodyweight good morning"],
  "wall-sit": ["wall sit"],
  "dragon-flag-tuck": ["dragon flag"],
  "crunch": ["crunch arms straight"],
  "plank": ["forearm plank", "high plank"],
  "tuck-planche": ["tuck planche", "tucked planche"],
  "crow-stand": ["bakasana", "crow pose"],
};

function tokens(value) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token))
    .filter((token) => !IGNORE.has(token));
}

function same(wanted, title) {
  const left = tokens(wanted);
  const right = tokens(title);
  if (left.length === 0 || left.length !== right.length) return false;
  return [...left].sort().join(" ") === [...right].sort().join(" ");
}

function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseResults(html) {
  const results = [];
  const pattern =
    /href="\/exercises\/([^"]+)"[\s\S]*?thumbnails\/(\d+)\.png"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/g;
  for (const match of html.matchAll(pattern)) {
    results.push({
      slug: match[1],
      assetId: match[2],
      title: decode(match[3]).trim(),
    });
  }
  return results;
}

async function search(query, equipment, page) {
  const params = new URLSearchParams({ search: query, page: String(page) });
  if (equipment) params.set("equipment", equipment);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`https://loadmuscle.com/exercises?${params}`, {
      headers: { "user-agent": "Mozilla/5.0", accept: "text/html" },
    });
    if (!response.ok) return [];
    const results = parseResults(await response.text());
    if (results.length > 0 || attempt === 1) return results;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return [];
}

function targetsFor(exercise) {
  return [...new Set([PREFERRED[exercise.id], exercise.name, ...exercise.aliases].filter(Boolean))];
}

function queriesFor(exercise) {
  const targets = targetsFor(exercise).map((target) => target.replace(/-/g, " "));
  return [...new Set([...targets, ...(EXTRA_QUERIES[exercise.id] ?? [])])];
}

function pick(exercise, results) {
  for (const target of targetsFor(exercise)) {
    const hit = results.find((result) => same(target, result.title));
    if (hit) return { ...hit, matched: target };
  }
  return null;
}

async function pool(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => run()));
  return output;
}

fs.mkdirSync(outDir, { recursive: true });
const previous = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : {};
delete previous["feet-elevated-row"];
fs.rmSync(path.join(outDir, "feet-elevated-row.webp"), { force: true });

const pending = exercises.filter((exercise) => !previous[exercise.id]);

const matches = await pool(pending, 2, async (exercise) => {
  try {
    let results = [];
    for (const query of queriesFor(exercise)) {
      const first = await search(query, "Body weight", 1);
      results = results.concat(first);
      if (pick(exercise, results)) break;
      const more = await Promise.all([
        search(query, "Body weight", 2),
        search(query, null, 1),
      ]);
      results = results.concat(more.flat());
      if (pick(exercise, results)) break;
    }
    const hit = pick(exercise, results);
    return { exercise, hit, sample: results.slice(0, 4).map((result) => result.title) };
  } catch (error) {
    console.log(`ERR ${exercise.id} ${error.message}`);
    return { exercise, hit: null, sample: [] };
  }
});

const accepted = matches.filter((entry) => entry.hit);
console.log(`accepted ${accepted.length} new / ${pending.length} pending`);
for (const entry of matches.filter((entry) => !entry.hit)) {
  console.log(`SKIP ${entry.exercise.id} | ${entry.exercise.name} | ${entry.sample.join(" || ") || "none"}`);
}

const manifest = { ...previous };
await pool(accepted, 2, async (entry) => {
  const fileName = `${entry.exercise.id}.webp`;
  const url = `https://exercises.loadmuscle.com/gifs/720/${entry.hit.assetId}.webp`;
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!response.ok) {
    console.log(`FAIL ${entry.exercise.id} ${response.status}`);
    return;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000) {
    console.log(`FAIL ${entry.exercise.id} tiny`);
    return;
  }
  fs.writeFileSync(path.join(outDir, fileName), bytes);
  manifest[entry.exercise.id] = `exercises/${fileName}`;
  console.log(`OK ${entry.exercise.id} <- ${entry.hit.title} [${entry.hit.assetId}] via "${entry.hit.matched}"`);
});

if (manifest["push-up"]) {
  const push = accepted.find((entry) => entry.exercise.id === "push-up");
  if (push?.hit.assetId !== "0662") {
    console.log(`WARN push-up asset ${push?.hit.assetId} title ${push?.hit.title}`);
  }
}

const ordered = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(manifestPath, `${JSON.stringify(ordered, null, 2)}\n`);
console.log(`wrote ${Object.keys(ordered).length} clips`);
