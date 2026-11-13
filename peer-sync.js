/* EYR · Sincronización de registros cercanos v3.0.
   Unir por ID y fecha de edición; sin nube ni reemplazos completos.
   Los archivos fotográficos permanecen privados en el teléfono: el respaldo ZIP es el método de migrarlos. */
(function(){
'use strict';
const TYPES=['clients','visits','equipment','quotes','remitos','serviceTemplates','reports'];
const LABELS={clients:'clientes',visits:'visitas',equipment:'equipos',quotes:'presupuestos',remitos:'remitos',serviceTemplates:'trabajos frecuentes',reports:'informes'};
const META=['updatedAt','_syncDevice'];
let hooks=null,view=null,mode='',endpoints=[],status='',connected=false,sending=false,lastResult=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function clone(x){return JSON.parse(JSON.stringify(x));}
function trimPhotos(rec,type){const r=clone(rec);if(type==='reports')r.photos=[];return r;}
function canonical(rec,type){
 const r=trimPhotos(rec,type);for(const k of META)delete r[k];
 return JSON.stringify(r);
}
function deviceId(){
 try{let id=localStorage.getItem('eyr-peer-device');
  if(id&&/^[A-Za-z0-9_-]{8,80}$/.test(id))return id;
  id='eyr_'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
  localStorage.setItem('eyr-peer-device',id);return id;
 }catch(e){return 'eyr-device-local';}
}
const myId=deviceId();
let baseline=null;
function createBaseline(data){
 return Object.fromEntries(TYPES.map(k=>[k,new Map((data[k]||[]).filter(r=>r&&r.id).map(r=>[String(r.id),canonical(r,k)]))]));
}
function baselineNow(data){baseline=createBaseline(data);}
function stampMillis(s){const n=Date.parse(String(s||''));return Number.isFinite(n)?n:0;}
function stamp(x){return new Date(x||Date.now()).toISOString();}
function touch(data,now){
 if(!data||typeof data!=='object')return;
 const time=stamp(now);
 data.syncDeleted=data.syncDeleted&&typeof data.syncDeleted==='object'?data.syncDeleted:{};
 if(!baseline){baseline=createBaseline(data);return;}
 for(const type of TYPES){
  const rows=Array.isArray(data[type])?data[type]:[],prev=baseline[type]||new Map(),seen=new Set();
  const tombs=data.syncDeleted[type]&&typeof data.syncDeleted[type]==='object'?data.syncDeleted[type]:{};
  for(const record of rows){
   if(!record||!record.id)continue;
   const id=String(record.id);seen.add(id);
   if(!prev.has(id)||prev.get(id)!==canonical(record,type)){
    record.updatedAt=time;record._syncDevice=myId;
   }
   if(tombs[id]&&stampMillis(record.updatedAt)>=stampMillis(tombs[id].at))delete tombs[id];
  }
  for(const id of prev.keys()){
   if(!seen.has(id))tombs[id]={at:time,device:myId};
  }
  data.syncDeleted[type]=tombs;
 }
 baselineNow(data);
}
function snapshot(data){
 if(!data||!Array.isArray(data.clients)||!Array.isArray(data.visits))throw Error('No se pudieron leer los datos EYR.');
 const copy={schema:'eyr-nearby-v1',device:myId,sentAt:new Date().toISOString(),records:{},syncDeleted:clone(data.syncDeleted||{})};
 for(const type of TYPES)copy.records[type]=(data[type]||[]).filter(r=>r&&typeof r.id==='string').map(r=>trimPhotos(r,type));
 copy.lastNumbers={quote:Number(data.settings?.lastNumber)||0,remito:Number(data.settings?.lastRemitoNumber)||0};
 return copy;
}
function valid(p){
 if(!p||p.schema!=='eyr-nearby-v1'||!p.records||typeof p.records!=='object'||p.device===myId)return false;
 let count=0;
 for(const type of TYPES){
  if(!Array.isArray(p.records[type])||p.records[type].length>30000)return false;
  count+=p.records[type].length;
  for(const r of p.records[type])if(!r||typeof r.id!=='string'||r.id.length>160||!r.id)return false;
 }
 return count<=80000;
}
function priority(r){return [stampMillis(r?.updatedAt||r?.createdAt),String(r?._syncDevice||'')];}
function choose(a,b,type){
 if(!a)return b;if(!b)return a;
 const x=priority(a),y=priority(b);
 if(x[0]!==y[0])return x[0]>y[0]?a:b;
 if(x[1]!==y[1])return x[1]>y[1]?a:b;
 // Cuando son documentos antiguos sin sello de edición, empate deterministicamente.
 return canonical(a,type)>=canonical(b,type)?a:b;
}
function newestDelete(a,b){
 if(!a)return b;if(!b)return a;
 const x=stampMillis(a.at),y=stampMillis(b.at);
 if(x!==y)return x>y?a:b;
 return String(a.device||'')>=String(b.device||'')?a:b;
}
function merge(local,remote){
 if(!valid(remote))throw Error('Este paquete no es una sincronización EYR válida o corresponde al mismo teléfono.');
 const result=clone(local),stats={added:{},updated:{},removed:{},conflicts:[],numberConflicts:[]};
 const deleted=clone(local.syncDeleted||{}),incoming=remote.syncDeleted||{};
 for(const type of TYPES){
  const a=(Array.isArray(local[type])?local[type]:[]),b=remote.records[type]||[];
  const aById=new Map(a.filter(x=>x&&x.id).map(x=>[x.id,x]));
  const bById=new Map(b.filter(x=>x&&x.id).map(x=>[x.id,x]));
  const byId=new Map([...aById,...bById]),out=[];
  const dm={...(deleted[type]||{})};
  for(const [id,t] of Object.entries(incoming[type]||{})){
   if(!/^[A-Za-z0-9_-]{1,160}$/.test(id)||!t||typeof t.at!=='string')continue;
   dm[id]=newestDelete(dm[id],t);
  }
  let add=0,upd=0,remove=0;
  for(const id of byId.keys()){
   const mine=aById.get(id),theirs=bById.get(id);
   const winner=choose(mine,theirs,type);
   const tomb=dm[id];
   if(tomb&&stampMillis(tomb.at)>=priority(winner)[0]&&stampMillis(tomb.at)>0){
    if(mine)remove++;
    continue;
   }
   if(tomb&&priority(winner)[0]>stampMillis(tomb.at))delete dm[id];
   if(mine&&theirs&&canonical(mine,type)!==canonical(theirs,type)){
    // Conflictos: conservar el ganador y avisar en el resumen. No hay reemplazo silencioso.
    stats.conflicts.push({type,id,winner:winner===mine?'local':'remoto',label:String(mine.client||mine.name||mine.description||id).slice(0,60)});
   }
   const row=clone(winner);
   // Las fotos físicas siguen en IndexedDB local. No crear enlaces a fotos ausentes.
   if(type==='reports')row.photos=mine?.photos||[];
   out.push(row);
   if(!mine)add++;
   else if(canonical(mine,type)!==canonical(row,type))upd++;
  }
  result[type]=out;deleted[type]=dm;stats.added[type]=add;stats.updated[type]=upd;stats.removed[type]=remove;
 }
 result.syncDeleted=deleted;
 result.settings={...(local.settings||{}),lastNumber:Math.max(Number(local.settings?.lastNumber)||0,Number(remote.lastNumbers?.quote)||0,...result.quotes.map(q=>Number(q.number)||0)),
  lastRemitoNumber:Math.max(Number(local.settings?.lastRemitoNumber)||0,Number(remote.lastNumbers?.remito)||0,...result.remitos.map(r=>Number(r.number)||0))};
 for(const [kind,type] of [['presupuestos','quotes'],['remitos','remitos']]){
  const used=new Map();
  for(const r of result[type]){
   const number=Number(r.number)||0;if(!number)continue;
   if(used.has(number)&&used.get(number)!==r.id)stats.numberConflicts.push({kind,number});
   else used.set(number,r.id);
  }
 }
 return {data:result,stats};
}
function total(dict){return Object.values(dict||{}).reduce((n,v)=>n+(Number(v)||0),0);}
function statusText(){if(connected)return 'Conectado con otro teléfono';if(mode==='receive')return 'Visible para el otro técnico';if(mode==='search')return 'Buscando el otro teléfono';return 'Sin conexión';}
function render(){
 if(!hooks)return;
 const devices=endpoints.map(e=>'<div class="eyr-peer-device"><div><b>📱 '+esc(e.name)+'</b><small>Teléfono EYR cercano</small></div><button class="btn btn-small btn-primary" data-action="peer-connect" data-id="'+esc(e.id)+'">Conectar</button></div>').join('');
 const result=lastResult?'<div class="eyr-peer-result"><b>✅ Sincronización recibida</b><p>'+total(lastResult.added)+' registros nuevos · '+total(lastResult.updated)+' actualizados · '+total(lastResult.removed)+' eliminados</p>'+
 (lastResult.conflicts.length?'<p class="eyr-peer-warning">⚠️ '+lastResult.conflicts.length+' registro(s) editados en ambos teléfonos. Se conservó la versión con modificación más reciente. Revisá esos trabajos.</p>':'')+
 (lastResult.numberConflicts.length?'<p class="eyr-peer-warning">⚠️ Hay números repetidos de presupuestos o remitos entre los celulares. Revisá su numeración antes de emitir nuevos documentos.</p>':'')+
 '<p class="eyr-peer-hint">Los datos quedaron guardados en este teléfono. Las fotografías no se transfieren en esta modalidad.</p></div>':'';
 const main='<div class="eyr-peer"><p>Compartí y recibí clientes, agenda, equipos, presupuestos y remitos sin internet.</p>'+
 '<div class="eyr-peer-state"><b>● '+esc(statusText())+'</b><small>'+esc(status||'Ambos celulares deben abrir esta función y tener Bluetooth y Wi-Fi activados.')+'</small></div>'+
 (!mode?'<div class="eyr-peer-buttons"><button class="btn btn-primary" data-action="peer-receive">📲 Compartir datos</button><button class="btn btn-blue" data-action="peer-search">🔎 Buscar teléfono</button></div>':mode==='search'?'<div class="eyr-peer-devices">'+(devices||'<p class="eyr-peer-hint">Buscando teléfonos EYR cercanos…</p>')+'</div>':'')+
 result+'<div class="eyr-peer-explain"><p>🔐 Compará el código de seguridad que aparece en ambos teléfonos antes de aceptar.</p>'+
 '<p>📷 Esta sincronización incluye los informes y sus notas, pero no sus fotografías. Para mover fotos usá la copia ZIP completa.</p>'+
 '<p>📍 Funciona solo con celulares próximos. No sincroniza automáticamente entre domicilios distintos.</p></div>'+
 '<div class="form-actions">'+(mode?'<button class="btn" data-action="peer-stop">Detener conexión</button>':'')+'<button class="btn" data-action="peer-close">Cerrar</button></div></div>';
 hooks.modal('📱 Sincronizar teléfonos EYR',main,true);
}
function start(kind){
 if(!window.EYRAndroid?.nearbyStart){hooks.toast('La sincronización cercana necesita la APK Android.');return;}
 if(hooks.hasEditing?.()){hooks.toast('Guardá primero el presupuesto o remito que estás editando.');return;}
 mode=kind;status='Preparando conexión…';endpoints=[];connected=false;lastResult=null;render();
 window.EYRAndroid.nearbyStart(kind);
}
function handle(action,button){
 if(action==='peer-open'){mode='';status='';endpoints=[];connected=false;lastResult=null;render();return true;}
 if(action==='peer-receive'){start('receive');return true;}
 if(action==='peer-search'){start('search');return true;}
 if(action==='peer-connect'){
  const endpoint=endpoints.find(x=>x.id===button.dataset.id);
  if(endpoint&&window.EYRAndroid?.nearbyConnect){status='Solicitando conexión a '+endpoint.name;render();window.EYRAndroid.nearbyConnect(endpoint.id);}
  return true;
 }
 if(action==='peer-stop'||action==='peer-close'){
  window.EYRAndroid?.nearbyStop?.();mode='';connected=false;
  if(action==='peer-close')hooks.closeModal();
  else{status='Conexión finalizada';render();}
  return true;
 }
 return false;
}
function onNativeEvent(event){
 if(!event||!hooks)return;
 const kind=String(event.kind||'');
 if(kind==='found'){
  if(!endpoints.some(x=>x.id===event.id))endpoints.push({id:String(event.id),name:String(event.name||'Otro teléfono EYR')});render();return;
 }
 if(kind==='lost'){endpoints=endpoints.filter(x=>x.id!==event.id);render();return;}
 if(kind==='connected'){
  connected=true;status='Intercambiando cambios entre ambos teléfonos…';render();
  try{
   const payload=JSON.stringify(snapshot(hooks.getDB()));
   if(payload.length>6500000)throw Error('Los datos superan el tamaño máximo. Utilizá el respaldo ZIP.');
   window.EYRAndroid?.nearbySend?.(payload);
  }catch(e){status=String(e.message);render();}
  return;
 }
 if(kind==='disconnected'){connected=false;status='El otro teléfono se desconectó.';render();return;}
 if(kind==='error'){status=String(event.message||'Error de conexión');render();return;}
 if(kind==='status'){status=String(event.message||'');render();return;}
 if(kind==='sent'){status='Datos enviados. Confirmá que ambos teléfonos hayan recibido la sincronización.';render();}
}
function onNativeData(message){
 try{
  if(!hooks||!message?.json)return;
  if(hooks.hasEditing?.())throw Error('No se pueden recibir cambios mientras editás un presupuesto o remito.');
  const remote=JSON.parse(message.json);
  const result=merge(hooks.getDB(),remote);
  // El respaldo local solo se actualiza una vez que se validó todo el paquete.
  hooks.apply(result.data);
  baselineNow(result.data);
  lastResult=result.stats;
  status='Datos combinados y guardados en el teléfono.';render();
 }catch(e){status='No se aplicaron cambios: '+String(e.message||e);render();}
}
function init(next){hooks=next;baselineNow(hooks.getDB());}
window.EYRPeerSync={init,touch,baselineNow,snapshot,merge,handle,onNativeData,onNativeEvent,open:()=>handle('peer-open'),myId};
})();