// The Other Side of the Glass: a two-player story (Ingerid and Kristian). SPOILERS.
// Choices alternate between the players; their threads split and come back together.
// Build: node story-src/SPOILERS/mirror/build.mjs -> src/stories/mirror.json
const I = 'ingerid';
const K = 'kristian';
const f = (flag, set = true) => ({ flag, set });
const has = (flag) => ({ flag });
const not = (c) => ({ not: c });
const all = (...c) => ({ all: c });
const any = (...c) => ({ any: c });

// Having understood Leander Gloam, in any of the ways the story offers.
const UNDERSTOOD = { any: [
  { flag: 'k_listened' }, { flag: 'i_hint_story' }, { flag: 'pact_fair' }, { flag: 'pact_fair_i' }, { flag: 'k_diary' },
  { flag: 'k_knows_gloam' }, { flag: 'i_knows_gloam' }, { flag: 'i_understood' }, { flag: 'k_music' }, { flag: 'pell_for_gloam' },
] };

const S = {};

// ---------------------------------------------------------------- act one: the ball
S.m_ball = {
  title: 'The Winter Ball', mood: 'cozy', visual: { preset: 'ballroom-night', particles: ['candles', 'dust'] },
  cast: [I, K],
  text: [
    `Snow has been falling on the castle since lunch, and the Great Hall has given up pretending to be a dining room. Tonight it is a ballroom: four hundred floating candles, a ceiling full of slow snow that never lands, and a string quartet of enchanted instruments that plays a little faster whenever a teacher walks past.`,
    `{ingerid} of {ingeridHouse} and {kristian} of {kristianHouse} have danced exactly one dance, badly, and are now hiding by the drinks table with two cups of something that fizzes the wrong colour.`,
    `It is {ingerid} who notices it first. Behind the tapestry of the dancing trolls, where there has always been stone, there is a corridor. Its floor is polished like ice. At the far end, something catches the candlelight and throws it back.`,
    `Madam Ottoline Pell, the librarian, is chaperoning tonight from a chair by the door with a book in her lap. She has not looked up in an hour.`,
  ],
  choices: {
    [I]: [
      { label: `Take {kristian}'s hand and walk into the corridor`, effects: [f('i_bold'), { relation: 'bond', add: 1 }] },
      { label: `Tell {kristian} to wait while you take a careful look`, effects: [f('i_careful')] },
      { label: `Tell Madam Pell about the corridor first`, effects: [f('i_help'), f('pell_knows'), { relation: 'pell', add: 1 }], ripple: `Madam Pell will remember who told her.` },
    ],
  },
  next: [{ to: 'm_ball_k' }],
};

S.m_ball_k = {
  title: 'The corridor that was not there', mood: 'tense', visual: { preset: 'ballroom-night', particles: ['candles'] },
  cast: [I, K],
  text: [
    { if: has('i_bold'), text: `{ingerid} takes {kristian}'s hand without a word and pulls. The tapestry trolls stop dancing to watch them go.` },
    { if: has('i_careful'), text: `“Wait here,” says {ingerid}, and takes three careful steps onto the icy floor, testing it like a frozen pond.` },
    { if: has('i_help'), text: `{ingerid} crosses the hall to Madam Pell, who listens, closes her book on one finger, and looks at the tapestry for a long moment. “That corridor,” she says quietly, “was bricked up in 1923. Do not go far. I will be right behind you.”` },
    `The music behind them goes thin, as if it is being played in another room. The corridor smells of cold glass and old roses.`,
  ],
  choices: {
    [K]: [
      { label: `Stride ahead of {ingerid}, first into the dark`, effects: [f('k_bold'), { player: K, stat: 'courage', add: 1 }] },
      { label: `Stay half a step behind and keep your eyes open`, effects: [f('k_careful'), { player: K, stat: 'wit', add: 1 }] },
      { label: `Make a joke about haunted corridors to steady your nerves`, effects: [f('k_joke'), { player: K, stat: 'kindness', add: 1 }, { relation: 'bond', add: 1 }] },
    ],
  },
  next: [{ to: 'm_hall' }],
};

S.m_hall = {
  title: 'The Hall of Glass', mood: 'magic', visual: { preset: 'mirror-hall', particles: ['dust', 'fireflies'] },
  cast: [I, K, 'Gloam'], speaker: 'Gloam',
  text: [
    `The corridor opens into a long gallery of mirrors, floor to ceiling, each one taller than a door. Moonlight comes in from nowhere. In every mirror there are two of them, and then four, and then a hundred, all the way down into silver.`,
    { if: has('k_joke'), text: `{kristian}'s joke about haunted corridors echoes back from the glass a moment too late, in a voice that is almost his.` },
    `Between two mirrors hangs a portrait of an old wizard asleep in an armchair, snoring gently. The brass plate reads: Sir Aldous Vane, Keeper of the Hall.`,
    `Then one of the reflections of {kristian} does not move when he moves. It tilts its head. It smiles, politely, the way a stranger smiles across a train carriage.`,
    `“Good evening,” it says to {ingerid}. “You have no idea how long it has been since anyone came to the ball.”`,
  ],
  choices: {
    [I]: [
      { label: `Ask the reflection who it really is`, effects: [f('knows_name')], ripple: `The reflection will remember that you asked.` },
      { label: `Wake the snoring portrait`, effects: [f('portrait_awake'), { relation: 'aldous', add: 1 }] },
      { label: `Grab {kristian}'s sleeve and do not let go`, effects: [f('held'), { player: K, item: 'scarf', give: true }, { relation: 'bond', add: 1 }] },
    ],
  },
  next: [{ to: 'm_hall_k' }],
};

S.m_hall_k = {
  title: 'The reflection', mood: 'tense', visual: { preset: 'mirror-hall', particles: ['fireflies'] },
  cast: [I, K, 'Gloam'], speaker: 'Gloam',
  text: [
    { if: has('knows_name'), text: `“Who are you?” asks {ingerid}. The reflection bows. “Leander Gloam,” it says. “Fifth year. Ravenclaw, once. I came to a ball like this one and I never quite left.”` },
    { if: has('portrait_awake'), text: `{ingerid} raps on the frame of the portrait. Sir Aldous wakes with a snort, sees the smiling reflection and goes white under his paint. “Do not give it your name!” he cries. “Whatever it offers, girl, it must never have your name!”` },
    { if: has('held'), text: `{ingerid} grabs {kristian}'s sleeve and holds on. In the confusion her scarf ends up wound around his wrist.` },
    `The reflection turns to {kristian}. “And you,” it says warmly. “You look like someone who would understand. Come closer. The glass is cold, but it is honest.”`,
  ],
  choices: {
    [K]: [
      { label: `Reach out and touch the glass`, effects: [f('k_touched'), { relation: 'gloam', add: 1 }] },
      {
        label: `Step back from the mirror`,
        check: { stat: 'courage', difficulty: 5, success: [f('k_resisted')], fail: [f('k_touched')] },
      },
      { label: `Say good evening back, politely`, effects: [f('k_polite'), { relation: 'gloam', add: 2 }], ripple: `The reflection will remember your manners.` },
    ],
  },
  next: [{ to: 'm_split' }],
};

S.m_split = {
  title: 'Through', mood: 'dark', visual: { preset: 'mirror-hall', particles: ['fog', 'sparks'] },
  cast: [I, 'kristian@mirror'],
  text: [
    { if: has('k_touched'), text: `{kristian}'s fingertips meet the glass, and the glass does not stop them. It gives, like the skin of cold water.` },
    { if: has('k_resisted'), text: `{kristian} steps back, hard. It makes no difference. The floor tilts like the deck of a ship, and he slides toward the mirror as if the whole hall has decided it.` },
    { if: has('k_polite'), text: `“Good evening,” says {kristian}, because his grandmother raised him properly. The reflection looks genuinely touched. Then the mirror opens like a door, and {kristian} is on the other side of it.` },
    `There is no sound. There is no flash. One moment {kristian} is standing next to {ingerid}; the next he is standing next to her in the mirror, and nowhere else.`,
    { if: has('held'), text: `{ingerid}'s scarf has gone with him. She can see the end of it trailing from his wrist, in the glass.` },
    `He presses his hands to the glass from the inside. His mouth moves. {ingerid} cannot hear a single word.`,
  ],
  next: [{ to: 'm_k_silver' }],
};

// ---------------------------------------------------------------- act two: two sides of the glass
S.m_k_silver = {
  title: 'The silver castle', mood: 'magic', visual: { preset: 'mirror-world', particles: ['fog', 'dust'] },
  cast: ['kristian@mirror'],
  text: [
    `On the other side of the glass the castle is exactly the same and completely wrong. The candles burn downward. The tapestry trolls dance backwards. Every word on every sign is written the wrong way round, and the snow outside the windows falls up.`,
    `There is no colour here, only silver and grey and the deep blue of moonlight. {kristian}'s own footsteps reach his ears a heartbeat before he takes them.`,
    { if: { player: K, item: 'scarf' }, text: `He still has {ingerid}'s scarf around his wrist. It is the only warm colour in the whole world.` },
    `Through the mirror he can see {ingerid}, small and real and very far away, in a hall full of ordinary candlelight.`,
    `At the end of the silver gallery, a figure in old-fashioned school robes beckons to him, and then slips round a corner.`,
  ],
  choices: {
    [K]: [
      { label: `Search the silver gallery for a way back`, check: { stat: 'wit', difficulty: 5, success: [{ player: K, item: 'shard', give: true }, f('k_found_shard')], fail: [f('k_lost')] } },
      { label: `Follow the figure round the corner`, effects: [f('met_gloam_early'), { relation: 'gloam', add: 1 }] },
      { label: `Breathe on the glass and write a message to {ingerid}`, effects: [f('k_wrote'), { relation: 'bond', add: 1 }], ripple: `{ingerid} will see whatever you write.` },
    ],
  },
  next: [{ to: 'm_i_glass' }],
};

S.m_i_glass = {
  title: 'Writing on the glass', mood: 'tense', visual: { preset: 'mirror-hall', particles: ['fog'] },
  cast: [I, 'kristian@mirror'], speaker: 'Sir Aldous',
  text: [
    `{ingerid} stands alone in the Hall of Glass. The quartet in the Great Hall has started a waltz. Nobody has noticed that two students are missing.`,
    { if: has('k_found_shard'), text: `In the mirror, {kristian} is crouching, picking something up from the silver floor: a long, sharp sliver of glass that glows faintly. He holds it up so she can see.` },
    { if: has('k_lost'), text: `In the mirror, {kristian} walks the length of the silver gallery and back again, twice, and each time ends up exactly where he started. He looks very tired of it.` },
    { if: has('met_gloam_early'), text: `In the mirror, {kristian} hurries after a figure in old school robes, and the two of them vanish round a corner. A minute later {kristian} comes back alone, looking thoughtful.` },
    { if: has('k_wrote'), text: `In the mirror, {kristian} breathes on the glass and writes in the mist with one finger. The letters come out backwards on her side, but she can read them: ARE YOU OK? HOW DO I GET BACK?` },
    { if: has('portrait_awake'), text: `“The hall opens at midnight,” mutters Sir Aldous from his frame, “on the last stroke, and only if both sides turn together. That is all I know, and it is a great deal more than I should.”` },
    `The great clock above the ballroom says a quarter past eleven. Every story {ingerid} has ever heard about this castle's lost hall ends the same way: whoever is still inside at the last stroke of midnight stays inside for a hundred years.`,
    `She has three quarters of an hour to get {kristian} back.`,
  ],
  choices: {
    [I]: [
      { label: `Breathe on the glass and write back`, effects: [f('i_wrote'), { relation: 'bond', add: 1 }], ripple: `{kristian} will see whatever you write.` },
      { label: `Run to Madam Pell for help`, effects: [f('i_help'), f('pell_knows'), { relation: 'pell', add: 1 }] },
      { label: `Watch the other side closely, without blinking`, effects: [f('i_watch'), { player: I, stat: 'wit', add: 1 }] },
    ],
  },
  next: [
    { if: all(has('i_wrote'), has('k_wrote')), to: 'm_code' },
    { to: 'm_k_gallery' },
  ],
};

S.m_code = {
  title: 'Twelve', mood: 'cozy', visual: { preset: 'mirror-hall', particles: ['fog', 'fireflies'] },
  cast: [I, 'kristian@mirror'],
  onEnter: [f('code'), { relation: 'bond', add: 1 }],
  text: [
    `For a few minutes the mirror becomes a slate. {ingerid} writes, {kristian} writes back. It is slow, and every word has to be read backwards, and it is the best conversation either of them has had all year.`,
    `They agree on one thing, in capitals, underlined twice: whatever happens, they will act together on the twelfth stroke of midnight. TWELVE, writes {kristian}. TWELVE, writes {ingerid}.`,
  ],
  next: [{ to: 'm_k_gallery' }],
};

// ---------------------------------------------------------------- the side stories
S.m_k_gallery = {
  title: 'The silver gallery', mood: 'magic', visual: { preset: 'mirror-world', particles: ['fog', 'dust'] },
  cast: ['kristian@mirror'],
  text: [
    { if: has('i_help'), text: `In the real hall, {ingerid} is gone, running. {kristian} watches her go and feels, for the first time, properly alone.` },
    { if: has('i_watch'), text: `In the real hall, {ingerid} stands perfectly still and watches him, not blinking, like a cat at a window. It helps more than he would have guessed.` },
    { if: has('i_wrote'), text: `On the glass, in her handwriting, backwards from his side: HOLD ON. I'M HERE.` },
    `The silver castle goes on and on. {kristian} walks into a gallery of portraits, every one of them the reflection of a painting he has walked past a hundred times. Here, the painted people are awake, and they are all looking at him.`,
    `At the far end, somewhere beyond the portraits, a music box is playing a waltz, very slowly, as if it is running down. Above him, a door stands open onto a balcony where the snow is falling the wrong way.`,
  ],
  choices: {
    [K]: [
      { label: `Question the silver portraits`, effects: [f('kb_portraits')] },
      { label: `Follow the sound of the music box`, effects: [f('kb_room')] },
      { label: `Climb out onto the upside-down balcony`, effects: [f('kb_balcony'), { player: K, stat: 'courage', add: 1 }] },
    ],
  },
  next: [{ to: 'm_i_corridors' }],
};

S.m_i_corridors = {
  title: 'The castle at night', mood: 'tense', visual: { preset: 'corridor-torch', particles: ['dust'] },
  cast: [I],
  text: [
    `{ingerid} leaves the Hall of Glass and the music of the ball behind her. The real castle at a quarter to midnight is all moving staircases and sleepy portraits, and every corridor seems longer than it is in daylight.`,
    { if: has('kb_portraits'), text: `In a window as she passes, she catches a glimpse of {kristian} in a silver gallery, deep in conversation with a row of paintings.` },
    { if: has('kb_room'), text: `In a window as she passes, she catches a glimpse of {kristian}, hurrying down a silver corridor as though he is following a tune.` },
    { if: has('kb_balcony'), text: `In a window as she passes, she catches a glimpse of {kristian} climbing out onto a balcony, into snow that is falling up.` },
    `Three ways lie open. Up the spiral stair to the clock tower, where the great clock of the ballroom keeps its works. Along the east corridor, where the castle ghost called Sister Wren is said to walk on winter nights. Or down to Madam Pell's office, which is never locked, because nobody would dare.`,
  ],
  choices: {
    [I]: [
      { label: `Climb the stair to the clock tower`, effects: [f('ib_tower')] },
      { label: `Look for Sister Wren in the east corridor`, effects: [f('ib_ghost')] },
      { label: `Slip into Madam Pell's office`, effects: [f('ib_office'), { player: I, stat: 'cunning', add: 1 }] },
    ],
  },
  next: [
    { if: has('kb_portraits'), to: 'm_k_portraits' },
    { if: has('kb_room'), to: 'm_k_room' },
    { to: 'm_k_balcony' },
  ],
};

S.m_k_portraits = {
  title: 'The painted witnesses', mood: 'magic', visual: { preset: 'mirror-world', particles: ['dust'] },
  cast: ['kristian@mirror'], speaker: 'Sir Aldous',
  text: [
    `The silver portraits whisper among themselves as {kristian} comes closer. The reflection of Sir Aldous Vane is here too, awake and much braver than the original.`,
    `“A living boy, on this side!” he says. “We have not had one of those since the twenties. Ask, lad, ask. We have been dying to be asked anything at all for a hundred years.”`,
  ],
  choices: {
    [K]: [
      { label: `Ask how the door between the sides opens`, effects: [f('k_hint'), f('k_portraits'), { relation: 'aldous', add: 1 }] },
      { label: `Ask about the boy in old school robes`, effects: [f('k_knows_gloam'), { relation: 'gloam', add: 1 }] },
      { label: `Ask whether a voice can pass through the glass`, effects: [f('whisper_link')], ripple: `Once tonight, {ingerid} may hear you.` },
    ],
  },
  next: [
    { if: has('ib_tower'), to: 'm_i_tower' },
    { if: has('ib_ghost'), to: 'm_i_ghost' },
    { to: 'm_i_office' },
  ],
};

S.m_k_room = {
  title: 'Room 1923', mood: 'cozy', visual: { preset: 'mirror-world', particles: ['dust', 'fireflies'] },
  cast: ['kristian@mirror'],
  text: [
    `The music box is in a dormitory that has not changed in a hundred years: one bed made with hospital corners, a school trunk with a name painted on the lid, a wireless set, a single photograph propped against the lamp. The box is still turning, slower and slower.`,
    `The name on the trunk is L. GLOAM.`,
  ],
  choices: {
    [K]: [
      { label: `Read the diary lying open on the bed`, effects: [f('k_diary'), { player: K, stat: 'kindness', add: 1 }] },
      { label: `Wind the music box before it stops`, effects: [f('k_music'), { relation: 'gloam', add: 2 }], ripple: `Somebody will notice the music start again.` },
      { label: `Take the photograph`, effects: [f('k_photo'), { player: K, item: 'photo', give: true }] },
    ],
  },
  next: [
    { if: has('ib_tower'), to: 'm_i_tower' },
    { if: has('ib_ghost'), to: 'm_i_ghost' },
    { to: 'm_i_office' },
  ],
};

S.m_k_balcony = {
  title: 'Snow falling up', mood: 'magic', visual: { preset: 'mirror-world', particles: ['fog', 'sparks'] },
  cast: ['kristian@mirror'],
  text: [
    `The balcony hangs over a silver courtyard. Snow rises past {kristian} in slow flakes and vanishes into a black sky with no stars, only one enormous moon. Across the courtyard, the backwards clock tower shows its face: the hands are creeping toward twelve, from the wrong side.`,
    `Below him, through a window that is a mirror on the other side, he can see straight into the real castle: warm corridors, candles, and somewhere in there, {ingerid}.`,
  ],
  choices: {
    [K]: [
      { label: `Wave, in case {ingerid} is looking`, effects: [f('k_waved'), { player: K, stat: 'kindness', add: 1 }, { relation: 'bond', add: 1 }] },
      { label: `Study the backwards clock until you understand it`, effects: [f('k_saw_clock'), f('k_hint')] },
      { label: `Leap to the next window ledge`, check: { stat: 'courage', difficulty: 6, success: [{ player: K, item: 'shard', give: true }, f('k_found_shard')], fail: [{ player: K, stat: 'courage', add: -1 }, f('k_slipped')] } },
    ],
  },
  next: [
    { if: has('ib_tower'), to: 'm_i_tower' },
    { if: has('ib_ghost'), to: 'm_i_ghost' },
    { to: 'm_i_office' },
  ],
};

S.m_i_tower = {
  title: 'The clockworks', mood: 'tense', visual: { preset: 'tower-stairs', particles: ['dust', 'sparks'] },
  cast: [I],
  text: [
    { if: has('k_waved'), text: `Through a narrow window on the stair, {ingerid} sees a silver figure on a balcony in a sky that is not there, waving. She waves back before she can feel silly about it.` },
    { if: has('k_music'), text: `Somewhere in the walls, very faintly, a music box starts playing a waltz.` },
    `At the top of the spiral stair the clock tower is one great machine: wheels the size of cartwheels, a pendulum as long as a boat, and the back of the ballroom clock's face, glowing like a moon from behind.`,
    `A small portrait hangs among the gears, of a clockmaker with a jeweller's glass screwed into one eye. He is fast asleep, and ticking.`,
  ],
  choices: {
    [I]: [
      { label: `Study the mechanism`, check: { stat: 'wit', difficulty: 5, success: [f('i_clock_knowledge')], fail: [f('i_confused')] } },
      { label: `Wake the clockmaker and ask him`, effects: [f('i_clock_knowledge')] },
      { label: `Free the gear that is sticking`, check: { stat: 'courage', difficulty: 5, success: [f('i_gear')], fail: [{ player: I, stat: 'courage', add: -1 }] } },
    ],
  },
  next: [{ to: 'm_k_library' }],
};

S.m_i_ghost = {
  title: 'Sister Wren', mood: 'magic', visual: { preset: 'corridor-torch', particles: ['fog', 'fireflies'] },
  cast: [I, 'Sister Wren'], speaker: 'Sister Wren',
  text: [
    { if: has('k_music'), text: `As {ingerid} turns into the east corridor, a music box starts to play somewhere inside the walls, and the air goes cold.` },
    `Sister Wren is exactly where the stories say: drifting along the east corridor in a nun's grey habit, humming. She has been dead for four hundred years and says she has never been bored once.`,
    `“A living girl, out of bed, on the night of the ball,” she says. “You have come about the Hall of Glass. Everybody always does, eventually. Ask your question, dear. I have time.”`,
  ],
  choices: {
    [I]: [
      { label: `Ask her about Leander Gloam`, effects: [f('i_knows_gloam'), { relation: 'gloam', add: 1 }, { relation: 'wren', add: 1 }] },
      { label: `Ask how anyone comes back through the glass`, effects: [f('i_rule')] },
      { label: `Ask her to keep watch over the Hall of Glass`, effects: [f('wren_watch'), { relation: 'wren', add: 2 }], ripple: `Sister Wren will be watching.` },
    ],
  },
  next: [{ to: 'm_k_library' }],
};

S.m_i_office = {
  title: "Madam Pell's office", mood: 'cozy', visual: { preset: 'office-study', particles: ['dust', 'candles'] },
  cast: [I],
  text: [
    { if: has('k_waved'), text: `In the dark window of the office, {ingerid} glimpses a silver boy on a silver balcony, waving. She waves back.` },
    `Madam Pell's office smells of tea and glue. There are books on every surface, including the chair, and a cat asleep in the in-tray who opens one eye and closes it again.`,
    `On the desk: a filing cabinet drawer marked INCIDENTS 1900-1950, a pair of odd spectacles with silver lenses, and a pad of paper for leaving notes.`,
  ],
  choices: {
    [I]: [
      { label: `Read the incident report from 1923`, effects: [f('i_records'), f('i_suspects'), { player: I, stat: 'wit', add: 1 }] },
      { label: `Borrow the silver spectacles`, effects: [{ player: I, item: 'spectacles', give: true }, f('i_watch')] },
      { label: `Leave Madam Pell a note telling her everything`, effects: [f('pell_knows'), f('i_help'), { relation: 'pell', add: 1 }] },
    ],
  },
  next: [{ to: 'm_k_library' }],
};

S.m_k_library = {
  title: 'The backwards library', mood: 'magic', visual: { preset: 'mirror-world', particles: ['dust'] },
  cast: ['kristian@mirror', 'Echo'], speaker: 'Echo',
  text: [
    `The silver library is silent in the way only libraries and graves are. Behind the desk sits a librarian made of moonlight: Madam Pell's shape, Madam Pell's spectacles, and no face at all. The plaque on the desk says ECHO.`,
    `On the desk lies a book bound in mirror. Its title runs backwards: The Charm of the Two Sides. Half its pages are blank. The other half are written in a hand so reversed that it hurts to look at.`,
    `“Two halves,” says the Echo, in a voice like a spoon against a glass. “Two hands. The last word.”`,
  ],
  choices: {
    [K]: [
      { label: `Read the backwards pages in your shard of mirror`, requires: { player: K, item: 'shard' }, lockedHint: `You have nothing to read mirror-writing with.`, effects: [f('k_half')] },
      { label: `Puzzle out the mirror-writing by yourself`, check: { stat: 'wit', difficulty: 6, success: [f('k_half')], fail: [f('k_puzzled')] } },
      { label: `Ask the Echo politely what it means`, effects: [f('k_hint'), { relation: 'echo', add: 2 }] },
      { label: `Grab the book and run`, effects: [f('k_half'), f('echo_angry'), { relation: 'echo', add: -2 }], ripple: `The Echo will not forget this.` },
    ],
  },
  next: [{ to: 'm_i_library' }],
};

S.m_i_library = {
  title: 'The real library', mood: 'tense', visual: { preset: 'library-basement', particles: ['dust', 'candles'] },
  cast: [I, 'Madam Pell'], speaker: 'Madam Pell',
  text: [
    `The castle library at half past eleven on the night of the ball is dark and smells of candle smoke. {ingerid} has never been here alone after hours.`,
    { if: has('pell_knows'), text: `Madam Pell is here before her, already pulling a ladder along the shelves. “1923,” she says, without turning round. “A boy went into that hall and did not come out, and the headmaster of the day bricked it up and told everyone it was a draught. I have always hated that story.”` },
    { if: not(has('pell_knows')), text: `Madam Pell's chair at the front desk is empty; she is still at the ball. The restricted section is behind a little iron gate with a lock that looks bored.` },
    { if: has('k_half'), text: `Somewhere on the other side of the glass, {ingerid} feels rather than knows that {kristian} has found something.` },
  ],
  choices: {
    [I]: [
      { label: `Ask Madam Pell for the book about the Hall of Glass`, requires: has('pell_knows'), lockedHint: `Madam Pell does not know what is happening.`, effects: [f('i_half'), f('pell_helped'), { relation: 'pell', add: 1 }] },
      { label: `Sneak into the restricted section`, check: { stat: 'cunning', difficulty: 6, success: [f('i_half')], fail: [f('i_caught')] } },
      { label: `Search the ordinary shelves for anything about mirrors`, check: { stat: 'wit', difficulty: 6, success: [f('i_half')], fail: [f('i_searched')] } },
      { label: `Look up the name Gloam in the old yearbooks`, effects: [f('i_records'), { player: I, stat: 'kindness', add: 1 }] },
    ],
  },
  next: [
    { if: has('echo_angry'), to: 'm_k_echo_chase' },
    { to: 'm_k_stair' },
  ],
};

const libraryResults = [
    { if: has('i_half'), text: `In the real library, {ingerid} finds a thin book with a mirror for a cover, the twin of one she has never seen. Half its pages are blank. The other half hold the first half of a charm.` },
    { if: has('i_caught'), text: `In the real library, the iron gate squeals, and a prefect on patrol sends {ingerid} back to the corridor with a warning and nothing in her hands.` },
    { if: has('i_searched'), text: `In the real library, {ingerid} pulls down every book with “mirror” in the title and finds hand mirrors, shaving charms and a very long poem, but nothing about a hall of glass.` },
    { if: has('i_records'), text: `In the real library, {ingerid} finds him in the 1923 yearbook: Leander Gloam, fifth year, “most likely to be overlooked”. Someone has written in pencil beside his photograph: he only wanted somebody to notice him. Underneath, a staff note: last seen in the Hall of Glass, in the company of the Keeper of the Hall, Sir Aldous Vane.` },
];

S.m_k_echo_chase = {
  title: 'The Echo follows', mood: 'dark', visual: { preset: 'mirror-world', particles: ['fog', 'sparks'] },
  cast: [I, 'kristian@mirror', 'Echo'], speaker: 'Echo',
  text: [
    ...libraryResults,
    `In the silver castle, {kristian} runs with the mirror-bound book under his arm, and behind him comes the Echo: no feet, no face, only the sound of a library's worth of shushing, getting louder.`,
    `“Return,” it says, from everywhere at once. “Return what is borrowed.”`,
  ],
  choices: {
    [K]: [
      { label: `Hide among the backwards shelves`, check: { stat: 'cunning', difficulty: 6, success: [f('k_hidden')], fail: [f('k_cornered'), { player: K, stat: 'courage', add: -1 }] } },
      { label: `Apologise, and give the book back after learning your half by heart`, check: { stat: 'kindness', difficulty: 5, success: [f('echo_calmed'), { relation: 'echo', add: 3 }], fail: [{ flag: 'k_half', set: false }, f('echo_took_book')] } },
      { label: `Run up the backwards stairs`, check: { stat: 'courage', difficulty: 5, success: [f('k_escaped')], fail: [f('k_cornered')] } },
    ],
  },
  next: [
    { if: has('i_caught'), to: 'm_i_prefect' },
    { to: 'm_i_stairs' },
  ],
};

S.m_k_stair = {
  title: 'Catching his breath', mood: 'cozy', visual: { preset: 'mirror-world', particles: ['dust', 'fireflies'] },
  cast: [I, 'kristian@mirror'],
  text: [
    ...libraryResults,
    `In the silver castle, {kristian} sits down on a staircase that goes downward to go up, and lets himself breathe for a minute. The quiet here is enormous. He can hear his own heart, and, very far away, the waltz from the ball, playing backwards.`,
  ],
  choices: {
    [K]: [
      { label: `Write to {ingerid} on the nearest pane of glass`, effects: [f('k_wrote2'), { player: K, stat: 'kindness', add: 1 }, { relation: 'bond', add: 1 }] },
      { label: `Go looking for the boy in old robes`, effects: [f('met_gloam_early'), { relation: 'gloam', add: 1 }] },
      { label: `Practise your half of the charm under your breath`, requires: has('k_half'), lockedHint: `You have no charm to practise.`, effects: [f('k_practised'), { player: K, stat: 'wit', add: 1 }] },
      { label: `Close your eyes and gather your courage`, effects: [{ player: K, stat: 'courage', add: 1 }] },
    ],
  },
  next: [
    { if: has('i_caught'), to: 'm_i_prefect' },
    { to: 'm_i_stairs' },
  ],
};

S.m_i_prefect = {
  title: 'The prefect', mood: 'tense', visual: { preset: 'corridor-torch', particles: ['dust'] },
  cast: [I], speaker: 'Prefect',
  text: [
    { if: any(has('k_hidden'), has('k_escaped')), text: `In a dark window, {ingerid} sees {kristian} slip away from something made of moonlight. Good.` },
    { if: has('k_cornered'), text: `In a dark window, {ingerid} sees {kristian} backed against a silver shelf by something made of moonlight. Her heart jumps.` },
    { if: has('k_wrote2'), text: `On the dark window, backwards: STILL OK. YOU?` },
    `The prefect who caught her has a badge so polished it could be used for signalling ships, and the expression of a boy who has read the school rules for pleasure. He would get on, {ingerid} thinks, with a certain Percy she has read about.`,
    `“Out of bed, out of the ball, out of bounds,” he says. “That's three things. I'm going to have to write all three down.”`,
  ],
  choices: {
    [I]: [
      { label: `Talk your way out of it`, check: { stat: 'cunning', difficulty: 5, success: [f('i_free')], fail: [f('i_detained')] } },
      { label: `Tell him the truth, all of it`, check: { stat: 'kindness', difficulty: 5, success: [f('pell_knows'), f('i_help'), f('prefect_helped'), { relation: 'pell', add: 1 }], fail: [f('i_detained')] } },
      { label: `Run for it`, check: { stat: 'courage', difficulty: 5, success: [f('i_free')], fail: [f('i_detained')] } },
    ],
  },
  next: [{ to: 'm_talk1' }],
};

S.m_i_stairs = {
  title: 'The moving staircases', mood: 'tense', visual: { preset: 'tower-stairs', particles: ['dust'] },
  cast: [I],
  text: [
    { if: any(has('k_hidden'), has('k_escaped')), text: `In a dark window, {ingerid} sees {kristian} slip away from something made of moonlight. Good.` },
    { if: has('k_cornered'), text: `In a dark window, {ingerid} sees {kristian} backed against a silver shelf by something made of moonlight. Her heart jumps.` },
    { if: has('k_wrote2'), text: `On the dark window, backwards: STILL OK. YOU?` },
    `On her way back to the Hall of Glass, the great staircases start to move, the way they do when they are bored. One swings away into the dark. One offers itself, creaking, like a dog wanting a walk.`,
  ],
  choices: {
    [I]: [
      { label: `Take the shortcut the staircase offers`, check: { stat: 'wit', difficulty: 5, success: [f('i_early')], fail: [f('i_detour')] } },
      { label: `Practise your half of the charm while you wait`, requires: has('i_half'), lockedHint: `You have no charm to practise.`, effects: [f('i_practised'), { player: I, stat: 'wit', add: 1 }] },
      { label: `Write back on the dark window`, effects: [f('i_wrote2'), { player: I, stat: 'kindness', add: 1 }, { relation: 'bond', add: 1 }] },
    ],
  },
  next: [{ to: 'm_talk1' }],
};

// ---------------------------------------------------------------- a conversation across the glass
S.m_talk1 = {
  title: 'Leander Gloam', mood: 'magic', visual: { preset: 'mirror-world', particles: ['fog', 'fireflies'] },
  cast: ['kristian@mirror', 'Gloam'], speaker: 'Gloam',
  text: [
    `In the silver castle, the boy in old robes is waiting for {kristian} on the backwards staircase. He is pale and thin and perfectly polite, and his edges shimmer like heat over a road.`,
    { if: has('met_gloam_early'), text: `“We meet again,” he says. “You followed me. Nobody ever follows me.”` },
    { if: has('k_polite'), text: `“You said good evening,” he says. “In a hundred years, you are the first.”` },
    { if: has('k_knows_gloam'), text: `{kristian} remembers how the silver portraits went quiet when he asked about this boy, and how quickly Sir Aldous changed the subject.` },
    `“Not so loud,” the boy whispers, glancing up the staircase. “He listens through every frame.”`,
    `On the landing above them hangs an empty silver frame. As {kristian} looks up, it is not empty any more. The reflection of Sir Aldous Vane settles into it, beaming, kindly, like a favourite grandfather.`,
    `“The living boy!” says Sir Aldous. “Splendid. I am the Keeper of this Hall, lad, and I can have you home by midnight. One small formality. Tell me your name, your whole name, and I will write it in the register of the living, and the door will open for you.”`,
    `Behind the frame, where only {kristian} can see, the pale boy shakes his head, very slightly, again and again.`,
  ],
  choices: {
    [K]: [
      { label: `Ignore the portrait and ask the boy why he has been alone for so long`, effects: [f('k_listened'), { relation: 'gloam', add: 2 }, { relation: 'aldous', add: -1 }] },
      { label: `Refuse the Keeper, kindly but firmly`, effects: [f('k_refused'), { relation: 'aldous', add: -1 }] },
      { label: `Tell the Keeper your name`, effects: [f('name_offered'), { relation: 'aldous', add: 2 }] },
    ],
  },
  next: [{ to: 'm_talk2' }],
};

S.m_talk2 = {
  title: 'A message in the mist', mood: 'tense', visual: { preset: 'mirror-hall', particles: ['fog'] },
  cast: [I, 'kristian@mirror', 'Gloam'],
  text: [
    `{ingerid} is back in the Hall of Glass. In the biggest mirror she can see them: {kristian} and a pale boy on a staircase that goes the wrong way, and above them, in a silver frame, the beaming face of Sir Aldous Vane.`,
    { if: has('k_listened'), text: `{kristian} is listening. The boy is talking with his hands, quickly, like someone who has saved up a hundred years of things to say.` },
    { if: has('k_refused'), text: `{kristian} shakes his head. The boy's smile does not change, but his edges flicker.` },
    { if: has('name_offered'), text: `{kristian} turns to the portrait and opens his mouth to say something, and Sir Aldous leans so far out of his frame to hear it that his painted fingers curl over the edge.` },
    `There is still a little mist on the glass. Enough for a few words.`,
  ],
  choices: {
    [I]: [
      { label: `Write: DON'T TELL IT YOUR NAME`, requires: any(has('i_watch'), has('i_wrote'), has('portrait_awake'), has('knows_name')), lockedHint: `You don't know enough about the reflection to warn him.`, effects: [f('i_warned'), { relation: 'bond', add: 1 }] },
      { label: `Write: ASK HIM ABOUT 1923`, requires: has('i_records'), lockedHint: `You don't know anything about 1923.`, effects: [f('i_hint_story'), { relation: 'gloam', add: 1 }] },
      { label: `Write: DON'T TRUST THE PORTRAIT`, requires: any(has('i_suspects'), has('i_records')), lockedHint: `You have no reason to doubt the portrait.`, effects: [f('aldous_exposed'), { relation: 'bond', add: 1 }, { relation: 'aldous', add: -2 }] },
      { label: `Try to crack the mirror with a spell`, check: { stat: 'courage', difficulty: 6, success: [f('cracked'), { player: K, item: 'shard', give: true }, { relation: 'gloam', add: -2 }, { relation: 'bond', add: -1 }], fail: [f('spell_failed'), { relation: 'bond', add: -1 }] } },
      { label: `Write nothing, and trust {kristian}`, effects: [f('i_trusted'), { player: I, stat: 'kindness', add: 1 }, { relation: 'bond', add: 2 }] },
    ],
  },
  next: [{ to: 'm_talk3' }],
};

S.m_talk3 = {
  title: 'The Keeper of the Hall', mood: 'magic', visual: { preset: 'mirror-world', particles: ['fireflies', 'fog'] },
  cast: ['kristian@mirror', 'Gloam'], speaker: 'Gloam',
  onEnter: [],
  text: [
    { if: has('i_warned'), text: `Over the boy's shoulder, {kristian} sees letters bloom in the mist on the glass: DON'T TELL IT YOUR NAME.` },
    { if: has('aldous_exposed'), text: `Over the portrait's shoulder, letters bloom in the mist: DON'T TRUST THE PORTRAIT.` },
    { if: all(any(has('i_warned'), has('aldous_exposed')), has('name_offered')), text: `{kristian} shuts his mouth on the first syllable. Sir Aldous's smile freezes. For one moment the painted face is not kind at all.` },
    { if: all(has('name_offered'), not(has('i_warned')), not(has('aldous_exposed'))), text: `{kristian} says his name, all of it. Sir Aldous closes his painted eyes as if he is tasting it. “Thank you, {kristian},” he says, and then he does something portraits cannot do: he steps out of his frame, tall and grey and smiling, and his smile is {kristian}'s smile.` },
    { if: not(all(has('name_offered'), not(has('i_warned')), not(has('aldous_exposed')))), text: `“A pity,” says Sir Aldous softly, and the frame is empty again. Somewhere in the silver castle, a door closes.` },
    `The boy lets out a breath he seems to have been holding for a hundred years. “Now you know,” he says. “He is the Keeper of the Hall. In 1923 he took my name, the same way, so that he could go on living in his frame. A name buys a portrait a hundred years. Two names would buy him a body. He has been waiting at that door for someone like you.”`,
    { if: { relation: 'aldous', gte: 2 }, text: `{kristian} thinks of how friendly the portrait was, how helpful. He was counting on that.` },
    { if: has('i_hint_story'), text: `ASK HIM ABOUT 1923, says the mist. {kristian} does. And the boy tells him: a ball, a girl he never dared ask to dance, a wish made to a mirror to be seen, just once. The mirror saw him. It has not stopped seeing him since.` },
    { if: has('cracked'), text: `A spell from the other side hits the mirror like a thrown stone. A crack runs across the glass, and a long shard of it drops at {kristian}'s feet. The boy's face goes cold. “That,” he says, “was not kind.”` },
    { if: has('i_trusted'), text: `On the other side of the glass, {ingerid} simply stands and waits, and {kristian} can feel it: she trusts him to get this right.` },
    { if: all(has('name_offered'), not(has('i_warned')), { relation: 'bond', gte: 5 }), text: `And yet, with his name gone, {kristian} finds he can still remember exactly how {ingerid} laughs at his jokes. Some things the glass cannot take. Not if you hold on to them.` },
    `“Midnight is coming,” says Leander Gloam. “At midnight the hall opens, only for a moment, and only if both sides turn their clocks together. If you are not through by the last stroke, it will not open again for a hundred years. And he will be waiting at the door.”`,
  ],
  choices: {
    [K]: [
      { label: `Promise to take him with you if you can`, effects: [f('pact_fair'), { relation: 'gloam', add: 2 }], ripple: `Gloam will remember your promise.` },
      { label: `Ask for your name back`, requires: all(has('name_offered'), not(has('i_warned'))), check: { stat: 'kindness', difficulty: 6, success: [f('name_returned')], fail: [] } },
      { label: `Think of {ingerid}, and take your name back`, requires: all(has('name_offered'), not(has('i_warned')), { relation: 'bond', gte: 5 }), effects: [f('name_returned'), { relation: 'bond', add: 1 }] },
      { label: `Promise nothing, and go to find the clock`, effects: [f('k_alone')] },
    ],
  },
  next: [{ to: 'm_talk4' }],
};

S.m_talk4 = {
  title: 'Her turn to speak', mood: 'magic', visual: { preset: 'mirror-hall', particles: ['fog', 'fireflies'] },
  cast: [I, 'kristian@mirror', 'Gloam'], speaker: 'Gloam',
  text: [
    { if: has('pact_fair'), text: `{ingerid} watches {kristian} say something to the pale boy, and the boy's whole face changes, as though nobody has promised him anything in a very long time.` },
    { if: has('k_alone'), text: `{ingerid} watches {kristian} turn away from the pale boy without a word. The boy watches him go.` },
    { if: has('name_returned'), text: `{ingerid} sees the pale boy hand something back to {kristian}, something she cannot see, and {kristian} looks suddenly more like himself.` },
    `Then Leander Gloam turns to the glass and looks straight at {ingerid}, as if he has known she was there all along.`,
    `“And you,” he says. She can hear him. His voice comes through the mirror like a voice through ice. “The one on the warm side. What do you say?”`,
  ],
  choices: {
    [I]: [
      { label: `“We'll take you with us, if we can.”`, effects: [f('pact_fair_i'), { relation: 'gloam', add: 2 }] },
      { label: `“Who are you, really?”`, requires: any(has('i_records'), has('i_knows_gloam')), lockedHint: `You don't know enough about him to ask the right way.`, effects: [f('i_understood'), { relation: 'gloam', add: 1 }] },
      { label: `“Give him back, and then we'll talk.”`, effects: [f('i_stern'), { player: I, stat: 'courage', add: 1 }, { relation: 'bond', add: 1 }, { relation: 'gloam', add: -1 }] },
    ],
  },
  next: [{ to: 'm_k_prepare' }],
};

S.m_k_prepare = {
  title: 'Before midnight', mood: 'tense', visual: { preset: 'mirror-world', particles: ['fog', 'sparks'] },
  cast: ['kristian@mirror', 'Gloam'],
  text: [
    { if: has('pact_fair_i'), text: `“She said they'd take me with them,” says Gloam, very quietly, almost to himself.` },
    { if: has('i_understood'), text: `“She asked who I really am,” says Gloam. He sounds amazed. “Nobody has asked me that since 1923.” And he tells them both, through the glass: a ball, a girl he never dared ask to dance, a wish made to a mirror to be seen, just once.` },
    { if: has('i_stern'), text: `Gloam looks at {ingerid} through the glass for a long moment and bows, very slightly, as one does to a worthy opponent.` },
    `Five minutes to midnight. The backwards clock of the silver ballroom is somewhere above them. {kristian} has time to do one more thing before he climbs to it.`,
  ],
  choices: {
    [K]: [
      { label: `Ask Gloam to come with you to the clock`, effects: [f('gloam_with'), { relation: 'gloam', add: 1 }] },
      { label: `Write one last message on the glass: TWELVE`, effects: [f('k_wrote_twelve')], ripple: `{ingerid} will see it before midnight.` },
      { label: `Go alone, and quickly`, effects: [{ player: K, stat: 'courage', add: 1 }, f('k_quick')] },
    ],
  },
  next: [{ to: 'm_i_prepare' }],
};

S.m_i_prepare = {
  title: 'Five to midnight', mood: 'tense', visual: { preset: 'ballroom-night', particles: ['candles', 'dust'] },
  cast: [I],
  text: [
    { if: has('k_wrote_twelve'), text: `On the mirror by the ballroom door, in backwards letters: TWELVE.` },
    { if: has('gloam_with'), text: `In the glass, {kristian} and the pale boy climb a silver stair together.` },
    { if: has('i_early'), text: `The shortcut was a good one. {ingerid} is back at the ballroom with minutes to spare.` },
    { if: has('i_detour'), text: `The staircase dumped her two floors too low. {ingerid} arrives at the ballroom breathless, with almost no time left.` },
    { if: has('i_detained'), text: `It took ages to get away from the prefect. {ingerid} arrives at the ballroom breathless, with almost no time left.` },
    `The great clock above the ballroom doors says five to midnight. Nobody else has noticed anything at all.`,
  ],
  choices: {
    [I]: [
      { label: `Fetch Madam Pell to the clock`, requires: has('pell_knows'), lockedHint: `Madam Pell doesn't know what is happening.`, effects: [f('pell_at_clock')] },
      { label: `Write one last message on the glass: TWELVE`, effects: [f('i_wrote_twelve')], ripple: `{kristian} will see it before midnight.` },
      { label: `Tell Madam Pell who Leander Gloam really was`, requires: all(has('pell_knows'), any(has('i_records'), has('i_knows_gloam'), has('i_understood'))), lockedHint: `You don't know his story, or Madam Pell isn't with you.`, effects: [f('pell_for_gloam'), { relation: 'pell_gloam', add: 3 }, { relation: 'pell', add: 1 }] },
      { label: `Go up to the clock alone, quietly`, effects: [{ player: I, stat: 'cunning', add: 1 }] },
    ],
  },
  next: [{ to: 'm_clock_k' }],
};

// ---------------------------------------------------------------- act three: midnight
S.m_clock_k = {
  title: 'The backwards clock', mood: 'tense', visual: { preset: 'mirror-world', particles: ['sparks', 'fog'] },
  cast: ['kristian@mirror'],
  text: [
    { if: has('pell_at_clock'), text: `In the glass of the clock face, {kristian} can see the real ballroom clock from behind, and two people climbing to it: {ingerid}, and Madam Pell.` },
    { if: has('i_wrote_twelve'), text: `On the inside of the clock face, backwards, in {ingerid}'s handwriting: TWELVE.` },
    `In the silver ballroom the clock runs backwards, and its strokes arrive before they are struck. {kristian} climbs to it and puts both hands on the minute hand.`,
    { if: has('k_hint'), text: `Two halves. Two hands. The last word. The riddle goes round and round in his head.` },
    { if: has('k_saw_clock'), text: `He has studied this clock from the balcony. He knows which way its hands really go.` },
    { if: all({ relation: 'aldous', gte: 1 }, not(has('i_wrote_twelve'))), text: `And then, from the glass of the clock face, a voice that sounds exactly like {ingerid}'s: “Now, {kristian}! The sixth stroke! Turn it now!”` },
    { if: all({ relation: 'aldous', gte: 1 }, not(has('i_wrote_twelve')), { relation: 'bond', gte: 6 }), text: `He almost does. Then he stops. {ingerid} would never rush. That is not her. That is him.` },
    { if: { relation: 'echo', gte: 2 }, text: `The Echo drifts up beside him, a librarian made of moonlight, no longer angry. “The last word,” it says, quite kindly. “Always the last word.”` },
    { if: { relation: 'bond', gte: 6 }, text: `He knows {ingerid}. She always makes sure, and then makes sure again. She will wait for the very last stroke.` },
    { if: has('code'), text: `He remembers the word in the mist, underlined twice.` },
    { if: has('gloam_with'), text: `Gloam stands at his shoulder. “Whenever you are ready,” he says. “I will hold the door for as long as I can.”` },
    { if: all(has('echo_angry'), not(has('echo_calmed'))), text: `Behind him, in the dark of the silver hall, something made of moonlight is following him, and it does not sound pleased.` },
    `The first stroke of midnight rolls through both castles. {kristian} has to choose his moment now. {ingerid} will choose hers on the other side, without knowing his.`,
  ],
  choices: {
    [K]: [
      { label: `Turn it on the first stroke`, effects: [f('k_stroke_1')] },
      { label: `Turn it on the sixth stroke`, effects: [f('k_stroke_6')] },
      { label: `Turn it on the twelfth stroke`, effects: [f('k_stroke_12')] },
    ],
  },
  next: [{ to: 'm_clock_i' }],
};

S.m_clock_i = {
  title: 'The ballroom clock', mood: 'tense', visual: { preset: 'ballroom-night', particles: ['candles', 'sparks'] },
  cast: [I], speaker: 'Madam Pell',
  text: [
    `The ball is still going. The great clock above the doors is striking midnight, and its hands are as long as broomsticks. {ingerid} has both hands on the minute hand.`,
    { if: any(has('pell_at_clock'), has('pell_helped'), { relation: 'pell', gte: 3 }), text: `“The old clocks only listen on the last stroke,” says Madam Pell, puffing, at her elbow. “Everything else is just noise.”` },
    { if: has('pell_for_gloam'), text: `“And bring that boy home,” she adds, fiercely. “A hundred years is long enough.” {ingerid} has never heard her voice shake before.` },
    { if: all({ relation: 'aldous', gte: 1 }, not(has('whisper_link'))), text: `And from the frame by the ballroom doors, a voice that sounds exactly like {kristian}'s: “The first stroke, {ingerid}! Now, before it's too late!”` },
    { if: all({ relation: 'aldous', gte: 1 }, not(has('whisper_link')), { relation: 'bond', gte: 6 }), text: `She doesn't move. {kristian} has never been early for anything in his life. That is not him.` },
    { if: { relation: 'bond', gte: 6 }, text: `She knows {kristian}. He always waits until the very last moment for everything: homework, apologies, the end of a song. He will wait for this.` },
    { if: has('portrait_awake'), text: `She remembers what Sir Aldous muttered from his frame: on the last stroke, and only if both sides turn together.` },
    { if: has('i_clock_knowledge'), text: `She has seen this clock's works from the inside. The latch that lets the hall open only drops on the final stroke.` },
    { if: has('k_wrote_twelve'), text: `On the mirror by the doors, backwards, in {kristian}'s handwriting: TWELVE.` },
    { if: has('whisper_link'), text: `And very faintly, through the glass of the clock face, she hears a voice that can only be {kristian}'s, whispering a single word: “twelve”.` },
    { if: has('code'), text: `She remembers the word they both wrote in the mist, underlined twice.` },
    `She cannot know when {kristian} turned his clock. She can only choose her own moment and hope it is the same.`,
  ],
  choices: {
    [I]: [
      { label: `Turn it on the first stroke`, effects: [f('i_stroke_1')] },
      { label: `Turn it on the sixth stroke`, effects: [f('i_stroke_6')] },
      { label: `Turn it on the twelfth stroke`, effects: [f('i_stroke_12')] },
    ],
  },
  next: [
    { if: any(all(has('i_stroke_1'), has('k_stroke_1')), all(has('i_stroke_6'), has('k_stroke_6')), all(has('i_stroke_12'), has('k_stroke_12'))), to: 'm_door' },
    { to: 'm_door_miss' },
  ],
};

S.m_door = {
  title: 'The door', mood: 'magic', visual: { preset: 'mirror-hall', particles: ['sparks', 'fireflies'] },
  cast: [I, 'kristian@mirror', 'Gloam'],
  onEnter: [f('synced')],
  text: [
    `Two clocks turn in two castles at the same instant. Somewhere between them, something clicks, like a key that has waited a hundred years for the right hand.`,
    { if: all(has('i_stroke_12'), has('k_stroke_12')), text: `The twelfth stroke rings out in both worlds at once, and for the first time it sounds like one bell instead of two.` },
    `In the Hall of Glass the biggest mirror opens like a door. {ingerid} stands on one side of it and {kristian} on the other, close enough to touch. Between them, on the threshold, stands Leander Gloam.`,
  ],
  next: [{ to: 'm_offer_k' }],
};

S.m_door_miss = {
  title: 'Out of step', mood: 'dark', visual: { preset: 'mirror-hall', particles: ['fog', 'sparks'] },
  cast: [I, 'kristian@mirror', 'Gloam'],
  onEnter: [f('missed')],
  text: [
    `Two clocks turn, a heartbeat apart. The hall shudders. The biggest mirror opens a crack, a hand's width, and starts to close again, slowly, like a heavy door on a cold night.`,
    `{ingerid} and {kristian} can see each other through the gap. Between them, holding the door open with both hands and visibly straining, is Leander Gloam.`,
    { if: has('i_gear'), text: `Up in the clock tower, the gear {ingerid} freed earlier keeps turning a moment longer than it should, and the door stops closing.` },
    { if: { relation: 'echo', gte: 2 }, text: `On the silver side, the Echo puts its moonlight hands against the glass and pushes, holding the door from behind.` },
    { if: { relation: 'gloam', lte: -1 }, text: `Gloam is holding the door, but he is looking at {kristian}, and his face is very still. He has not forgotten how they treated him.` },
    `“Quickly,” he gasps. “I cannot hold this for long.”`,
  ],
  next: [{ to: 'm_offer_k' }],
};

S.m_offer_k = {
  title: 'Only two can pass', mood: 'dark', visual: { preset: 'mirror-hall', particles: ['fog', 'fireflies'] },
  cast: [I, 'kristian@mirror', 'Sir Aldous'], speaker: 'Sir Aldous',
  text: [
    `Sir Aldous Vane is standing in the doorway, outside his frame at last, tall and grey and smiling.`,
    { if: all(has('name_offered'), not(has('i_warned')), not(has('aldous_exposed')), not(has('name_returned'))), text: `He is wearing {kristian}'s face, very nearly. It is getting harder to tell which of them is the reflection.` },
    `“Here is the rule of the glass,” says the Keeper pleasantly. “Two may pass. Three is one too many. Someone stays. I do so hope it is not you, my dear.”`,
    `“That is his rule,” says Leander Gloam quietly. “Not the glass's. He made it in 1923. A rule like that can be broken, if you know the words.”`,
    { if: all(has('i_half'), has('k_half')), text: `{ingerid} has half a charm in a mirror-bound book. {kristian} has the other half in his head. The Charm of the Two Sides: two halves, two hands, the last word.` },
    { if: has('pact_fair'), text: `“You promised,” says Gloam to {kristian}, quietly. It is not an accusation. It sounds like hope.` },
    `{kristian} speaks first.`,
  ],
  choices: {
    [K]: [
      { label: `Speak your half of the charm`, requires: has('k_half'), lockedHint: `You never learned your half of the charm.`, effects: [f('k_charm')] },
      { label: `Step through, and leave Gloam behind`, effects: [f('k_leave')] },
      { label: `Stay, so that {ingerid} does not have to choose`, effects: [f('k_stay'), { relation: 'bond', add: 2 }], ripple: `{ingerid} will have to decide what this means.` },
    ],
  },
  next: [{ to: 'm_offer_i' }],
};

S.m_offer_i = {
  title: 'The last word', mood: 'dark', visual: { preset: 'mirror-hall', particles: ['fog', 'sparks'] },
  cast: [I, 'kristian@mirror', 'Gloam'],
  text: [
    { if: has('k_charm'), text: `{kristian} speaks his half of the charm into the glass. The words come out backwards and right at the same time, and the mirror begins to hum.` },
    { if: has('k_leave'), text: `{kristian} steps toward the door. Gloam does not stop him. He only watches, like someone who has watched a hundred people leave.` },
    { if: has('k_stay'), text: `{kristian} steps back from the door. “Go,” he says to {ingerid}, through the gap. “One of us gets home tonight. Make it you.”` },
    `Now it is {ingerid}'s turn. The last word is hers.`,
  ],
  choices: {
    [I]: [
      { label: `Speak your half of the charm`, requires: has('i_half'), lockedHint: `You never found your half of the charm.`, effects: [f('i_charm')] },
      { label: `Seal the mirror the moment {kristian} is through`, effects: [f('i_seal')] },
      { label: `Offer to stay in {kristian}'s place`, requires: not(has('k_charm')), effects: [f('i_stay'), { relation: 'bond', add: 2 }] },
    ],
  },
  next: [
    // both offering to stay: only if they were in step, and only if they trust each other enough to let it happen
    { if: all(has('i_stay'), has('k_stay'), has('synced'), { relation: 'bond', gte: 6 }), to: 'ending_two_sides' },
    // the Keeper has Kristian's name, or a wronged Gloam lets go of the door when the clocks miss
    { if: any(all(has('name_offered'), not(has('i_warned')), not(has('aldous_exposed')), not(has('name_returned')), not(all(has('i_charm'), has('k_charm')))), all(has('missed'), { relation: 'gloam', lte: -2 }, not(all(has('i_charm'), has('k_charm'))))), to: 'ending_swapped' },
    // out of step, no charm, nobody willing to stay, and nobody holding the door: it closes on them
    { if: all(has('missed'), not(any(has('i_charm'), has('k_charm'))), not(has('i_stay')), not(has('k_stay')), not(has('gloam_with')), not(has('i_gear')), { relation: 'echo', lte: 1 }, { relation: 'gloam', lte: 2 }), to: 'ending_midnight' },
    // the whole charm, Gloam willing, and either in step at midnight or truly understanding him
    { if: all(has('i_charm'), has('k_charm'), { relation: 'gloam', gte: 1 }, any(has('synced'), UNDERSTOOD)), to: 'ending_all_free' },
    { if: all(has('i_charm'), has('k_charm')), to: 'ending_two_halves' },
    { if: has('i_stay'), to: 'ending_ingerid_stays' },
    { if: has('k_stay'), to: 'ending_kristian_stays' },
    { to: 'ending_sealed' },
  ],
};

// ---------------------------------------------------------------- endings
const epilogue = [
  { if: { relation: 'bond', gte: 7 }, text: `{ingerid} and {kristian} never quite explain to anyone what happened that night. They don't need to. From then on, whenever one of them says “twelve”, the other one smiles.` },
  { if: { relation: 'bond', lte: 2 }, text: `Afterwards, {ingerid} and {kristian} find it oddly hard to talk about that night. Something happened on the glass between them that neither of them has quite forgiven.` },
  { if: { relation: 'pell_gloam', gte: 3 }, text: `Madam Pell has the 1923 records reopened, and puts Leander Gloam's name back in the school register, in ink, where it belongs.` },
  { if: { relation: 'wren', gte: 2 }, text: `Sister Wren takes to humming the waltz from the ball on winter nights. Nobody knows where she learned it.` },
  { if: has('pell_helped'), text: `Madam Pell writes the whole thing down that same night, in the library ledger, in ink, so that this time nobody can call it a draught.` },
  { if: { player: K, item: 'scarf' }, text: `{ingerid}'s scarf comes back with a faint silver sheen that never washes out. She decides she likes it.` },
  { if: has('echo_angry'), text: `For the rest of the year, every library book {kristian} borrows comes back with one page written backwards.` },
  { if: all(has('portrait_awake'), not(all(has('i_charm'), has('k_charm')))), text: `Sir Aldous Vane tells his version of the story to every portrait in the castle. In his version, he is the hero.` },
  { if: has('wren_watch'), text: `Sister Wren keeps watch over the Hall of Glass for the rest of the winter, humming, and nobody else goes missing from a ball again.` },
  { if: has('prefect_helped'), text: `The prefect never does write anything down. He does, however, start saying good evening to every mirror he passes.` },
  { if: has('i_gear'), text: `The great clock runs two seconds fast for the rest of the year. Nobody but {ingerid} knows why.` },
];

// Endings where one of them is lost for good leave out the lines about the two of them together.
const epilogueApart = epilogue.filter((e) => !(e.if && e.if.relation === 'bond'));

S.ending_all_free = {
  title: 'Three come home', mood: 'cozy', visual: { preset: 'ballroom-night', particles: ['candles', 'fireflies'] },
  cast: [I, K, 'Gloam'],
  ending: { id: 'all_free', title: 'Three come home', kind: 'good' },
  text: [
    `{ingerid} speaks the last word. Two halves of the charm meet in the middle of the glass, and the rule of two breaks like a held breath let go.`,
    `Sir Aldous Vane screams. The bargain he made in 1923 comes undone, and the glass takes back what it lent him: he is pulled backwards, out of the doorway and into the mirror, until he is only a reflection, very small and very far away, shouting at nobody.`,
    `{kristian} steps through. So does Leander Gloam, blinking, into ordinary candlelight, a hundred years late for the ball and dressed for it.`,
    `The quartet is still playing. Gloam stands at the edge of the dance floor and stares at the colours as if he has forgotten that the world has any.`,
    { if: has('pell_knows'), text: `And then Madam Pell comes in from the corridor, and stops. Her book falls out of her hand. “Leander?” she says. He turns, and his face does something it has not done in a hundred years. “Ottoline,” he says. “You came to the ball after all.” She was the girl he never dared ask to dance. She has been the librarian here ever since, waiting, and she never told anyone why.` },
    { if: { relation: 'echo', gte: 2 }, text: `Behind her, in the dark glass of the window, a figure made of moonlight bows to the old librarian, and quietly becomes her reflection again. Some part of her had been waiting on the other side all along.` },
    { if: has('k_listened'), text: `“You listened,” he says to {kristian}. “That was the whole trick, I think. Somebody only had to listen.”` },
    { if: has('i_hint_story'), text: `He finds {ingerid} by the drinks table. “You knew about 1923,” he says. “You looked me up.” He seems more moved by that than by anything else.` },
    { if: has('k_music'), text: `“Somebody wound my music box,” he says, to nobody in particular. “I heard it from the other end of the castle. I knew then.”` },
    { if: { player: K, item: 'photo' }, text: `{kristian} gives him back his photograph. Gloam looks at it for a long time: a girl in a 1923 ball gown, laughing at something out of frame.` },
    ...epilogue,
    `The Hall of Glass is just a hall again by morning. The mirrors show what is in front of them, and nothing else. Every now and then, though, {ingerid} and {kristian} catch each other's reflection in a window and wave, just to check.`,
  ],
};

S.ending_two_halves = {
  title: 'Two halves', mood: 'magic', visual: { preset: 'ballroom-night', particles: ['candles', 'fog'] },
  cast: [I, K],
  ending: { id: 'two_halves', title: 'Two halves of a charm', kind: 'good' },
  text: [
    `The charm works. The rule of two bends, and {kristian} steps through into the real castle, warm and loud and smelling of candle smoke.`,
    `But Leander Gloam does not follow. He stands on the threshold, and the charm passes through him like light through glass. “It needed more than words,” he says gently. “It needed someone to know me. Never mind. You two go.”`,
    `Behind him, Sir Aldous Vane steps back into his frame, straightens his painted collar, and smiles. He has waited a hundred years. He can wait another.`,
    { if: not(has('synced')), text: `The clocks were out of step. The door could only hold so long.` },
    `The mirror closes. For a moment {ingerid} sees him in it, waving, and then only their own faces.`,
    ...epilogue,
    `They go back to the ball, because there is nothing else to do. Afterwards, neither of them can stop wondering what they would have needed to know.`,
  ],
};

S.ending_sealed = {
  title: 'The sealed hall', mood: 'tense', visual: { preset: 'corridor-torch', particles: ['dust'] },
  cast: [I, K],
  ending: { id: 'sealed', title: 'The sealed hall', kind: 'neutral' },
  text: [
    `{kristian} comes through the door and falls into {ingerid}'s arms, and the mirror slams shut behind him like a book.`,
    `Leander Gloam is left on the other side. He does not shout. He only watches until the glass is ordinary again.`,
    { if: has('i_seal'), text: `{ingerid} seals it. A charm from the back of a textbook, cast with shaking hands, and a crust of frost spreads over every mirror in the hall.` },
    ...epilogue,
    `On Monday the corridor behind the tapestry is gone again, bricked up as if it had never been. They are both safe. The castle has one more story that nobody tells.`,
    `Only the portrait of Sir Aldous Vane has been moved, somehow, to the corridor outside the ballroom. When {ingerid} walks past it, he wakes, and winks.`,
  ],
};

S.ending_ingerid_stays = {
  title: '{ingerid} stays', mood: 'magic', visual: { preset: 'mirror-world', particles: ['fireflies', 'fog'] },
  cast: ['ingerid@mirror', K, 'Gloam'],
  ending: { id: 'ingerid_stays', title: 'The other side, for now', kind: 'neutral' },
  text: [
    `“Go,” says {ingerid}. She steps through to the silver side as {kristian} steps out of it, and for one second they pass each other in the doorway.`,
    `Leander Gloam goes out too, into the candlelight, a hundred years late. He looks back at her, astonished. Nobody has ever traded places with him on purpose.`,
    `The mirror closes. {kristian} stands in the Hall of Glass with {ingerid} on the other side of it, and this time it is his breath on the glass, and his finger writing: I WILL GET YOU OUT.`,
    ...epilogue,
    `He means it. Next year's Winter Ball is three hundred and sixty-four days away, and he has already started counting.`,
  ],
};

S.ending_kristian_stays = {
  title: '{kristian} stays', mood: 'magic', visual: { preset: 'mirror-world', particles: ['fireflies', 'fog'] },
  cast: ['kristian@mirror', I, 'Gloam'],
  ending: { id: 'kristian_stays', title: 'The boy in the glass', kind: 'neutral' },
  text: [
    `{kristian} stays where he is. He pushes Gloam gently toward the door instead. “You've waited longer,” he says.`,
    `Leander Gloam stumbles out into the real castle and stands beside {ingerid}, staring at his own hands as if they might vanish.`,
    `The mirror closes. {kristian} raises one hand on the other side. {ingerid} raises hers to meet it, and the glass is cold between them.`,
    ...epilogue,
    `She visits the Hall of Glass every evening after that. They write to each other in the mist. It is a strange way to be friends, but it is still a way.`,
  ],
};

S.ending_swapped = {
  title: 'The wrong reflection', mood: 'dark', visual: { preset: 'ending-dark', particles: ['fog'] },
  cast: [I, K],
  ending: { id: 'swapped', title: 'The wrong reflection', kind: 'bad' },
  text: [
    `Someone comes through the mirror wearing {kristian}'s face. He hugs {ingerid}, says the right things in the right voice, and walks her back to the ball. In the Hall of Glass, the frame of Sir Aldous Vane hangs empty.`,
    `It is only later, by the drinks table, that she notices he reaches for the cup with the wrong hand. And that when he looks into the punch bowl, there is no reflection looking back.`,
    { if: has('wren_watch'), text: `Sister Wren drifts straight through him on the stairs, stops, and turns. “You,” she says, “are not that boy.” He smiles {kristian}'s smile at her and walks on.` },
    `In every mirror in the castle, very faintly, a boy is knocking on the glass. Two boys, now.`,
    ...epilogueApart,
  ],
};

S.ending_midnight = {
  title: 'After midnight', mood: 'dark', visual: { preset: 'ending-dark', particles: ['fog', 'dust'] },
  cast: [I],
  ending: { id: 'midnight', title: 'After midnight', kind: 'bad' },
  text: [
    `The last stroke of midnight dies away, and the door in the glass closes with it, gently and completely.`,
    `{ingerid} is alone in the Hall of Glass. In the mirror, {kristian} and the pale boy stand side by side, as quiet as photographs.`,
    `In his frame, Sir Aldous Vane is smiling. He has another hundred years, and two more names to keep him company.`,
    `The ball ends. The candles go out one by one. By Monday the corridor has been bricked up again, and when {ingerid} tells the staff what happened, they say it must have been a draught.`,
    ...epilogueApart,
    `She goes back to the tapestry of the dancing trolls every night, all year, and waits for the Winter Ball.`,
  ],
};

S.ending_two_sides = {
  title: 'Both sides', mood: 'magic', visual: { preset: 'mirror-world', particles: ['fireflies', 'sparks'] },
  cast: ['ingerid@mirror', 'kristian@mirror'],
  ending: { id: 'two_sides', title: 'Two of everything', kind: 'secret' },
  text: [
    `{kristian} says he will stay. {ingerid} says she will stay. They say it at almost the same moment, and then look at each other through the gap in the glass with identical expressions of outrage.`,
    `Leander Gloam starts to laugh, and cannot stop. “Two,” he says. “Two may pass. Go on, then.” And he steps out of the glass himself, into the candlelight, while {ingerid} steps in.`,
    `The mirror closes on the two of them, together, on the silver side.`,
    `It is not so bad, the backwards castle, with company. The snow falls up. The library is very quiet. They have a whole year to find the other half of every charm in it.`,
    `Sir Aldous Vane, on the silver side, discovers that two stubborn people in his hall are far worse company than one lonely boy. They have already started looking for his frame.`,
    ...epilogue,
    `And in the real castle, a boy from 1923 asks a girl to dance, a hundred years late, and she says yes.`,
  ],
};

export default S;
