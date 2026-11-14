// Rangeringshatten: temaene og kategoriene.
// Hver kategori har nøyaktig 8 ting og et tema (farger, ikon, bakgrunn og musikk).
// top og bottom står over og under listen, så alle vet hvilken vei de rangerer.
window.RH = window.RH || {};

/* Ikonene er tegnet for 64×64 og bruker currentColor. */
RH.ICONS = {
  bolt: '<path fill="currentColor" d="M38 3 13 36h15l-6 25 29-36H36z"/>',
  snake: '<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M46 14c-7-7-26-5-25 6 1 10 25 7 25 19 0 11-16 15-29 9"/></g><circle cx="48" cy="14" r="6" fill="currentColor"/><path d="M53 13l8-3m-8 3 7 3" stroke="currentColor" stroke-width="2"/>',
  owl: '<path fill="currentColor" d="M14 10l8 8a18 18 0 0 1 20 0l8-8v22c0 16-8 26-18 26S14 48 14 32z"/><circle cx="25" cy="28" r="6" fill="#0b0b12"/><circle cx="39" cy="28" r="6" fill="#0b0b12"/><circle cx="26" cy="27" r="2.5" fill="currentColor"/><circle cx="40" cy="27" r="2.5" fill="currentColor"/><path d="M32 33l-3 5h6z" fill="#0b0b12"/>',
  flame: '<path fill="currentColor" d="M32 3c3 12 18 17 18 35a18 18 0 0 1-36 0c0-9 5-14 9-18 0 7 3 11 7 12-3-11 1-21 2-29z"/><path fill="#0b0b12" opacity=".35" d="M32 30c2 6 9 8 9 16a9 9 0 0 1-18 0c0-5 3-8 5-10 0 3 1 5 3 6-1-5 0-9 1-12z"/>',
  wand: '<path d="M10 56 42 24" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path fill="currentColor" d="M50 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3zM24 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM56 34l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>',
  flask: '<path fill="currentColor" d="M25 4h14v5h-3v12l15 26a7 7 0 0 1-6 11H19a7 7 0 0 1-6-11l15-26V9h-3z"/><path fill="#0b0b12" opacity=".3" d="M20 44h24l5 9a3 3 0 0 1-3 4H18a3 3 0 0 1-3-4z"/><circle cx="29" cy="36" r="2.5" fill="#0b0b12" opacity=".35"/><circle cx="36" cy="30" r="1.8" fill="#0b0b12" opacity=".35"/>',
  castle: '<path fill="currentColor" d="M4 60V34l5-10 5 10v6h6V22l6-14 6 14v18h6V16l6-12 6 12v24h2v-6l5-10 5 10v26z"/><path fill="#0b0b12" opacity=".4" d="M26 60V50a4 4 0 0 1 8 0v10zM43 24h4v6h-4zM29 30h4v5h-4z"/>',
  snitch: '<circle cx="32" cy="36" r="9" fill="currentColor"/><path fill="currentColor" opacity=".85" d="M23 34C15 24 6 20 1 22c5 3 7 7 9 11-3-1-5 0-7 2 6 1 12 2 20 2zM41 34c8-10 17-14 22-12-5 3-7 7-9 11 3-1 5 0 7 2-6 1-12 2-20 2z"/><path d="M26 33c4 3 8 3 12 0" stroke="#0b0b12" stroke-width="1.5" fill="none" opacity=".4"/>',
  candy: '<circle cx="32" cy="24" r="17" fill="currentColor"/><path d="M32 24m-11 0a11 11 0 1 0 11-11a6 6 0 1 0 6 6" fill="none" stroke="#0b0b12" stroke-width="3" opacity=".35" stroke-linecap="round"/><rect x="29.5" y="40" width="5" height="22" rx="2.5" fill="currentColor"/>',
  candle: '<path fill="currentColor" d="M32 4c4 6 7 10 7 15a7 7 0 0 1-14 0c0-5 3-9 7-15z"/><rect x="24" y="28" width="16" height="32" rx="2" fill="currentColor" opacity=".9"/><path fill="#0b0b12" opacity=".25" d="M24 34c4 3 6 0 9 3v6c-3-2-6 2-9-1z"/>',
  film: '<path fill="currentColor" d="M6 26h52v32H6z"/><path fill="currentColor" d="M5 12 54 4l2 12-49 8z"/><path fill="#0b0b12" opacity=".4" d="M14 10l6 12 6-1-6-12zm12-2 6 12 6-1-6-12zm12-2 6 12 6-1-6-12z"/>',
  heart: '<path fill="currentColor" d="M32 58S6 42 6 22A13 13 0 0 1 32 15a13 13 0 0 1 26 7c0 20-26 36-26 36z"/>',
  book: '<path fill="currentColor" d="M4 14c10-3 20-2 27 4v40c-7-6-17-7-27-4zM60 14c-10-3-20-2-27 4v40c7-6 17-7 27-4z"/>',
  broom: '<path d="M8 8l30 30" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path fill="currentColor" d="M34 40l6-6 6 2 14 18-4 6-18-14z"/><path d="M44 42l10 10m-14-6 8 10m2-20 10 8" stroke="#0b0b12" stroke-width="1.5" opacity=".35"/>',
  hat: '<path fill="currentColor" d="M6 54c10-3 16-6 20-12l5-28c2-6 7-9 12-7l-5 9 4 25c3 6 9 10 16 13-15 4-37 4-52 0z"/><path d="M24 38c3 2 6 2 9 0m-7-8c1 1 3 1 4 0" stroke="#0b0b12" stroke-width="2" fill="none" opacity=".45" stroke-linecap="round"/>',
  mask: '<path fill="currentColor" d="M32 4C18 4 10 14 10 28c0 16 10 30 22 32 12-2 22-16 22-32C54 14 46 4 32 4z"/><path fill="#0b0b12" d="M18 26c4-3 9-3 12 1-3 5-9 5-12-1zm28 0c-4-3-9-3-12 1 3 5 9 5 12-1z"/><path d="M26 46c4 2 8 2 12 0" stroke="#0b0b12" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  quote: '<path fill="currentColor" d="M8 14h48a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H26l-12 10v-10H8a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z"/><path fill="#0b0b12" opacity=".4" d="M18 26h8v8l-4 6h-3l3-6h-4zm16 0h8v8l-4 6h-3l3-6h-4z"/>'
};

/* Temaene: farger, ikon, partikler i bakgrunnen og stemning i musikken. */
RH.THEMES = {
  heroes:  { icon: 'bolt',   accent: '#f5b941', accent2: '#e04848', deep: '#2a0d12', particle: 'dust',      mood: 'heroic' },
  dark:    { icon: 'snake',  accent: '#6fe39a', accent2: '#9aa6a0', deep: '#04140c', particle: 'smoke',     mood: 'dark' },
  beasts:  { icon: 'owl',    accent: '#b6e07a', accent2: '#e8b44a', deep: '#0b1c10', particle: 'fireflies', mood: 'calm' },
  fierce:  { icon: 'flame',  accent: '#ff8a3d', accent2: '#ffd25a', deep: '#260b04', particle: 'embers',    mood: 'dark' },
  magic:   { icon: 'wand',   accent: '#c19bff', accent2: '#6fd6ff', deep: '#140b2e', particle: 'sparks',    mood: 'calm' },
  potions: { icon: 'flask',  accent: '#3ee6b0', accent2: '#c2ff6b', deep: '#03211c', particle: 'bubbles',   mood: 'calm' },
  places:  { icon: 'castle', accent: '#9cc0ff', accent2: '#f5b941', deep: '#0a1430', particle: 'stars',     mood: 'heroic' },
  objects: { icon: 'snitch', accent: '#ffd65a', accent2: '#f0f0ff', deep: '#221706', particle: 'dust',      mood: 'bright' },
  sweets:  { icon: 'candy',  accent: '#ff8fcb', accent2: '#ffd36b', deep: '#280a1f', particle: 'sweets',    mood: 'bright' },
  sad:     { icon: 'candle', accent: '#c5d3ec', accent2: '#8aa2cc', deep: '#0a1120', particle: 'tears',     mood: 'sad' },
  screen:  { icon: 'film',   accent: '#f3e6c4', accent2: '#e0b85a', deep: '#151312', particle: 'dust',      mood: 'bright' },
  quotes:  { icon: 'quote',  accent: '#ffe08a', accent2: '#ff9d6b', deep: '#1f1408', particle: 'dust',      mood: 'heroic' },
  love:    { icon: 'heart',  accent: '#ff7396', accent2: '#ffc4d4', deep: '#2a0914', particle: 'hearts',    mood: 'bright' },
  school:  { icon: 'book',   accent: '#79adff', accent2: '#dca560', deep: '#0a1832', particle: 'dust',      mood: 'calm' },
  travel:  { icon: 'broom',  accent: '#86d8ff', accent2: '#f5b941', deep: '#08202f', particle: 'wind',      mood: 'bright' },
  rivals:  { icon: 'mask',   accent: '#ff5e5e', accent2: '#ffd0a0', deep: '#1f0606', particle: 'embers',    mood: 'dark' }
};

RH.CATEGORIES = [
  /* Karakterer */
  { id: 'karakterer', theme: 'heroes', name: 'Beste karakter', top: 'Best', bottom: 'Verst', items: [
    'Harry Potter', 'Hermione Granger', 'Ron Weasley', 'Albus Dumbledore', 'Severus Snape', 'Rubeus Hagrid', 'Sirius Black', 'Luna Lovegood'] },
  { id: 'bikarakterer', theme: 'heroes', name: 'Beste bikarakter', top: 'Best', bottom: 'Verst', items: [
    'Neville Longbottom', 'Fred og George', 'Nymphadora Tonks', 'Mad-Eye Moody', 'Kingsley Shacklebolt', 'Moaning Myrtle', 'Kreacher', 'Cedric Diggory'] },
  { id: 'weasley', theme: 'heroes', name: 'Beste Weasley', top: 'Best', bottom: 'Verst', items: [
    'Ron', 'Ginny', 'Fred', 'George', 'Molly', 'Arthur', 'Percy', 'Bill'] },
  { id: 'undervurdert', theme: 'heroes', name: 'Mest undervurdert', top: 'Mest undervurdert', bottom: 'Får nok skryt', items: [
    'Neville Longbottom', 'Molly Weasley', 'Arthur Weasley', 'Kingsley Shacklebolt', 'Charlie Weasley', 'Aberforth Dumbledore', 'Narcissa Malfoy', 'Regulus Black'] },
  { id: 'overvurdert', theme: 'rivals', name: 'Mest overvurdert', top: 'Mest overvurdert', bottom: 'Fortjener skryten', items: [
    'Harry Potter', 'Albus Dumbledore', 'Severus Snape', 'Ginny Weasley', 'Cho Chang', 'Draco Malfoy', 'Sirius Black', 'Cedric Diggory'] },
  { id: 'irriterende', theme: 'rivals', name: 'Mest irriterende', top: 'Mest irriterende', bottom: 'Minst irriterende', items: [
    'Dolores Umbridge', 'Gilderoy Lockhart', 'Draco Malfoy', 'Rita Skeeter', 'Cornelius Fudge', 'Argus Filch', 'Dudley Dursley', 'Lavender Brown'] },
  { id: 'farsfigur', theme: 'heroes', name: 'Beste farsfigur for Harry', top: 'Best', bottom: 'Verst', items: [
    'Sirius Black', 'Albus Dumbledore', 'Rubeus Hagrid', 'Arthur Weasley', 'Remus Lupin', 'Severus Snape', 'Vernon Dursley', 'Horace Slughorn'] },
  { id: 'orden', theme: 'heroes', name: 'Beste medlem av Føniksordenen', top: 'Best', bottom: 'Verst', items: [
    'Mad-Eye Moody', 'Nymphadora Tonks', 'Remus Lupin', 'Sirius Black', 'Kingsley Shacklebolt', 'Mundungus Fletcher', 'Molly Weasley', 'Arthur Weasley'] },
  { id: 'kamp', theme: 'heroes', name: 'Hvem vil du ha med i en duell', top: 'Helst', bottom: 'Minst lyst', items: [
    'Albus Dumbledore', 'Minerva McGonagall', 'Mad-Eye Moody', 'Molly Weasley', 'Kingsley Shacklebolt', 'Sirius Black', 'Hermione Granger', 'Neville Longbottom'] },
  { id: 'quidditch', theme: 'travel', name: 'Beste Quidditch-spiller', top: 'Best', bottom: 'Verst', items: [
    'Harry Potter', 'Ginny Weasley', 'Oliver Wood', 'Viktor Krum', 'Cedric Diggory', 'Fred og George', 'Katie Bell', 'Ron Weasley'] },

  /* Skurker og mørk magi */
  { id: 'skurker', theme: 'dark', name: 'Beste skurk', top: 'Best', bottom: 'Verst', items: [
    'Lord Voldemort', 'Dolores Umbridge', 'Bellatrix Lestrange', 'Lucius Malfoy', 'Peter Pettigrew', 'Barty Crouch Jr.', 'Fenrir Greyback', 'Gellert Grindelwald'] },
  { id: 'forbannelser', theme: 'dark', name: 'Verste trolldom å bli truffet av', top: 'Verst', bottom: 'Går fint', items: [
    'Cruciatus Curse', 'Imperius Curse', 'Sectumsempra', 'Petrificus Totalus', 'Spy snegler (Eat Slugs)', 'Levicorpus', 'Jelly-Legs Jinx', 'Bat-Bogey Hex'] },
  { id: 'skumlesteder', theme: 'dark', name: 'Skumleste sted', top: 'Skumlest', bottom: 'Minst skummelt', items: [
    'Forbidden Forest', 'Chamber of Secrets', 'Azkaban', 'Knockturn Alley', 'Malfoy Manor', 'Kirkegården i Little Hangleton', 'The Shrieking Shack', 'Department of Mysteries'] },
  { id: 'twister', theme: 'dark', name: 'Beste plot-twist', top: 'Best', bottom: 'Verst', items: [
    'Snape var på den gode siden', 'Scabbers er Peter Pettigrew', 'Moody er Barty Crouch Jr.', 'Quirrell bærer på Voldemort', 'Harry er en horcrux', 'Tom Riddle er Voldemort', 'Sirius er uskyldig', 'Dumbledore planla sin egen død'] },

  /* Skapninger */
  { id: 'skapninger', theme: 'beasts', name: 'Beste skapning', top: 'Best', bottom: 'Verst', items: [
    'Hedwig', 'Buckbeak', 'Dobby', 'Fawkes', 'Thestral', 'Fluffy', 'Niffler', 'Norbert'] },
  { id: 'kjaeledyr', theme: 'beasts', name: 'Beste kjæledyr', top: 'Best', bottom: 'Verst', items: [
    'Hedwig', 'Crookshanks', 'Scabbers', 'Trevor', 'Fang', 'Errol', 'Pigwidgeon', 'Mrs Norris'] },
  { id: 'skumle', theme: 'fierce', name: 'Skumleste skapning', top: 'Skumlest', bottom: 'Minst skummel', items: [
    'Dementor', 'Basilisk', 'Aragog', 'Inferi', 'Hungarian Horntail', 'Varulv', 'Boggart', 'Nagini'] },
  { id: 'drager', theme: 'fierce', name: 'Hvilken skapning ville du helst ridd på', top: 'Helst', bottom: 'Aldri', items: [
    'Buckbeak', 'Thestral', 'Hungarian Horntail', 'Fawkes', 'Kost', 'Abraxan-hest', 'Aragog', 'Ukrainian Ironbelly'] },
  { id: 'patronus', theme: 'magic', name: 'Beste patronus', top: 'Best', bottom: 'Verst', items: [
    'Hjort (Harry)', 'Oter (Hermione)', 'Hind (Snape)', 'Fønix (Dumbledore)', 'Jack Russell (Ron)', 'Hare (Luna)', 'Katt (McGonagall)', 'Gaupe (Kingsley)'] },

  /* Magi */
  { id: 'formler', theme: 'magic', name: 'Beste trylleformel', top: 'Best', bottom: 'Verst', items: [
    'Expecto Patronum', 'Expelliarmus', 'Wingardium Leviosa', 'Accio', 'Lumos', 'Alohomora', 'Riddikulus', 'Obliviate'] },
  { id: 'hverdagsmagi', theme: 'magic', name: 'Mest nyttige trylleformel i hverdagen', top: 'Mest nyttig', bottom: 'Minst nyttig', items: [
    'Accio', 'Reparo', 'Scourgify', 'Lumos', 'Alohomora', 'Apparition', 'Aguamenti', 'Muffliato'] },
  { id: 'drikker', theme: 'potions', name: 'Mest nyttige trylledrikk', top: 'Mest nyttig', bottom: 'Minst nyttig', items: [
    'Felix Felicis', 'Polyjuice Potion', 'Amortentia', 'Veritaserum', 'Wolfsbane Potion', 'Skele-Gro', 'Draught of Living Death', 'Pepperup Potion'] },
  { id: 'smaksdrikk', theme: 'potions', name: 'Hvilken trylledrikk ville du helst drukket', top: 'Helst', bottom: 'Aldri', items: [
    'Felix Felicis', 'Butterbeer', 'Polyjuice Potion (med katt-hår)', 'Skele-Gro', 'Amortentia', 'Veritaserum', 'Pepperup Potion', 'Draught of Peace'] },

  /* Ting */
  { id: 'gjenstander', theme: 'objects', name: 'Beste magiske gjenstand', top: 'Best', bottom: 'Verst', items: [
    'Elder Wand', 'Invisibility Cloak', 'Resurrection Stone', "Marauder's Map", 'Time-Turner', 'Firebolt', 'Sorting Hat', 'Pensieve'] },
  { id: 'hverdagsting', theme: 'objects', name: 'Beste magiske ting å ha hjemme', top: 'Best', bottom: 'Verst', items: [
    "Hermiones bunnløse veske", 'Time-Turner', 'Invisibility Cloak', "Marauder's Map", 'Deluminator', 'Remembrall', 'Selvrørende gryte', 'Weasley-klokken'] },
  { id: 'wheezes', theme: 'objects', name: "Beste vare fra Weasleys' Wizard Wheezes", top: 'Best', bottom: 'Verst', items: [
    'Skiving Snackboxes', 'Extendable Ears', 'Peruvian Instant Darkness Powder', 'Decoy Detonators', 'Fyrverkeri (Wildfire Whiz-bangs)', 'Bærbar sump', 'Lureknotter (trick wands)', 'Kjærlighetsdrikk'] },
  { id: 'horcrux', theme: 'dark', name: 'Kuleste horcrux', top: 'Kulest', bottom: 'Minst kul', items: [
    "Tom Riddles dagbok", "Marvolo Gaunts ring", "Slytherins medaljong", "Hufflepuffs beger", "Ravenclaws diadem", 'Nagini', 'Harry Potter', 'Elder Wand (ikke en horcrux, men likevel)'] },

  /* Steder */
  { id: 'steder', theme: 'places', name: 'Beste sted', top: 'Best', bottom: 'Verst', items: [
    'Hogwarts', 'Diagon Alley', 'Hogsmeade', 'The Burrow', 'Room of Requirement', 'Great Hall', 'Gringotts', 'Platform 9¾'] },
  { id: 'rom', theme: 'places', name: 'Beste rom på Hogwarts', top: 'Best', bottom: 'Verst', items: [
    'Great Hall', 'Room of Requirement', 'Gryffindor-oppholdsrommet', 'Astronomy Tower', 'Biblioteket', "Dumbledores kontor", 'Prefektbadet', 'Sykestua'] },
  { id: 'butikker', theme: 'places', name: 'Beste butikk eller pub', top: 'Best', bottom: 'Verst', items: [
    'Ollivanders', "Weasleys' Wizard Wheezes", 'Honeydukes', 'The Three Broomsticks', 'Flourish and Blotts', 'The Leaky Cauldron', "Zonko's", 'Borgin and Burkes'] },
  { id: 'bo', theme: 'places', name: 'Hvor ville du helst bodd', top: 'Helst', bottom: 'Aldri', items: [
    'The Burrow', 'Hogwarts', 'Grimmauld Place', 'Shell Cottage', "Hagrids hytte", 'Malfoy Manor', 'Privet Drive 4', 'Lovegood-huset'] },

  /* Skole */
  { id: 'fag', theme: 'school', name: 'Beste fag på Hogwarts', top: 'Best', bottom: 'Verst', items: [
    'Defence Against the Dark Arts', 'Potions', 'Charms', 'Transfiguration', 'Herbology', 'Care of Magical Creatures', 'Divination', 'History of Magic'] },
  { id: 'larere', theme: 'school', name: 'Beste lærer', top: 'Best', bottom: 'Verst', items: [
    'Minerva McGonagall', 'Remus Lupin', 'Severus Snape', 'Filius Flitwick', 'Horace Slughorn', 'Pomona Sprout', 'Sybill Trelawney', 'Gilderoy Lockhart'] },
  { id: 'forsvar', theme: 'school', name: 'Beste lærer i forsvar mot svartekunster', top: 'Best', bottom: 'Verst', items: [
    'Quirinus Quirrell', 'Gilderoy Lockhart', 'Remus Lupin', '«Mad-Eye Moody»', 'Dolores Umbridge', 'Severus Snape', 'Amycus Carrow', 'Harry (Dumbledores Armé)'] },
  { id: 'spokelser', theme: 'school', name: 'Beste spøkelse eller portrett', top: 'Best', bottom: 'Verst', items: [
    'Nearly Headless Nick', 'Moaning Myrtle', 'The Bloody Baron', 'The Fat Friar', 'The Grey Lady', 'Professor Binns', 'Peeves', 'The Fat Lady'] },

  /* Mat og godteri */
  { id: 'godteri', theme: 'sweets', name: 'Beste godteri og mat', top: 'Best', bottom: 'Verst', items: [
    'Chocolate Frogs', "Bertie Bott's Every Flavour Beans", 'Butterbeer', 'Pumpkin Juice', 'Treacle Tart', 'Fizzing Whizzbees', 'Acid Pops', 'Cauldron Cakes'] },
  { id: 'bertie', theme: 'sweets', name: "Verste smak av Bertie Bott's", top: 'Verst', bottom: 'Faktisk god', items: [
    'Øreverk', 'Oppkast', 'Gress', 'Sardin', 'Såpe', 'Svart pepper', 'Spinat', 'Jordsmak'] },
  { id: 'julemiddag', theme: 'sweets', name: 'Beste fest på Hogwarts', top: 'Best', bottom: 'Verst', items: [
    'Velkomstfesten', 'Halloween-festen', 'Juleballet', 'Julemiddagen', 'Nearly Headless Nicks dødsdagsfest', "Slughorns juleselskap", 'Festen etter Quidditch-seieren', 'Avslutningsfesten'] },

  /* Øyeblikk, filmer og replikker */
  { id: 'filmer', theme: 'screen', name: 'Beste film', top: 'Best', bottom: 'Verst', items: [
    "Philosopher's Stone", 'Chamber of Secrets', 'Prisoner of Azkaban', 'Goblet of Fire', 'Order of the Phoenix', 'Half-Blood Prince', 'Deathly Hallows: Part 1', 'Deathly Hallows: Part 2'] },
  { id: 'skuespillere', theme: 'screen', name: 'Beste skuespillerprestasjon', top: 'Best', bottom: 'Verst', items: [
    'Alan Rickman', 'Maggie Smith', 'Daniel Radcliffe', 'Emma Watson', 'Rupert Grint', 'Robbie Coltrane', 'Ralph Fiennes', 'Helena Bonham Carter'] },
  { id: 'oyeblikk', theme: 'screen', name: 'Beste øyeblikk', top: 'Best', bottom: 'Verst', items: [
    'Molly mot Bellatrix', 'Neville dreper Nagini', 'Tvillingene forlater Hogwarts', 'Snapes minner', 'Yule Ball', 'Hermione slår Draco', 'Harrys første Quidditch-kamp', 'Dumbledores Armé øver'] },
  { id: 'replikker', theme: 'quotes', name: 'Beste replikk', top: 'Best', bottom: 'Verst', items: [
    '"Yer a wizard, Harry."', '"It\'s LeviOsa, not LevioSA!"', '"After all this time?" "Always."', '"Not my daughter, you bitch!"', '"I solemnly swear that I am up to no good."', '"Dobby is a free elf!"', '"Why couldn\'t it be follow the butterflies?"', '"Did you put your name in the Goblet of Fire?!"'] },
  { id: 'dodsfall', theme: 'sad', name: 'Tristeste død', top: 'Tristest', bottom: 'Minst trist', items: [
    'Dobby', 'Sirius Black', 'Albus Dumbledore', 'Fred Weasley', 'Hedwig', 'Severus Snape', 'Cedric Diggory', 'Lupin og Tonks'] },
  { id: 'grine', theme: 'sad', name: 'Scenen som får deg til å grine', top: 'Mest grining', bottom: 'Tørre øyne', items: [
    'Harry ser foreldrene i Mirror of Erised', 'Dobbys grav', 'Snapes minner', 'Harry går inn i skogen', 'Hedwig dør', 'Fred dør', 'Sirius faller gjennom sløret', 'Dumbledores begravelse'] },

  /* Kjærlighet og vennskap */
  { id: 'par', theme: 'love', name: 'Beste par', top: 'Best', bottom: 'Verst', items: [
    'Ron og Hermione', 'Harry og Ginny', 'Lupin og Tonks', 'Arthur og Molly', 'Bill og Fleur', 'James og Lily', 'Neville og Hannah', 'Lucius og Narcissa'] },
  { id: 'vennskap', theme: 'love', name: 'Beste vennskap', top: 'Best', bottom: 'Verst', items: [
    'Harry og Ron', 'Harry og Hermione', 'Fred og George', 'Harry og Hagrid', 'James og Sirius', 'Luna og Ginny', 'Harry og Dobby', 'Crabbe og Goyle'] },
  { id: 'date', theme: 'love', name: 'Hvem ville du dratt på date med', top: 'Helst', bottom: 'Aldri', items: [
    'Cedric Diggory', 'Fleur Delacour', 'Viktor Krum', 'Sirius Black', 'Luna Lovegood', 'Fred Weasley', 'Hermione Granger', 'Charlie Weasley'] },
  { id: 'romkamerat', theme: 'love', name: 'Beste romkamerat', top: 'Helst', bottom: 'Minst lyst', items: [
    'Rubeus Hagrid', 'Luna Lovegood', 'Dobby', 'Fred og George', 'Neville Longbottom', 'Hermione Granger', 'Moaning Myrtle', 'Peeves'] },

  /* Reise */
  { id: 'reise', theme: 'travel', name: 'Beste måte å reise på', top: 'Best', bottom: 'Verst', items: [
    'Kost', 'Floo Powder', 'Apparition', 'Portkey', 'Hogwarts Express', 'Knight Bus', 'Flying Ford Anglia', 'Thestral'] },
  { id: 'koster', theme: 'travel', name: 'Hva ville du helst hatt i julegave', top: 'Helst', bottom: 'Minst lyst', items: [
    'Firebolt', 'Invisibility Cloak', 'Weasley-genser', "Marauder's Map", 'Sjokoladefrosker for et år', 'Egen ugle', 'Ny tryllestav fra Ollivanders', 'Sokker (som Dobby)'] }
];
