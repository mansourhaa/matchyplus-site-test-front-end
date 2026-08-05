package com.matchy.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocationGatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
