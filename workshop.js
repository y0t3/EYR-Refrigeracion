/* EYR v2.6: informes de visitas, fotos privadas, voz, errores de display y QR. */
(function(){
'use strict';
let hooks=null,active=null,qrImage=null,dbPromise=null,pendingKind='detalle';
const PHOTO_LIMIT=6;
function esc(s){return String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
function uid(){return 'foto_'+(crypto?.randomUUID?.().replace(/-/g,'')||Date.now()+'_'+Math.random().toString(36).slice(2));}
function db(){return hooks.getDB();}
function reportByVisit(visitId,create){
 if(!visitId)return null;
 db().reports=Array.isArray(db().reports)?db().reports:[];
 let r=db().reports.find(x=>x.visitId===visitId);
 if(!r&&create){r={id:'informe_'+visitId,visitId,notes:'',errorCode:'',errorText:'',photos:[],updatedAt:new Date().toISOString()};db().reports.push(r);hooks.saveDB();}
 return r;
}
function openStore(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!('indexedDB' in window)){reject(Error('El almacenamiento de fotos no está disponible.'));return;}
  const req=indexedDB.open('eyr-refrigeracion-fotos-v1',1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('photos'))req.result.createObjectStore('photos',{keyPath:'id'});};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('No se pudo abrir el archivo local de fotos.'));
 });
 dbPromise.catch(()=>{dbPromise=null;});return dbPromise;
}
async function store(kind,value,id){
 const conn=await openStore();
 return new Promise((resolve,reject)=>{
  const tx=conn.transaction('photos',kind==='get'||kind==='all'?'readonly':'readwrite'),obj=tx.objectStore('photos');
  let req;
  if(kind==='put')req=obj.put(value);
  else if(kind==='get')req=obj.get(id);
  else if(kind==='remove')req=obj.delete(id);
  else if(kind==='clear')req=obj.clear();
  else req=obj.getAll();
  let result=null;req.onsuccess=()=>{result=req.result;};
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('No se pudo guardar la imagen.'));
  tx.onabort=()=>reject(tx.error||Error('Operación de fotos cancelada.'));
 });
}
async function replaceAllPhotos(photos){
 const conn=await openStore();
 return new Promise((resolve,reject)=>{
  const tx=conn.transaction('photos','readwrite'),o=tx.objectStore('photos');o.clear();
  for(const p of photos)o.put({id:p.id,dataUrl:p.dataUrl});
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('No se pudo restaurar fotos'));
 });
}
function record(){return active?.mode==='report'?reportByVisit(active.visitId,false):null;}
function sync(){
 const r=record();if(!r)return;
 const n=document.getElementById('work-notes'),c=document.getElementById('work-error-code'),t=document.getElementById('work-error-text');
 if(n)r.notes=String(n.value||'').slice(0,12000);
 if(c)r.errorCode=String(c.value||'').trim().toUpperCase().slice(0,24);
 if(t)r.errorText=String(t.value||'').slice(0,1500);
 r.updatedAt=new Date().toISOString();hooks.saveDB();
}
function reportHTML(r,v){
 const photos=r.photos||[],eq=db().equipment.find(x=>x.id===v.equipmentId);
 const images=photos.map(p=>'<div class="eyr-work-photo"><div class="eyr-work-photo-image"><img data-work-photo="'+esc(p.id)+'" alt="Fotografía de '+esc(p.kind)+'"><span>'+esc(({antes:'ANTES',despues:'DESPUÉS',detalle:'DETALLE'})[p.kind]||'FOTO')+'</span></div>'+
  '<input type="text" data-work-caption="'+esc(p.id)+'" value="'+esc(p.caption||'')+'" maxlength="110" placeholder="Descripción de la foto">'+
  '<button class="btn btn-small btn-danger" data-action="work-remove-photo" data-id="'+esc(p.id)+'">Quitar foto</button></div>').join('');
 return '<div class="eyr-work"><div class="eyr-work-summary"><strong>'+esc(v.client||'Cliente')+'</strong><small>'+esc(v.date||'')+' · '+esc(v.description||'Trabajo técnico')+'</small>'+
 (eq?'<small>❄️ '+esc(eq.brand+' '+eq.model)+'</small>':'')+'</div>'+
 '<h3>📸 Registro fotográfico</h3><p class="eyr-work-help">Sacá fotos del antes, después o de un detalle. Las imágenes quedan guardadas solamente en este dispositivo.</p>'+
 '<div class="eyr-work-photo-actions">'+['antes','despues','detalle'].map(kind=>'<button class="btn btn-small btn-blue" data-action="work-photo-choose" data-kind="'+kind+'">+ '+({antes:'Antes',despues:'Después',detalle:'Detalle'})[kind]+'</button>').join('')+'</div>'+
 '<p class="eyr-work-help">'+photos.length+' / '+PHOTO_LIMIT+' fotos. Podés usar cámara o una imagen recibida por WhatsApp.</p>'+
 (images?'<div class="eyr-work-gallery">'+images+'</div>':'<div class="eyr-work-empty">Todavía no hay fotografías de esta visita.</div>')+
 '<input type="file" accept="image/*" id="work-photo-file" hidden>'+
 '<h3>🎙️ Observaciones técnicas</h3><textarea id="work-notes" rows="5" maxlength="12000" placeholder="Qué encontraste, qué hiciste y cómo quedó el equipo...">'+esc(r.notes||'')+'</textarea>'+
 '<button type="button" class="btn btn-small" data-action="work-voice">🎙️ Dictar observaciones</button>'+
 '<p class="eyr-work-help">El dictado depende del reconocimiento de voz instalado en el teléfono; revisá el texto antes de guardar.</p>'+
 '<h3>⚠️ Código mostrado en display</h3><div class="form-grid"><div class="field"><label>Código observado</label>'+
 '<input id="work-error-code" value="'+esc(r.errorCode||'')+'" maxlength="24" placeholder="Ej.: CH05, E1, F0"></div>'+
 '<div class="field"><label>Texto de la foto / observación</label><input id="work-error-text" value="'+esc(r.errorText||'')+'" maxlength="1500" placeholder="Anotación o lectura del display"></div></div>'+
 '<div class="eyr-work-photo-actions"><button type="button" class="btn btn-small btn-blue" data-action="work-error-camera">📷 Leer display</button>'+
 '<button type="button" class="btn btn-small" data-action="work-error-gallery">🖼️ Cargar foto</button></div>'+
 '<div class="eyr-work-warning">El código se guarda como evidencia. Su significado depende del fabricante y del modelo exacto; EYR no inventa diagnósticos ni procedimientos.</div>'+
 '<div class="form-actions"><button class="btn" data-action="work-save">Guardar informe</button>'+
 '<button class="btn btn-blue" data-action="work-pdf" data-mode="view">👁 Ver informe PDF</button>'+
 '<button class="btn btn-primary" data-action="work-pdf" data-mode="share">↗ Compartir PDF</button></div></div>';
}
function renderReport(){
 const v=db().visits.find(x=>x.id===active?.visitId),r=record();
 if(!v||!r){hooks.toast('No encontramos esa visita');return;}
 hooks.modal('Informe de visita · EYR',reportHTML(r,v),true);
 hydrate();
}
async function hydrate(){
 const root=document.getElementById('modal-root');
 if(!root)return;
 const images=Array.from(root.querySelectorAll('[data-work-photo]'));
 for(const img of images){
  const id=img.dataset.workPhoto;
  try{const p=await store('get',null,id);if(p?.dataUrl&&img.isConnected)img.src=p.dataUrl;}
  catch(e){if(img.isConnected)img.alt='Foto no disponible';}
 }
}
function openReport(visitId){
 const visit=db().visits.find(x=>x.id===visitId);
 if(!visit){hooks.toast('Primero registrá la visita');return;}
 active={mode:'report',visitId};reportByVisit(visitId,true);renderReport();
}
function photoSelect(kind){
 const r=record();if(!r)return;
 sync();if((r.photos||[]).length>=PHOTO_LIMIT){hooks.toast('Máximo seis fotos por visita');return;}
 pendingKind=kind||'detalle';
 hooks.modal('Agregar fotografía','<div class="eyr-work"><p>¿Cómo querés agregar la foto de '+esc(pendingKind)+'?</p>'+
  '<div class="eyr-work-photo-actions"><button type="button" class="btn btn-primary" data-action="work-photo-camera">📷 Sacar foto</button>'+
  '<button type="button" class="btn btn-blue" data-action="work-photo-gallery">🖼️ Cargar imagen</button></div>'+
  '<p class="eyr-work-help">La fotografía se comprime para ocupar menos espacio; podés ponerle una descripción después.</p>'+
  '<input type="file" accept="image/*" id="work-photo-file" hidden>'+
  '<div class="form-actions"><button class="btn" data-action="work-back-report">Volver al informe</button></div></div>',true);
}
function beginPhoto(source){
 if(!active||active.mode!=='report')return;
 if(window.EYRAndroid&&typeof window.EYRAndroid.captureWorkPhoto==='function'){
  try{window.EYRAndroid.captureWorkPhoto(source);}catch(e){hooks.toast('No se pudo abrir la cámara o galería');}
 }else{
  const input=document.getElementById('work-photo-file');
  if(!input)return;
  if(source==='camera')input.setAttribute('capture','environment');else input.removeAttribute('capture');
  input.click();
 }
}
async function addPhoto(dataUrl){
 if(!active||active.mode!=='report'||!dataUrl?.startsWith('data:image/jpeg;base64,'))return;
 if(dataUrl.length>550000){hooks.toast('La foto es demasiado grande. Probá con otra.');renderReport();return;}
 const r=record();if(!r)return;
 if(r.photos.length>=PHOTO_LIMIT){hooks.toast('Máximo seis fotos');renderReport();return;}
 const id=uid();
 try{
  await store('put',{id,dataUrl});
  r.photos.push({id,kind:pendingKind,caption:''});
  hooks.saveDB();renderReport();hooks.toast('Foto agregada al informe');
 }catch(e){hooks.toast('No se pudo guardar la foto: '+e.message);renderReport();}
}
async function webPhoto(file){
 if(!file)return;
 try{
  if(!file.type.startsWith('image/'))throw Error('Elegí una imagen');
  if(file.size>25*1024*1024)throw Error('Imagen muy grande');
  const data=await new Promise((ok,fail)=>{const rd=new FileReader();rd.onload=()=>ok(rd.result);rd.onerror=()=>fail(Error('No se puede leer'));rd.readAsDataURL(file);});
  const img=await new Promise((ok,fail)=>{const m=new Image();m.onload=()=>ok(m);m.onerror=()=>fail(Error('Formato no compatible'));m.src=data;});
  const size=Math.min(1,1200/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.width*size));canvas.height=Math.max(1,Math.round(img.height*size));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  let jpeg=canvas.toDataURL('image/jpeg',.65);
  if(jpeg.length>500000)jpeg=canvas.toDataURL('image/jpeg',.42);
  await addPhoto(jpeg);
 }catch(e){hooks.toast('No se pudo importar foto: '+e.message);renderReport();}
}
function onNativePhoto(value){
 if(value?.cancelled){renderReport();return;}
 if(value?.error){hooks.toast(value.error);renderReport();return;}
 addPhoto(value?.image||'');
}
async function removePhoto(id){
 const r=record();if(!r?.photos.some(p=>p.id===id))return;
 if(!hooks.confirm('¿Quitar esta foto del informe?'))return;
 try{await store('remove',null,id);r.photos=r.photos.filter(p=>p.id!==id);hooks.saveDB();renderReport();}
 catch(e){hooks.toast('No se pudo eliminar la foto');}
}
function onNativeVoice(value){
 if(active?.mode!=='report')return;
 if(value?.error){hooks.toast(String(value.error));return;}
 if(value?.cancelled)return;
 const tx=document.getElementById('work-notes');
 if(!tx)return;
 const s=String(value?.text||'').trim();
 tx.value=(tx.value?tx.value.trim()+'\n':'')+s;sync();hooks.toast('Dictado agregado. Revisá el texto.');
}
function possibleCodes(raw){
 const text=String(raw||'').toUpperCase().replace(/\u00a0/g,' '),regex=/\b(?:CH\s*[-]?\s*\d{2,3}|[EFPUHC]\s*[-]?\s*\d{1,3})\b/g;
 const matches=(text.match(regex)||[]).map(s=>s.replace(/\s|-/g,'')).filter(s=>s.length>=2);
 return [...new Set(matches)].slice(0,7);
}
function errorPicker(){
 if(!active)return;
 const raw=String(active.lastErrorOCR||''),matches=possibleCodes(raw);
 const choices=matches.map(v=>'<button class="btn btn-small btn-blue" data-action="work-error-select" data-code="'+esc(v)+'">'+esc(v)+'</button>').join('');
 hooks.modal('Lectura del display','<div class="eyr-work"><p>Texto leído desde el display:</p>'+
  '<pre class="eyr-work-ocr">'+esc(raw||'No se detectó ningún texto claro')+'</pre>'+
  '<p class="eyr-work-help">Elegí un código posible y confirmalo contra la pantalla real.</p>'+
  '<div class="eyr-work-photo-actions">'+(choices||'<span>No hay códigos claros; ingresalo manualmente en el informe.</span>')+'</div>'+
  '<div class="form-actions"><button class="btn btn-blue" data-action="work-error-manual">Escribir código manualmente</button>'+
  '<button class="btn" data-action="work-back-report">Volver</button></div></div>',true);
}
function errorCamera(source){
 if(!active)return;
 if(active.mode==='report')sync();
 if(window.EYRAndroid?.scanLabel)window.EYRAndroid.scanLabel('error-'+source);
 else hooks.toast('La lectura automática de displays requiere la APK Android.');
}
function onNativeError(value){
 if(value?.cancelled){if(active?.mode==='report')renderReport();return;}
 if(value?.error){hooks.toast(value.error);if(active?.mode==='report')renderReport();return;}
 if(!active)return;
 active.lastErrorOCR=String(value?.text||'').slice(0,1500);errorPicker();
}
function selectError(code){
 if(!active)return;
 const raw=String(active.lastErrorOCR||'').slice(0,1500);
 if(active.mode==='report'){
  const r=record();if(!r)return;r.errorCode=String(code||'').toUpperCase().slice(0,24);r.errorText=raw;
  hooks.saveDB();renderReport();
 }else{
  active.chosenCode=code||'';active.raw=raw;renderStandalone();
 }
}
function renderStandalone(){
 if(!active||active.mode!=='standalone')return;
 const visits=[...db().visits].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,120);
 const options='<option value="">Elegir visita para guardar</option>'+visits.map(v=>'<option value="'+esc(v.id)+'">'+esc(v.client+' · '+v.date+' · '+v.description)+'</option>').join('');
 hooks.modal('⚠️ Leer código de error','<div class="eyr-work"><p>Fotografiá el display del aire o cargá la foto que envió el cliente.</p>'+
 '<div class="eyr-work-photo-actions"><button class="btn btn-blue" data-action="work-error-camera">📷 Leer display</button>'+
 '<button class="btn" data-action="work-error-gallery">🖼️ Cargar foto</button></div>'+
 '<div class="field"><label>Código leído (confirmar)</label><input id="work-standalone-code" value="'+esc(active.chosenCode||'')+'" maxlength="24" placeholder="Ej.: CH05, E1, F0"></div>'+
 '<div class="eyr-work-warning">No existe un significado universal para los códigos de error. Consultá el manual del modelo exacto antes de interpretarlos.</div>'+
 '<div class="field"><label>Registrar en una visita</label><select id="work-standalone-visit">'+options+'</select></div>'+
 '<div class="form-actions"><button class="btn btn-primary" data-action="work-error-save">Guardar código en visita</button>'+
 '<button class="btn" data-action="work-close">Cerrar</button></div></div>',true);
}
function openStandalone(){active={mode:'standalone',chosenCode:'',raw:''};renderStandalone();}
function saveStandalone(){
 const code=String(document.getElementById('work-standalone-code')?.value||'').trim().toUpperCase();
 const visitId=document.getElementById('work-standalone-visit')?.value;
 if(!code||!visitId){hooks.toast('Confirmá el código y elegí una visita');return;}
 const r=reportByVisit(visitId,true);r.errorCode=code.slice(0,24);r.errorText=String(active?.raw||'').slice(0,1500);
 hooks.saveDB();openReport(visitId);hooks.toast('Código registrado en informe');
}
async function makePDF(mode){
 sync();const r=record(),v=db().visits.find(x=>x.id===active?.visitId);if(!r||!v)return;
 try{
  hooks.toast('Generando informe PDF…');
  const photos=[];for(const p of (r.photos||[])){const saved=await store('get',null,p.id);if(saved?.dataUrl)photos.push({...p,dataUrl:saved.dataUrl});}
  const client=db().clients.find(c=>c.id===v.clientId);
  const eq=db().equipment.find(e=>e.id===v.equipmentId);
  const blob=await window.EYRWorkshopPDF.report(r,v,photos,client,eq);
  hooks.download(blob,'EYR-Informe-'+String(v.date||'visita')+'-'+String(v.id).slice(-8)+'.pdf',mode);
 }catch(e){hooks.toast('No se pudo generar informe: '+e.message);}
}
function showQr(equipmentId){
 const eq=db().equipment.find(x=>x.id===equipmentId);if(!eq){hooks.toast('Equipo no encontrado');return;}
 active={mode:'qr',equipmentId,qrData:''};qrImage=null;
 renderQr();if(window.EYRAndroid?.generateEquipmentQR)window.EYRAndroid.generateEquipmentQR(equipmentId);
}
function renderQr(){
 if(active?.mode!=='qr')return;
 const eq=db().equipment.find(x=>x.id===active.equipmentId),client=db().clients.find(c=>c.id===eq?.clientId);
 if(!eq)return;
 hooks.modal('QR del equipo · EYR','<div class="eyr-work eyr-work-qr"><p>Imprimí esta etiqueta y pegala en el equipo. Al escanearla desde EYR, se abre su ficha e historial local.</p>'+
 (active.qrData?'<img src="'+active.qrData+'" alt="QR de equipo EYR">':'<div class="eyr-work-empty">Generando QR…</div>')+
 '<strong>'+esc(eq.brand)+' '+esc(eq.model)+'</strong><small>'+esc(client?.name||'Cliente')+'</small>'+
 '<p class="eyr-work-help">Los QR identifican equipos guardados en este teléfono. En otro celular hace falta importar una copia de los datos de EYR.</p>'+
 '<div class="form-actions"><button class="btn btn-primary" data-action="work-qr-pdf" '+(active.qrData?'':'disabled')+'>📄 Etiqueta PDF</button>'+
 '<button class="btn" data-action="work-scan-qr">📷 Escanear QR</button><button class="btn" data-action="work-close">Cerrar</button></div></div>',true);
}
function onNativeQRImage(value){if(active?.mode==='qr'&&active.equipmentId===value?.id){active.qrData=String(value.image||'');renderQr();}}
async function qrPDF(){
 if(active?.mode!=='qr'||!active.qrData)return;
 const e=db().equipment.find(x=>x.id===active.equipmentId),c=db().clients.find(x=>x.id===e?.clientId);
 try{hooks.download(await window.EYRWorkshopPDF.qrSticker(active.qrData,e,c),'EYR-QR-'+String(e.model).replace(/[^a-z0-9]/gi,'-').slice(0,45)+'.pdf','share');}
 catch(ex){hooks.toast('No se pudo crear etiqueta: '+ex.message);}
}
function scanQr(source){
 if(!window.EYRAndroid?.scanLabel){hooks.toast('El lector QR requiere Android.');return;}
 window.EYRAndroid.scanLabel('qr-'+(source||'camera'));
}
function onNativeQR(value){
 if(value?.cancelled)return;
 if(value?.error){hooks.toast(value.error);return;}
 const text=String(value?.text||'').trim(),match=text.match(/^EYR:EQ:1:([A-Za-z0-9_-]{4,100})$/);
 if(!match){hooks.toast('No es una etiqueta QR de EYR');return;}
 const eq=db().equipment.find(e=>e.id===match[1]);
 if(!eq){hooks.toast('Este equipo no está en el dispositivo. Importá el respaldo correspondiente.');return;}
 active=null;hooks.closeModal();hooks.equipmentDetail(eq.id);
}
async function exportFull(){
 try{
  hooks.toast('Preparando copia completa con fotos…');
  const all=await store('all');const blob=window.EYRWorkshopBackup.exportZip(db(),all||[]);
  hooks.download(blob,'EYR-Copia-Completa-'+new Date().toISOString().slice(0,10)+'.zip');
 }catch(e){hooks.toast('No se pudo exportar copia completa: '+e.message);}
}
async function importFull(file){
 if(!file)return;
 try{
  hooks.toast('Validando respaldo completo…');
  const parsed=await window.EYRWorkshopBackup.importZip(file);
  if(!hooks.confirm('Esta copia reemplazará clientes, visitas, informes y fotos de este dispositivo. ¿Continuar?'))return;
  await replaceAllPhotos(parsed.photos);
  hooks.restoreDB(parsed.db);
  active=null;hooks.toast('Copia completa con fotos restaurada.');
 }catch(e){hooks.toast('No se pudo importar copia: '+e.message);}
}
function fileChange(el){
 if(el.id==='work-photo-file'){webPhoto(el.files?.[0]);el.value='';return true;}
 if(el.id==='work-import-zip'){importFull(el.files?.[0]);el.value='';return true;}
 if(el.hasAttribute('data-work-caption')){
  const r=record(),photo=r?.photos.find(x=>x.id===el.dataset.workCaption);
  if(photo){photo.caption=String(el.value||'').slice(0,110);hooks.saveDB();}return true;
 }
 return false;
}
function onDeleteVisit(id){
 const r=db().reports?.find(x=>x.visitId===id);
 if(!r)return;
 for(const p of r.photos||[])store('remove',null,p.id).catch(()=>{});
 db().reports=db().reports.filter(x=>x.visitId!==id);
}
function handle(action,el){
 if(action==='work-open-report'){openReport(el.dataset.id);return true;}
 if(action==='work-photo-choose'){photoSelect(el.dataset.kind);return true;}
 if(action==='work-photo-camera'){beginPhoto('camera');return true;}
 if(action==='work-photo-gallery'){beginPhoto('gallery');return true;}
 if(action==='work-back-report'){renderReport();return true;}
 if(action==='work-remove-photo'){removePhoto(el.dataset.id);return true;}
 if(action==='work-save'){sync();hooks.toast('Informe guardado');return true;}
 if(action==='work-voice'){sync();if(window.EYRAndroid?.startVoiceInput)window.EYRAndroid.startVoiceInput();else hooks.toast('El dictado necesita la APK Android.');return true;}
 if(action==='work-error-camera'||action==='work-error-gallery'){errorCamera(action.endsWith('camera')?'camera':'gallery');return true;}
 if(action==='work-error-select'){selectError(el.dataset.code);return true;}
 if(action==='work-error-manual'){if(active?.mode==='report'){const r=record();r.errorText=String(active.lastErrorOCR||'');hooks.saveDB();renderReport();}else renderStandalone();return true;}
 if(action==='work-error-save'){saveStandalone();return true;}
 if(action==='work-open-error'){openStandalone();return true;}
 if(action==='work-pdf'){makePDF(el.dataset.mode==='share'?'share':'view');return true;}
 if(action==='work-qr-open'){showQr(el.dataset.id);return true;}
 if(action==='work-scan-qr'){scanQr('camera');return true;}
 if(action==='work-qr-pdf'){qrPDF();return true;}
 if(action==='work-export-full'){exportFull();return true;}
 if(action==='work-import-full'){document.getElementById('work-import-zip')?.click();return true;}
 if(action==='work-close'){active=null;hooks.closeModal();return true;}
 return false;
}
function init(h){
 hooks=h;
 db().reports=Array.isArray(db().reports)?db().reports:[];
}
window.EYRWorkshop={init,openReport,openStandalone,showQr,scanQr,handle,fileChange,onNativePhoto,onNativeVoice,onNativeError,onNativeQR,onNativeQRImage,
 possibleCodes,exportFull,importFull,onDeleteVisit,photoStore:store};
})();