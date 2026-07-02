/* ============================================================
 *  ir-engine.js  -  Motor IR Bethel
 *  Dos ramas de codigo:
 *    - NEC : reconstruye la onda desde addr + cmd (JSON compacto)
 *    - RAW : reproduce un array de microsegundos tal cual (estilo ZaZa)
 *  Framework-agnostico: corre en navegador (simulado) y en WebView
 *  de Capacitor (transmite IR real via plugin nativo).
 * ============================================================ */

'use strict';

/* ---------- Constantes de tiempo NEC (microsegundos) ---------- */
const NEC = {
  HDR_MARK:  9000,   // cabecera encendido
  HDR_SPACE: 4500,   // cabecera apagado
  BIT_MARK:   560,   // pulso de cada bit
  ONE_SPACE: 1690,   // espacio = bit 1
  ZERO_SPACE: 560,   // espacio = bit 0
  STOP:       560,   // bit de parada
  RPT_MARK:  9000,   // cabecera del codigo de repeticion
  RPT_SPACE: 2250,   // espacio del codigo de repeticion
  GAP:      40000    // separacion entre frames
};

const DEFAULT_FREQ = 38000; // 38 kHz, portadora tipica de estos STB

/* ---------- Codificador NEC ---------- */

// Empuja 8 bits de 'value' en orden LSB primero (como manda NEC)
function emitByte(out, value) {
  for (let i = 0; i < 8; i++) {
    out.push(NEC.BIT_MARK);
    out.push(((value >> i) & 1) ? NEC.ONE_SPACE : NEC.ZERO_SPACE);
  }
}

// Un frame NEC completo (32 bits) a partir de addr + cmd logicos
function necFrame(addr, cmd) {
  const out = [NEC.HDR_MARK, NEC.HDR_SPACE];
  if (addr > 0xFF) {
    // NEC extendido: direccion de 16 bits, SIN byte inverso
    emitByte(out, addr & 0xFF);
    emitByte(out, (addr >> 8) & 0xFF);
  } else {
    // NEC estandar: direccion 8 bits + su inverso
    emitByte(out, addr & 0xFF);
    emitByte(out, (~addr) & 0xFF);
  }
  emitByte(out, cmd & 0xFF);
  emitByte(out, (~cmd) & 0xFF);
  out.push(NEC.STOP);
  return out;
}

// Codigo de repeticion corto NEC (lo que hace ZaZa al final)
function necRepeat() {
  return [NEC.RPT_MARK, NEC.RPT_SPACE, NEC.STOP];
}

// Frame + N repeticiones cortas. repeats=0 -> un solo frame.
// Si un decodificador no responde fiable, sube repeats a 1 o 2.
function necEncode(addr, cmd, repeats = 0) {
  let p = necFrame(addr, cmd);
  for (let i = 0; i < repeats; i++) {
    p = p.concat([NEC.GAP], necRepeat());
  }
  return p;
}

/* ---------- Utilidades ---------- */

// Acepta "0x04", "0X4" o "4"; lanza error si esta vacio o es invalido
function parseHex(s) {
  if (s === undefined || s === null || s === '') {
    throw new Error('valor hex vacio (tecla sin capturar)');
  }
  const n = Number(s); // Number("0x04") === 4
  if (Number.isNaN(n)) throw new Error('hex invalido: ' + s);
  return n;
}

/* ---------- Dispatcher: entrada del JSON -> {freq, pattern} ---------- */

function buildPattern(entry) {
  if (!entry) throw new Error('tecla inexistente en el JSON');
  const proto = String(entry.proto || '').toUpperCase();

  if (proto === 'RAW') {
    if (!Array.isArray(entry.raw) || entry.raw.length === 0) {
      throw new Error('entrada RAW sin array "raw"');
    }
    return { freq: entry.freq || DEFAULT_FREQ, pattern: entry.raw.slice() };
  }

  // NEC y variantes compatibles (NEC2, ONKYO, APPLE usan misma temporizacion)
  if (proto === 'NEC' || proto === 'NEC2' || proto === 'ONKYO' || proto === 'APPLE') {
    const addr = parseHex(entry.addr);
    const cmd  = parseHex(entry.cmd);
    const reps = Number.isInteger(entry.repeats) ? entry.repeats : 0;
    return { freq: DEFAULT_FREQ, pattern: necEncode(addr, cmd, reps) };
  }

  throw new Error('protocolo no soportado: "' + entry.proto +
                  '". Captura esta tecla como RAW.');
}

/* ---------- Puente nativo (Capacitor) ---------- */
// El plugin nativo "IrBlaster" expone transmit({freq, pattern}).
// En navegador no hay IR: se simula con console.log para depurar.

let _IrBlaster = null;
function getBlaster() {
  if (_IrBlaster) return _IrBlaster;
  if (window.Capacitor && window.Capacitor.registerPlugin) {
    _IrBlaster = window.Capacitor.registerPlugin('IrBlaster');
  }
  return _IrBlaster;
}

function isNative() {
  return !!(window.Capacitor &&
            typeof window.Capacitor.isNativePlatform === 'function' &&
            window.Capacitor.isNativePlatform());
}

async function sendIr(freq, pattern) {
  if (!isNative()) {
    console.log('[IR simulado]', freq, 'Hz |', pattern.length, 'valores |', pattern);
    return;
  }
  const blaster = getBlaster();
  if (!blaster) throw new Error('plugin IrBlaster no disponible');
  await blaster.transmit({ freq, pattern });
}

/* ---------- Carga de marcas y disparo por tecla ---------- */

const CODIGOS = {}; // { aimsat: {...}, digitalcom: {...}, newland: {...} }

async function cargarMarca(marca) {
  const resp = await fetch('codigos_' + marca + '.json');
  if (!resp.ok) throw new Error('no se pudo cargar codigos_' + marca + '.json');
  CODIGOS[marca] = await resp.json();
  return CODIGOS[marca];
}

async function pressKey(marca, key) {
  const tabla = CODIGOS[marca];
  if (!tabla) { console.warn('marca no cargada:', marca); return; }
  const entry = tabla[key];
  if (!entry || !entry.proto) {
    console.warn('tecla sin codigo capturado:', marca, key);
    return; // boton aun en blanco; no hace nada (no rompe la UI)
  }
  try {
    const { freq, pattern } = buildPattern(entry);
    await sendIr(freq, pattern);
  } catch (e) {
    console.error('error en tecla', marca, key, '->', e.message);
  }
}

/* ---------- Cableado de la UI ----------
 * En el HTML cada boton lleva data-key="VOL_UP" (o el nombre canonico).
 * Esta delegacion sirve para toda la carataula sin listeners por boton.
 * Llamar a wireSkin('aimsat', contenedor) tras cargar la marca.
 */
function wireSkin(marca, root) {
  (root || document).addEventListener('click', function (ev) {
    const btn = ev.target.closest('[data-key]');
    if (!btn) return;
    pressKey(marca, btn.dataset.key);
    // feedback tactil opcional en moviles
    if (navigator.vibrate) navigator.vibrate(15);
  });
}

/* ---------- Exporta para uso desde la carataula ---------- */
window.IRBethel = {
  buildPattern, necEncode, sendIr,
  cargarMarca, pressKey, wireSkin, CODIGOS
};
