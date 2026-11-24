// Part 3: night two, the climb, the belfry, the finale.
const S = {};
const R = 'This will not be forgotten.';
const WITH_AWAKE = { all: [{ flag: 'with_mirela' }, { flag: 'mirela_awake' }] };

S.n0_dusk = {
  title: 'Sunset', mood: 'tense', preset: 'dormitory-night', particles: ['dust'],
  text: [
    `The sun sets behind Hollow Tower, and the tower throws a long shadow across the courtyard. In an hour the bell will toll. You go up to the dormitory to fetch what you need.`,
    `Pip lies as he did last night: calm, cold, far away. On the bedside table sit a half-eaten chocolate frog and an unopened letter from his mother.`
  ],
  choices: [
    { label: `Sit with Pip for a moment`, to: 'n1_evening', effects: [{ stat: 'kindness', add: 1 }, { flag: 'sat_with_pip', set: true }] },
    { label: `Take Pip’s chocolate frog with you`, to: 'n1_evening', effects: [{ item: 'pip_frog', give: true }, { stat: 'kindness', add: 1 }], ripple: 'Something shifts.' },
    { label: `Go over what you know once more`, to: 'n1_evening', requires: { any: [{ counter: 'song', gte: 1 }, { flag: 'knows_ashgrove_plan' }] }, effects: [{ stat: 'wit', add: 1 }], lockedHint: `You haven’t learned enough to go over.` },
    { label: `Check your gear and steady yourself`, to: 'n1_evening', effects: [{ stat: 'courage', add: 1 }] }
  ]
};

S.n1_evening = {
  title: 'Night two', mood: 'dark', preset: 'corridor-torch', particles: ['fog'],
  text: [
    `Tonight the bell tolls earlier than yesterday, almost during supper. In two days more than thirty students have fallen asleep in their beds. The castle is closing its eyes.`,
    `You go over what you know and what is in your pockets. What you did today decides what you must manage now.`
  ],
  choices: [
    { label: `Go with Mirela`, to: 'n1b_mirela', requires: { relation: 'mirela', gte: 1 }, lockedHint: `You haven’t asked Mirela for help.`, effects: [{ flag: 'with_mirela', set: true }], ripple: 'Something shifts.' },
    { label: `Go alone`, to: 'n2_stairs', effects: [{ stat: 'courage', add: 1 }] }
  ]
};

S.n1b_mirela = {
  title: 'At the foot of the tower', mood: 'tense', preset: 'corridor-torch', particles: ['fog'],
  text: [
    `Mirela waits at the stairs with her wand in hand. She has not slept, and her gaze is sharp. “What do we do if Ashgrove is up there?” she asks quietly. “If he’s the one ringing, he’s the enemy.”`
  ],
  choices: [
    { label: `Go in with wands ready`, to: 'm1_door', effects: [{ stat: 'courage', add: 1 }, { flag: 'mirela_armed', set: true }] },
    { label: `Ask her to lower her wand until you’ve heard what he has to say`, to: 'm1_door', effects: [{ stat: 'kindness', add: 1 }, { flag: 'mirela_calm', set: true }] }
  ]
};

S.m1_door = {
  title: 'Mirela: the door', mood: 'dark', preset: 'tower-stairs', particles: ['fog'], pov: { name: 'Mirela' },
  text: [
    `You are Mirela. At the foot of the tower the silence has taken a shape: a tall, soundless shadow across the door. It turns toward you, though it has no head.`,
    `{name} has to get up the stairs. Your job is to hold it back. The notebook shakes in your hand.`
  ],
  choices: [
    { label: `Lock the tower door with the key you were given`, to: 'm2_holds', requires: { flag: 'mirela_has_key' } },
    { label: `Strike back with a defensive spell`, to: 'm2_holds', check: { stat: 'courage', difficulty: 6, successTo: 'm2_holds', failTo: 'm2_falls' } },
    { label: `Read the rhythm from your notebook and answer in time`, to: 'm2_holds', check: { stat: 'wit', difficulty: 6, successTo: 'm2_holds', failTo: 'm2_falls' } },
    { label: `Fall back and shut the door`, to: 'm2_retreats' }
  ]
};
S.m2_holds = {
  title: 'Mirela: holding', mood: 'magic', preset: 'tower-stairs', particles: ['sparks'], pov: { name: 'Mirela' },
  onEnter: [{ flag: 'mirela_awake', set: true }],
  text: [
    `The shadow writhes, chokes, and draws back into the walls. You breathe out, shaking, and feel that something has changed: it does not fear you, but it respects you.`,
    `You run up the stairs after {name}.`
  ],
  choices: [{ label: `Back to {name}`, to: 'n2_stairs' }]
};
S.m2_falls = {
  title: 'Mirela: falling', mood: 'dark', preset: 'tower-stairs', particles: ['fog'], pov: { name: 'Mirela' },
  onEnter: [{ flag: 'mirela_asleep', set: true }],
  text: [
    `The spell dies in your mouth. The shadow swallows the sound, and your thoughts with it. You watch {name} vanish up the stairs and want to shout, but you have no voice.`,
    `The last thing you feel is the floor against your cheek. Then it goes very, very quiet.`
  ],
  choices: [{ label: `Back to {name}`, to: 'n2_stairs' }]
};
S.m2_retreats = {
  title: 'Mirela: falling back', mood: 'tense', preset: 'tower-stairs', particles: ['fog'], pov: { name: 'Mirela' },
  text: [
    `You slam the door and put your back against it. The shadow pounds, but it does not get through. You are safe, but you are going nowhere tonight.`,
    `{name} is alone up there.`
  ],
  choices: [{ label: `Back to {name}`, to: 'n2_stairs' }]
};

S.n2_stairs = {
  title: 'The stairs', mood: 'dark', preset: 'tower-stairs', particles: ['fog'],
  text: [
    `The Hollow Tower stair twists upward in the dark. The higher you climb, the thicker the silence grows: first your footsteps go, then your breath, then your thoughts. It is like wading through black wool.`,
    { if: { flag: 'sat_with_pip' }, text: `You hold on to the memory of sitting beside Pip, the warmth of his hand. It is something to keep hold of.` },
    `A hundred steps remain. Somewhere above, the bell is waiting.`
  ],
  choices: [
    { label: `Force your way through the silence`, to: 'n3_belfry', check: { stat: 'courage', difficulty: 6, successTo: 'n3_belfry', failTo: 'n2_setback' } },
    { label: `Read the rhythm of the silence and walk in time with it`, to: 'n3_belfry', check: { stat: 'wit', difficulty: 6, successTo: 'n3_belfry', failTo: 'n2_setback' } },
    { label: `Strike the tuning fork (it will crack)`, to: 'n3_belfry', requires: { item: 'tuning_fork' }, effects: [{ item: 'tuning_fork', give: false }, { counter: 'song', add: -1 }], ripple: 'Something breaks.' }
  ]
};
S.n2_setback = {
  title: 'The silence takes you', mood: 'dark', preset: 'tower-stairs', particles: ['fog'],
  text: [
    `The silence seizes you. You can no longer hear yourself. Your knees give way and the steps blur together. You are about to become part of it.`
  ],
  choices: [
    { label: `Mirela hauls you up the stairs`, to: 'n3_belfry', requires: WITH_AWAKE, effects: [{ relation: 'mirela', add: 1 }, { stat: 'courage', add: -1 }], ripple: 'Something shifts.' },
    { label: `Hold Pip’s chocolate frog and think of home`, to: 'n3_belfry', requires: { item: 'pip_frog' }, effects: [{ item: 'pip_frog', give: false }] },
    { label: `Harrow and Quill carry you up the stairs together`, to: 'n3_belfry', requires: { all: [{ bond: 'harrow|quill', gte: 2 }, { flag: 'quill_forgiven' }, { relation: 'harrow', gte: 1 }] }, effects: [{ relation: 'quill', add: 1 }] },
    { label: `Harrow’s lantern cuts through: he has followed you`, to: 'n3_belfry', requires: { relation: 'harrow', gte: 2 }, ripple: 'Something shifts.' },
    { label: `Strike the tuning fork (it will crack)`, to: 'n3_belfry', requires: { item: 'tuning_fork' }, effects: [{ item: 'tuning_fork', give: false }, { counter: 'song', add: -1 }] },
    { label: `Push on alone`, to: 'n3_belfry', check: { stat: 'courage', difficulty: 8, successTo: 'n3_belfry', failTo: 'ending_silence' } }
  ]
};

S.n3_belfry = {
  title: 'The belfry', mood: 'dark', preset: 'belfry-storm', particles: ['fog', 'sparks'],
  text: [
    `At the top the stair opens into a round belfry with windows that have no glass, letting in night wind and mist. In the middle hangs the Hollow Bell: black, bigger than a cart, and humming so faintly that you feel it in your teeth.`,
    `Professor Ashgrove stands by the ropes. He does not look surprised. In the corner, bound to the bell’s shadow by chains you cannot see, hangs Eadric Vale, almost lost in the light.`,
    { if: { flag: 'promised_silence' }, text: `“You gave me your word,” says Ashgrove, not unkindly.` },
    `“I did not ask you to come,” he says. “But now that you are here, I can at least explain.”`
  ],
  choices: [
    { label: `Let him explain. Listen to him`, to: 'n4_talk' },
    { label: `Throw yourself at him and grab the rope`, to: 'n4_fight' },
    { label: `Smash the bell together with Mirela`, to: 'ending_broken_bell', requires: WITH_AWAKE, lockedHint: `Mirela is not here.`, ripple: 'This cannot be undone.' },
    { label: `Give Mirela the signal to strike first`, to: 'n4_clapper', requires: { all: [{ flag: 'mirela_armed' }, { flag: 'mirela_awake' }] }, effects: [{ relation: 'ashgrove', add: -1 }], ripple: 'Something shifts.' },
    { label: `Call on Vale: he promised to stand with you`, to: 'n3_vale_breaks', requires: { flag: 'vale_promised' }, ripple: R },
    { label: `Take Vale’s place at the bell`, to: 'n6_bargain', requires: { all: [{ flag: 'knows_pact' }, { stat: 'cunning', gte: 4 }] }, lockedHint: `You don’t know the pact well enough, or you’re not cunning enough.` }
  ]
};

S.n3_vale_breaks = {
  title: 'The chains break', mood: 'magic', preset: 'belfry-storm', particles: ['sparks', 'fireflies'],
  onEnter: [{ flag: 'ashgrove_beaten', set: true }, { relation: 'ashgrove', add: -1 }],
  text: [
    `“I promised,” says Vale, and for the first time in three hundred years his chains snap. He flings himself between Ashgrove and the bell, and a cold wave throws the professor to the floor.`,
    `“I am sorry,” says Vale. “But this is what I owe them.”`
  ],
  choices: [{ label: `Turn to Vale`, to: 'n5_cantor' }]
};

S.n4_talk = {
  title: 'The arithmetic', mood: 'tense', preset: 'belfry-storm', particles: ['fog'],
  text: [
    `“The Hush beneath us is the only reason this castle still stands,” says Ashgrove. “Every night it grows stronger. The bell holds it down, but it feeds on the sleepers. If I ring thirteen strokes, it seals for ever. The price is those who already sleep.”`,
    `His voice cracks. “Forty-one students for a thousand. I have done the arithmetic for ten years. I am not proud of it.”`,
    `He does not look at you as an enemy. He looks at you as someone who could stop him, and whom he hopes will not.`
  ],
  choices: [
    { label: `Show him that you have the song`, to: 'n5_yields', requires: { counter: 'song', gte: 2 }, lockedHint: `You don’t have enough of the song yet.` },
    { label: `Put his own ledger in front of him and demand answers`, to: 'n5_yields', requires: { item: 'ledger' }, check: { stat: 'wit', difficulty: 5, successTo: 'n5_yields', failTo: 'n4_fight' } },
    { label: `Tell him you saw his numbers on the hospital chart`, to: 'n5_yields', requires: { flag: 'saw_thirteen' }, check: { stat: 'wit', difficulty: 4, successTo: 'n5_yields', failTo: 'n4_fight' } },
    { label: `Quote the letter Quill wrote to him`, to: 'n5_yields', requires: { flag: 'read_letter' }, check: { stat: 'wit', difficulty: 3, successTo: 'n5_yields', failTo: 'n4_fight' } },
    { label: `Remind him of the trust between you`, to: 'n5_yields', requires: { any: [{ all: [{ relation: 'ashgrove', gte: 1 }, { not: { flag: 'promised_silence' } }] }, { all: [{ flag: 'promised_silence' }, { not: { flag: 'with_mirela' } }] }] }, check: { stat: 'kindness', difficulty: 4, successTo: 'n5_yields', failTo: 'n4_fight' }, lockedHint: `He doesn’t trust you, or you broke your promise by bringing Mirela.` },
    { label: `Speak his sister’s name: Lenora`, to: 'n5_yields', requires: { flag: 'knows_ashgrove_grief' }, check: { stat: 'kindness', difficulty: 3, successTo: 'n5_yields', failTo: 'n4_fight' } },
    { label: `Call for Quill, who has followed you`, to: 'n4_quill', requires: { flag: 'quill_forgiven' }, ripple: R },
    { label: `Ask Mirela to lower her wand as a sign of peace`, to: 'n5_yields', requires: { all: [{ flag: 'mirela_calm' }, { flag: 'mirela_awake' }] } },
    { label: `Appeal to his conscience`, to: 'n5_yields', check: { stat: 'kindness', difficulty: 7, successTo: 'n5_yields', failTo: 'n4_fight' } },
    { label: `Tell him he’s right`, to: 'ending_last_toll', ripple: 'This cannot be undone.' },
    { label: `Say you need time`, to: 'n3_belfry' }
  ]
};

S.n4_fight = {
  title: 'The rope', mood: 'dark', preset: 'belfry-storm', particles: ['sparks', 'fog'],
  text: [
    `Ashgrove is faster than you thought. His wand sends light and shadow flaring against the walls, and the silence takes the words out of your mouth. You wrestle for the rope while the bell hums in time with your heart.`
  ],
  choices: [
    { label: `Give everything you have`, to: 'n4_clapper', check: { stat: 'courage', difficulty: 7, successTo: 'n4_clapper', failTo: 'ending_silence' } },
    { label: `Snuff the lights and strike from the dark`, to: 'n4_clapper', check: { stat: 'cunning', difficulty: 6, successTo: 'n4_clapper', failTo: 'ending_silence' } },
    { label: `Let Mirela distract him`, to: 'n4_clapper', requires: WITH_AWAKE, check: { stat: 'courage', difficulty: 4, successTo: 'n4_clapper', failTo: 'ending_silence' } }
  ]
};

S.n4_clapper = {
  title: 'The clapper', mood: 'tense', preset: 'belfry-storm', particles: ['sparks'],
  onEnter: [{ flag: 'ashgrove_beaten', set: true }, { relation: 'ashgrove', add: -1 }],
  text: [
    `You seize the clapper in both hands and haul it down. Ashgrove falls to his knees, spent. The bell whines one last time and goes still.`,
    `“Don’t,” he whispers. “You don’t know what’s waiting below.” But from the corner you hear Vale humming, thin and trembling. He needs you.`
  ],
  choices: [{ label: `Turn to Vale`, to: 'n5_cantor' }]
};

S.n4_quill = {
  title: 'Quill’s confession', mood: 'dark', preset: 'belfry-storm', particles: ['fog'],
  onEnter: [{ relation: 'ashgrove', add: 1 }],
  text: [
    `The footsteps behind you are Quill’s. He has followed, pale and out of breath, lantern in hand. “Corvin,” he says quietly. “It was I who tore out the page. It was I who locked the door. This is my responsibility. Don’t make it your students’.”`,
    { if: { all: [{ flag: 'with_mirela' }, { flag: 'mirela_awake' }, { bond: 'mirela|quill', gte: 1 }] }, text: `Mirela lays a hand on Quill’s shoulder. She says nothing, but she stands there.` },
    { if: { all: [{ flag: 'with_mirela' }, { flag: 'mirela_awake' }, { bond: 'mirela|quill', lte: -1 }] }, text: `Mirela has drawn her wand. “You let them sleep for fifty years,” she says to Quill, and her voice shakes.` },
    `Ashgrove stares at him. It is the first time you have seen him stop being calm. “You?” he whispers. “All these years?”`
  ],
  choices: [
    { label: `Let them have it out`, to: 'n5_yields', requires: { any: [{ not: { flag: 'with_mirela' } }, { not: { flag: 'mirela_awake' } }, { bond: 'mirela|quill', gte: 0 }] } },
    { label: `Stop Mirela from attacking Quill`, to: 'n5_yields', requires: { all: [{ flag: 'with_mirela' }, { flag: 'mirela_awake' }, { bond: 'mirela|quill', lte: -1 }] }, check: { stat: 'kindness', difficulty: 6, successTo: 'n5_yields', failTo: 'n4_fight' } }
  ]
};

S.n5_yields = {
  title: 'He lowers his hand', mood: 'magic', preset: 'belfry-storm', particles: ['fireflies'],
  onEnter: [{ flag: 'ashgrove_yielded', set: true }, { relation: 'ashgrove', add: 1 }],
  text: [
    `Ashgrove lowers his hand. He sits in silence for a long moment. “I have been set on this for ten years,” he says at last. “And a child comes and shows me I stopped looking for anything else.”`,
    `He steps aside, and for the first time Vale looks at you with hope.`,
    { if: { not: { item: 'page_b' } }, text: `From inside his coat Ashgrove takes a folded sheet, brittle at the creases. “I should have given you this long ago,” he says. “The other half.”` }
  ],
  choices: [
    { label: `Take the page he offers`, to: 'n5_cantor', requires: { not: { item: 'page_b' } }, effects: [{ item: 'page_b', give: true }, { counter: 'song', add: 1 }] },
    { label: `Turn to Vale`, to: 'n5_cantor', requires: { item: 'page_b' } }
  ]
};

S.n5_cantor = {
  title: 'The Cantor’s song', mood: 'magic', preset: 'belfry-storm', particles: ['fireflies'],
  text: [
    `Eadric Vale drifts out of the bell’s shadow. “If you ask me to sing, I bind myself to the bell once more. I do it gladly. But I need something to sing from.”`,
    { if: { flag: 'vale_recalls' }, text: `He no longer hides what he remembers. The melody is plainly in him, only waiting for something to hold it up.` }
  ],
  choices: [
    { label: `Lay out everything you have and strike the fork`, to: 'n7_reseal', requires: { counter: 'song', gte: 3 } },
    { label: `Trust him to carry what is missing: he has waited three hundred years for someone who would`, to: 'n7_reseal', requires: { all: [{ counter: 'song', gte: 2 }, { not: { counter: 'song', gte: 3 } }, { relation: 'cantor', gte: 3 }] }, lockedHint: `Vale doesn’t trust you enough to carry the song with you.`, ripple: 'Something shifts.' },
    { label: `Hum the line you heard in the dark, and let him find the rest`, to: 'n7_reseal', requires: { all: [{ counter: 'song', gte: 2 }, { not: { counter: 'song', gte: 3 } }, { flag: 'felt_hum' }] }, check: { stat: 'wit', difficulty: 6, successTo: 'n7_reseal', failTo: 'ending_cantors_rest' }, ripple: 'Something shifts.' },
    { label: `Ask him to sing it as far as he remembers`, to: 'n7_reseal', requires: { all: [{ counter: 'song', gte: 2 }, { not: { counter: 'song', gte: 3 } }] }, check: { stat: 'wit', difficulty: 8, successTo: 'n7_reseal', failTo: 'ending_cantors_rest' } },
    { label: `Try to carry the melody with the little you have`, to: 'ending_cantors_rest', requires: { all: [{ counter: 'song', gte: 1 }, { not: { counter: 'song', gte: 2 } }] }, check: { stat: 'wit', difficulty: 10, successTo: 'ending_cantors_rest', failTo: 'ending_silence' } },
    { label: `Improvise with him, with nothing to go on`, to: 'ending_cantors_rest', requires: { not: { counter: 'song', gte: 1 } }, check: { stat: 'wit', difficulty: 10, successTo: 'ending_cantors_rest', failTo: 'ending_silence' } }
  ]
};

S.n6_bargain = {
  title: 'The pact', mood: 'dark', preset: 'belfry-storm', particles: ['fog'],
  text: [
    `You walk toward the bell’s shadow. Vale looks up, afraid. “What are you doing?” You know the words from the archive and from his story, and you say them aloud: the old pact, with your name on the Cantor’s line.`,
    `The bell answers not with a toll but with something worse and kinder: attention. It knows who you are. The pact is waiting only for a yes.`
  ],
  choices: [
    { label: `Say yes`, to: 'ending_quiet_bargain', ripple: 'This cannot be undone.' },
    { label: `Pull back and regret it`, to: 'n3_belfry' }
  ]
};

S.n7_reseal = {
  title: 'The reseal', mood: 'magic', preset: 'belfry-storm', particles: ['fireflies', 'sparks'],
  text: [
    `Vale takes the note from the fork, and his voice, old and clear, fills the belfry. As he sings you read the pages aloud, and the bell begins to answer: not with a hollow toll but with a calm, clear tone that you feel down to your toes.`,
    `Beneath you the Hush turns in its sleep and sinks deeper. And for the first time in two days a real light comes through the windows: dawn.`,
    `Only the last stroke remains. Someone must take the rope and ring it in time with the song.`
  ],
  choices: [
    { label: `Take the rope together with Ashgrove`, to: 'ending_waking_together', requires: { all: [{ flag: 'ashgrove_yielded' }, { relation: 'ashgrove', gte: 3 }] } },
    { label: `Take the rope alone`, to: 'ending_waking', requires: { not: { all: [{ flag: 'ashgrove_yielded' }, { relation: 'ashgrove', gte: 3 }] } } }
  ]
};

// ================= ENDINGS =================
S.ending_waking_together = {
  title: 'Everyone wakes', mood: 'cozy', preset: 'ending-dawn', particles: ['fireflies'],
  ending: { id: 'waking_together', title: 'Everyone wakes, together', kind: 'good' },
  text: [
    `You and Ashgrove take hold of the rope at the same moment. The bell strikes one clean note, and the mist in the tower lifts like a heavy cloak. One by one the students open their eyes in their beds.`,
    { if: { flag: 'tried_wake_pip' }, text: `In the dormitory Pip sits up and asks, confused, if it’s breakfast yet. Then he looks at you and says, “I heard you. You said my name.”` },
    { if: { not: { flag: 'tried_wake_pip' } }, text: `In the dormitory Pip sits up and asks, confused, if it’s breakfast yet.` },
    { if: { flag: 'sat_with_pip' }, text: `He adds that he dreamed someone was sitting beside him, and that it was warm.` },
    { if: { flag: 'mirela_asleep' }, text: `Mirela wakes too. It takes her three days to be herself again, and she refuses to say what she dreamed.` },
    { if: { flag: 'mirela_awake' }, text: `Mirela stands at the tower door with tears in her eyes and a notebook torn in half. She smiles anyway.` },
    `Vale remains in the music room, but he sings now every evening, softly, and the Hush sleeps. Quill puts the pages on display in the archive, behind glass.`,
    { if: { bond: 'ashgrove|cantor', gte: 1 }, text: `Before sunrise Ashgrove goes to the music room and asks Vale’s forgiveness. Vale answers with a note, and the two of them sing together for the first time in three hundred years.` },
    `Ashgrove goes to the headmaster that same morning and tells him everything. He keeps his post, but he must apologise to every student, one by one.`,
    `You sleep well tonight, {name}.`
  ]
};
S.ending_waking = {
  title: 'The song', mood: 'magic', preset: 'ending-dawn', particles: ['fireflies'],
  ending: { id: 'waking', title: 'The song that closed the bell', kind: 'good' },
  text: [
    `You take the rope alone and ring the last stroke in time with Vale’s voice. The bell answers with a note so pure that the glass in the tower sings. The Hush sinks, and the day comes.`,
    `Ashgrove sits on the floor, broken. He looks at the bell and understands, too late, what he almost did. He leaves without a word, and nobody sees him again until autumn.`,
    { if: { flag: 'tried_wake_pip' }, text: `In the dormitory Pip sits up. “I heard you,” he says. “I just couldn’t answer.”` },
    { if: { not: { flag: 'tried_wake_pip' } }, text: `In the dormitory Pip sits up and asks if it’s breakfast yet.` },
    { if: { flag: 'sat_with_pip' }, text: `He says he dreamed someone sat beside him, and that it was warm.` },
    { if: { flag: 'mirela_asleep' }, text: `Mirela wakes too, after three days. She no longer trusts anyone who smiles too much.` },
    { if: { bond: 'ashgrove|harrow', gte: 2 }, text: `Harrow sits beside Ashgrove all night, saying nothing. It is enough.` },
    `Vale stays in the music room and sings the Hush to rest each evening. The castle wakes, but you will always remember how close it was.`
  ]
};
S.ending_cantors_rest = {
  title: 'Vale’s rest', mood: 'magic', preset: 'ending-dawn', particles: ['fireflies'],
  ending: { id: 'cantors_rest', title: 'Vale’s rest', kind: 'good' },
  text: [
    `Vale sings from memory. His voice is weaker than you expected, but it is true. The bell answers, and with every note he grows a little more transparent.`,
    `At the last note he smiles. “Three hundred years,” he says. “At last I am finished.” He fades into the light that comes through the windows.`,
    `The students wake, one by one. Pip asks if it’s breakfast yet. The castle is safe, but the song is gone for ever.`,
    { if: { flag: 'mirela_asleep' }, text: `Mirela wakes too, but it takes three days.` },
    { if: { flag: 'ashgrove_beaten' }, text: `Ashgrove sits in the tower long afterwards. He says nothing, but you see that he is weeping.` },
    { if: { flag: 'vale_stopped' }, text: `“I should have stopped sooner,” Vale says in the last moment. “Thank you for letting me do it right this time.”` },
    { if: { flag: 'vale_keeps_singing' }, text: `“I sang to protect them,” Vale whispers. “It is all I ever wanted.”` }
  ]
};
S.ending_broken_bell = {
  title: 'The crack', mood: 'dark', preset: 'ending-dark', particles: ['sparks', 'fog'],
  ending: { id: 'broken_bell', title: 'The bell that broke', kind: 'neutral' },
  text: [
    `You and Mirela raise your wands together. The bell shatters with a sound that makes the whole castle shake. The Hush is loose. The walls tremble, the lights die, and far below something opens its eyes.`,
    `The students wake that night, every one, in a castle evacuated before dawn. Hogwarts is closed for months.`,
    `What lives beneath Hollow Tower now, nobody knows. It does not sing. It only listens.`,
    { if: { flag: 'tried_wake_pip' }, text: `Pip is awake and well. He has not forgotten that you tried to wake him.` },
    { if: { flag: 'mirela_waits' }, text: `Mirela looks away. “You wanted us to wait,” she says quietly. She says no more, but you know she hasn’t forgiven herself.` },
    { if: { flag: 'mirela_plan_smash' }, text: `Mirela smiles for the first time in days. “I told you,” she says. Then she looks down into the hole in the floor, and the smile fades.` },
    { if: { bond: 'harrow|mirela', gte: 2 }, text: `Harrow and Mirela stand together at the gate, receiving the evacuated students. It is the first time you have seen the caretaker laugh.` }
  ]
};
S.ending_last_toll = {
  title: 'Thirteen strokes', mood: 'dark', preset: 'ending-dark', particles: ['fog'],
  ending: { id: 'last_toll', title: 'The Last Toll', kind: 'bad' },
  text: [
    `You take the rope beside Ashgrove. Thirteen strokes. Each is heavier than the last, and after the final one you hear it: nothing. Not wind, not song, not breath.`,
    `The Hush is sealed. The castle is safe. But the dormitories are full of students who will never wake.`,
    { if: { flag: 'tried_wake_pip' }, text: `Pip lies in the bed beside yours. You know he heard you. It doesn’t help.` },
    { if: { not: { flag: 'tried_wake_pip' } }, text: `Pip lies in the bed beside yours, dreaming on.` },
    { if: { flag: 'sat_with_pip' }, text: `You sat with him that evening. It is all you got.` },
    { if: { flag: 'mirela_asleep' }, text: `Mirela sleeps among them.` },
    `You drift through the rest of your school years as if in a dream. Every night you hear the bell, though it never rings.`
  ]
};
S.ending_silence = {
  title: 'The Hush', mood: 'dark', preset: 'ending-silence', particles: ['fog'],
  ending: { id: 'silence', title: 'The Hush', kind: 'bad' },
  text: [
    `There is no pain. The sound goes first, then the light, and finally your thoughts. You dream that you are standing in the belfry, ringing a bell that nobody can hear.`,
    `The next morning there is one more student who does not wake.`,
    { if: { not: { flag: 'looped' } }, text: `But inside the dream you remember everything. Perhaps you can find a way out.` }
  ],
  choices: [
    { label: `Wake again, in the middle of the night`, to: 'p01_midnight', requires: { not: { flag: 'looped' } }, resetState: { keep: ['stats'] }, effects: [{ flag: 'looped', set: true }, { flag: 'knows_pact', set: true }, { stat: 'wit', add: 1 }], ripple: 'You remember. The world doesn’t.' }
  ]
};
S.ending_expelled = {
  title: 'Sent home', mood: 'dark', preset: 'ending-dark', particles: [],
  ending: { id: 'expelled', title: 'Sent home', kind: 'bad' },
  text: [
    `The headmaster reads the slip in silence. “Two warnings in two days, {name}. I am sorry.”`,
    `You pack your trunk that evening. From the carriage you see Hollow Tower against the sky, the light at its top pulsing in time with your heart.`,
    `At home you hear the bell in your dreams. You never learn whether anyone was ever saved.`
  ]
};
S.ending_quiet_bargain = {
  title: 'The bell-keeper', mood: 'magic', preset: 'ending-dark', particles: ['fireflies', 'fog'],
  ending: { id: 'quiet_bargain', title: 'The Bell-Keeper', kind: 'secret' },
  text: [
    `You say yes. The bell sings through you, and the pact moves from Vale to you. The Cantor smiles, almost embarrassed, and dissolves into light.`,
    `The students wake, every one. Nobody knows why.`,
    `From that night you are the castle’s bell-keeper. Every midnight you stand in the tower and sing the Hush to rest. You are never tired, never alone, and never quite awake.`,
    { if: { flag: 'tried_wake_pip' }, text: `Pip notices that you never sleep. He says nothing, but he leaves a cup of tea on the stairs every evening.` }
  ]
};

export default S;
