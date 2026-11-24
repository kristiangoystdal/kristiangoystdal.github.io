// Part 2: hub, three leads (archive, music room, office), afternoon events.
const S = {};
const R = 'This will not be forgotten.';

S.hub = {
  title: 'The afternoon', mood: 'tense', preset: 'courtyard-day', particles: [],
  text: [
    `It is early afternoon. The bell will toll again tonight; everyone knows it, and everyone is pretending not to. You have until dusk, and time for two leads, not three.`,
    { if: { flag: 'strike' }, text: `Harrow’s warning sits in your pocket like a small cold stone.` },
    { if: { flag: 'mirela_ally' }, text: `Across the courtyard Mirela catches your eye and taps her wrist, once: time.` }
  ],
  choices: [
    { label: `The archive, three floors below the kitchens`, to: 'a1_archive', requires: { all: [{ not: { flag: 'lead_a_done' } }, { not: { all: [{ flag: 'lead_b_done' }, { flag: 'lead_c_done' }] } }] } },
    { label: `The abandoned music room in the east wing`, to: 'b1_door', requires: { all: [{ not: { flag: 'lead_b_done' } }, { not: { all: [{ flag: 'lead_a_done' }, { flag: 'lead_c_done' }] } }] } },
    { label: `Professor Ashgrove’s office`, to: 'c1_office', requires: { all: [{ not: { flag: 'lead_c_done' } }, { not: { all: [{ flag: 'lead_a_done' }, { flag: 'lead_b_done' }] } }] } },
    { label: `Find Mirela behind the greenhouses`, to: 'mirela_talk', requires: { all: [{ flag: 'mirela_ally' }, { not: { flag: 'mirela_talk_done' } }] } },
    { label: `Wait for dusk and go to the tower`, to: 'dir_dusk', requires: { any: [{ flag: 'lead_a_done' }, { flag: 'lead_b_done' }, { flag: 'lead_c_done' }] }, lockedHint: `You know too little to go up. Follow one lead first.` }
  ]
};

S.mirela_talk = {
  title: 'Mirela’s plan', mood: 'tense', preset: 'courtyard-day', particles: [],
  text: [
    `Mirela is waiting behind the greenhouses with a map of the castle and a long column of numbers: the times the bell has rung. “I’ve done the arithmetic,” she says. “It’s speeding up. At this rate the whole castle is asleep in four days.”`,
    `“I have a plan, and you won’t like it. I found a counter-spell in an old book that can break metal like this. We take the bell.” She looks at you. “But I don’t know what lies under that tower. I only know I can’t watch one more person fall asleep.”`
  ],
  choices: [
    { label: `Back her plan`, to: 'hub', effects: [{ relation: 'mirela', add: 1 }, { flag: 'mirela_plan_smash', set: true }, { flag: 'mirela_talk_done', set: true }] },
    { label: `Ask her to look for another way first`, to: 'mirela_wait', effects: [{ flag: 'mirela_talk_done', set: true }], check: { stat: 'kindness', difficulty: 5, successTo: 'mirela_wait', failTo: 'mirela_hurt' } }
  ]
};
S.mirela_wait = {
  title: 'Wait', mood: 'cozy', preset: 'courtyard-day', particles: [],
  onEnter: [{ relation: 'mirela', add: 1 }, { flag: 'mirela_waits', set: true }],
  text: [
    `Mirela bites her lip. Then, reluctantly, she nods. “Fine. But if there’s nothing else by tonight, we take the bell. No more talking.”`,
    `She folds the map into her pocket, and you realise she was relieved. She never wanted to be the one deciding.`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};
S.mirela_hurt = {
  title: 'Too careful', mood: 'dark', preset: 'courtyard-day', particles: [],
  onEnter: [{ relation: 'mirela', add: -1 }],
  text: [
    `“Careful,” says Mirela bitterly. “We’ve had five careful days.” She folds up the map, and her eyes are hard. “I’ll do it with you or without you, {name}.” She walks away and leaves you standing between the greenhouses.`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};

// ================= LEAD A: ARCHIVE =================
S.a1_archive = {
  title: 'The archive', mood: 'cozy', preset: 'library-basement', particles: ['dust'],
  text: [
    `The archive lies three flights beneath the kitchens: shelves to the ceiling, dust that glows in lantern light, a smell of old paper and cold stone. Behind an oak desk sits Quill, spectacles pushed up into his hair, apparently in the middle of an argument with a cat.`,
    { if: { relation: 'quill', gte: 1 }, text: `He looks up and beams. “Ah! My night visitor. Sit. Mind the cat; she bites scholars.”` },
    { if: { relation: 'quill', lte: 0 }, text: `“You’re late,” he says. “Or early. It rather depends what you’re looking for.”` }
  ],
  choices: [
    { label: `Tell him about the sleeping students and the bell`, to: 'a2_truth', effects: [{ relation: 'quill', add: 1 }], ripple: 'Something shifts.' },
    { label: `Say Matron Hale sent you`, to: 'a2_truth', requires: { flag: 'matron_hint' }, effects: [{ relation: 'quill', add: 1 }] },
    { label: `Pretend you’re looking for something else`, to: 'a2_sneak', check: { stat: 'cunning', difficulty: 5, successTo: 'a2_sneak', failTo: 'a2_truth' } }
  ]
};
S.a2_truth = {
  title: 'Hollow Bell', mood: 'magic', preset: 'library-basement', particles: ['dust'],
  onEnter: [{ flag: 'knows_pact', set: true }],
  text: [
    `Quill sets down his pen and draws out a folder sealed with brown wax. “Hollow Bell. Cast three hundred years ago by Cantor Eadric Vale, who led the castle choir. It was never meant to warn anyone. It was meant to hold something down.”`,
    `“Beneath the tower lies what we call the Hush. It eats sound, and it eats sleep. Vale sang it to rest every night with a song that closes the bell. Then the song was lost, and the bell began to ring by itself. Now it feeds on whoever sleeps.”`,
    `He peers at you over the folder. “The song was written on two pages. I know where one of them is.”`
  ],
  choices: [
    { label: `Ask why he cares so much`, to: 'a_quill_past' },
    { label: `Ask where the page is`, to: 'a3_search' }
  ]
};
S.a2_sneak = {
  title: 'Dust and paper', mood: 'tense', preset: 'library-basement', particles: ['dust'],
  onEnter: [{ stat: 'cunning', add: 1 }, { flag: 'knows_pact', set: true }],
  text: [
    `While you leaf innocently through a crate of nineteenth-century accounts, you find a letter from Cantor Vale to the headmaster: “The bell will ring itself if the song is forgotten. Remember that the song is written on two pages.”`,
    `Quill has been standing behind you the entire time. “You’re looking for the bell, aren’t you?” He smiles thinly. “You look so innocent that you very nearly fooled me.”`
  ],
  choices: [
    { label: `Ask why he’s so interested`, to: 'a_quill_past' },
    { label: `Ask him to tell you the rest`, to: 'a3_search' }
  ]
};
S.a_quill_past = {
  title: 'Quill’s secret', mood: 'dark', preset: 'library-basement', particles: ['dust'],
  text: [
    `Quill takes off his spectacles and rubs his eyes. “I wasn’t always an archivist. Fifty years ago I was Vale’s last student, seventeen years old. The night the bell began ringing by itself, I panicked. I tore out the page with the song and locked the music room. I thought that would stop it.”`,
    `“It did the opposite. Since then I have been an archivist, a watchman and a coward, all at once.” He puts the spectacles back on, and his hands are not quite steady.`
  ],
  choices: [
    { label: `Forgive him`, to: 'a3_search', effects: [{ relation: 'quill', add: 2 }, { stat: 'kindness', add: 1 }, { flag: 'quill_forgiven', set: true }], ripple: R },
    { label: `Tell him this is his fault`, to: 'a3_search', effects: [{ relation: 'quill', add: -1 }, { stat: 'courage', add: 1 }] },
    { label: `Say nothing and ask for the page`, to: 'a3_search' }
  ]
};
S.a3_search = {
  title: 'The missing page', mood: 'tense', preset: 'library-basement', particles: ['dust'],
  text: [
    `Behind Quill the shelves hold a thousand folders, and some are dustier than others. “It’s in there somewhere,” he says. “I can’t search any more. My eyes aren’t what they were.”`
  ],
  choices: [
    { label: `You remember where it lay, from a dream you have had before`, to: 'a4_found', requires: { flag: 'looped' } },
    { label: `Ask Quill to help you look`, to: 'a4_found', requires: { relation: 'quill', gte: 2 }, lockedHint: `Quill doesn’t trust you enough yet.` },
    { label: `Ask him to hum what he remembers of the song`, to: 'a4_hum', requires: { all: [{ flag: 'quill_forgiven' }, { relation: 'quill', gte: 3 }] }, lockedHint: `He would only do that for someone he has fully forgiven himself in front of.` },
    { label: `Search the folders yourself`, to: 'a4_found', check: { stat: 'wit', difficulty: 6, successTo: 'a4_found', failTo: 'a4_missed' } }
  ]
};
S.a4_found = {
  title: 'First page', mood: 'magic', preset: 'library-basement', particles: ['dust'],
  onEnter: [{ item: 'page_a', give: true }, { counter: 'song', add: 1 }, { flag: 'lead_a_done', set: true }],
  text: [
    `Under a stack of old accounts you find a single page in neat, faded ink: the notes of a lullaby. Over them Vale has written: “The Cantor’s close. To be sung from the tower, and the bell shall be stilled.”`,
    `The page is cold in your hand, but you feel it wants something. Quill nods. “Take it. And for heaven’s sake, don’t lose it.”`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};
S.a4_hum = {
  title: 'What he remembers', mood: 'magic', preset: 'library-basement', particles: ['candles'],
  onEnter: [{ counter: 'song', add: 1 }, { relation: 'quill', add: 1 }, { flag: 'lead_a_done', set: true }],
  text: [
    `Quill closes his eyes. For a long moment nothing happens. Then, in a thin, cracked voice that has not sung in fifty years, he begins to hum. The melody is simple and very sad, and you find you already know where it is going.`,
    `When he finishes he is crying and pretending not to. “That is as much as I have,” he says. “Mind it well.”`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};
S.a4_missed = {
  title: 'Empty hands', mood: 'dark', preset: 'library-basement', particles: ['dust'],
  onEnter: [{ flag: 'lead_a_done', set: true }],
  text: [
    `You search for hours. The paper crumbles between your fingers, and the ink has run where it is worst. In the end you find only an empty cover and the ragged edge of something torn out long ago.`,
    `“Somebody got here first,” Quill mutters. “It’s not the first time something has disappeared from here.”`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};

// ================= LEAD B: MUSIC ROOM =================
S.b1_door = {
  title: 'The music room', mood: 'magic', preset: 'music-room-moon', particles: ['fog'],
  text: [
    `The music room in the east wing has been locked for longer than anyone can say. The door is covered in frost flowers, though the day is mild. From behind it comes a hum: a very old melody, almost too faint to be real.`
  ],
  choices: [
    { label: `Hum the melody you felt through the tower door`, to: 'b2_soft', requires: { flag: 'felt_hum' }, effects: [{ relation: 'cantor', add: 1 }] },
    { label: `Use Harrow’s key and slip in quietly`, to: 'b2_soft', requires: { item: 'harrow_key' } },
    { label: `Knock politely and wait`, to: 'b2_soft', effects: [{ stat: 'kindness', add: 1 }] },
    { label: `Break the door open with magic`, to: 'b2_hard', requires: { not: { flag: 'strike' } }, effects: [{ stat: 'courage', add: 1 }] },
    { label: `Break the door open with magic. You already have one warning`, to: 'b2_hard', requires: { flag: 'strike' }, check: { stat: 'courage', difficulty: 6, successTo: 'b2_hard', failTo: 'ending_expelled' }, effects: [{ stat: 'courage', add: 1 }], ripple: 'This cannot be undone.' }
  ]
};
S.b2_soft = {
  title: 'The Cantor', mood: 'magic', preset: 'music-room-moon', particles: ['fog'],
  onEnter: [{ relation: 'cantor', add: 2 }],
  text: [
    `The door swings open on its own. In the middle of the room, among overturned stools and a closed grand piano, stands a transparent man in a choir cassock, hands folded before him as if in prayer.`,
    `“No one has knocked here in a very long time,” he says, and his voice carries a strange harmonic, as though two people are speaking. “You are kind. Come in. I am Eadric Vale.”`
  ],
  choices: [
    { label: `Ask him to show you what happened`, to: 'b_flash1', ripple: 'Something shifts.' },
    { label: `Ask him to tell it briefly`, to: 'b3_gift' }
  ]
};
S.b2_hard = {
  title: 'Frost', mood: 'dark', preset: 'music-room-moon', particles: ['fog'],
  text: [
    `The door splinters on its hinges, and cold pours out of the room. In the middle of it a transparent figure shoots up toward the ceiling, shrieking without sound.`,
    `“You come to take more!” he cries. “I have nothing left to give!”`
  ],
  choices: [
    { label: `Apologise and lower your wand`, to: 'b3_gift', check: { stat: 'kindness', difficulty: 5, successTo: 'b3_gift', failTo: 'b3_press' } },
    { label: `Press him for answers`, to: 'b3_press', effects: [{ stat: 'cunning', add: 1 }] }
  ]
};
S.b_flash1 = {
  title: 'Memory: Vale', mood: 'magic', preset: 'belfry-storm', particles: ['candles', 'fog'], pov: { name: 'Eadric Vale' },
  text: [
    `You are Eadric Vale, three hundred years ago. It is night and the castle sleeps. Beneath the belfry floor you feel the Hush stirring like a hungry dog.`,
    `You have cast a bell of black metal and written a song on two pages. You know it will work. You do not yet know what it will cost.`
  ],
  choices: [
    { label: `Sing the song for the first time`, to: 'b_flash2', effects: [{ stat: 'kindness', add: 1 }] },
    { label: `Hesitate and examine the pact once more`, to: 'b_flash2', effects: [{ stat: 'wit', add: 1 }] }
  ]
};
S.b_flash2 = {
  title: 'Memory: the price', mood: 'dark', preset: 'belfry-storm', particles: ['fog'], pov: { name: 'Eadric Vale' },
  text: [
    `The bell answers. The Hush sinks. But with every night you sing, you notice the power must come from somewhere: the students you teach sleep more heavily, and some of them never quite wake.`,
    `“Every pact has a price,” says a calm voice from the wall. It is not hostile. It is only honest.`
  ],
  choices: [
    { label: `Keep singing to protect the castle`, to: 'b_flash3', effects: [{ flag: 'vale_keeps_singing', set: true }] },
    { label: `Stop, and let it break`, to: 'b_flash3', effects: [{ flag: 'vale_stopped', set: true }] }
  ]
};
S.b_flash3 = {
  title: 'The memory ends', mood: 'magic', preset: 'music-room-moon', particles: ['fireflies'],
  onEnter: [{ relation: 'cantor', add: 1 }, { flag: 'knows_pact', set: true }, { flag: 'vale_recalls', set: true }, { counter: 'song', add: 1 }],
  text: [
    `You blink, and the music room is back. Vale stands before you, and in his eyes you can see that he knows what you have seen.`,
    `“Now you know why I cannot sing alone,” he says quietly. “The song is true only if someone shares the price with me. I remember it all, child. The melody still lives in me. I merely cannot hold it up by myself.”`
  ],
  choices: [{ label: `Ask what he needs`, to: 'b3_gift' }]
};
S.b3_gift = {
  title: 'The tuning fork', mood: 'magic', preset: 'music-room-moon', particles: ['fireflies'],
  onEnter: [{ item: 'tuning_fork', give: true }, { counter: 'song', add: 1 }, { flag: 'knows_pact', set: true }, { flag: 'lead_b_done', set: true }, { relation: 'cantor', add: 1 }],
  text: [
    `Vale speaks softly. He saved the castle once by making a pact: he would sing the Hush to rest every night, and the bell would hold it down. When he died the song stayed in him and bound him to this room. Then someone broke in and took half of the notes. Ever since, he has not been able to sing alone.`,
    `He offers you a small silver fork that glows faintly. “My tuning fork. With it you can tune the bell to the lullaby. And if you find the pages, perhaps we can give them peace together.”`
  ],
  choices: [
    { label: `Ask whether anyone else has asked for the song`, to: 'b_vale_ash' },
    { label: `Back to the afternoon`, to: 'hub' }
  ]
};
S.b3_press = {
  title: 'Bitter truth', mood: 'dark', preset: 'music-room-moon', particles: ['fog'],
  onEnter: [{ relation: 'cantor', add: -1 }, { flag: 'knows_pact', set: true }, { flag: 'lead_b_done', set: true }],
  text: [
    `Vale turns away. As you press him, he tells it shortly and bitterly: the pact, the bell, the Hush, and the half of the notes that was stolen. “Now go,” he says, and the door closes behind you.`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};
S.b_vale_ash = {
  title: 'The visitor', mood: 'dark', preset: 'music-room-moon', particles: ['fog'],
  text: [
    `Vale looks toward the door. “There has been another here,” he says. “The professor. Three times. He wants the song, but not to close the bell. He wants to use it to ring thirteen.”`,
    `“I said no. But he promises me my freedom if I sing. I am tired, child. I am so very tired.”`
  ],
  choices: [
    { label: `Ask Vale to promise to stand with you when the time comes`, to: 'hub', effects: [{ relation: 'cantor', add: 1 }, { flag: 'vale_promised', set: true }], ripple: R },
    { label: `Say you’ll try to talk Ashgrove round first`, to: 'hub', effects: [{ stat: 'wit', add: 1 }] },
    { label: `Thank him and go`, to: 'hub' }
  ]
};

// ================= LEAD C: OFFICE =================
S.c1_office = {
  title: 'The office', mood: 'tense', preset: 'office-study', particles: [],
  text: [
    `Professor Ashgrove’s office is in the west wing behind a door of dark wood with a small brass nameplate. It is lunchtime, and the room beyond is dark: nobody is home.`,
    `Through the keyhole you see a tidy desk, a glass cabinet of silver instruments, and an open book.`
  ],
  choices: [
    { label: `Use Harrow’s key and let yourself in`, to: 'c2_ledger', requires: { item: 'harrow_key' } },
    { label: `Wait and ask him politely when he comes`, to: 'c2_talk' },
    { label: `Sneak in while he’s at lunch`, to: 'c2_ledger', requires: { not: { flag: 'strike' } }, check: { stat: 'cunning', difficulty: 6, successTo: 'c2_ledger', failTo: 'c2_caught' } },
    { label: `Sneak in. You already have one warning`, to: 'c2_ledger', requires: { flag: 'strike' }, check: { stat: 'cunning', difficulty: 6, successTo: 'c2_ledger', failTo: 'ending_expelled' }, ripple: 'One more mistake would be the last.' }
  ]
};
S.c2_talk = {
  title: 'Tea with the professor', mood: 'cozy', preset: 'office-study', particles: ['candles'],
  text: [
    `Ashgrove comes up the corridor with his cloak over his arm and greets you with a warm smile. He lets you in, puts the kettle on, and listens. He is courteous, nearly too courteous.`,
    `As he pours, you notice that the book on his desk lies open to a number circled in pencil: 13.`
  ],
  choices: [
    { label: `Ask what the number means`, to: 'c3_hints' },
    { label: `Say you saw the same number on the Matron’s chart`, to: 'c3_hints', requires: { flag: 'saw_thirteen' }, effects: [{ stat: 'wit', add: 1 }] },
    { label: `Ask why he became a teacher here`, to: 'c_ashgrove_past' },
    { label: `Thank him for the tea and leave`, to: 'c4_leave' }
  ]
};
S.c_ashgrove_past = {
  title: 'Lenora', mood: 'dark', preset: 'office-study', particles: ['candles'],
  text: [
    `Ashgrove looks down into his cup for a long time. “My sister Lenora climbed Hollow Tower when she was twelve, to prove she was brave. She fell asleep up there. She never woke.”`,
    `“I was sixteen. I have spent the rest of my life trying to understand why.”`
  ],
  choices: [
    { label: `Tell him you’re sorry, and ask about the number`, to: 'c3_hints', effects: [{ stat: 'kindness', add: 1 }, { relation: 'ashgrove', add: 1 }, { flag: 'knows_ashgrove_grief', set: true }], ripple: R },
    { label: `Sit in silence with him`, to: 'c4_leave', effects: [{ relation: 'ashgrove', add: 2 }, { flag: 'knows_ashgrove_grief', set: true }], ripple: R }
  ]
};
S.c3_hints = {
  title: 'Thirteen', mood: 'dark', preset: 'office-study', particles: ['candles'],
  onEnter: [{ relation: 'ashgrove', add: 1 }, { flag: 'knows_ashgrove_plan', set: true }, { flag: 'lead_c_done', set: true }],
  text: [
    `His smile tightens. “An old arithmetic exercise,” he says, but his finger drums against the desk. After a long moment he adds, more quietly: “Some doors should stay closed, {name}. Trust me. I am trying to protect you.”`,
    `You see how afraid he is beneath the calm. It is not a villain’s fear. It is the fear of a man who has decided on something terrible.`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};
S.c4_leave = {
  title: 'Polite goodbye', mood: 'cozy', preset: 'office-study', particles: [],
  onEnter: [{ relation: 'ashgrove', add: 1 }, { flag: 'lead_c_done', set: true }],
  text: [
    `He walks you to the door, still smiling. “Come to me whenever you’re worried.” The door closes behind you, and you feel he was relieved that you did not ask.`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};
S.c2_ledger = {
  title: 'The ledger', mood: 'dark', preset: 'office-study', particles: [],
  text: [
    `You slip inside and open the book. It is not a book. It is a ledger: rows of names, and beside each the date a student fell asleep. At the bottom, in the professor’s tidy hand: “The Last Toll. Thirteen strokes. When the Hush is full, it seals for ever. The price: the sleepers’ sleep. They will not wake.”`,
    `A desk drawer is slightly ajar.`
  ],
  choices: [
    { label: `Take the ledger and go`, to: 'c2_out' },
    { label: `Search the drawers as well`, to: 'c2_drawer', check: { stat: 'cunning', difficulty: 6, successTo: 'c2_drawer', failTo: 'c2_caught' } }
  ]
};
S.c2_out = {
  title: 'Out unseen', mood: 'tense', preset: 'office-study', particles: [],
  onEnter: [{ item: 'ledger', give: true }, { flag: 'knows_ashgrove_plan', set: true }, { stat: 'cunning', add: 1 }, { flag: 'lead_c_done', set: true }],
  text: [`You tuck the ledger under your cloak and are gone before anyone comes.`],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};
S.c2_drawer = {
  title: 'The second page', mood: 'magic', preset: 'office-study', particles: ['dust'],
  onEnter: [{ item: 'ledger', give: true }, { item: 'page_b', give: true }, { counter: 'song', add: 1 }, { flag: 'knows_ashgrove_plan', set: true }, { stat: 'cunning', add: 1 }, { flag: 'lead_c_done', set: true }],
  text: [
    `Under a stack of letters lies a single sheet of music, brittle at the creases, written in Vale’s own hand. The other half of the song. He has had it all along.`,
    `You take it, and the ledger, and leave the door exactly as you found it.`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub', ripple: 'Something shifts.' }]
};
S.c2_caught = {
  title: 'Out', mood: 'dark', preset: 'office-study', particles: [],
  onEnter: [{ relation: 'ashgrove', add: -2 }, { flag: 'strike', set: true }, { flag: 'lead_c_done', set: true }],
  text: [
    `You have barely opened the book when the door swings wide. Ashgrove stands in the opening, and his gaze is suddenly not warm any more. “Interesting,” he says quietly. “Out.”`,
    `He writes something on a slip of paper. You are reported to the headmaster.`
  ],
  choices: [{ label: `Back to the afternoon`, to: 'hub' }]
};

// ================= AFTERNOON EVENTS (director pool "dusk") =================
const ev = (id, o) => { S[id] = { mood: 'tense', preset: 'corridor-torch', particles: ['dust'], ...o }; };

S.dir_dusk = { title: 'The afternoon', mood: 'tense', director: { pool: 'dusk', pick: 2, then: 'n0_dusk' } };

ev('ev_mirela_ashgrove', {
  title: 'In the corridor',
  storylet: { pool: 'dusk', priority: 6, once: true, when: { all: [{ flag: 'mirela_ally' }, { bond: 'ashgrove|mirela', lte: 0 }] } },
  text: [
    `Outside the staff room you hear Mirela’s voice, hard and controlled. “You know more than you say, Professor. Fifteen students have fallen asleep since Monday.”`,
    `Ashgrove answers calmly, but his hands are white. “You do not understand what you are saying, Miss Voss.” You are the only one who sees them.`
  ],
  choices: [
    { label: `Stand by Mirela`, to: '$return', effects: [{ bond: 'ashgrove|mirela', add: -2 }, { relation: 'mirela', add: 1 }, { relation: 'ashgrove', add: -1 }] },
    { label: `Defend Ashgrove: he’s trying to help`, to: '$return', effects: [{ bond: 'ashgrove|mirela', add: 1 }, { relation: 'ashgrove', add: 1 }, { relation: 'mirela', add: -1 }] },
    { label: `Ask them both to wait, for the students’ sake`, to: '$return', effects: [{ bond: 'ashgrove|mirela', add: 1 }, { stat: 'kindness', add: 1 }] }
  ]
});
ev('ev_quill_mirela', {
  title: 'The vanished page', preset: 'library-basement',
  storylet: { pool: 'dusk', priority: 7, once: true, when: { all: [{ flag: 'quill_forgiven' }, { flag: 'mirela_ally' }] } },
  text: [
    `At the archive door you hear Quill tell Mirela what he told you: that he tore out the page fifty years ago. Mirela goes quiet. Then she goes white.`,
    `“You knew why,” she says. “All this time?”`
  ],
  choices: [
    { label: `Ask Mirela to understand: he was seventeen and terrified`, to: '$return', effects: [{ bond: 'mirela|quill', add: 1 }, { stat: 'kindness', add: 1 }] },
    { label: `Say she has every right to be angry`, to: '$return', effects: [{ bond: 'mirela|quill', add: -2 }, { relation: 'mirela', add: 1 }, { relation: 'quill', add: -1 }] },
    { label: `Say nothing`, to: '$return', effects: [{ bond: 'mirela|quill', add: -1 }] }
  ]
});
ev('ev_harrow_quill', {
  title: 'Old debts',
  storylet: { pool: 'dusk', priority: 4, once: true, when: { all: [{ relation: 'harrow', gte: 1 }, { relation: 'quill', gte: 1 }] } },
  text: [
    `Harrow and Quill stand in the corridor, snarling at each other in low voices. “You locked the door and let us think it was an accident,” says Harrow. “I was seventeen!” Quill retorts. Both look up as you appear.`
  ],
  choices: [
    { label: `Tell Quill that Harrow isn’t out to judge him`, to: '$return', effects: [{ bond: 'harrow|quill', add: 2 }] },
    { label: `Tell Harrow that Quill has had fifty years to regret it`, to: '$return', effects: [{ bond: 'harrow|quill', add: 1 }, { stat: 'kindness', add: 1 }] },
    { label: `Let them argue it out`, to: '$return', effects: [{ bond: 'harrow|quill', add: -1 }] }
  ]
});
ev('ev_vale_ashgrove', {
  title: 'A visit to the music room', preset: 'music-room-moon',
  storylet: { pool: 'dusk', priority: 8, once: true, when: { all: [{ flag: 'lead_b_done' }, { bond: 'ashgrove|cantor', lte: 0 }] } },
  text: [
    `Passing the music room you see the door standing ajar. Ashgrove is inside, his back to you. “One more time,” he says softly. “Sing it, and I will set you free.” Vale does not answer. He looks at you through the gap.`
  ],
  choices: [
    { label: `Sneak in and listen`, to: '$return', effects: [{ stat: 'cunning', add: 1 }, { flag: 'knows_ashgrove_plan', set: true }, { bond: 'ashgrove|cantor', add: -1 }] },
    { label: `Walk in and get them talking to each other`, to: '$return', effects: [{ bond: 'ashgrove|cantor', add: 2 }, { stat: 'kindness', add: 1 }, { relation: 'ashgrove', add: 1 }, { relation: 'cantor', add: 1 }], ripple: R },
    { label: `Warn Vale with a look and walk on`, to: '$return', effects: [{ relation: 'cantor', add: 1 }] }
  ]
});
ev('ev_quill_ashgrove', {
  title: 'The envelope', preset: 'library-basement',
  storylet: { pool: 'dusk', priority: 3, once: true, when: { all: [{ flag: 'lead_a_done' }, { bond: 'ashgrove|quill', gte: 1 }] } },
  text: [
    `Quill hands you a sealed envelope. “Give this to Corvin. He will understand.” It is heavier than paper should be.`
  ],
  choices: [
    { label: `Deliver it unopened`, to: '$return', effects: [{ bond: 'ashgrove|quill', add: 2 }, { relation: 'ashgrove', add: 1 }] },
    { label: `Open it and read it first`, to: '$return', effects: [{ flag: 'read_letter', set: true }, { bond: 'ashgrove|quill', add: 1 }, { stat: 'cunning', add: 1 }] },
    { label: `Burn it`, to: '$return', effects: [{ bond: 'ashgrove|quill', add: -2 }, { relation: 'quill', add: -1 }] }
  ]
});
ev('ev_mirela_key', {
  title: 'The key',
  storylet: { pool: 'dusk', priority: 5, once: true, when: { all: [{ flag: 'mirela_ally' }, { relation: 'harrow', gte: 1 }] } },
  text: [
    `Mirela has spoken to Harrow and is full of questions. “You must have a way into the tower,” she says. “I want to check the tower door before tonight.”`
  ],
  choices: [
    { label: `Give her Harrow’s key`, to: '$return', requires: { item: 'harrow_key' }, lockedHint: `You have no key to give.`, effects: [{ relation: 'mirela', add: 2 }, { item: 'harrow_key', give: false }, { flag: 'mirela_has_key', set: true }] },
    { label: `Tell her the key isn’t yours to lend`, to: '$return', effects: [{ relation: 'mirela', add: -1 }] },
    { label: `Suggest asking Harrow together`, to: '$return', effects: [{ bond: 'harrow|mirela', add: 2 }, { relation: 'mirela', add: 1 }, { relation: 'harrow', add: 1 }] }
  ]
});
ev('ev_harrow_ashgrove', {
  title: 'A message for Corvin',
  storylet: { pool: 'dusk', priority: 4, once: true, when: { all: [{ relation: 'harrow', gte: 1 }, { relation: 'ashgrove', gte: 1 }] } },
  text: [
    `Harrow holds you back in a doorway. “Tell Professor Ashgrove I can see he isn’t sleeping,” he says quietly. “And that I would rather have an honest man in that tower than a clever one.”`
  ],
  choices: [
    { label: `Pass the message on word for word`, to: '$return', effects: [{ bond: 'ashgrove|harrow', add: 2 }, { relation: 'ashgrove', add: 1 }] },
    { label: `Soften the words so they don’t wound`, to: '$return', effects: [{ bond: 'ashgrove|harrow', add: 1 }, { stat: 'wit', add: 1 }] },
    { label: `Say nothing`, to: '$return', effects: [{ bond: 'ashgrove|harrow', add: -1 }] }
  ]
});
ev('ev_suspect', {
  title: 'A cough in the stairwell', preset: 'corridor-torch',
  storylet: { pool: 'dusk', priority: 5, once: true, when: { all: [{ flag: 'saw_figure' }, { not: { flag: 'harrow_was_figure' } }] } },
  text: [
    `Somewhere below you someone coughs, a dry hard cough, and you realise you have been wondering all day who owns it. Harrow is two floors down, polishing a doorknob that does not need polishing.`
  ],
  choices: [
    { label: `Ask him straight out`, to: '$return', effects: [{ relation: 'harrow', add: -1 }, { flag: 'harrow_was_figure', set: true }, { stat: 'courage', add: 1 }] },
    { label: `Let it go for now`, to: '$return', effects: [{ stat: 'cunning', add: 1 }] }
  ]
});

export default S;
