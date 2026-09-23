# Scrub-clip tooling

## Start here: `frames.mjs`

**The reel does not ship as a video any more** — see
`obsidian/meta/decisions-log.md` ADR-0046. It is a canvas blending between
pre-decoded stills, and this is what makes them:

```sh
node .claude/scripts/video/frames.mjs
```

It reads `technology-stack.mp4`, keeps only its *real* frames (the even ones —
ADR-0045's in-betweens are synthetic), trims the motionless tail, bakes the
`feColorMatrix` colour key into a real alpha channel, and writes two tiers to
`public/assets/technology/stack-frames/`: **61 × 768px** (`hi`) and **41 ×
512px** (`lo`), plus a `manifest.json`.

> [!warning] The key lives in two places
> `KEY_WEIGHT` / `KEY_FLOOR` here and in `technology-reel.tsx` must match. This
> script keys every frame; the component's SVG filter keys the poster only, and
> if they disagree the hand-off flashes.

> [!warning] Resident memory, not download, is the constraint
> A decoded `ImageBitmap` costs `side² × 4` bytes whatever it weighed on the
> wire. The `hi` tier is 2.77MB downloaded and **137MB resident**. Raising the
> side or the count is not free — 121 frames at 1024px would be 507MB.

## The mp4 is now a source, not a deliverable

Nothing fetches `technology-stack.mp4`; it stays in the repo because
`frames.mjs` reads it. The two AVFoundation tools below still build it. They
were written because this machine had no `ffmpeg` — **it does now**, which is
what `frames.mjs` uses; the Swift tools are kept because they are what produced
the shipped clip and re-encoding it through a different pipeline would change
the artwork under the frames.

See ADR-0042 (all-intra, H.264) and ADR-0045 (48 fps via blended in-betweens)
for why the clip is the shape it is.

## Build

```sh
swiftc -O reencode.swift -o reencode
swiftc -O interp.swift   -o interp
```

## Use

`reencode` — re-encodes to all-intra H.264 at a given square side and bitrate.
Every frame becomes an IDR, so `video.currentTime = x` is O(1) instead of
decoding from the previous keyframe.

```sh
./reencode in.mp4 out.mp4 1280 6
```

`interp` — doubles the frame rate by inserting a linear cross-blend between each
pair of source frames, then encodes all-intra. Duration is preserved exactly:
each source frame yields itself plus one in-between, and the last frame blends
with itself.

```sh
./interp original.mp4 out.mp4 1280 9
```

## Verify the output, always

A scrub clip that looks fine playing can still freeze when scrubbed. Check the
container rather than the picture:

```sh
python3 - out.mp4 <<'PY'
import struct, sys
d = open(sys.argv[1], 'rb').read()
i, j = d.find(b'stss'), d.find(b'stsz')
print("frames:", struct.unpack('>I', d[j+12:j+16])[0])
print("keyframes:", "ALL" if i < 0 else struct.unpack('>I', d[i+8:i+12])[0])
print("codec:", "avc1" if d.find(b'avc1') >= 0 else "NOT H.264 — check browser support")
PY
```

**No `stss` box means every frame is a keyframe — that is what you want.** An
`stss` with a small count is the freeze coming back. The supplied original had
one keyframe for 121 frames and each seek cost 96 ms.

This matters for the mp4 as a **source** now, not as a delivered asset: a clip
whose seeks are slow is still slow to export frames from. There is no
`SOURCE_FPS` in the component any more — the frame grid is a property of what
`frames.mjs` writes, and the component reads the count from the tier.
