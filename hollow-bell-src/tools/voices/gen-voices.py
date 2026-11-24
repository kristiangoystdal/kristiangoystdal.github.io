#!/usr/bin/env python3
"""Level 2 voices: one audio file per tagged line.  Run locally:
  pip install piper-tts && node voices/extract-lines.mjs && python voices/gen-voices.py
Downloads each Piper model once, caches in voices/models, writes public/voices/out/<key>.ogg and public/voices/manifest.json.
Incremental: lines whose key already exists are skipped, so rerun after story edits."""
import json, os, subprocess, urllib.request, wave, sys
from pathlib import Path
here = Path(__file__).parent
cfg = json.load(open(here/'voices.json')); lines = json.load(open(here/'lines.json'))
(models := here/'models').mkdir(exist_ok=True); pub = here/'..'/'..'/'public'/'voices'; (out := pub/'out').mkdir(parents=True, exist_ok=True)
BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/'
def fetch(name):
    lang, voice, q = name.split('-')[0], name.split('-')[1], name.split('-')[2]
    fam = lang.split('_')[0]; p = f'{fam}/{lang}/{voice}/{q}/{name}'
    for ext in ('.onnx', '.onnx.json'):
        f = models/(name+ext)
        if not f.exists(): print('download', f.name); urllib.request.urlretrieve(BASE+p+ext, f)
    return models/(name+'.onnx')
from piper import PiperVoice
from piper.config import SynthesisConfig
cache, manifest = {}, {}
for l in lines:
    c = cfg.get(l['speaker']); dst = out/(l['key']+'.ogg'); manifest[l['key']] = f"voices/out/{l['key']}.ogg"
    if not c or dst.exists(): continue
    v = cache.get(c['model']) or cache.setdefault(c['model'], PiperVoice.load(fetch(c['model'])))
    tmp = out/(l['key']+'.wav')
    with wave.open(str(tmp), 'wb') as w: v.synthesize_wav(l['text'], w, syn_config=SynthesisConfig(length_scale=c['length_scale']))
    cmd = ['ffmpeg','-loglevel','error','-y','-i',str(tmp)] + (['-af', c['fx']] if c['fx'] else []) + ['-c:a','libvorbis','-q:a','4',str(dst)]
    subprocess.run(cmd, check=True); tmp.unlink(); print('ok', l['speaker'], l['key'])
json.dump(manifest, open(pub/'manifest.json','w'), indent=2); print(len(manifest), 'lines in manifest')
