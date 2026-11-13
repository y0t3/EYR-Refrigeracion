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
import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.speech.RecognizerIntent;
import androidx.exifinterface.media.ExifInterface;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.common.Barcode;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import androidx.core.content.FileProvider;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import org.json.JSONObject;
import java.io.File;
import java.io.IOException;
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
    private static final int LABEL_PICK_IMAGE = 36;
    private static final int LABEL_TAKE_PHOTO = 37;
    private static final int WORK_PHOTO_CAMERA = 38;
    private static final int WORK_PHOTO_PICK = 39;
    private static final int WORK_VOICE = 40;
    private WebView webView;
    private NearbySyncManager nearbySync;
    private ImageView startupImage;
    private final Handler splashHandler = new Handler(Looper.getMainLooper());
    private long splashShownAt;
    private boolean splashDismissed=false;
    private final ExecutorService backupExecutor=Executors.newSingleThreadExecutor();
    private android.webkit.ValueCallback<Uri[]> uploadCallback;
    private Uri labelPhotoUri;
    private File labelPhotoFile;
    private boolean labelScanRequested=false;
    private String labelScanSource="gallery";
    private Uri workPhotoUri;
    private File workPhotoFile;
    private boolean workPhotoRequested=false;
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
        nearbySync=new NearbySyncManager(this,webView);
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



    /** EYR v2.5: foto de la etiqueta local, sin permisos de galería ni subida a servidores. */
    private void startLabelScan(String source) {
        if(labelScanRequested) return;
        if(!source.matches("(camera|gallery|error-camera|error-gallery|qr-camera|qr-gallery|duo-label-camera|duo-label-gallery|duo-error-camera|duo-error-gallery)"))return;
        labelScanSource=source;
        final boolean useCamera=source.endsWith("camera");
        labelScanRequested=true;
        try {
            if(useCamera){
                File dir=new File(getCacheDir(),"eyr-label-ocr");
                if(!dir.exists()&&!dir.mkdirs())throw new IOException("No se pudo preparar la cámara");
                labelPhotoFile=File.createTempFile("etiqueta_",".jpg",dir);
                labelPhotoUri=FileProvider.getUriForFile(this,
                    getPackageName()+".fileprovider",labelPhotoFile);
                Intent camera=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                camera.putExtra(MediaStore.EXTRA_OUTPUT,labelPhotoUri);
                camera.setClipData(ClipData.newUri(getContentResolver(),"Etiqueta EYR",labelPhotoUri));
                camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                startActivityForResult(camera,LABEL_TAKE_PHOTO);
            }else{
                clearLabelPhoto();
                Intent picker=new Intent(Intent.ACTION_GET_CONTENT);
                picker.setType("image/*");
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(Intent.createChooser(picker,"Elegir foto de etiqueta"),LABEL_PICK_IMAGE);
            }
        }catch(Exception ex){
            labelScanRequested=false;
            clearLabelPhoto();
            dispatchLabelResult("", "No se pudo abrir la cámara o galería.",false,source);
        }
    }
    private void clearLabelPhoto(){
        labelPhotoUri=null;
        if(labelPhotoFile!=null){try{labelPhotoFile.delete();}catch(Exception ignored){}}
        labelPhotoFile=null;
    }
    private void dispatchLabelResult(String text,String error,boolean cancelled,String source){
        JSONObject result=new JSONObject();
        try{
            result.put("text",text==null?"":text);
            result.put("error",error==null?"":error);
            result.put("cancelled",cancelled);
            result.put("source",source);
        }catch(Exception ex){return;}
        final String method;
        final String target;
        if(source.startsWith("duo-")){
            method="window.EYRDoublePhoto.onNativeResult";
            target="window.EYRDoublePhoto&&window.EYRDoublePhoto.onNativeResult";
        }else if(source.startsWith("error-")){
            method="window.EYRWorkshop.onNativeError";
            target="window.EYRWorkshop&&window.EYRWorkshop.onNativeError";
        }else{
            method="window.EYRLabelScan.onNativeResult";
            target="window.EYRLabelScan&&window.EYRLabelScan.onNativeResult";
        }
        final String script="if("+target+")"+method+"("+result.toString()+");";
        runOnUiThread(()->{if(webView!=null)webView.evaluateJavascript(script,null);});
    }
    private void recognizeLabelImage(Uri uri,String source) {
        if(uri==null){
            clearLabelPhoto();
            dispatchLabelResult("","No se recibió una imagen.",false,source);
            return;
        }
        if(source.startsWith("qr-")){recognizeQrImage(uri);return;}
        final TextRecognizer recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        try{
            InputImage image=InputImage.fromFilePath(this,uri);
            recognizer.process(image)
                .addOnSuccessListener(found->{
                    dispatchLabelResult(found.getText(),null,false,source);
                })
                .addOnFailureListener(ex->{
                    dispatchLabelResult("","No se pudo leer la foto. Probá con otra imagen más nítida.",false,source);
                })
                .addOnCompleteListener(done->{
                    recognizer.close();
                    clearLabelPhoto();
                });
        }catch(Exception ex){
            recognizer.close();
            clearLabelPhoto();
            dispatchLabelResult("","No se pudo abrir la imagen. Probá en JPG o PNG.",false,source);
        }
    }


    /** Mensajes JS codificados con JSONObject: no se evalúa código originado por el usuario. */
    private void dispatchWorkshop(String callback,JSONObject json){
        if(!callback.matches("onNativePhoto|onNativeVoice|onNativeQR|onNativeQRImage"))return;
        final String js="if(window.EYRWorkshop&&window.EYRWorkshop."+callback+")window.EYRWorkshop."+callback+"("+json.toString()+");";
        runOnUiThread(()->{if(webView!=null)webView.evaluateJavascript(js,null);});
    }
    private JSONObject workResult(String key,String value,String error,boolean cancelled){
        JSONObject obj=new JSONObject();
        try{
            obj.put(key,value==null?"":value);
            obj.put("error",error==null?"":error);
            obj.put("cancelled",cancelled);
        }catch(Exception ignored){}
        return obj;
    }
    private void recognizeQrImage(Uri uri){
        BarcodeScannerOptions opts=new BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE).build();
        final BarcodeScanner scanner=BarcodeScanning.getClient(opts);
        try{
            scanner.process(InputImage.fromFilePath(this,uri))
                .addOnSuccessListener(codes->{
                    String match="";
                    for(Barcode b:codes)if(b.getRawValue()!=null&&b.getRawValue().startsWith("EYR:EQ:1:")){
                        match=b.getRawValue();break;
                    }
                    dispatchWorkshop("onNativeQR",workResult("text",match,match.isEmpty()?"No se reconoció un QR de EYR.":null,false));
                })
                .addOnFailureListener(e->dispatchWorkshop("onNativeQR",workResult("text","","No se pudo leer el QR.",false)))
                .addOnCompleteListener(task->{scanner.close();clearLabelPhoto();});
        }catch(Exception ex){
            scanner.close();clearLabelPhoto();
            dispatchWorkshop("onNativeQR",workResult("text","","No se pudo abrir la foto del QR.",false));
        }
    }
    private void makeEquipmentQR(String equipmentId){
        if(equipmentId==null||!equipmentId.matches("[A-Za-z0-9_-]{4,100}"))return;
        backupExecutor.submit(()->{
            try{
                String data="EYR:EQ:1:"+equipmentId;
                BitMatrix bits=new MultiFormatWriter().encode(data,BarcodeFormat.QR_CODE,460,460);
                Bitmap bitmap=Bitmap.createBitmap(bits.getWidth(),bits.getHeight(),Bitmap.Config.ARGB_8888);
                for(int y=0;y<bits.getHeight();y++)for(int x=0;x<bits.getWidth();x++)
                    bitmap.setPixel(x,y,bits.get(x,y)?android.graphics.Color.BLACK:android.graphics.Color.WHITE);
                ByteArrayOutputStream out=new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.PNG,100,out);bitmap.recycle();
                JSONObject obj=workResult("image","data:image/png;base64,"+
                    Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP),null,false);
                obj.put("id",equipmentId);dispatchWorkshop("onNativeQRImage",obj);
            }catch(Exception ex){
                dispatchWorkshop("onNativeQRImage",workResult("image","","No se pudo generar QR.",false));
            }
        });
    }
    private void startWorkPhoto(String source){
        if(workPhotoRequested)return;
        if(!"camera".equals(source)&&!"gallery".equals(source))return;
        workPhotoRequested=true;
        try{
            if("camera".equals(source)){
                File dir=new File(getCacheDir(),"eyr-label-ocr");
                if(!dir.exists()&&!dir.mkdirs())throw new IOException("Sin almacenamiento temporal");
                workPhotoFile=File.createTempFile("trabajo_",".jpg",dir);
                workPhotoUri=FileProvider.getUriForFile(this,getPackageName()+".fileprovider",workPhotoFile);
                Intent camera=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                camera.putExtra(MediaStore.EXTRA_OUTPUT,workPhotoUri);
                camera.setClipData(ClipData.newUri(getContentResolver(),"Foto EYR",workPhotoUri));
                camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                startActivityForResult(camera,WORK_PHOTO_CAMERA);
            }else{
                clearWorkPhoto();
                Intent picker=new Intent(Intent.ACTION_GET_CONTENT);
                picker.setType("image/*");picker.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(Intent.createChooser(picker,"Elegir foto del trabajo"),WORK_PHOTO_PICK);
            }
        }catch(Exception ex){
            workPhotoRequested=false;clearWorkPhoto();
            dispatchWorkshop("onNativePhoto",workResult("image","","No se pudo abrir la cámara o galería.",false));
        }
    }
    private void clearWorkPhoto(){
        workPhotoUri=null;
        if(workPhotoFile!=null){try{workPhotoFile.delete();}catch(Exception ignored){}}
        workPhotoFile=null;
    }
    private void readWorkPhoto(Uri uri){
        backupExecutor.submit(()->{
            try{
                if(uri==null)throw new IOException("No se recibió una foto");
                BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;
                try(InputStream in=getContentResolver().openInputStream(uri)){BitmapFactory.decodeStream(in,null,bounds);}
                if(bounds.outWidth<=0||bounds.outHeight<=0)throw new IOException("Imagen inválida");
                int factor=1;
                while(Math.max(bounds.outWidth,bounds.outHeight)/factor>1700)factor*=2;
                BitmapFactory.Options opts=new BitmapFactory.Options();opts.inSampleSize=factor;
                Bitmap bmp;
                try(InputStream in=getContentResolver().openInputStream(uri)){bmp=BitmapFactory.decodeStream(in,null,opts);}
                if(bmp==null)throw new IOException("No se pudo leer la imagen");
                try(InputStream in=getContentResolver().openInputStream(uri)){
                    int rot=new ExifInterface(in).getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);
                    float angle=rot==ExifInterface.ORIENTATION_ROTATE_90?90:rot==ExifInterface.ORIENTATION_ROTATE_180?180:rot==ExifInterface.ORIENTATION_ROTATE_270?270:0;
                    if(angle!=0){Matrix matrix=new Matrix();matrix.postRotate(angle);
                        Bitmap turned=Bitmap.createBitmap(bmp,0,0,bmp.getWidth(),bmp.getHeight(),matrix,true);
                        if(turned!=bmp){bmp.recycle();bmp=turned;}}
                }catch(Exception ignored){}
                int m=Math.max(bmp.getWidth(),bmp.getHeight());
                if(m>1150){float k=1150f/m;Bitmap small=Bitmap.createScaledBitmap(bmp,
                    Math.max(1,Math.round(bmp.getWidth()*k)),Math.max(1,Math.round(bmp.getHeight()*k)),true);
                    if(small!=bmp){bmp.recycle();bmp=small;}}
                ByteArrayOutputStream stream=new ByteArrayOutputStream();
                bmp.compress(Bitmap.CompressFormat.JPEG,65,stream);bmp.recycle();
                byte[] bytes=stream.toByteArray();
                if(bytes.length>330000)throw new IOException("Foto muy compleja para guardar; probá otra");
                dispatchWorkshop("onNativePhoto",workResult("image","data:image/jpeg;base64,"+
                    Base64.encodeToString(bytes,Base64.NO_WRAP),null,false));
            }catch(Exception ex){
                dispatchWorkshop("onNativePhoto",workResult("image","",ex.getMessage(),false));
            }finally{runOnUiThread(this::clearWorkPhoto);}
        });
    }
    private void beginVoiceInput(){
        try{
            Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"es-AR");
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT,"Dictá las observaciones del trabajo");
            startActivityForResult(intent,WORK_VOICE);
        }catch(Exception ex){
            dispatchWorkshop("onNativeVoice",workResult("text","","No hay un servicio de dictado disponible en este teléfono.",false));
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
        @JavascriptInterface public void nearbyStart(String mode){
            if(mode==null)return;
            runOnUiThread(()->{if(nearbySync!=null)nearbySync.start(mode);});
        }
        @JavascriptInterface public void nearbyConnect(String endpointId){
            if(endpointId==null)return;
            runOnUiThread(()->{if(nearbySync!=null)nearbySync.connect(endpointId);});
        }
        @JavascriptInterface public void nearbySend(String json){
            if(json==null||json.length()>7000000)return;
            if(nearbySync!=null)nearbySync.send(json);
        }
        @JavascriptInterface public void nearbyStop(){
            runOnUiThread(()->{if(nearbySync!=null)nearbySync.stop();});
        }
        @JavascriptInterface public void startVoiceInput(){runOnUiThread(MainActivity.this::beginVoiceInput);}
        @JavascriptInterface public void generateEquipmentQR(String equipmentId){makeEquipmentQR(equipmentId);}
        @JavascriptInterface public void captureWorkPhoto(String source){runOnUiThread(()->startWorkPhoto(source));}
        @JavascriptInterface public void scanLabel(String source) {
            runOnUiThread(()->startLabelScan(source));
        }
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
                if (comma<0 || dataUrl.length()>95000000)
                    throw new IllegalArgumentException("Archivo demasiado grande");
                byte[] bytes=Base64.decode(dataUrl.substring(comma+1),Base64.DEFAULT);
                final String safe=fileName.replaceAll("[^a-zA-Z0-9._ -]","_");
                final String mime="application/pdf".equals(mimeType)?"application/pdf":
                    "application/zip".equals(mimeType)?"application/zip":"application/json";
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
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){
        super.onRequestPermissionsResult(requestCode,permissions,grantResults);
        if(nearbySync!=null)nearbySync.permissionsResult(requestCode,grantResults);
    }
    @Override protected void onActivityResult(int code,int result,Intent data){
        super.onActivityResult(code,result,data);
        if(code==WORK_VOICE){
            if(result==RESULT_OK&&data!=null){
                ArrayList<String> found=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                dispatchWorkshop("onNativeVoice",workResult("text",found!=null&&!found.isEmpty()?found.get(0):"",null,false));
            }else dispatchWorkshop("onNativeVoice",workResult("text","",null,true));
            return;
        }
        if(code==WORK_PHOTO_CAMERA||code==WORK_PHOTO_PICK){
            workPhotoRequested=false;
            final Uri selected=code==WORK_PHOTO_CAMERA?workPhotoUri:(data==null?null:data.getData());
            if(result!=RESULT_OK){clearWorkPhoto();dispatchWorkshop("onNativePhoto",workResult("image","",null,true));}
            else readWorkPhoto(selected);
            return;
        }
        if(code==LABEL_PICK_IMAGE||code==LABEL_TAKE_PHOTO){
            labelScanRequested=false;
            final String source=labelScanSource;
            final Uri selected=code==LABEL_TAKE_PHOTO?labelPhotoUri:(data==null?null:data.getData());
            if(result!=RESULT_OK){
                clearLabelPhoto();
                if(source.startsWith("qr-"))dispatchWorkshop("onNativeQR",workResult("text","",null,true));
                else dispatchLabelResult("",null,true,source);
            }else recognizeLabelImage(selected,source);
            return;
        }
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
    @Override public void onDestroy(){splashHandler.removeCallbacksAndMessages(null);if(nearbySync!=null)nearbySync.close();backupExecutor.shutdown();clearLabelPhoto();clearWorkPhoto();if(webView!=null){webView.destroy();webView=null;}super.onDestroy();}
}