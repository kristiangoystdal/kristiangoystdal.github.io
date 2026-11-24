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

document.getElementById('paper')!.style.backgroundImage = `url(${paperTexture()})`;
const stage = new Stage(document.getElementById('stage') as HTMLCanvasElement);
if (new URLSearchParams(location.search).has('gallery')) showGallery(stage, document.getElementById('ui')!);
else new App(stage, new AudioEngine()).showTitle();
