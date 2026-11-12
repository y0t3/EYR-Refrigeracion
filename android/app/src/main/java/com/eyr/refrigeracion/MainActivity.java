package com.eyr.refrigeracion;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

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
    private android.webkit.ValueCallback<Uri[]> uploadCallback;
    private byte[] pendingExport;
    private String pendingMime;

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
        settings.setUserAgentString(settings.getUserAgentString() + " EYRAndroid/1.4");
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
        if (Build.VERSION.SDK_INT >= 35) {
            safeRoot.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(safeRoot);
        webView.loadUrl(ROOT + "index.html");
    }

    private void showMessage(String s) { runOnUiThread(() -> Toast.makeText(this,s,Toast.LENGTH_LONG).show()); }

    public class NativeBridge {
        @JavascriptInterface public void saveFile(String dataUrl, String fileName, String mimeType) {
            try {
                int comma = dataUrl.indexOf(',');
                if (comma<0 || dataUrl.length()>12000000) throw new IllegalArgumentException("Archivo demasiado grande");
                byte[] bytes = Base64.decode(dataUrl.substring(comma+1),Base64.DEFAULT);
                final String safe = fileName.replaceAll("[^a-zA-Z0-9._ -]", "_");
                final String mime = (mimeType!=null && mimeType.equals("application/pdf")) ? "application/pdf" : "application/json";
                runOnUiThread(() -> saveBytes(bytes, safe, mime));
            } catch(Exception ex) { showMessage("No se pudo guardar el archivo: " + ex.getMessage()); }
        }
    }
    private void saveBytes(byte[] bytes,String name,String mime) {
        if(Build.VERSION.SDK_INT>=29) {
            Uri uri=null;
            try {
                ContentValues info = new ContentValues();
                info.put(MediaStore.MediaColumns.DISPLAY_NAME,name);
                info.put(MediaStore.MediaColumns.MIME_TYPE,mime);
                info.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS + "/EYR Refrigeracion");
                uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, info);
                if (uri==null) throw new FileNotFoundException("Sin acceso a Descargas");
                try (OutputStream out=getContentResolver().openOutputStream(uri)) {
                    if(out==null) throw new FileNotFoundException("No se pudo escribir el archivo");
                    out.write(bytes);
                }
                showMessage("Guardado en Descargas / EYR Refrigeracion");
            } catch (Exception e) { if(uri!=null)getContentResolver().delete(uri,null,null);showMessage("Error al guardar: "+e.getMessage()); }
        } else {
            pendingExport=bytes;pendingMime=mime;
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.setType(mime);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.putExtra(Intent.EXTRA_TITLE,name);
            try {startActivityForResult(intent,EXPORT_FILE);} catch(Exception e) {showMessage("No se pudo abrir el guardado");}
        }
    }
    @Override protected void onActivityResult(int code,int result,Intent data){
        super.onActivityResult(code,result,data);
        if(code==IMPORT_FILE && uploadCallback!=null){
            uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));
            uploadCallback=null;
        } else if(code==EXPORT_FILE && pendingExport!=null){
            if(result==RESULT_OK && data!=null && data.getData()!=null){
                try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
                    if(out==null)throw new FileNotFoundException("No se puede escribir");
                    out.write(pendingExport);showMessage("Archivo guardado correctamente");
                }catch(Exception ex){showMessage("Error al guardar: "+ex.getMessage());}
            }
            pendingExport=null;pendingMime=null;
        }
    }
    @Override public void onBackPressed(){if(webView!=null && webView.canGoBack())webView.goBack();else super.onBackPressed();}
    @Override public void onDestroy(){if(webView!=null){webView.destroy();webView=null;}super.onDestroy();}
}