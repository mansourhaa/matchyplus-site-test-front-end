package com.matchy.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Exposes the Cap build's MOBILE_CLIENT_SECRET to the WebView so the SPA can send
 * X-Matchy-Mobile-Key. The secret lives in BuildConfig (gradle/env), not the web bundle,
 * so a normal browser cannot forge authorized mobile auth.
 */
@CapacitorPlugin(name = "MobileClient")
public class MobileClientPlugin extends Plugin {

    @PluginMethod
    public void getClientKey(PluginCall call) {
        JSObject ret = new JSObject();
        String key = BuildConfig.MOBILE_CLIENT_SECRET;
        ret.put("key", key != null ? key : "");
        call.resolve(ret);
    }
}
