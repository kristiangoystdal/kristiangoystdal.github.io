// Part 1: prologue, three opening routes, morning, caretaker.
const S = {};
const R = 'This will not be forgotten.';

S.p01_midnight = {
  title: 'Midnight', mood: 'tense', preset: 'dormitory-night', particles: ['dust'],
  text: [
    `The clock above the {house} dormitory fireplace shows a few minutes past midnight when you wake. Something has pulled you out of sleep, and it takes a moment to understand that it is a sound: a deep, hollow note, like a bell rung at the bottom of a lake.`,
    `Nobody else stirs. In the next bed Pip Marlowe lies with his mouth slightly open, breathing slow and even, one hand curled around the wrapper of a chocolate frog he must have fallen asleep eating.`,
    { if: { flag: 'looped' }, text: `You have stood in this room before. You remember how this night ends, and you remember what it cost.` },
    `The note comes again. This time you feel it in your breastbone, as if the castle has a pulse and has just skipped a beat.`
  ],
  choices: [
    { label: `Try to wake Pip`, to: 'p02_pip' },
    { label: `Go to the window`, to: 'p03_window' }
  ]
};

S.p02_pip = {
  title: 'Pip', mood: 'tense', preset: 'dormitory-night', particles: ['dust'],
  onEnter: [{ stat: 'kindness', add: 1 }, { flag: 'tried_wake_pip', set: true }],
  text: [
    `You shake Pip by the shoulder. His skin is cold as a stone in a stream, and he does not respond. His eyes move fast beneath the lids, the way eyes do when someone is dreaming something they cannot climb out of.`,
    `You whisper his name three times. Nothing. But when the bell tolls again, his fingers tighten on the chocolate frog wrapper, as if something has taken hold of him and he is holding on.`
  ],
  choices: [
    { label: `Go to the window`, to: 'p03_window' },
    { label: `This can’t wait. You have to do something`, to: 'p04_choice' }
  ]
};

S.p03_window = {
  title: 'The light in the tower', mood: 'tense', preset: 'window-night', particles: ['fog'],
  onEnter: [{ stat: 'wit', add: 1 }, { flag: 'saw_light', set: true }],
  text: [
    `Beyond the window the grounds lie silver under the moon. High above the rooftops, at the top of Hollow Tower, the old clock tower that has been sealed for fifty years, a pale light flickers.`,
    `Each time the bell tolls the light pulses, and a thin mist seeps out of the tower windows and drifts down toward the dormitories like breath on cold glass.`,
    `You count the tolls. Seven. Then silence. Then it begins again, and you notice that the gaps are getting shorter.`
  ],
  choices: [{ label: `You can’t just stand here`, to: 'p04_choice' }]
};

S.p04_choice = {
  title: 'Three roads', mood: 'tense', preset: 'dormitory-night', particles: ['dust'],
  text: [
    `Pip does not wake. The whole castle sleeps too deeply, too evenly, and somewhere above it the bell keeps its patient time. You have three options, and none of them is safe.`
  ],
  choices: [
    { label: `Go alone to Hollow Tower, now`, to: 'r1_stairs' },
    { label: `Wake the prefect, Mirela Voss`, to: 'r2_mirela' },
    { label: `Wait for dawn and look for answers in daylight`, to: 'r4_wing' }
  ]
};

// ---------- Route 1: alone ----------
S.r1_stairs = {
  title: 'The corridors', mood: 'dark', preset: 'corridor-torch', particles: ['dust'],
  text: [
    `You slip into the corridors with your wand in your fist and no light. The castle is another place at night. Portraits breathe in their frames, suits of armour seem to be listening, and the air tastes of cold iron.`,
    `At the foot of the tower stairs the silence thickens. The sound of your footsteps leaves your feet and does not arrive at your ears, as if something is eating it.`,
    `Ahead, around the corner, a light swings. Someone is coming.`
  ],
  choices: [
    { label: `Stand your ground and keep walking`, to: 'r1_split', check: { stat: 'courage', difficulty: 6, successTo: 'r1_split', failTo: 'r1_caught' } },
    { label: `Slip behind the suits of armour`, to: 'r1_split', check: { stat: 'cunning', difficulty: 5, successTo: 'r1_split', failTo: 'r1_caught' } }
  ]
};

S.r1_split = {
  title: 'Two lights', mood: 'tense', preset: 'corridor-torch', particles: ['fog'],
  text: [
    `From the shadow of an alcove you watch two lights part ways. One is a warm, swinging lantern heading down toward the kitchen stairs. The other is no light at all: a hooded figure with a ring of keys that chimes faintly, crossing the courtyard arch toward the tower.`,
    `You have time to follow only one. Or to go straight to the door they’re both avoiding.`
  ],
  choices: [
    { label: `Follow the lantern`, to: 'r1_quill_meet' },
    { label: `Follow the hooded figure`, to: 'r1_figure', check: { stat: 'cunning', difficulty: 5, successTo: 'r1_figure', failTo: 'r1_caught' } },
    { label: `Go straight to the tower door`, to: 'r1_door' }
  ]
};

S.r1_quill_meet = {
  title: 'The night archivist', mood: 'magic', preset: 'corridor-torch', particles: ['dust'],
  onEnter: [{ relation: 'quill', add: 1 }, { stat: 'courage', add: 1 }],
  text: [
    `The lantern belongs to an old man in a patched coat, a brass spyglass hanging on a cord around his neck. He stops as though he had been expecting you, then seems embarrassed to be caught expecting.`,
    `“Oh. Oh, you hear it too. Forgive me, I’m— Quill. Night archivist. Nobody asks what an archivist does at night, which is lucky, because mostly it’s listening.” He lowers his voice. “I have waited fifty years for someone else to hear it.”`,
    `He takes your elbow with surprising firmness and steers you away from the tower. “Not tonight. The bell is hungry, and you are rather small to feed it. Come to the archive tomorrow. Bring questions. Bring tea, if you can steal any.”`
  ],
  choices: [{ label: `Let him walk you back`, to: 'r3_morning' }]
};

S.r1_figure = {
  title: 'Keys in the dark', mood: 'dark', preset: 'corridor-torch', particles: ['fog'],
  onEnter: [{ stat: 'wit', add: 1 }, { stat: 'cunning', add: 1 }, { flag: 'saw_figure', set: true }],
  text: [
    `You keep to the shadows and follow the chiming keys. The figure unlocks the tower door without hesitation, slips inside, and pulls it shut behind them. You wait. The bell tolls above you, twice, and the door opens again.`,
    `The figure comes out coughing into a sleeve, a hard dry cough you almost recognise, and locks up. They pass your hiding place close enough that you smell pipe smoke and lamp oil. You never see a face.`
  ],
  choices: [{ label: `Slip back to bed before dawn`, to: 'r3_morning' }]
};

S.r1_door = {
  title: 'The black door', mood: 'dark', preset: 'tower-stairs', particles: ['fog'],
  onEnter: [{ stat: 'courage', add: 1 }, { flag: 'felt_hum', set: true }],
  text: [
    `The tower door is black oak banded with iron, and cold radiates from it like winter from a cellar. Your hand is on the handle before you decide to move it.`,
    `Beneath your palm the wood hums, low and patient, and the hum finds the bones of your wrist. For a moment you hear something that is not the bell. A voice, almost: a lullaby with its words worn smooth. Then you snatch your hand away and the silence rushes back in.`
  ],
  choices: [{ label: `Retreat to the dormitory`, to: 'r3_morning' }]
};

S.r1_caught = {
  title: 'Caught', mood: 'tense', preset: 'corridor-torch', particles: [],
  text: [
    `A lantern beam catches you square in the chest. “Well, well.” It’s Harrow, the caretaker, lamp in one hand and a face that hasn’t smiled since before you were born. His coat smells of pipe smoke.`,
    `“Out of bed past midnight, {name}. Explain yourself.”`
  ],
  choices: [
    { label: `Tell him the truth about Pip and the light`, to: 'r1_truth' },
    { label: `Lie: you were sleepwalking`, to: 'r3_morning', check: { stat: 'cunning', difficulty: 6, successTo: 'r3_morning', failTo: 'r1_detention' } }
  ]
};

S.r1_truth = {
  title: 'The truth', mood: 'tense', preset: 'corridor-torch', particles: [],
  onEnter: [{ stat: 'kindness', add: 1 }, { relation: 'harrow', add: 1 }],
  text: [
    `You tell him everything: Pip, the bell, the light on the tower. Harrow listens without a word, his jaw working. When you finish he lets out a long breath through his nose.`,
    `“The bell has rung before,” he says. “I was young. I told myself I dreamed it.” He jerks his head toward the stairs. “Get to bed, {name}. And when you can, talk to Quill in the archive before you talk to anyone else with a title.”`
  ],
  choices: [{ label: `Go to bed`, to: 'r3_morning' }]
};

S.r1_detention = {
  title: 'First warning', mood: 'dark', preset: 'corridor-torch', particles: [],
  onEnter: [{ flag: 'strike', set: true }],
  text: [
    `Harrow looks straight through you. “Sleepwalkers don’t carry wands.” You spend the rest of the night polishing brass plaques in the trophy room while the bell tolls faintly through the walls.`,
    `By dawn your name is in his book: first warning. One more, and a letter goes home.`
  ],
  choices: [{ label: `Stagger to bed at daybreak`, to: 'r3_morning' }]
};

// ---------- Route 2: Mirela ----------
S.r2_mirela = {
  title: 'The prefect', mood: 'tense', preset: 'dormitory-night', particles: ['candles'],
  onEnter: [{ relation: 'mirela', add: 2 }, { flag: 'mirela_ally', set: true }],
  text: [
    `Mirela Voss, sixth-year prefect, opens her door in a dressing gown, hair wild, a book already open in one hand. She does not tell you to go back to bed. She listens to every word with her eyebrows slowly rising.`,
    `“Four last night. Six tonight,” she says. “Asleep, all of them. Calm as lambs, cold as slate. The staff are calling it a stomach bug.” Her mouth thins. “I call it something else.”`,
    `She looks at you properly for the first time. “You heard the bell. Most people don’t. That makes you either very useful or very unlucky. Possibly both.”`
  ],
  choices: [
    { label: `Tell her about the light on the tower`, to: 'r2_walk', requires: { flag: 'saw_light' }, effects: [{ relation: 'mirela', add: 1 }], ripple: 'Something shifts.' },
    { label: `Keep the light to yourself for now`, to: 'r2_walk', requires: { flag: 'saw_light' }, effects: [{ stat: 'cunning', add: 1 }] },
    { label: `Ask her to go and look at the tower with you`, to: 'r2_walk' },
    { label: `Ask her to keep watch over Pip`, to: 'r3_morning', effects: [{ stat: 'kindness', add: 1 }, { relation: 'mirela', add: 1 }] }
  ]
};

S.r2_walk = {
  title: 'The foot of the tower', mood: 'dark', preset: 'tower-stairs', particles: ['fog'],
  text: [
    `She takes you the long way, through the library gallery and down the servants’ stair, because she has already mapped which corridors the portraits gossip in. At the foot of Hollow Tower a door of black oak waits, banded with iron.`,
    `Mirela opens her notebook and reads off times in a flat voice. “Tolls every eleven minutes, sometimes ten. It’s speeding up.” She studies the door. “I’d like to know if it’s locked or just unwelcoming.”`
  ],
  choices: [
    { label: `Try the handle yourself`, to: 'r2_felt', check: { stat: 'courage', difficulty: 5, successTo: 'r2_felt', failTo: 'r2_dragged' } },
    { label: `Let Mirela try a spell on the lock`, to: 'r2_spell' },
    { label: `Suggest you leave it and report what you’ve seen`, to: 'r3_morning' }
  ]
};

S.r2_felt = {
  title: 'The pull', mood: 'dark', preset: 'tower-stairs', particles: ['fog'],
  onEnter: [{ stat: 'courage', add: 1 }, { flag: 'felt_hum', set: true }, { relation: 'mirela', add: 1 }],
  text: [
    `Your fingers close on the iron ring and the door hums through your arm. Something pulls, gently, like a current under smooth water. You stand there and do not let go for far too long, and then you do.`,
    `“Interesting,” says Mirela quietly, though her face has lost its colour. “You held on longer than I would have.”`
  ],
  choices: [{ label: `Go back, shaken`, to: 'r3_morning' }]
};

S.r2_dragged = {
  title: 'Hauled back', mood: 'dark', preset: 'tower-stairs', particles: ['fog'],
  onEnter: [{ relation: 'mirela', add: 1 }],
  text: [
    `The hum finds you before you have finished reaching for the handle. The edges of the corridor blur and your knees go soft. Mirela catches you by the collar and hauls you from the door like a kitten from a pond.`,
    `“That,” she says through her teeth, “is not a lock.”`
  ],
  choices: [{ label: `Let her walk you back`, to: 'r3_morning' }]
};

S.r2_spell = {
  title: 'It listens', mood: 'tense', preset: 'tower-stairs', particles: ['sparks'],
  onEnter: [{ stat: 'wit', add: 1 }, { relation: 'mirela', add: 1 }],
  text: [
    `Mirela whispers a lock-breaker and the air before the door sours. The spell comes back on itself as a puff of cold dust, and her wand hand goes numb. She flexes her fingers, quiet and calculating.`,
    `“Well,” she says. “It listens, at least.”`
  ],
  choices: [{ label: `Head back with her`, to: 'r3_morning' }]
};

// ---------- Route 3: wait for dawn ----------
S.r4_wing = {
  title: 'The hospital wing', mood: 'tense', preset: 'great-hall-day', particles: ['dust'],
  text: [
    `At dawn you stand in the doorway of the hospital wing and stop. Every bed is full, and every sleeper is peaceful. Matron Hale moves between them with a clipboard and an expression like a closed door.`,
    `“Sleeping sickness,” she says before you can ask. “Nothing to be done but rest and fluids. Professor Ashgrove has been very kind about it.” Her eyes flick away on the last word.`
  ],
  choices: [
    { label: `Read the clipboard when she turns away`, to: 'r4_chart', check: { stat: 'cunning', difficulty: 5, successTo: 'r4_chart', failTo: 'r4_shooed' } },
    { label: `Ask her gently what she’s afraid of`, to: 'r4_matron', check: { stat: 'kindness', difficulty: 5, successTo: 'r4_matron', failTo: 'r4_shooed' } },
    { label: `Leave for breakfast`, to: 'r3_morning' }
  ]
};

S.r4_chart = {
  title: 'The chart', mood: 'dark', preset: 'great-hall-day', particles: [],
  onEnter: [{ stat: 'wit', add: 1 }, { flag: 'saw_thirteen', set: true }],
  text: [
    `Names, dates, times. And in the margin, in a neat professor’s hand, a column of numbers that climbs by two each night: 4, 6, 8. Beside it, circled twice, the number 13.`
  ],
  choices: [{ label: `Slip out before she turns`, to: 'r3_morning' }]
};

S.r4_matron = {
  title: 'Matron Hale', mood: 'tense', preset: 'great-hall-day', particles: [],
  onEnter: [{ stat: 'kindness', add: 1 }, { flag: 'matron_hint', set: true }],
  text: [
    `“I’m afraid,” she says at last, very quietly, “that I’ve seen this before. Fifty years ago. I was a junior nurse in this wing. Nobody wrote it down. Nobody said a word.” She straightens. “Go and eat, {name}. And find someone who remembers.”`
  ],
  choices: [{ label: `Thank her and go`, to: 'r3_morning' }]
};

S.r4_shooed = {
  title: 'Out', mood: 'tense', preset: 'great-hall-day', particles: [],
  text: [
    `“Out,” says Matron Hale, tight-lipped, and she steers you into the corridor with a hand between your shoulder blades. Her hand is shaking.`
  ],
  choices: [{ label: `Go to breakfast`, to: 'r3_morning' }]
};

// ---------- Morning ----------
S.r3_morning = {
  title: 'Breakfast', mood: 'tense', preset: 'great-hall-day', particles: ['dust'],
  text: [
    `Day two. The Great Hall is half empty. Eight chairs stand unused along the house tables, and nobody talks at full voice. The staff say the word “illness” often enough to make it sound rehearsed.`,
    { if: { flag: 'tried_wake_pip' }, text: `Pip’s chair is one of the empty ones. Someone has left his spoon beside the plate, as if he might be back for it.` },
    `At the staff table Professor Corvin Ashgrove, who teaches Defence Against the Dark Arts, sits with a cup of tea and a face you would like to trust. He catches your eye and nods, mild and kind.`
  ],
  choices: [
    { label: `Tell Professor Ashgrove what you heard`, to: 'r3_ashgrove', ripple: R },
    { label: `Find Mirela Voss in the courtyard`, to: 'r3_mirela', requires: { not: { flag: 'mirela_ally' } } },
    { label: `Watch the staff table before you decide anything`, to: 'r3_watch', check: { stat: 'wit', difficulty: 5, successTo: 'r3_watch', failTo: 'd_harrow' } },
    { label: `Keep it to yourself and move on`, to: 'd_harrow' }
  ]
};

S.r3_watch = {
  title: 'Who isn’t eating', mood: 'tense', preset: 'great-hall-day', particles: [],
  onEnter: [{ stat: 'wit', add: 1 }, { flag: 'noticed_staff', set: true }],
  text: [
    `You pretend to read and watch the staff table over the edge of the page. Ashgrove’s tea has not been touched. His eyes keep drifting to the ceiling. Matron Hale isn’t eating either. And one chair stands empty: the caretaker’s. Harrow, who never misses a meal, is somewhere else.`
  ],
  choices: [{ label: `Leave before anyone notices you looking`, to: 'd_harrow' }]
};

S.r3_ashgrove = {
  title: 'The professor', mood: 'cozy', preset: 'great-hall-day', particles: [],
  text: [
    `Professor Ashgrove listens with his whole face, nodding in all the right places, and when you finish he lays a hand on your shoulder. “You were right to come to me, {name}. This is something for adults to handle.”`,
    `His gaze drifts upward for a heartbeat, to the ceiling, to the tower beyond it, and returns. “I need your word that you won’t go after that bell on your own, and that you won’t draw other students into this. For their safety. And yours.”`
  ],
  choices: [
    { label: `Give him your word`, to: 'd_harrow', effects: [{ relation: 'ashgrove', add: 2 }, { flag: 'promised_silence', set: true }], ripple: R },
    { label: `Tell him honestly you can’t promise that`, to: 'd_harrow', effects: [{ relation: 'ashgrove', add: 1 }, { stat: 'courage', add: 1 }] }
  ]
};

S.r3_mirela = {
  title: 'The courtyard wall', mood: 'cozy', preset: 'courtyard-day', particles: [],
  onEnter: [{ relation: 'mirela', add: 1 }, { flag: 'mirela_ally', set: true }],
  text: [
    `Mirela sits alone on the courtyard wall with a notebook full of times and the look of a person who has not slept since Monday. She raises an eyebrow as you tell her, then writes something down.`,
    `“The tower was sealed fifty years ago and there’s not a line in the school records about why,” she says. “I think I know how to stop it. I need someone with nerve.” She considers you. “Congratulations. You volunteered.”`
  ],
  choices: [{ label: `Get on with the day`, to: 'd_harrow' }]
};

// ---------- Harrow ----------
S.d_harrow = {
  title: 'Harrow', mood: 'tense', preset: 'corridor-torch', particles: ['dust'],
  text: [
    `On your way out of the Great Hall Harrow steps into your path. He has dark rings under his eyes and the look of a man who has not slept in days.`,
    { if: { flag: 'strike' }, text: `“You’re in my book, {name},” he says dryly. “One warning.”` },
    { if: { relation: 'harrow', gte: 1 }, text: `He nods to you, almost as to an equal.` },
    { if: { flag: 'saw_figure' }, text: `His coat smells of pipe smoke and lamp oil, and when he clears his throat it is a hard, dry cough you have heard before.` }
  ],
  choices: [
    { label: `Apologise for last night`, to: 'd_harrow_forgive', requires: { flag: 'strike' }, check: { stat: 'kindness', difficulty: 5, successTo: 'd_harrow_forgive', failTo: 'hub' } },
    { label: `Ask where he was at breakfast`, to: 'd_harrow_story', requires: { flag: 'noticed_staff' }, effects: [{ relation: 'harrow', add: 1 }] },
    { label: `Accuse him of being the one with the keys`, to: 'd_harrow_accuse', requires: { flag: 'saw_figure' } },
    { label: `Ask what he knows about the bell`, to: 'd_harrow_story' },
    { label: `Say you’re in a hurry`, to: 'hub' }
  ]
};

S.d_harrow_accuse = {
  title: 'Keys', mood: 'dark', preset: 'corridor-torch', particles: [],
  onEnter: [{ relation: 'harrow', add: -1 }, { flag: 'harrow_was_figure', set: true }],
  text: [
    `Harrow goes very still. “You followed someone with keys,” he says. “And you think it was me.” The old man does not shout, and that is worse.`,
    `“It was me,” he says finally. “Every night since the first sleeper. Because if somebody doesn’t watch that door, somebody worse than me will.”`
  ],
  choices: [{ label: `“I’m sorry. Tell me what you know”`, to: 'd_harrow_story', effects: [{ relation: 'harrow', add: 1 }] }]
};

S.d_harrow_forgive = {
  title: 'Wiped clean', mood: 'cozy', preset: 'corridor-torch', particles: [],
  onEnter: [{ flag: 'strike', set: false }, { relation: 'harrow', add: 1 }],
  text: [
    `Harrow looks at you for a long time. Then he draws out his book, tears the page free, and folds it into his pocket. “We’ll say no more about it,” he says. “You’ve got enough on your plate.”`
  ],
  choices: [
    { label: `Ask what he knows about the bell`, to: 'd_harrow_story', ripple: 'Something shifts.' },
    { label: `Thank him and go`, to: 'hub' }
  ]
};

S.d_harrow_story = {
  title: 'What Harrow saw', mood: 'dark', preset: 'corridor-torch', particles: ['fog'],
  onEnter: [{ relation: 'harrow', add: 1 }],
  text: [
    `Harrow glances up and down the corridor and lowers his voice. “I was a junior caretaker the night it started, fifty years back. I saw a boy in an archive coat carry music out of the east wing and lock the door behind him. He was crying. I never asked who it was.”`,
    `“I’ve watched that tower ever since. If you need something, {name}, you come to me.”`
  ],
  choices: [
    { label: `Ask if he could lend you a key to the east and west wings`, to: 'd_harrow_key', requires: { relation: 'harrow', gte: 2 }, lockedHint: `Harrow doesn’t trust you that far yet.` },
    { label: `Thank him and go`, to: 'hub' }
  ]
};

S.d_harrow_key = {
  title: 'The key', mood: 'cozy', preset: 'corridor-torch', particles: [],
  onEnter: [{ item: 'harrow_key', give: true }],
  text: [
    `Harrow unhooks a heavy ring from his belt and twists a brass key free. “Opens most doors in the east and west wings. You never had it, understand?” He presses it into your palm and walks away without waiting for an answer.`
  ],
  choices: [{ label: `Slip it into your pocket`, to: 'hub', ripple: R }]
};

export default S;
