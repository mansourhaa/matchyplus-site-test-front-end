package com.matchy.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.location.LocationManager;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.Priority;
import com.google.android.gms.location.SettingsClient;

/**
 * Plugin natif : état du GPS de l'appareil + activation du GPS DANS l'application.
 *
 * - isEnabled()     : la localisation (GPS) de l'appareil est-elle activée ?
 * - requestEnable() : déclenche le dialogue Google Play Services
 *                     (« Pour poursuivre… / Activer / Non, merci ») qui active le
 *                     GPS SANS quitter l'app ni ouvrir les réglages.
 * - openSettings()  : ouvre l'écran de réglages (conservé en repli/legacy).
 *
 * NB : indépendant de la permission applicative — un utilisateur peut avoir
 * accordé la permission tout en ayant le GPS désactivé.
 */
// `requestCodes` DOIT contenir REQUEST_CHECK_SETTINGS (0x1A2B) : c'est ainsi que le
// Bridge Capacitor (getPluginWithRequestCode) route le résultat du dialogue système
// vers handleOnActivityResult() de CE plugin. Garder les deux valeurs synchronisées.
@CapacitorPlugin(name = "LocationGate", requestCodes = { 0x1A2B })
public class LocationGatePlugin extends Plugin {

    private static final int REQUEST_CHECK_SETTINGS = 0x1A2B;
    private String enableCallId;

    @PluginMethod
    public void isEnabled(PluginCall call) {
        boolean enabled = false;
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (lm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    enabled = lm.isLocationEnabled();
                } else {
                    enabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                            || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
                }
            }
        } catch (Exception e) {
            enabled = false;
        }

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    /**
     * Demande l'activation du GPS via le dialogue système (in-app, sans quitter l'app).
     * Résout { enabled: true } si le GPS est (devenu) actif, sinon { enabled: false }.
     */
    @PluginMethod
    public void requestEnable(final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            resolveEnabled(call, false);
            return;
        }

        LocationRequest locationRequest =
                new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000).build();

        LocationSettingsRequest settingsRequest = new LocationSettingsRequest.Builder()
                .addLocationRequest(locationRequest)
                .setAlwaysShow(true)
                .build();

        SettingsClient client = LocationServices.getSettingsClient(activity);
        client.checkLocationSettings(settingsRequest)
                // Réglages déjà OK → GPS actif, rien à afficher.
                .addOnSuccessListener(activity, response -> resolveEnabled(call, true))
                .addOnFailureListener(activity, e -> {
                    if (e instanceof ResolvableApiException) {
                        // GPS désactivé mais activable → on affiche le dialogue système.
                        try {
                            call.setKeepAlive(true);
                            bridge.saveCall(call);
                            enableCallId = call.getCallbackId();
                            ((ResolvableApiException) e)
                                    .startResolutionForResult(activity, REQUEST_CHECK_SETTINGS);
                        } catch (IntentSender.SendIntentException sendEx) {
                            enableCallId = null;
                            resolveEnabled(call, false);
                        }
                    } else {
                        // Play Services indisponible / non résoluble → on ne peut pas activer ici.
                        resolveEnabled(call, false);
                    }
                });
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_CHECK_SETTINGS || enableCallId == null) return;

        PluginCall call = bridge.getSavedCall(enableCallId);
        enableCallId = null;
        if (call == null) return;

        // RESULT_OK = l'utilisateur a appuyé sur « Activer ».
        resolveEnabled(call, resultCode == Activity.RESULT_OK);
        bridge.releaseCall(call);
    }

    private void resolveEnabled(PluginCall call, boolean enabled) {
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open location settings", e);
        }
    }
}
