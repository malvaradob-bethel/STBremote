# Bethel STB Remote

Control remoto IR por infrarrojo para decodificadores **Aimsat**, **Digitalcom** y **Newland**,
con carátulas fieles a cada mando físico. Un solo motor (`ir-engine.js`) reconstruye la señal
NEC desde `addr`/`cmd`, o reproduce RAW en microsegundos (estilo ZaZa) para protocolos no NEC.

## Contenido del repositorio

```
/                      <- la app (PWA) — esto es lo que sirve GitHub Pages
├── index.html         carátulas Aimsat / Digitalcom / Newland + selector
├── ir-engine.js       motor IR (NEC + RAW) y puente al plugin nativo
├── codigos_*.json     códigos capturados por modelo
├── manifest.json      PWA
├── service-worker.js  cache offline
├── icons/             iconos (any / maskable / apple-touch / favicon)
├── capturador.html    herramienta de captura por Web Serial (Chrome de escritorio)
├── arduino/
│   └── captura_ir_serial.ino   sketch lector (TSOP/VS1838 en pin 11)
├── android/           piezas nativas para empaquetar el APK con Capacitor
│   ├── IrBlasterPlugin.java
│   ├── MainActivity.java
│   └── AndroidManifest-additions.xml
└── SETUP.md           guia para compilar el APK
```

## Publicar como PWA (GitHub Pages)

1. Sube todo a la rama principal del repo.
2. **Settings -> Pages -> Source:** rama `main`, carpeta `/ (root)`.
3. La app queda en `https://<usuario>.github.io/STBremote/`.
4. En el móvil (Chrome): menú -> **Instalar app** / "Agregar a pantalla de inicio".

Rutas relativas: funciona igual en raíz o subcarpeta, siempre que los archivos
esten juntos y se respete la carpeta `icons/`.

> **El PWA no emite infrarrojo.** El navegador no expone el emisor IR. La versión PWA
> muestra la interfaz y valida el flujo; el IR real solo sale desde el APK (ver SETUP.md).

## Capturar / actualizar códigos

1. Sube `arduino/captura_ir_serial.ino` al Arduino (receptor en pin 11).
2. Abre `capturador.html` en **Chrome de escritorio** con el Arduino conectado por USB.
3. Elige modelo, toca un botón de la lista, apunta el control original y presiónalo.
4. Al terminar, **Exportar JSON** y reemplaza el `codigos_<marca>.json` del repo.
5. Sube al repo y **cambia `stbremote-v1` a `-v2`** en `service-worker.js` para refrescar
   la caché de los móviles ya instalados.

## Empaquetar el APK (IR real)

Ver `SETUP.md`. Resumen: proyecto Capacitor apuntando a estos mismos archivos web +
copiar `android/IrBlasterPlugin.java` y `android/MainActivity.java` + permiso
`TRANSMIT_IR`. El plugin llama a `ConsumerIrManager.transmit()` con el patrón que
produce `ir-engine.js`.
