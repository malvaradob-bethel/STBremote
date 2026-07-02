# Bethel Remote — montaje del entorno (Capacitor + IR)

App-web (carataulas HTML) dentro de un APK Android que SÍ transmite IR,
via plugin nativo `IrBlaster` -> `ConsumerIrManager.transmit()`.

## Estructura de este paquete

```
bethel-remote/
├── www/                         <- los assets web (lo que ve el usuario)
│   ├── index.html               <- carataula Aimsat
│   ├── ir-engine.js             <- motor NEC + RAW
│   └── codigos_aimsat.json      <- codigos capturados (rellenar)
└── android-snippets/            <- copiar dentro del proyecto Android
    ├── IrBlasterPlugin.java
    ├── MainActivity.java
    └── AndroidManifest-additions.xml
```

## 1) Probar la carataula SIN compilar (en PC)

`fetch()` del JSON no funciona con file://, levanta un server local:

```bash
cd www
python -m http.server 8080
# abrir http://localhost:8080  (la consola muestra el patron IR simulado)
```

O subirlo a GitHub Pages como haces siempre. Sin IR real, pero validas
layout y reconstruccion NEC en la consola.

## 2) Crear el proyecto Capacitor

```bash
npm init -y
npm install @capacitor/core @capacitor/cli
npx cap init "Bethel Remote" tv.bethel.remote --web-dir=www
npm install @capacitor/android
npx cap add android
```

> El appId `tv.bethel.remote` debe coincidir con el `package` de los .java.

## 3) Copiar la pieza nativa

- `IrBlasterPlugin.java` y `MainActivity.java`
  -> `android/app/src/main/java/tv/bethel/remote/`
  (crea las carpetas segun el package si no existen; reemplaza el
   MainActivity que genera Capacitor)
- De `AndroidManifest-additions.xml`, pega el permiso y el `<uses-feature>`
  en `android/app/src/main/AndroidManifest.xml`

## 4) Sincronizar y compilar

```bash
npx cap sync android
npx cap open android      # abre Android Studio -> Run en un equipo con IR
```

Para regenerar el APK tras cambios en www/:

```bash
npx cap copy android
```

## 5) Validacion en equipo real

1. La barra superior debe decir **"IR listo"** (verde). Si dice
   "Sin emisor IR", ese telefono no tiene blaster.
2. Apunta el telefono al decodificador y prueba POWER.
3. Si una tecla no responde pero el codigo esta bien capturado, agrega
   `"repeats": 1` a esa entrada del JSON (ver nota del motor).

## Agregar las otras marcas

1. Copia `codigos_digitalcom.json` / `codigos_newland.json` a `www/`.
2. Duplica `index.html` como carataula de esa marca (o un selector de marca).
3. El motor (`ir-engine.js`) NO cambia: es el mismo para las tres.
