/**
 * Build the technology reel's frame sequence.
 *
 * Replaces the scrubbed `<video>` with a set of keyed WebP stills the canvas
 * blends between — see `obsidian/meta/decisions-log.md` ADR-0046.
 *
 * Three things happen here that used to happen at runtime, or not at all:
 *
 * 1. **The synthetic in-betweens are dropped.** ADR-0045 doubled the clip to
 *    48 fps by baking a fixed 50/50 cross-blend into every second frame. The
 *    canvas interpolates at the *correct* fraction every display frame, so the
 *    baked ones are worse than useless — they cost bytes and resident memory to
 *    reproduce something the GPU does for free. Only the even frames of
 *    `technology-stack.mp4` are real; those are what this reads.
 *
 * 2. **The colour key is baked in.** `feColorMatrix` with the weights from
 *    ADR-0040 wrote the alpha channel from the colour channels on every painted
 *    frame. Applied here instead, once, the shipped stills carry a real alpha
 *    channel and the filter comes off the hot path entirely.
 *
 * 3. **The tail is trimmed.** 99.1% of the clip's movement is over by 4.4s of
 *    its 5.04 (the old `CLIP_TAIL` constant); the frames past it are the same
 *    picture. Shipping them cost ~16MB of resident memory to hold seven copies
 *    of one still, so the export stops there and the component maps the whole
 *    scroll across what it gets.
 *
 * Two tiers, because the binding constraint is resident memory, not download:
 * an `ImageBitmap` costs `side² × 4` bytes decoded whatever it cost on the
 * wire. 768²×61 is 144MB, which a desktop tab carries; a phone cannot, and its
 * box is a third of the size anyway.
 *
 * Usage:
 *   node .claude/scripts/video/frames.mjs [--src <mp4>] [--out <dir>]
 */

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";

const run = promisify(execFile);

/** Alpha-from-brightness, straight off ADR-0040. Keep the two in step. */
const KEY_WEIGHT = 7;
const KEY_FLOOR = -0.04;

/**
 * Last *real* frame worth shipping: 4.4s into a 24 fps source.
 *
 * The old `CLIP_TAIL` in the component, resolved to a frame index. Everything
 * after it is the settled stack holding still.
 */
const TAIL_FRAME = 106;

/**
 * The tiers, and why these numbers.
 *
 * `count` is real frames kept, spread evenly across `0…TAIL_FRAME`. It can be
 * far below the source's own rate because the canvas cross-dissolves in
 * premultiplied space every display frame — the picture is continuous, so what
 * `count` actually bounds is how much *motion* a single blend has to span.
 * At 61 frames that is 1/12s of a slow translation, which does not ghost.
 */
const TIERS = [
  { name: "hi", side: 768, count: 61, quality: 80 },
  { name: "lo", side: 512, count: 41, quality: 82 },
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const read = (flag, fallback) => {
    const at = args.indexOf(flag);
    return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
  };
  return {
    src: path.resolve(read("--src", "public/assets/technology/technology-stack.mp4")),
    out: path.resolve(read("--out", "public/assets/technology/stack-frames")),
  };
};

/**
 * Every real frame of the clip, as PNG, in a scratch directory.
 *
 * `not(mod(n,2))` because ADR-0045's in-betweens are the odd ones: source frame
 * `i` was written out as `frame[i]` then `blend(frame[i], frame[i+1])`, so the
 * even indices are the artwork and the odd ones are arithmetic.
 */
const extractRealFrames = async (src) => {
  const dir = await mkdtemp(path.join(tmpdir(), "reel-frames-"));
  await run("ffmpeg", [
    "-v", "error",
    "-i", src,
    "-vf", "select='not(mod(n,2))'",
    "-vsync", "0",
    path.join(dir, "f_%04d.png"),
  ]);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".png")).sort();
  return { dir, files: files.map((f) => path.join(dir, f)) };
};

/**
 * Write the alpha channel from the colour channels, exactly as the SVG filter
 * did: `a = clamp(w·(r+g+b) + floor)`, RGB untouched.
 *
 * Straight (non-premultiplied) alpha, which is what both WebP and
 * `createImageBitmap` expect — the canvas premultiplies on upload.
 */
const keyAlpha = (data, channels, pixels) => {
  const rgba = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i += 1) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const alpha = (KEY_WEIGHT * (r + g + b)) / 255 + KEY_FLOOR;
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  }
  return rgba;
};

const buildTier = async (sources, outRoot, tier) => {
  const dir = path.join(outRoot, tier.name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  let bytes = 0;
  for (let k = 0; k < tier.count; k += 1) {
    // Evenly across the kept range, endpoints included: the first frame is the
    // untouched stack and the last is the settled one, and both have to land.
    const pick = Math.round((k * TAIL_FRAME) / (tier.count - 1));
    const { data, info } = await sharp(sources[pick])
      .resize(tier.side, tier.side, { kernel: "lanczos3" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = keyAlpha(data, info.channels, info.width * info.height);
    const dest = path.join(dir, `${String(k).padStart(3, "0")}.webp`);
    await sharp(rgba, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .webp({ quality: tier.quality, alphaQuality: tier.quality, effort: 6 })
      .toFile(dest);
    bytes += (await stat(dest)).size;
  }

  const resident = (tier.count * tier.side * tier.side * 4) / 1048576;
  console.log(
    `${tier.name}: ${tier.count} × ${tier.side}px — ` +
      `${(bytes / 1048576).toFixed(2)} MB on the wire, ` +
      `${resident.toFixed(0)} MB decoded`,
  );
  return { ...tier, bytes };
};

const main = async () => {
  const { src, out } = parseArgs();
  const { dir, files } = await extractRealFrames(src);
  try {
    if (files.length <= TAIL_FRAME) {
      throw new Error(
        `expected more than ${TAIL_FRAME} real frames, found ${files.length}`,
      );
    }
    const built = [];
    for (const tier of TIERS) built.push(await buildTier(files, out, tier));

    // The component reads this rather than carrying the counts twice.
    await writeFile(
      path.join(out, "manifest.json"),
      `${JSON.stringify(
        {
          tiers: Object.fromEntries(
            built.map((t) => [t.name, { side: t.side, count: t.count }]),
          ),
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

await main();
