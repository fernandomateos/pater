// Lo de la carta del 20-oct: esa tarde la app ya da por hechas sentadillas, flexiones y remo.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/';
let fallos = 0;
const ok = (c, m) => { if (!c) fallos++; console.log((c ? 'OK   ' : 'FALLO') + ' ' + m); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-10-20T17:00:00+02:00') });
  await p.goto(URL);
  await p.clock.runFor(1000);
  await p.getByRole('button', { name: 'Ahora no' }).click();
  const hechos = await p.$$eval('.boton.hecho .nombre', bs => bs.map(b => b.textContent));
  ok(JSON.stringify(hechos) === JSON.stringify(['Sentadillas', 'Flexiones en la mesa', 'Remo con mancuerna']), 'hechos de la mañana: ' + hechos.join(', '));
  ok((await p.locator('.ahora .que').textContent()).includes('Bici o paseo'), 'AHORA: bici o paseo');
  ok((await p.locator('.boton.hecho .estado').first().textContent()) === '✓ 30 rep.', 'sentadillas muestran ✓ 30 rep.');
  await p.screenshot({ path: process.env.CAP || '/dev/null', fullPage: true });
  await p.getByRole('button', { name: 'Sentadillas' }).click();
  ok((await p.locator('.serie').textContent()).includes('Hoy ya está hecho'), 'sentadillas: ya hecho, serie de propina');
  await p.getByRole('button', { name: 'Serie hecha' }).click();
  ok((await p.locator('.listo').count()) === 0, 'una serie de propina no repite la pantalla de terminado');
  await p.reload(); await p.clock.runFor(1000);
  const n = await p.evaluate(() => JSON.parse(localStorage.getItem('pater.v1')).registros.filter(r => r.id.startsWith('carta-')).length);
  ok(n === 3, 'lo de la carta se carga una sola vez (' + n + ')');
  await b.close();
  console.log(fallos ? fallos + ' FALLOS' : 'TODO OK');
})();
