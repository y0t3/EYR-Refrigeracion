package com.eyr.refrigeracion;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Offline reminders only. Android may defer inexact alarms while saving battery. */
public final class EYRLocalServices {
    private static final String PREFS = "eyr-local-reminders";
    private static final String DATA = "visits";
    private static final String CHANNEL = "eyr_visitas";
    private static final String TAG = "EYRLocal";
    private EYRLocalServices() {}

    private static PendingIntent pending(Context context, JSONObject visit) {
        String id=visit.optString("id","");
        Intent intent=new Intent(context, ReminderReceiver.class);
        intent.setAction("com.eyr.refrigeracion.REMINDER");
        intent.setData(Uri.parse("eyr://visita/"+Uri.encode(id)));
        intent.putExtra("client",visit.optString("client","Cliente"));
        intent.putExtra("description",visit.optString("description","Visita técnica"));
        intent.putExtra("time",visit.optString("time",""));
        intent.putExtra("address",visit.optString("address",""));
        return PendingIntent.getBroadcast(context,id.hashCode(),intent,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }

    private static boolean active(JSONObject v) {
        String status=v.optString("status","pendiente");
        return ("pendiente".equals(status)||"confirmada".equals(status)) &&
            v.optInt("reminderMinutes",0)>0 && !v.optString("id","").isEmpty();
    }
    public static boolean hasActive(String json) {
        try {
            JSONArray arr=new JSONArray(json);
            for(int i=0;i<arr.length();i++)if(active(arr.getJSONObject(i)))return true;
        }catch(Exception ignored){}
        return false;
    }
    public static void sync(Context context, String json) {
        SharedPreferences prefs=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
        String old=prefs.getString(DATA,"[]");
        schedule(context,old,true);
        prefs.edit().putString(DATA,json).apply();
        schedule(context,json,false);
    }
    private static void schedule(Context context,String json,boolean cancel) {
        AlarmManager alarms=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if(alarms==null)return;
        try {
            JSONArray array=new JSONArray(json);
            SimpleDateFormat format=new SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.ROOT);
            format.setLenient(false);
            long now=System.currentTimeMillis();
            for(int i=0;i<array.length();i++){
                JSONObject v=array.optJSONObject(i);
                if(v==null||v.optString("id","").isEmpty())continue;
                PendingIntent pi=pending(context,v);
                if(cancel){alarms.cancel(pi);pi.cancel();continue;}
                if(!active(v))continue;
                Date date;
                try{date=format.parse(v.optString("date","")+" "+v.optString("time",""));}
                catch(Exception parseEx){continue;}
                if(date==null)continue;
                long when=date.getTime()-v.optInt("reminderMinutes",0)*60000L;
                if(when<=now||date.getTime()<=now)continue;
                if(Build.VERSION.SDK_INT>=23)alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
                else alarms.set(AlarmManager.RTC_WAKEUP,when,pi);
            }
        }catch(Exception e){Log.w(TAG,"Recordatorios no programados",e);}
    }
    public static final class ReminderReceiver extends BroadcastReceiver {
        @Override public void onReceive(Context context,Intent intent){
            if(Build.VERSION.SDK_INT>=33 &&
               context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
            NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
            if(manager==null)return;
            if(Build.VERSION.SDK_INT>=26){
                NotificationChannel channel=new NotificationChannel(CHANNEL,"Visitas programadas",NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("Recordatorios de agenda EYR Refrigeración");
                manager.createNotificationChannel(channel);
            }
            String client=intent.getStringExtra("client");
            String description=intent.getStringExtra("description");
            String time=intent.getStringExtra("time");
            String address=intent.getStringExtra("address");
            String content=(time==null?"":time+" · ")+(client==null?"Cliente":client)+" · "+(description==null?"Visita técnica":description);
            if(address!=null&&!address.isEmpty())content+=" · "+address;
            Intent open=new Intent(context,MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent tap=PendingIntent.getActivity(context,0,open,
                PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(context,CHANNEL):new Notification.Builder(context);
            builder.setSmallIcon(R.drawable.ic_stat_eyr)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(),R.mipmap.ic_launcher))
                .setColor(Color.rgb(0,190,245))
                .setContentTitle("EYR · Próxima visita")
                .setContentText(content)
                .setStyle(new Notification.BigTextStyle().bigText(content))
                .setContentIntent(tap).setAutoCancel(true);
            manager.notify(intent.getData()==null?117:intent.getData().hashCode(), builder.build());
        }
    }
    public static final class BootReceiver extends BroadcastReceiver {
        @Override public void onReceive(Context context,Intent intent){
            if(!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) &&
               !Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction()))return;
            String current=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(DATA,"[]");
            schedule(context,current,false);
        }
    }
}
