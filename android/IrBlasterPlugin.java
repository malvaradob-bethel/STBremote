package tv.bethel.remote;

import android.content.Context;
import android.hardware.ConsumerIrManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

/**
 * Puente IR para Bethel Remote.
 * Expone al WebView:
 *   IrBlaster.hasIrEmitter()            -> { value: boolean }
 *   IrBlaster.transmit({ freq, pattern }) -> resuelve si transmitio
 *
 * 'pattern' es el array de microsegundos (mark/space alternados,
 * empezando por mark) que produce ir-engine.js, tanto para NEC
 * reconstruido como para RAW estilo ZaZa.
 */
@CapacitorPlugin(name = "IrBlaster")
public class IrBlasterPlugin extends Plugin {

    private ConsumerIrManager getIr() {
        return (ConsumerIrManager) getContext().getSystemService(Context.CONSUMER_IR_SERVICE);
    }

    @PluginMethod
    public void hasIrEmitter(PluginCall call) {
        ConsumerIrManager ir = getIr();
        JSObject ret = new JSObject();
        ret.put("value", ir != null && ir.hasIrEmitter());
        call.resolve(ret);
    }

    @PluginMethod
    public void transmit(PluginCall call) {
        int freq = call.getInt("freq", 38000);

        JSArray patternArr = call.getArray("pattern");
        if (patternArr == null) {
            call.reject("Falta el parametro 'pattern'");
            return;
        }

        int[] pattern;
        try {
            int n = patternArr.length();
            pattern = new int[n];
            for (int i = 0; i < n; i++) {
                pattern[i] = patternArr.getInt(i);
            }
        } catch (JSONException e) {
            call.reject("pattern invalido: " + e.getMessage());
            return;
        }

        ConsumerIrManager ir = getIr();
        if (ir == null || !ir.hasIrEmitter()) {
            call.reject("Este telefono no tiene emisor de infrarrojos");
            return;
        }

        try {
            ir.transmit(freq, pattern); // duraciones en microsegundos
            call.resolve();
        } catch (Exception e) {
            call.reject("Error al transmitir IR: " + e.getMessage());
        }
    }
}
