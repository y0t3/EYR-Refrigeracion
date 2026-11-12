package com.eyr.refrigeracion;

import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.ContentUris;
import android.content.ClipData;
import android.database.Cursor;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.SystemClock;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.graphics.BitmapFactory;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;

/** Local-only WebView shell. No EYR customer information is uploaded. */
public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String ROOT = ORIGIN + "/assets/";
    private static final int IMPORT_FILE = 34;
    private static final int EXPORT_FILE = 35;
    private WebView webView;
    private ImageView startupImage;
    private final Handler splashHandler = new Handler(Looper.getMainLooper());
    private long splashShownAt;
    private boolean splashDismissed=false;
    private final ExecutorService backupExecutor=Executors.newSingleThreadExecutor();
    private android.webkit.ValueCallback<Uri[]> uploadCallback;
    private byte[] pendingExport;
    private String pendingMime;
    private String pendingAction="save";
    private long lastBackPress=0L;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Los insets reservan el área de notificaciones; el fondo debe ser oscuro
        // también en Android 15, donde la barra del sistema es transparente.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(android.graphics.Color.rgb(3, 10, 24));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(3, 10, 24));
        getWindow().getDecorView().setBackgroundColor(android.graphics.Color.rgb(3, 10, 24));
        if (Build.VERSION.SDK_INT >= 29) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                // Sin APPEARANCE_LIGHT_*: hora, señal y batería en blanco.
                controller.setSystemBarsAppearance(0,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                getWindow().getDecorView().getSystemUiVisibility() &
                ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
        webView = new WebView(this);
        webView.setBackgroundColor(android.graphics.Color.rgb(4, 17, 34));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setDefaultTextEncodingName("utf-8");
        settings.setUserAgentString(settings.getUserAgentString() + " EYRAndroid/1.9");
        webView.addJavascriptInterface(new NativeBridge(), "EYRAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (!"appassets.androidplatform.net".equals(u.getHost()) || !"https".equals(u.getScheme())) return null;
                String path = u.getPath();
                if (path == null || !path.startsWith("/assets/")) return null;
                String relative = path.substring("/assets/".length());
                if (relative.isEmpty()) relative = "index.html";
                if (relative.startsWith("/") || relative.contains("..") || relative.contains("\\"))
                    return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                try {
                    InputStream stream = getAssets().open(relative);
                    String mime;
                    if (relative.endsWith(".html")) mime="text/html";
                    else if (relative.endsWith(".css")) mime="text/css";
                    else if (relative.endsWith(".js")) mime="text/javascript";
                    else if (relative.endsWith(".json") || relative.endsWith(".webmanifest")) mime="application/json";
                    else if (relative.endsWith(".jpg") || relative.endsWith(".jpeg")) mime="image/jpeg";
                    else if (relative.endsWith(".png")) mime="image/png";
                    else mime="application/octet-stream";
                    return new WebResourceResponse(mime, "utf-8", stream);
                } catch (Exception ex) {
                    return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("appassets.androidplatform.net".equals(uri.getHost())) return false;
                if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()) || "geo".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException ex) { showMessage("No hay aplicación para abrir este enlace"); }
                    return true;
                }
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onCreateWindow(WebView view,boolean isDialog,boolean isUserGesture,Message resultMsg){
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient(){
                    @Override public boolean shouldOverrideUrlLoading(WebView child,WebResourceRequest request){
                        try {startActivity(new Intent(Intent.ACTION_VIEW,request.getUrl()));}
                        catch(Exception e){showMessage("No se pudo abrir el mapa");}
                        child.destroy();return true;
                    }
                });
                WebView.WebViewTransport transport=(WebView.WebViewTransport)resultMsg.obj;
                transport.setWebView(popup);resultMsg.sendToTarget();return true;
            }
            @Override public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback=callback;
                try { startActivityForResult(params.createIntent(), IMPORT_FILE); }
                catch (Exception ex) { uploadCallback.onReceiveValue(null); uploadCallback=null; showMessage("No se pudo abrir el selector de archivos"); }
                return true;
            }
        });
        // Android 15 (target 35) fuerza edge-to-edge: respetar barras de estado y navegación.
        // El padding se aplica al contenedor, NO a la página HTML.
        FrameLayout safeRoot = new FrameLayout(this);
        safeRoot.setBackgroundColor(android.graphics.Color.rgb(3, 10, 24));
        safeRoot.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        // Portada nativa Fuego & Hielo mientras carga la app.
        startupImage = new ImageView(this);
        startupImage.setBackgroundColor(android.graphics.Color.rgb(3,10,24));
        startupImage.setScaleType(ImageView.ScaleType.FIT_CENTER);
        try (InputStream input = getAssets().open("assets/splash-eyr.jpg")) {
            startupImage.setImageBitmap(BitmapFactory.decodeStream(input));
        } catch (Exception ex) {
            android.util.Log.w("EYRSplash","No se pudo cargar el arte",ex);
        }
        safeRoot.addView(startupImage,new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.MATCH_PARENT));
        splashShownAt=SystemClock.uptimeMillis();
        if (Build.VERSION.SDK_INT >= 35) {
            safeRoot.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(safeRoot);
        // Si la página falla, el splash no bloquea el uso indefinidamente.
        splashHandler.postDelayed(this::hideStartupImage,7000L);
        webView.loadUrl(ROOT + "index.html");
    }

    private void hideStartupImage(){
        if(splashDismissed||startupImage==null)return;
        splashDismissed=true;
        ImageView image=startupImage;
        image.animate().alpha(0f).setDuration(360L).withEndAction(()->{
            if(image.getParent() instanceof FrameLayout)
                ((FrameLayout)image.getParent()).removeView(image);
            if(startupImage==image)startupImage=null;
        }).start();
    }
    private void splashReady(){
        runOnUiThread(()->{
            long elapsed=SystemClock.uptimeMillis()-splashShownAt;
            splashHandler.postDelayed(this::hideStartupImage,Math.max(0L,1450L-elapsed));
        });
    }
    private void showMessage(String s) { runOnUiThread(() -> Toast.makeText(this,s,Toast.LENGTH_LONG).show()); }

    private void askPermissionForReminders(String json) {
        if(Build.VERSION.SDK_INT < 33) return;
        if(!EYRLocalServices.hasActive(json))return;
        if(checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)return;
        android.content.SharedPreferences prefs=getSharedPreferences("eyr-permissions",MODE_PRIVATE);
        if(prefs.getBoolean("notifications_asked",false))return;
        prefs.edit().putBoolean("notifications_asked",true).apply();
        requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},201);
    }
    private void writeAutomaticBackup(String json) {
        if(Build.VERSION.SDK_INT<29) {
            // On older Android devices, use the app-specific external document directory.
            try {
                java.io.File base=getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
                if(base!=null){
                    java.io.File dst=new java.io.File(base,"EYR-Respaldo-Automatico.json");
                    try(java.io.FileOutputStream out=new java.io.FileOutputStream(dst,false)){
                        out.write(json.getBytes(StandardCharsets.UTF_8));
                    }
                }
            }catch(Exception ex){android.util.Log.w("EYRBackup","Respaldo automático",ex);}
            return;
        }
        Uri uri=null;boolean created=false;
        try{
            String filename="EYR-Respaldo-Automatico.json";
            uri=findSavedDocument(filename);
            if(uri==null){
                ContentValues info=new ContentValues();
                info.put(MediaStore.MediaColumns.DISPLAY_NAME,filename);
                info.put(MediaStore.MediaColumns.MIME_TYPE,"application/json");
                info.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/EYR Refrigeracion");
                uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,info);
                created=true;
            }
            if(uri==null)throw new java.io.IOException("No se pudo crear el respaldo");
            try(OutputStream out=getContentResolver().openOutputStream(uri,"rwt")){
                if(out==null)throw new java.io.IOException("Archivo inaccesible");
                out.write(json.getBytes(StandardCharsets.UTF_8));
            }
        }catch(Exception ex){
            if(created&&uri!=null)getContentResolver().delete(uri,null,null);
            android.util.Log.w("EYRBackup","Respaldo automático",ex);
        }
    }


    /** Apertura externa sin envío automático de mensajes. */
    private void launchClientWhatsApp(String number) {
        if(number==null || !number.matches("[1-9][0-9]{9,14}")) {
            showMessage("Número de WhatsApp incompleto o inválido");
            return;
        }
        Uri deepLink=Uri.parse("whatsapp://send?phone="+number);
        for(String pkg : new String[]{"com.whatsapp","com.whatsapp.w4b"}) {
            Intent whatsapp=new Intent(Intent.ACTION_VIEW,deepLink);
            whatsapp.setPackage(pkg);
            try {startActivity(whatsapp);return;}
            catch(ActivityNotFoundException ignored) {}
            catch(Exception ex) {android.util.Log.w("EYRWhatsApp","No se pudo abrir "+pkg,ex);}
        }
        try {startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://wa.me/"+number)));}
        catch(Exception ex) {showMessage("No se encontró una aplicación para abrir WhatsApp");}
    }

    public class NativeBridge {
        @JavascriptInterface public void openWhatsApp(String number) {
            runOnUiThread(()->launchClientWhatsApp(number));
        }
        @JavascriptInterface public void appReady(){splashReady();}
        @JavascriptInterface public void syncReminders(String visitsJson) {
            if(visitsJson==null||visitsJson.length()>4000000)return;
            runOnUiThread(()->{
                EYRLocalServices.sync(MainActivity.this,visitsJson);
                askPermissionForReminders(visitsJson);
            });
        }
        @JavascriptInterface public void autoBackup(String data) {
            if(data==null||data.length()>6000000)return;
            backupExecutor.submit(()->writeAutomaticBackup(data));
        }
        @JavascriptInterface public void saveFile(String dataUrl, String fileName, String mimeType, String action) {
            try {
                int comma = dataUrl.indexOf(',');
                if (comma<0 || dataUrl.length()>12000000)
                    throw new IllegalArgumentException("Archivo demasiado grande");
                byte[] bytes=Base64.decode(dataUrl.substring(comma+1),Base64.DEFAULT);
                final String safe=fileName.replaceAll("[^a-zA-Z0-9._ -]","_");
                final String mime="application/pdf".equals(mimeType)?"application/pdf":"application/json";
                final String mode="share".equals(action)||"view".equals(action)?action:"save";
                runOnUiThread(()->saveBytes(bytes,safe,mime,mode));
            }catch(Exception ex){showMessage("No se pudo preparar el documento: "+ex.getMessage());}
        }
    }
    private Uri findSavedDocument(String name){
        String folder=Environment.DIRECTORY_DOWNLOADS+"/EYR Refrigeracion/";
        String clause=MediaStore.MediaColumns.DISPLAY_NAME+"=? AND "+MediaStore.MediaColumns.RELATIVE_PATH+"=?";
        try(Cursor cursor=getContentResolver().query(
                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                new String[]{MediaStore.MediaColumns._ID},
                clause,new String[]{name,folder},MediaStore.MediaColumns._ID+" DESC")){
            if(cursor!=null&&cursor.moveToFirst())
                return ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI,cursor.getLong(0));
        }catch(Exception ignored){}
        return null;
    }
    private void openPdf(Uri uri){
        try{
            Intent intent=new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri,"application/pdf");
            intent.setClipData(ClipData.newRawUri("PDF EYR",uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(intent);
        }catch(Exception ex){showMessage("No se encontró un visor de PDF. Podés abrirlo desde Descargas.");}
    }
    private void sharePdf(Uri uri){
        try{
            Intent send=new Intent(Intent.ACTION_SEND);
            send.setType("application/pdf");
            send.putExtra(Intent.EXTRA_STREAM,uri);
            send.setClipData(ClipData.newRawUri("Documento EYR",uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(send,"Enviar PDF por WhatsApp"));
        }catch(Exception ex){showMessage("No hay una aplicación disponible para compartir este PDF.");}
    }
    private void afterPdfSaved(Uri uri,String mime,String mode){
        if(!"application/pdf".equals(mime)||"save".equals(mode)){
            showMessage("Guardado en Descargas / EYR Refrigeracion");return;
        }
        if("view".equals(mode))openPdf(uri);
        else if("share".equals(mode))sharePdf(uri);
    }
    private void saveBytes(byte[] bytes,String name,String mime,String mode){
        if(Build.VERSION.SDK_INT>=29){
            Uri uri=null;boolean created=false;
            try{
                // Reutiliza el PDF del mismo cliente y número; no acumula copias idénticas.
                uri=findSavedDocument(name);
                if(uri==null){
                    ContentValues info=new ContentValues();
                    info.put(MediaStore.MediaColumns.DISPLAY_NAME,name);
                    info.put(MediaStore.MediaColumns.MIME_TYPE,mime);
                    info.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/EYR Refrigeracion");
                    uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,info);
                    created=true;
                }
                if(uri==null)throw new FileNotFoundException("Sin acceso a Descargas");
                try(OutputStream out=getContentResolver().openOutputStream(uri,"rwt")){
                    if(out==null)throw new FileNotFoundException("No se pudo escribir el PDF");
                    out.write(bytes);
                }
                afterPdfSaved(uri,mime,mode);
            }catch(Exception ex){
                if(created&&uri!=null)getContentResolver().delete(uri,null,null);
                showMessage("Error al guardar: "+ex.getMessage());
            }
        }else{
            pendingExport=bytes;pendingMime=mime;pendingAction=mode;
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.setType(mime);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.putExtra(Intent.EXTRA_TITLE,name);
            try{startActivityForResult(intent,EXPORT_FILE);}
            catch(Exception ex){showMessage("No se pudo abrir el guardado");}
        }
    }
    @Override protected void onActivityResult(int code,int result,Intent data){
        super.onActivityResult(code,result,data);
        if(code==IMPORT_FILE&&uploadCallback!=null){
            uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));
            uploadCallback=null;
        }else if(code==EXPORT_FILE&&pendingExport!=null){
            if(result==RESULT_OK&&data!=null&&data.getData()!=null){
                try(OutputStream out=getContentResolver().openOutputStream(data.getData(),"rwt")){
                    if(out==null)throw new FileNotFoundException("No se puede escribir");
                    out.write(pendingExport);
                    afterPdfSaved(data.getData(),pendingMime,pendingAction);
                }catch(Exception ex){showMessage("Error al guardar: "+ex.getMessage());}
            }
            pendingExport=null;pendingMime=null;pendingAction="save";
        }
    }
    @Override public void onBackPressed(){
        if(webView==null){super.onBackPressed();return;}
        webView.evaluateJavascript(
          "(function(){try{return !!(window.EYRGoBack && window.EYRGoBack());}catch(e){return false;}})()",
          result->{
              if("true".equals(result))return;
              long now=SystemClock.elapsedRealtime();
              if(now-lastBackPress<2200L){finish();}
              else{lastBackPress=now;showMessage("Tocá atrás otra vez para salir de EYR");}
          });
    }
    @Override public void onDestroy(){splashHandler.removeCallbacksAndMessages(null);backupExecutor.shutdown();if(webView!=null){webView.destroy();webView=null;}super.onDestroy();}
}