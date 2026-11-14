// Firebase-prosjektet til Jetlag Hide and Seek. Spillet bruker bare mappen rangeringshatten/ i databasen
// (reglene ligger i hide-and-seek-src/database.rules.json).
// Nøkkelen står ikke i git. GitHub Actions setter den inn ved publisering, fra de samme hemmelighetene som Hide and Seek.
window.RH = window.RH || {};
RH.FIREBASE = {
  apiKey: '__FIREBASE_API_KEY__',
  appId: '__FIREBASE_APP_ID__',
  authDomain: 'jetlag-hide-and-seek-norway.firebaseapp.com',
  databaseURL: 'https://jetlag-hide-and-seek-norway-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'jetlag-hide-and-seek-norway'
};
