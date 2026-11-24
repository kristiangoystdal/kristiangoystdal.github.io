// Spoiler-free QA: node check.mjs [runs]. Runs validate.mjs and masks scene ids, ending names and story names.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const story = JSON.parse(readFileSync(new URL('../src/stories/hollow-bell.json', import.meta.url), 'utf8'));
let out = execFileSync('node', [new URL('./validate.mjs', import.meta.url).pathname, new URL('../src/stories/hollow-bell.json', import.meta.url).pathname, process.argv[2] ?? '10000'], { encoding: 'utf8', cwd: new URL('.', import.meta.url).pathname });
const ends = Object.values(story.scenes).filter((s) => s.ending).map((s) => s.ending.id);
ends.forEach((e, i) => { out = out.replaceAll(e, `ending_${i + 1}`); });
Object.keys(story.scenes).sort((a, b) => b.length - a.length).forEach((id, i) => { out = out.replaceAll(id, `scene#${i}`); });
Object.keys(story.initialState.relations).concat(Object.keys(story.initialState.bonds)).forEach((n, i) => { out = out.replaceAll(n, `x${i}`); });
console.log(out);
