// Точка входа для bothost.ru (автодетект main-file: /app/index.js)
// Вся логика — в server/boot.js
import('./server/boot.js').catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
