# Ejercicio de Pater

App web sencilla (PWA) para apuntar el ejercicio desde el móvil y saber qué toca cada día.

- En vivo: https://fernandomateos.github.io/pater/
- HTML, CSS y JavaScript sin dependencias. Los datos se guardan solo en el móvil (localStorage, clave `pater.v1`); no hay servidor ni cuentas.
- Funciona sin conexión gracias a `sw.js`. Al cambiar archivos, sube la versión de `CACHE` en `sw.js`.
- El plan (ejercicios, series y repeticiones) está al principio de `app.js`.
- Prueba: sirve la carpeta en `localhost:8765` y lanza `node pruebas/prueba.js` (Playwright, pantalla de Pixel 7).

La URL no debe cambiar nunca: los datos van atados a ella.
