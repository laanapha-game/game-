// Standalone entry (scene3.html): scene 3 on its own.
//   ?char=<scene 1 id>  play as that character (default nuannapa)
//   ?night=1            start at night
//   ?today=YYYY-MM-DD   ticket date (dev builds)
//   ?skip=1             skip the opening welcome;  ?ending=1  open the ending directly
import '../styles.css';
import { startScene3 } from './index.js';

const q = new URLSearchParams(window.location.search);
startScene3({
  character: { id: q.get('char') ?? 'nuannapa' },
  onBack: () => window.location.reload(),
  onHome: () => window.location.reload(),
  dev: {
    night: q.get('night') === '1',
    skipWelcome: q.get('skip') === '1',
    start: q.get('ending') === '1' ? 'ending' : undefined,
  },
});
