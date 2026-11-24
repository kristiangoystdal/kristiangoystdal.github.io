import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/600.css';
import './styles/main.css';
import { AudioEngine } from './audio/audio';
import { App } from './ui/app';
import { paperTexture } from './visuals/paint';
import { Stage } from './visuals/stage';
import { showGallery } from './ui/gallery';
import { DuoApp } from './ui/duo';

document.getElementById('paper')!.style.backgroundImage = `url(${paperTexture()})`;
const stage = new Stage(document.getElementById('stage') as HTMLCanvasElement);
if (new URLSearchParams(location.search).has('gallery')) showGallery(stage, document.getElementById('ui')!);
else {
  const audio = new AudioEngine();
  const app = new App(stage, audio);
  // the two-player game shares the stage and the sound with the single-player game
  app.onDuo = () => {
    app.closeOverlay();
    void new DuoApp(stage, audio, document.getElementById('ui')!, () => app.showTitle()).open();
  };
  app.showTitle();
}
