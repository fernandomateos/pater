const { chromium, devices } = require('playwright');
const CAP = __dirname + '/capturas/';
const URL = 'http://localhost:8765/';
const fallos = [];
const ok = (cond, msg) => { if (!cond) fallos.push(msg); console.log((cond ? 'OK   ' : 'FALLO') + ' ' + msg); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  await page.clock.install({ time: new Date('2026-10-20T10:00:00+02:00') }); // martes
  const desborde = async (donde) => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    ok(w[0] <= w[1], 'sin scroll horizontal en ' + donde + ' (' + w + ')');
  };
  const shot = n => page.screenshot({ path: CAP + n + '.png', fullPage: true });
  const clic = t => page.getByRole('button', { name: t, exact: false }).first().click();

  // 1. Primera vez: aviso de instalar
  await page.goto(URL);
  await page.clock.runFor(1000);
  ok(await page.locator('.ventana h1').textContent() === 'Pon el ejercicio en tu pantalla de inicio', 'aviso de instalar al abrir');
  await shot('01-aviso-instalar');
  await clic('Poner en mi pantalla de inicio');
  ok((await page.locator('.ventana').textContent()).includes('tres puntos'), 'instrucción del menú ⋮ sin aviso de Chrome');
  await shot('02-instrucciones');
  await clic('Entendido');

  // 2. Inicio vacío, día de fuerza
  ok((await page.locator('.toca').textContent()).includes('fuerza'), 'martes sin nada: toca fuerza');
  ok((await page.locator('.ahora .que').textContent()).includes('Bici o paseo'), 'AHORA empieza por la bici');
  await shot('03-inicio');
  await desborde('inicio');
  const alturas = await page.$$eval('.boton', bs => bs.map(b => b.getBoundingClientRect().height));
  ok(Math.min(...alturas) >= 56, 'botones de al menos 56 px (mín ' + Math.min(...alturas) + ')');

  // 3. Bici con cronómetro
  await clic('Vamos');
  await clic('Empezar');
  await page.clock.runFor(25 * 60 * 1000 + 3300);
  { const v = await page.locator('.reloj').textContent(); ok(v === '25:03', 'reloj de bici cuenta 25:03 (' + v + ')'); }
  await shot('04-bici-en-marcha');
  // vuelve al inicio con el reloj en marcha y regresa
  await page.goBack();
  ok(await page.locator('.marcha').count() === 1, 'el inicio avisa del reloj en marcha');
  await shot('05-inicio-reloj-en-marcha');
  await clic('Ver el reloj');
  await clic('Parar');
  ok((await page.locator('.listo .detalle').textContent()) === '25 minutos de bici o paseo', 'guarda 25 minutos');
  await shot('06-bici-guardada');
  await clic('Ahora: 🦵 Sentadillas');

  // 4. Fuerza guiada
  ok((await page.locator('.serie').textContent()) === 'Serie 1 de 2', 'sentadillas: serie 1 de 2');
  await shot('07-sentadillas');
  await clic('Serie hecha');
  ok((await page.locator('.serie').textContent()) === 'Serie 2 de 2', 'pasa a serie 2 de 2');
  await page.locator('[data-accion=reps][data-paso="-1"]').click();
  await clic('Serie hecha');
  ok((await page.locator('.listo .detalle').textContent()).includes('hechas'), 'sentadillas hechas');
  await clic('Ahora: 💪 Flexiones');
  await clic('Serie hecha'); await clic('Serie hecha');
  await clic('Ahora: 🏋️ Remo');
  for (let i = 0; i < 6; i++) await page.locator('[data-accion=kilos][data-paso="0.5"]').click();
  ok((await page.locator('.contador .valor').nth(1).textContent()) === '3', 'kilos del remo a 3');
  await shot('08-remo');
  await clic('Serie hecha'); await clic('Serie hecha');
  await clic('Ahora: 🪑 Abdominales');
  await clic('Serie hecha'); await clic('Serie hecha');
  await shot('09-abdominales-hechos');
  await clic('Ahora: 🙌 Colgarse');
  await clic('Empezar');
  await page.clock.runFor(45 * 1000 + 300);
  { const v = await page.locator('.reloj').textContent(); ok(v === '45', 'reloj de barra en 45 segundos (' + v + ')'); }
  await clic('Parar');
  ok((await page.locator('.listo .extra').textContent()).includes('primera'), 'primera colgada celebrada');
  await clic('Al inicio');
  ok((await page.locator('.ahora.fin').count()) === 1, 'todo hecho al final del día');
  await shot('10-inicio-todo-hecho');

  // 5. Atrás siempre al inicio
  await clic('Sentadillas');
  await page.goBack();
  ok((await page.locator('.saludo').count()) === 1, 'atrás de Android vuelve al inicio');

  // 6. Deshacer
  const antes = await page.evaluate(() => JSON.parse(localStorage.getItem('pater.v1')).registros.length);
  await clic('Deshacer último registro');
  ok((await page.locator('.borrar').textContent()).includes('45 segundos'), 'deshacer muestra la colgada');
  await shot('11-deshacer');
  await clic('Sí, borrar');
  const despues = await page.evaluate(() => JSON.parse(localStorage.getItem('pater.v1')).registros.length);
  ok(despues === antes - 1, 'deshacer borra un registro');

  // 7. Bici a mano
  await clic('Bici o paseo');
  await clic('Escribir los minutos');
  await page.fill('#minutos', '15');
  await shot('12-minutos-a-mano');
  await clic('Guardar');
  ok((await page.locator('.listo .detalle').textContent()) === '15 minutos de bici o paseo', 'minutos a mano');
  await clic('Al inicio');

  // 8. Persistencia tras recargar y sin conexión
  await page.reload();
  await page.clock.runFor(1000);
  ok((await page.locator('.ventana').count()) === 1, 'aviso de instalar en la 2ª apertura');
  await clic('Ahora no');
  ok((await page.locator('.boton.hecho').count()) === 5, 'datos conservados al recargar (5 hechos)');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await page.reload();
  await page.clock.runFor(1000);
  ok((await page.locator('.saludo').count()) === 1, 'abre sin conexión');
  await ctx.setOffline(false);
  await page.reload(); await page.clock.runFor(1000);
  await page.reload(); await page.clock.runFor(1000);
  ok((await page.locator('.ventana').count()) === 0, 'el aviso de instalar deja de salir tras 3 veces');

  // 9. Historial de varias semanas para progreso y resumen
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('pater.v1'));
    const base = new Date('2026-09-07T11:00:00+02:00').getTime();
    const tipos = ['sentadilla', 'flexion', 'remo', 'abdominal'];
    for (let sem = 0; sem < 6; sem++) {
      for (const dia of [0, 2, 4]) {
        const t = base + (sem * 7 + dia) * 864e5;
        d.registros.push({ id: 'b' + t, t, tipo: 'bici', min: 15 + sem * 4 + dia });
        d.registros.push({ id: 'h' + t, t: t + 1, tipo: 'barra', seg: 10 + sem * 4 + dia });
        for (const tp of tipos) for (let s = 0; s < 2; s++) d.registros.push({ id: tp + t + s, t: t + 2 + s, tipo: tp, reps: 8 + Math.min(sem, 4), kg: tp === 'remo' ? 2 + sem * 0.5 : undefined });
      }
    }
    // lunes de esta semana: fuerza completa
    const lun = new Date('2026-10-19T18:00:00+02:00').getTime();
    for (const tp of tipos) for (let s = 0; s < 2; s++) d.registros.push({ id: 'l' + tp + s, t: lun + s, tipo: tp, reps: 10 });
    d.registros.sort((a, b) => a.t - b.t);
    localStorage.setItem('pater.v1', JSON.stringify(d));
  });
  await page.reload(); await page.clock.runFor(1000);
  await clic('Mi progreso');
  await shot('13-progreso');
  await desborde('progreso');
  ok((await page.locator('.grafica svg').count()) === 3, 'tres gráficas');
  await clic('Al inicio');
  await clic('Enviar a Fernando');
  const texto = await page.locator('.resumen').textContent();
  console.log('\n' + texto + '\n');
  ok(texto.includes('Fuerza con todas las series: 2 días de 3'), 'resumen cuenta 2 días completos (lunes y martes)');
  await shot('14-enviar');
  await page.getByRole('button', { name: 'Ver la semana pasada' }).click();
  ok((await page.locator('.resumen').textContent()).includes('del 12 al 18 de octubre'), 'semana pasada');
  await clic('Volver');

  // 10. Día de descanso: miércoles tras fuerza el martes
  await page.clock.setSystemTime(new Date('2026-10-21T09:00:00+02:00'));
  await page.reload(); await page.clock.runFor(1000);
  ok((await page.locator('.toca').textContent()).includes('bici o paseo'), 'miércoles tras fuerza: toca bici y barra');
  await shot('15-dia-descanso');

  ok(errores.length === 0, 'sin errores de JavaScript ' + JSON.stringify(errores));
  await browser.close();
  console.log(fallos.length ? '\n' + fallos.length + ' FALLOS' : '\nTODO OK');
})().catch(e => { console.error(e); process.exit(1); });
