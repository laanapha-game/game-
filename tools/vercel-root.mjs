// After `vite build`, for the website (Vercel): the site's front page is the full game.
//   dist/index.html  <- dist/game.html   (scene 1 home -> character select -> scene 2)
//   dist/scene2.html <- dist/index.html  (scene 2 on its own, for testing)
// dist/game.html stays too, so old /game.html links keep working. Both pages use
// relative ./assets paths (vite base './'), so moving them within dist/ is safe.
import { copyFileSync, existsSync } from 'node:fs';

if (!existsSync('dist/game.html') || !existsSync('dist/index.html')) throw new Error('run vite build first');
copyFileSync('dist/index.html', 'dist/scene2.html');
copyFileSync('dist/game.html', 'dist/index.html');
console.log('dist/index.html = full game (game.html); scene 2 alone = dist/scene2.html');
