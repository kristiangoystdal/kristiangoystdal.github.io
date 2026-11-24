#!/usr/bin/env python3
"""Voices for every spoken segment (narrator and characters), made offline with Piper.

  python3 -m venv tools/voices/.venv && tools/voices/.venv/bin/pip install piper-tts
  node tools/voices/extract-lines.mjs && tools/voices/.venv/bin/python tools/voices/gen-voices.py [--jobs 4]

Downloads each model once into tools/voices/models (git-ignored), writes public/voices/out/<key>.m4a (AAC, plays in every browser) and
public/voices/manifest.json. Incremental: segments whose file exists are skipped; files no longer used are removed.
Prints counts only (the story stays a surprise)."""
import hashlib, json, subprocess, sys, time, urllib.request, wave
from pathlib import Path

here = Path(__file__).parent
cfg = {k: v for k, v in json.load(open(here / 'voices.json')).items() if not k.startswith('_')}
lines = json.load(open(here / 'lines.json'))
models = here / 'models'
models.mkdir(exist_ok=True)
pub = here / '..' / '..' / 'public' / 'voices'
out = pub / 'out'
out.mkdir(parents=True, exist_ok=True)
BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/'


def fetch(name):
    locale, voice, quality = name.split('-')
    path = f"{locale.split('_')[0]}/{locale}/{voice}/{quality}/{name}"
    for ext in ('.onnx', '.onnx.json'):
        f = models / (name + ext)
        for attempt in range(5):
            if f.exists():
                break
            print('download', f.name, flush=True)
            try:
                urllib.request.urlretrieve(BASE + path + ext, f)
            except OSError as e:
                print('  retry after', e, flush=True)
                time.sleep(3 * (attempt + 1))
        if not f.exists():
            sys.exit(f'could not download {f.name}')
    return models / (name + '.onnx')


import os
import onnxruntime

# Each worker gets its share of the cores; otherwise every process grabs them all and they slow each other down.
_args = sys.argv[1:]
_jobs = int(_args[_args.index('--jobs') + 1]) if '--jobs' in _args else 1
_threads = max(1, (os.cpu_count() or 4) // _jobs)
_SessionOptions = onnxruntime.SessionOptions


def _session_options():
    o = _SessionOptions()
    o.intra_op_num_threads = _threads
    o.inter_op_num_threads = 1
    return o


onnxruntime.SessionOptions = _session_options

from piper import PiperVoice
from piper.config import SynthesisConfig

# Tone of voice (from extract-lines.mjs): multipliers on tempo and pitch, loudness target in LUFS
# (normal speech -18; whispers much quieter, shouts clearly louder), Piper expressiveness
# (noise_scale, default 0.667) and an optional tremble (ffmpeg vibrato).
TONES = {
    'neutral': dict(length=1.0, pitch=1.0, lufs=-18, noise=0.667),
    'slow':    dict(length=1.07, pitch=1.0, lufs=-18, noise=0.6),
    'quiet':   dict(length=1.08, pitch=0.98, lufs=-23, noise=0.55),
    'whisper': dict(length=1.12, pitch=0.97, lufs=-27, noise=0.5),
    'shout':   dict(length=0.9, pitch=1.06, lufs=-13, noise=0.85),
    'shaky':   dict(length=1.1, pitch=1.0, lufs=-20, noise=0.75, vibrato='vibrato=f=5.5:d=0.18'),
    'dry':     dict(length=1.0, pitch=0.98, lufs=-19, noise=0.4),
}

# Bump when the ffmpeg chain changes, so every file is filtered again (the raw Piper audio is cached).
PIPELINE = 5
cache_dir = here / 'cache'
cache_dir.mkdir(exist_ok=True)

# What each file was made with, so a change of voice or tone re-renders just the affected segments.
# With --jobs N, N worker processes each render every N-th segment and record what they made in a part
# file; the main process then merges the parts, renders anything left, and writes the manifest.
rendered_path = here / 'rendered.json'
rendered = json.load(open(rendered_path)) if rendered_path.exists() else {}
args = sys.argv[1:]
worker = int(args[args.index('--worker') + 1]) if '--worker' in args else None
jobs = int(args[args.index('--jobs') + 1]) if '--jobs' in args else 1
if worker is None and jobs > 1:
    procs = [subprocess.Popen([sys.executable, __file__, '--worker', str(w), '--jobs', str(jobs)]) for w in range(jobs)]
    if any(p.wait() for p in procs):
        sys.exit('a worker failed')
for part in here.glob('rendered.part*.json'):
    rendered.update(json.load(open(part)))
    part.unlink()
part_path = here / f'rendered.part{worker}.json' if worker is not None else None

loaded, manifest, made = {}, {}, 0
for i, l in enumerate(lines):
    if worker is not None and i % jobs != worker:
        continue
    c = cfg[l['speaker']]
    t = TONES[l.get('tone', 'neutral')]
    recipe = json.dumps([PIPELINE, c, t, l['text']], sort_keys=True)
    dst = out / (l['key'] + '.m4a')
    manifest[l['key']] = f"voices/out/{l['key']}.m4a"
    if dst.exists() and rendered.get(l['key']) == recipe:
        continue
    # raw speech, cached by everything Piper sees, so changing only the filters is quick
    length = c.get('length_scale', 1.0) * t['length']
    raw_id = hashlib.sha1(json.dumps([c['model'], c.get('speaker'), length, t['noise'], l['text']]).encode()).hexdigest()[:16]
    tmp = cache_dir / (raw_id + '.wav')
    if not tmp.exists():
        voice = loaded.get(c['model']) or loaded.setdefault(c['model'], PiperVoice.load(fetch(c['model'])))
        syn = SynthesisConfig(length_scale=length, noise_scale=t['noise'])
        if 'speaker' in c:
            syn.speaker_id = voice.config.speaker_id_map[c['speaker']]
        part_wav = cache_dir / (raw_id + f'.{worker}.part')
        with wave.open(str(part_wav), 'wb') as w:
            voice.synthesize_wav(l['text'], w, syn_config=syn)
        part_wav.rename(tmp)
    with wave.open(str(tmp), 'rb') as w:
        sr = w.getframerate()
    filters = []
    p = c.get('pitch', 1.0) * t['pitch']
    if abs(p - 1.0) > 1e-6:
        # change pitch, then restore the tempo, so the voice gets deeper (or lighter) without slowing down
        filters += [f'asetrate={sr}*{p}', f'aresample={sr}', f'atempo={1 / p:.4f}']
    if c.get('fx'):
        filters.append(c['fx'])
    if t.get('vibrato'):
        filters.append(t['vibrato'])
    # even loudness across voices, set by the tone (whisper quiet, shout loud), never clipping:
    # shouts are compressed first so they can be louder without peaking; a limiter at the end leaves
    # room for the small overshoot AAC encoding adds
    if t['lufs'] > -16:
        filters.append('acompressor=threshold=-24dB:ratio=6:attack=4:release=80:makeup=8dB')
    filters.append(f"loudnorm=I={t['lufs']}:TP=-2:LRA=9")
    filters.append(f'aresample={sr}')
    filters.append('alimiter=limit=0.6:level=disabled:attack=2:release=40')
    filters.append('apad=pad_dur=0.15')  # a short breath between segments
    cmd = ['ffmpeg', '-loglevel', 'error', '-y', '-i', str(tmp), '-af', ','.join(filters), '-ac', '1', '-c:a', 'aac', '-b:a', '40k', '-movflags', '+faststart', str(dst)]
    subprocess.run(cmd, check=True)
    rendered[l['key']] = recipe
    made += 1
    if part_path:
        json.dump({k: rendered[k] for k in rendered if k in manifest}, open(part_path, 'w'))
    if made % 25 == 0:
        print(f'{"worker " + str(worker) + ": " if worker is not None else ""}{made} made', flush=True)

if worker is not None:
    sys.exit(0)

removed = 0
for f in cache_dir.glob('*.part'):
    f.unlink()
for f in [*out.glob('*.m4a'), *out.glob('*.wav'), *out.glob('*.ogg')]:
    if f.suffix != '.m4a' or f.stem not in manifest:
        f.unlink()
        removed += 1
rendered = {k: v for k, v in rendered.items() if k in manifest}
json.dump(rendered, open(rendered_path, 'w'), indent=0)
json.dump(manifest, open(pub / 'manifest.json', 'w'), indent=1)
size = sum(f.stat().st_size for f in out.glob('*.m4a'))
print(f'{len(manifest)} segments in manifest, {made} new, {removed} removed, {size / 1e6:.1f} MB')
