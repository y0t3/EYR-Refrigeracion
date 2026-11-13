package com.eyr.refrigeracion;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * EYR: sincronización cercana opcional, entre dos técnicos con confirmación del PIN.
 * Solo archivos de datos estructurados, no las fotografías alojadas en IndexedDB.
 * Nearby Connections cifra el enlace y no requiere internet.
 */
final class NearbySyncManager {
    private static final String SERVICE="com.eyr.refrigeracion.peersync";
    private static final int PERMISSIONS_REQUEST=2060;
    private static final int MAX_JSON=7*1024*1024;
    private final Activity host;
    private final WebView webView;
    private final ConnectionsClient client;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private final Map<Long,Payload> incoming=new HashMap<>();
    private final Map<Long,File> outgoing=new HashMap<>();
    private String activeEndpoint=null;
    private String mode="";
    private String requestedMode="";
    private boolean ready=false;
    private final Strategy strategy=Strategy.P2P_POINT_TO_POINT;

    NearbySyncManager(Activity activity,WebView view){
        host=activity;webView=view;client=Nearby.getConnectionsClient(activity);
    }
    private String deviceLabel(){
        String model=Build.MODEL==null?"Android":Build.MODEL.replaceAll("[^a-zA-Z0-9 _-]","");
        return "EYR · "+(model.length()>26?model.substring(0,26):model);
    }
    private void emit(String kind,String message,String id,String name){
        try {
            JSONObject json=new JSONObject();
            json.put("kind",kind);if(message!=null)json.put("message",message);
            if(id!=null)json.put("id",id);if(name!=null)json.put("name",name);
            final String js="if(window.EYRPeerSync&&window.EYRPeerSync.onNativeEvent)window.EYRPeerSync.onNativeEvent("+json+");";
            host.runOnUiThread(()->{if(webView!=null)webView.evaluateJavascript(js,null);});
        }catch(Exception ignored){}
    }
    private String[] permissions(){
        if(Build.VERSION.SDK_INT>=33)return new String[]{
            Manifest.permission.BLUETOOTH_ADVERTISE,
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.NEARBY_WIFI_DEVICES
        };
        if(Build.VERSION.SDK_INT>=31)return new String[]{
            Manifest.permission.BLUETOOTH_ADVERTISE,
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.ACCESS_FINE_LOCATION
        };
        return new String[]{Manifest.permission.ACCESS_FINE_LOCATION};
    }
    void start(String requested){
        if(!"receive".equals(requested)&&!"search".equals(requested))return;
        host.runOnUiThread(()->{
            if(GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(host)!=ConnectionResult.SUCCESS){
                emit("error","Esta función requiere Servicios de Google Play actualizados.",null,null);return;
            }
            final BluetoothAdapter adapter=BluetoothAdapter.getDefaultAdapter();
            if(adapter==null||!adapter.isEnabled()){
                emit("error","Activá Bluetooth desde los ajustes rápidos antes de continuar.",null,null);return;
            }
            requestedMode=requested;
            java.util.ArrayList<String> missing=new java.util.ArrayList<>();
            for(String perm:permissions())if(host.checkSelfPermission(perm)!=PackageManager.PERMISSION_GRANTED)missing.add(perm);
            if(!missing.isEmpty()){
                host.requestPermissions(missing.toArray(new String[0]),PERMISSIONS_REQUEST);
                emit("status","Autorizá los dispositivos cercanos en Android.",null,null);return;
            }
            startReady();
        });
    }
    void permissionsResult(int requestCode,@NonNull int[] grants){
        if(requestCode!=PERMISSIONS_REQUEST)return;
        for(int g:grants)if(g!=PackageManager.PERMISSION_GRANTED){
            emit("error","Sin permisos de dispositivos cercanos no se puede sincronizar.",null,null);return;
        }
        host.runOnUiThread(this::startReady);
    }
    private void startReady(){
        stop();
        mode=requestedMode;
        if("receive".equals(mode)){
            emit("status","Buscando conexión: este teléfono está visible para el otro técnico.",null,null);
            client.startAdvertising(deviceLabel(),SERVICE,life,
                new AdvertisingOptions.Builder().setStrategy(strategy).build())
                .addOnSuccessListener(nothing->emit("status","Este teléfono ya está visible. En el otro elegí Buscar teléfono.",null,null))
                .addOnFailureListener(e->emit("error","No se pudo activar recepción: "+e.getMessage(),null,null));
        }else if("search".equals(mode)){
            emit("status","Buscando el teléfono de EYR cercano…",null,null);
            client.startDiscovery(SERVICE,discovery,new DiscoveryOptions.Builder().setStrategy(strategy).build())
                .addOnSuccessListener(nothing->emit("status","Buscando teléfonos cercanos. Ambos deben tener EYR abierto.",null,null))
                .addOnFailureListener(e->emit("error","No se pudo buscar: "+e.getMessage(),null,null));
        }
    }
    private final EndpointDiscoveryCallback discovery=new EndpointDiscoveryCallback(){
        @Override public void onEndpointFound(@NonNull String endpointId,@NonNull DiscoveredEndpointInfo info){
            emit("found",null,endpointId,info.getEndpointName());
        }
        @Override public void onEndpointLost(@NonNull String endpointId){emit("lost",null,endpointId,null);}
    };
    void connect(String endpointId){
        host.runOnUiThread(()->{
            if(!"search".equals(mode)||endpointId==null||!endpointId.matches("[A-Za-z0-9_-]{1,120}"))return;
            emit("status","Solicitando conexión, verificá el código que aparecerá en ambos teléfonos.",null,null);
            client.requestConnection(deviceLabel(),endpointId,life).addOnFailureListener(
                e->emit("error","No se pudo conectar: "+e.getMessage(),null,null));
        });
    }
    private final ConnectionLifecycleCallback life=new ConnectionLifecycleCallback(){
        @Override public void onConnectionInitiated(@NonNull String id,@NonNull ConnectionInfo info){
            host.runOnUiThread(()->new AlertDialog.Builder(host)
                .setTitle("Confirmar teléfono EYR")
                .setMessage("Otro teléfono: "+info.getEndpointName()+
                    "\n\nCódigo de seguridad: "+info.getAuthenticationDigits()+
                    "\n\nComprobá que el código sea idéntico en ambos celulares. Solo aceptá si reconocés al otro técnico.")
                .setPositiveButton("Coincide · Conectar",(d,w)->client.acceptConnection(id,callback)
                    .addOnFailureListener(e->emit("error","No se pudo aceptar: "+e.getMessage(),null,null)))
                .setNegativeButton("Cancelar",(d,w)->client.rejectConnection(id))
                .setCancelable(false).show());
        }
        @Override public void onConnectionResult(@NonNull String id,@NonNull ConnectionResolution result){
            if(result.getStatus().getStatusCode()==ConnectionsStatusCodes.STATUS_OK){
                activeEndpoint=id;ready=true;
                client.stopAdvertising();client.stopDiscovery();
                emit("connected","Código verificado; intercambio de cambios en curso.",null,null);
            }else emit("error","Se rechazó la conexión o falló el emparejamiento.",null,null);
        }
        @Override public void onDisconnected(@NonNull String id){
            ready=false;activeEndpoint=null;
            emit("disconnected","El otro técnico se desconectó.",null,null);
        }
    };
    private final PayloadCallback callback=new PayloadCallback(){
        @Override public void onPayloadReceived(@NonNull String id,@NonNull Payload p){
            if(!id.equals(activeEndpoint))return;
            if(p.getType()!=Payload.Type.FILE){p.close();return;}
            synchronized(incoming){incoming.put(p.getId(),p);}
        }
        @Override public void onPayloadTransferUpdate(@NonNull String id,@NonNull PayloadTransferUpdate status){
            if(status.getStatus()!=PayloadTransferUpdate.Status.SUCCESS&&status.getStatus()!=PayloadTransferUpdate.Status.FAILURE&&
              status.getStatus()!=PayloadTransferUpdate.Status.CANCELED)return;
            final long payloadId=status.getPayloadId();
            final Payload received;
            synchronized(incoming){received=incoming.remove(payloadId);}
            final File sent;
            synchronized(outgoing){sent=outgoing.remove(payloadId);}
            if(sent!=null){
                if(status.getStatus()==PayloadTransferUpdate.Status.SUCCESS)emit("sent","Los datos llegaron al otro teléfono.",null,null);
                else emit("error","Se interrumpió el envío. Probá otra vez.",null,null);
                io.execute(()->sent.delete());
            }
            if(received==null)return;
            if(status.getStatus()!=PayloadTransferUpdate.Status.SUCCESS){
                received.close();emit("error","La recepción fue interrumpida.",null,null);return;
            }
            io.execute(()->{
                Uri uri=received.asFile()==null?null:received.asFile().asUri();
                try{
                    if(uri==null||received.asFile().getSize()>MAX_JSON)throw new IllegalStateException("Datos demasiado grandes para esta sincronización.");
                    try(InputStream in=host.getContentResolver().openInputStream(uri); ByteArrayOutputStream out=new ByteArrayOutputStream()){
                        if(in==null)throw new IllegalStateException("No se pudo leer la transferencia.");
                        byte[] buf=new byte[16384];int n;
                        while((n=in.read(buf))!=-1){if(out.size()+n>MAX_JSON)throw new IllegalStateException("Transferencia demasiado grande.");out.write(buf,0,n);}
                        String json=out.toString("UTF-8");JSONObject parsed=new JSONObject(json);
                        if(!"eyr-nearby-v1".equals(parsed.optString("schema")))throw new IllegalStateException("Datos EYR incompatibles.");
                        JSONObject msg=new JSONObject();msg.put("json",json);
                        String script="if(window.EYRPeerSync&&window.EYRPeerSync.onNativeData)window.EYRPeerSync.onNativeData("+msg+");";
                        host.runOnUiThread(()->{if(webView!=null)webView.evaluateJavascript(script,null);});
                    }
                }catch(Exception e){emit("error","No se pudieron aplicar los datos: "+e.getMessage(),null,null);}
                finally{
                    received.close();
                    if(uri!=null)try{host.getContentResolver().delete(uri,null,null);}catch(Exception ignored){}
                }
            });
        }
    };
    void send(String json){
        if(json==null||json.length()>MAX_JSON)return;
        final String endpoint=activeEndpoint;
        if(!ready||endpoint==null){emit("error","No se estableció conexión.",null,null);return;}
        io.execute(()->{
            File tmp=null;
            try{
                byte[] bytes=json.getBytes(StandardCharsets.UTF_8);
                if(bytes.length>MAX_JSON)throw new IllegalStateException("Los datos superan el tamaño máximo.");
                tmp=File.createTempFile("eyr_sync_",".json",host.getCacheDir());
                try(FileOutputStream out=new FileOutputStream(tmp)){out.write(bytes);}
                Payload transfer=Payload.fromFile(tmp);
                transfer.setSensitive(true);
                synchronized(outgoing){outgoing.put(transfer.getId(),tmp);}
                client.sendPayload(endpoint,transfer).addOnFailureListener(e->{
                    synchronized(outgoing){File file=outgoing.remove(transfer.getId());if(file!=null)file.delete();}
                    emit("error","No se pudo enviar: "+e.getMessage(),null,null);
                });
            }catch(Exception e){if(tmp!=null)tmp.delete();emit("error","Error al preparar datos: "+e.getMessage(),null,null);}
        });
    }
    void stop(){
        mode="";ready=false;activeEndpoint=null;
        client.stopAdvertising();client.stopDiscovery();client.stopAllEndpoints();
        synchronized(incoming){for(Payload p:incoming.values())p.close();incoming.clear();}
    }
    void close(){
        stop();io.shutdown();
        synchronized(outgoing){for(File f:outgoing.values())f.delete();outgoing.clear();}
    }
}