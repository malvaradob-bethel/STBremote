/*
 * ============================================================
 *  CAPTURA IR v2 - Bethel  (para el capturador HTML via Web Serial)
 * ============================================================
 *  Diferencia con la v1: en lugar de texto para leer a ojo,
 *  emite UNA linea JSON por cada tecla, con prefijo "IR ".
 *  El HTML capturador.html la lee directo por Web Serial.
 *
 *  Hardware:
 *    Receptor TSOP1738 / VS1838B  ->  OUT al pin D11
 *                                     VCC a 5V (o 3.3V)
 *                                     GND a GND
 *
 *  Libreria: "IRremote" de Armin Joachimsmeyer (v4.x)
 *  Serial a 115200 baudios.
 *
 *  Formato de salida por tecla:
 *    NEC:      IR {"proto":"NEC","addr":"0x4","cmd":"0x8"}
 *    UNKNOWN:  IR {"proto":"RAW","freq":38000,"raw":[9000,4500,...]}
 * ============================================================
 */

#include <IRremote.hpp>

#define IR_RECEIVE_PIN 11

void setup() {
  Serial.begin(115200);
  while (!Serial) { ; }
  IrReceiver.begin(IR_RECEIVE_PIN, ENABLE_LED_FEEDBACK);
  Serial.println(F("READY")); // el HTML lo usa para confirmar conexion
}

void loop() {
  if (!IrReceiver.decode()) return;

  // Ignorar frames de repeticion (boton mantenido)
  if (IrReceiver.decodedIRData.flags & IRDATA_FLAGS_IS_REPEAT) {
    IrReceiver.resume();
    return;
  }

  uint8_t proto = IrReceiver.decodedIRData.protocol;

  if (proto == UNKNOWN) {
    // Volcado RAW en microsegundos (para fallback raw, estilo ZaZa)
    // IRremote v4.4+: rawDataPtr fue removido. El buffer crudo ahora es
    // IrReceiver.irparams.rawbuf y la longitud IrReceiver.decodedIRData.rawlen
    Serial.print(F("IR {\"proto\":\"RAW\",\"freq\":38000,\"raw\":["));
    for (uint16_t i = 1; i < IrReceiver.decodedIRData.rawlen; i++) {
      if (i > 1) Serial.print(',');
      Serial.print((uint32_t)IrReceiver.irparams.rawbuf[i] * MICROS_PER_TICK);
    }
    Serial.println(F("]}"));
  } else {
    // Protocolo conocido: addr + cmd
    Serial.print(F("IR {\"proto\":\""));
    Serial.print(getProtocolString(proto));
    Serial.print(F("\",\"addr\":\"0x"));
    Serial.print(IrReceiver.decodedIRData.address, HEX);
    Serial.print(F("\",\"cmd\":\"0x"));
    Serial.print(IrReceiver.decodedIRData.command, HEX);
    Serial.println(F("\"}"));
  }

  IrReceiver.resume();
}
