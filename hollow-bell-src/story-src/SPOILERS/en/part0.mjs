// Intro: title card + prologue. Only reached on a fresh start (the loop goes straight to p01_midnight).
const S = {};
S.intro_title = {
  title: 'The Hollow Bell', mood: 'tense', preset: 'window-night', particles: ['fog', 'fireflies'],
  text: [
    `Rain on old glass. A castle of a thousand windows, and only a few of them lit.`,
    `Every old school keeps a secret. This one keeps it under a tower, and the secret has begun to ring.`
  ],
  choices: [{ label: `Begin`, to: 'intro_arrival' }]
};
S.intro_arrival = {
  title: 'Two months in', mood: 'cozy', preset: 'great-hall-day', particles: ['dust'],
  text: [
    `You, {name}, of {house}, have been at the castle long enough to stop getting lost on the way to breakfast, and not nearly long enough to know where it keeps its shadows.`,
    `Dinner tonight was loud and warm, the way it always is. You laughed at something. You fell asleep to the sound of rain.`,
    `Whatever happens next, you will remember this as the last ordinary evening.`
  ],
  choices: [{ label: `Close your eyes`, to: 'p01_midnight' }]
};
export default S;
