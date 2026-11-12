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

function errorLib(){return window.EYRErrorLibrary||null;}
function errorContext(){
 if(!active)return {brand:'',model:''};
 if(active.mode==='standalone')return {brand:active.brand||'',model:active.model||''};
 const v=db().visits.find(x=>x.id===active.visitId),r=record(),eq=db().equipment.find(x=>x.id===v?.equipmentId);
 return {brand:r?.errorBrand||eq?.brand||'',model:r?.errorModel||eq?.model||''};
}
function brandOptions(chosen){
 const brands=errorLib()?.brands||['Samsung','LG','Surrey','BGH','Hitachi','Philco','Carrier'];
 return '<option value="">Elegir marca</option>'+brands.map(b=>'<option value="'+esc(b)+'" '+(b.toLowerCase()===String(chosen||'').toLowerCase()?'selected':'')+'>'+esc(b)+'</option>').join('');
}
function errorMeaning(brand,code,model){
 const lib=errorLib(),normalized=lib?.normalizeCode(code)||String(code||'').trim().toUpperCase();
 if(!normalized)return '';
 if(!brand)return '<div class="eyr-error-result eyr-error-unverified"><strong>Código '+esc(normalized)+'</strong><p>Seleccioná la marca. El mismo código puede indicar cosas distintas.</p></div>';
 const info=lib?.lookup(brand,normalized,model);
 if(!info){
  const alternatives=(lib?.candidates(brand,normalized)||[]).filter(x=>x.scope==='documented-series');
  if(alternatives.length){
   const cards=alternatives.slice(0,6).map(x=>'<div class="eyr-error-variant">'+
    '<strong>'+esc(x.family||'Línea específica')+' · '+esc(x.title)+'</strong>'+
    '<p>'+esc(x.description)+'</p>'+
    '<small>Modelos documentados: '+esc((x.models||[]).join(' · '))+'</small>'+
    '<a href="'+esc(x.source)+'" target="_blank" rel="noopener noreferrer">📄 Manual oficial de esta línea</a></div>').join('');
   return '<div class="eyr-error-result eyr-error-unverified"><strong>'+esc(brand)+' · '+esc(normalized)+' · depende del modelo</strong>'+
    '<p>Encontré '+alternatives.length+' '+(alternatives.length===1?'interpretación documentada':'interpretaciones documentadas')+
    ', pero ninguna coincide todavía con el modelo ingresado <b>'+esc(model||'(sin modelo)')+'</b>. No asigné un diagnóstico.</p>'+
    '<div class="eyr-error-variants">'+cards+'</div>'+
    '<div class="eyr-error-caveat">Revisá la etiqueta del equipo y elegí el modelo exacto para confirmar qué tabla corresponde.</div></div>';
  }
  const philco=String(brand).toLowerCase()==='philco';
  const msg=philco?'El manual oficial localizado describe síntomas y avisos de un portátil, pero no publica una tabla de códigos alfanuméricos aplicable a otros aires Philco. No se debe asignar automáticamente un significado.':
    'Todavía no hay una interpretación verificable para esta combinación de marca y código. Consultá el manual específico.';
  const source=philco?'<a class="eyr-error-source" href="https://philco.com.ar/soporte/faqs" target="_blank" rel="noopener noreferrer">🌐 Soporte y manuales Philco</a>':'';
  return '<div class="eyr-error-result eyr-error-unverified"><strong>'+esc(brand)+' · '+esc(normalized)+'</strong><p>'+msg+'</p>'+source+'</div>';
 }
 const verified=info.verifiedForExactModel===true;
 const label=verified?'✓ Manual oficial del modelo '+esc(info.model):'📚 Guía general '+esc(info.brand);
 const caveat=verified?'Coincide el modelo con la lista del manual '+esc(info.family||'')+'. El código señala la condición detectada, pero no determina por sí solo qué pieza falló.':
  'Referencia general de la marca. No se verificó su aplicación al modelo '+esc(model||'exacto')+'. Confirmar con el manual específico.';
 return '<div class="eyr-error-result '+(info.kind==='aviso'?'eyr-error-info':'')+'"><small>'+label+' · '+(info.kind==='aviso'?'Aviso / función':'Posible incidencia')+'</small>'+
 '<strong>'+esc(info.code)+' · '+esc(info.title)+'</strong><p>'+esc(info.description)+'</p>'+
 '<div class="eyr-error-check"><b>Qué revisar:</b> '+esc(info.check)+'</div>'+
 '<div class="eyr-error-caveat">'+caveat+'</div>'+
 '<a class="eyr-error-source" href="'+esc(info.source)+'" target="_blank" rel="noopener noreferrer">📄 Abrir manual del fabricante</a></div>';
}
function setReportErrorContext(r,brand,model){
 const lib=errorLib();
 r.errorBrand=lib?.normalizeBrand(brand)||'';
 r.errorModel=String(model||'').trim().slice(0,110);
 const info=lib?.lookup(r.errorBrand,r.errorCode,r.errorModel);
 r.errorMeaning=info?{code:info.code,title:info.title,description:info.description,source:info.source,kind:info.kind,scope:info.validation||'guia-general-de-marca',family:info.family||'',verifiedForExactModel:!!info.verifiedForExactModel}:null;
}
function modelSuggestions(brand){
 const coverage=errorLib()?.coverage?.();
 const options=(coverage?.[brand]?.modelsList||[]);
 return options.map(m=>'<option value="'+esc(m)+'"></option>').join('');
}
function showErrorCatalog(){
 if(!active)return;
 if(active.mode==='standalone')rememberStandalone();
 else if(active.mode==='report')sync();
 const lib=errorLib(),context=errorContext(),brand=context.brand;
 const all=(lib?.entries||[]).filter(x=>x.brand===brand);
 const byFamily=new Map();
 for(const item of all){
  const family=item.family||'Referencias generales de la marca';
  if(!byFamily.has(family))byFamily.set(family,[]);
  byFamily.get(family).push(item);
 }
 const body=[...byFamily.entries()].map(([family,records])=>{
  const models=[...new Set(records.flatMap(r=>r.models||[]))];
  const rows=records.map(x=>'<div class="eyr-error-catalog-row"><button type="button" class="btn btn-small btn-blue" data-action="work-error-catalog-select" data-code="'+esc(x.code)+'">'+esc(x.code)+'</button>'+
   '<div><strong>'+esc(x.title)+'</strong><small>'+esc(x.description)+'</small></div></div>').join('');
  return '<details class="eyr-error-catalog-family"><summary>'+esc(family)+' <small>· '+records.length+' códigos</small></summary>'+
   (models.length?'<p class="eyr-work-help">Modelos incluidos: '+esc(models.join(', '))+'</p>':'<p class="eyr-work-help">Referencia general. Confirmar modelo.</p>')+
   rows+'</details>';
 }).join('');
 const fallback=brand==='Philco'
  ?'<div class="eyr-work-warning">No se encontró una tabla de códigos alfanuméricos suficientemente verificable para los splits Philco consultados. Sus manuales oficiales describen síntomas, pero no corresponde atribuir E1 o E2 de otras marcas.</div><a href="https://philco.com.ar/soporte/faqs" target="_blank" rel="noopener noreferrer">Consultar manuales y soporte Philco</a>'
  :'<p>Elegí una marca primero para ver su biblioteca.</p>';
 hooks.modal('📚 Biblioteca de errores '+(brand?'· '+brand:''),'<div class="eyr-work"><p class="eyr-work-help">'+all.length+' referencias técnicas. Cada familia tiene su propia tabla; algunas pueden compartir códigos con significados diferentes.</p>'+
 (body||fallback)+'<div class="form-actions"><button class="btn" data-action="work-back-report">Volver al lector</button></div></div>',true);
}
function chooseCatalogError(code){
 if(!active)return;
 const normalized=errorLib()?.normalizeCode(code)||code;
 if(active.mode==='standalone'){active.chosenCode=normalized;renderStandalone();}
 else if(active.mode==='report'){
  const r=record();if(!r)return;
  const context=errorContext();r.errorCode=normalized;
  setReportErrorContext(r,context.brand,context.model);hooks.saveDB();renderReport();
 }
}
function rememberStandalone(){
 if(active?.mode!=='standalone')return;
 const brand=document.getElementById('work-standalone-brand'),model=document.getElementById('work-standalone-model'),
       code=document.getElementById('work-standalone-code'),visit=document.getElementById('work-standalone-visit');
 if(brand)active.brand=String(brand.value||'');
 if(model)active.model=String(model.value||'').trim().slice(0,110);
 if(code)active.chosenCode=errorLib()?.normalizeCode(code.value)||String(code.value||'').trim().toUpperCase();
 if(visit)active.visitId=String(visit.value||'');
}
function sync(){
 const r=record();if(!r)return;
 const n=document.getElementById('work-notes'),c=document.getElementById('work-error-code'),t=document.getElementById('work-error-text');
 const brandEl=document.getElementById('work-error-brand'),modelEl=document.getElementById('work-error-model');
 const visit=db().visits.find(x=>x.id===active?.visitId),eq=db().equipment.find(x=>x.id===visit?.equipmentId);
 if(n)r.notes=String(n.value||'').slice(0,12000);
 if(c)r.errorCode=(errorLib()?.normalizeCode(c.value)||String(c.value||'').trim().toUpperCase()).slice(0,24);
 if(t)r.errorText=String(t.value||'').slice(0,1500);
 setReportErrorContext(r,brandEl?brandEl.value:(r.errorBrand||eq?.brand||''),modelEl?modelEl.value:(r.errorModel||eq?.model||''));
 r.updatedAt=new Date().toISOString();hooks.saveDB();
}
function reportHTML(r,v){
 const photos=r.photos||[],eq=db().equipment.find(x=>x.id===v.equipmentId);
 const brand=r.errorBrand||eq?.brand||'',model=r.errorModel||eq?.model||'';
 const found=errorMeaning(brand,r.errorCode,model);
 const images=photos.map(p=>'<div class="eyr-work-photo"><div class="eyr-work-photo-image"><img data-work-photo="'+esc(p.id)+'" alt="Fotografía de '+esc(p.kind)+'"><span>'+esc(({antes:'ANTES',despues:'DESPUÉS',detalle:'DETALLE'})[p.kind]||'FOTO')+'</span></div>'+
  '<input type="text" data-work-caption="'+esc(p.id)+'" value="'+esc(p.caption||'')+'" maxlength="110" placeholder="Descripción de la foto">'+
  '<div class="eyr-work-photo-actions"><button class="btn btn-small btn-blue" data-action="work-mark-photo" data-id="'+esc(p.id)+'">↗ Marcar con flechas</button><button class="btn btn-small btn-danger" data-action="work-remove-photo" data-id="'+esc(p.id)+'">Quitar</button></div></div>').join('');
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
 '<h3>⚠️ Código mostrado en display</h3><div class="form-grid">'+
 '<div class="field"><label>Marca</label><select id="work-error-brand">'+brandOptions(brand)+'</select></div>'+
 '<div class="field"><label>Modelo (según etiqueta)</label><input id="work-error-model" list="eyr-known-error-models" value="'+esc(model)+'" maxlength="110" placeholder="Código exacto de modelo"><datalist id="eyr-known-error-models">'+modelSuggestions(brand)+'</datalist></div>'+
 '<div class="field"><label>Código observado</label><input id="work-error-code" value="'+esc(r.errorCode||'')+'" maxlength="24" placeholder="Ej.: CH05, E5, CF"></div>'+
 '<div class="field"><label>Texto leído / anotación</label><input id="work-error-text" value="'+esc(r.errorText||'')+'" maxlength="1500" placeholder="Lectura original de la foto"></div></div>'+
 '<div class="eyr-work-photo-actions"><button type="button" class="btn btn-small btn-blue" data-action="work-error-camera">📷 Leer display</button>'+
 '<button type="button" class="btn btn-small" data-action="work-error-gallery">🖼️ Cargar foto</button>'+
 '<button type="button" class="btn btn-small" data-action="work-error-review">📚 Consultar código</button><button type="button" class="btn btn-small" data-action="work-error-library">📖 Ver biblioteca</button></div>'+
 found+
 '<div class="eyr-work-warning">La lectura de una foto no equivale a un diagnóstico. Las referencias generales por marca deben confirmarse contra el manual del modelo exacto.</div>'+
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
  try{
   const p=await store('get',null,id);
   if(p?.dataUrl&&img.isConnected){
    const meta=record()?.photos.find(x=>x.id===id);
    if(!meta?.arrows?.length){img.src=p.dataUrl;continue;}
    const source=new Image();source.onload=()=>{
      const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
      for(const ar of meta.arrows)drawArrow(ctx,canvas.width,canvas.height,ar);
      if(img.isConnected)img.src=canvas.toDataURL('image/jpeg',.78);
    };source.src=p.dataUrl;
   }
  }
  catch(e){if(img.isConnected)img.alt='Foto no disponible';}
 }
}
function openReport(visitId){
 const visit=db().visits.find(x=>x.id===visitId);
 if(!visit){hooks.toast('Primero registrá la visita');return;}
 active={mode:'report',visitId};reportByVisit(visitId,true);renderReport();
}

function drawArrow(ctx,width,height,a){
 if(!a)return;
 const x=a.x1*width,y=a.y1*height,xx=a.x2*width,yy=a.y2*height;
 const angle=Math.atan2(yy-y,xx-x),head=Math.max(12,Math.min(width,height)*.035);
 ctx.save();ctx.strokeStyle='#ff621e';ctx.fillStyle='#ff621e';ctx.lineWidth=Math.max(4,Math.min(width,height)*.009);
 ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();
 ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx-head*Math.cos(angle-.55),yy-head*Math.sin(angle-.55));
 ctx.lineTo(xx-head*Math.cos(angle+.55),yy-head*Math.sin(angle+.55));ctx.closePath();ctx.fill();ctx.restore();
}
function annotatePosition(event,canvas){
 const rect=canvas.getBoundingClientRect();
 return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),
         y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};
}
async function markPhoto(id){
 sync();const r=record(),p=r?.photos.find(x=>x.id===id);if(!p)return;
 const imageData=(await store('get',null,id))?.dataUrl;
 if(!imageData){hooks.toast('No encontramos esta foto');renderReport();return;}
 hooks.modal('↗ Marcar desperfecto','<div class="eyr-work"><p class="eyr-work-help">Deslizá el dedo sobre la foto para dibujar flechas hacia el desperfecto. Podés agregar varias y deshacerlas sin modificar la foto original.</p>'+
 '<canvas id="work-arrow-canvas" class="eyr-work-arrow-canvas"></canvas>'+
 '<div class="form-actions"><button class="btn btn-blue" data-action="work-arrow-undo">↶ Deshacer flecha</button><button class="btn btn-primary" data-action="work-back-report">Guardar y volver</button></div></div>',true);
 active.markedPhotoId=id;
 const canvas=document.getElementById('work-arrow-canvas');if(!canvas)return;
 const img=new Image();
 img.onload=()=>{
  const scale=Math.min(1,1100/Math.max(img.width,img.height));
  canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  const ctx=canvas.getContext('2d');let start=null,current=null;
  const draw=()=>{
   ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   for(const ar of p.arrows||[])drawArrow(ctx,canvas.width,canvas.height,ar);
   if(start&&current)drawArrow(ctx,canvas.width,canvas.height,{x1:start.x,y1:start.y,x2:current.x,y2:current.y});
  };
  draw();
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();start=annotatePosition(e,canvas);current=start;canvas.setPointerCapture(e.pointerId);draw();});
  canvas.addEventListener('pointermove',e=>{if(!start)return;e.preventDefault();current=annotatePosition(e,canvas);draw();});
  canvas.addEventListener('pointerup',e=>{
   if(!start)return;e.preventDefault();const end=annotatePosition(e,canvas);
   if(Math.hypot(end.x-start.x,end.y-start.y)>.02){
    p.arrows=Array.isArray(p.arrows)?p.arrows:[];
    if(p.arrows.length<5){p.arrows.push({x1:start.x,y1:start.y,x2:end.x,y2:end.y});hooks.saveDB();}
    else hooks.toast('Máximo cinco flechas por foto');
   }
   start=null;current=null;draw();
  });
  active.redrawArrows=draw;
 };
 img.onerror=()=>hooks.toast('No se pudo abrir la foto');
 img.src=imageData;
}
function undoArrow(){
 const r=record(),p=r?.photos.find(x=>x.id===active?.markedPhotoId);
 if(p?.arrows?.length){p.arrows.pop();hooks.saveDB();active.redrawArrows?.();}
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
function possibleCodes(raw,brand='',model=''){
 const text=String(raw||'').toUpperCase().replace(/\u00a0/g,' '),lib=errorLib(),found=[],seen=new Set();
 // Un solo recorrido preserva el orden de lectura de la foto.
 // Los códigos numéricos de Hitachi solo se habilitan para el controlador PSC-A128EX.
 const numericHitachi=brand==='Hitachi'&&/^PSC-?A128EX$/i.test(String(model||''));
 const expression=/\b(?:CH\s*[-]?\s*\d{1,3}|[EFPUHCS]\s*[-]?\s*\d{1,3}|[A-Z]{2,5}\d{0,3}[A-Z]?|\d{2})\b/g;
 for(const hit of text.matchAll(expression)){
  const rawCode=hit[0],code=lib?.normalizeCode(rawCode)||rawCode.replace(/[\s._-]/g,'');
  if(!code||seen.has(code))continue;
  const classic=/^(?:CH\d{1,3}|[EFPUHCS]\d{1,3})$/.test(code);
  const digits=/^\d{2}$/.test(code);
  if(digits&&!(numericHitachi&&lib?.candidates('Hitachi',code)?.length))continue;
  if(!digits&&!classic&&!lib?.matches(code)?.length)continue;
  seen.add(code);found.push(code);
  if(found.length>=8)break;
 }
 return found;
}
function errorPicker(){
 if(!active)return;
 const raw=String(active.lastErrorOCR||''),context=errorContext(),matches=possibleCodes(raw,context.brand,context.model);
 const choices=matches.map(code=>'<div class="eyr-error-choice"><button type="button" class="btn btn-small btn-primary" data-action="work-error-select" data-code="'+esc(code)+'">✓ Confirmar '+esc(code)+'</button>'+
 errorMeaning(context.brand,code,context.model)+'</div>').join('');
 hooks.modal('Código detectado en el display','<div class="eyr-work"><p>Texto leído desde la foto:</p>'+
  '<pre class="eyr-work-ocr">'+esc(raw||'No se pudo reconocer texto claro')+'</pre>'+
  '<p class="eyr-work-help">EYR encontró posibles códigos. Confirmalos visualmente antes de guardarlos. Marca: <strong>'+esc(context.brand||'sin seleccionar')+'</strong>.</p>'+
  '<div class="eyr-work-error-matches">'+(choices||'<div class="eyr-work-warning">No reconocimos un código. Podés escribirlo manualmente.</div>')+'</div>'+
  '<div class="form-actions"><button class="btn btn-blue" data-action="work-error-manual">Escribir manualmente</button>'+
  '<button class="btn" data-action="work-back-report">Volver</button></div></div>',true);
}
function errorCamera(source){
 if(!active)return;
 if(active.mode==='report')sync();else rememberStandalone();
 if(window.EYRAndroid?.scanLabel)window.EYRAndroid.scanLabel('error-'+source);
 else hooks.toast('La lectura automática requiere la APK Android.');
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
 const normalized=errorLib()?.normalizeCode(code)||String(code||'').trim().toUpperCase();
 if(active.mode==='report'){
  const r=record();if(!r)return;
  const context=errorContext();
  r.errorCode=normalized.slice(0,24);r.errorText=raw;
  setReportErrorContext(r,context.brand,context.model);
  hooks.saveDB();renderReport();
 }else{
  active.chosenCode=normalized;active.raw=raw;renderStandalone();
 }
}
function renderStandalone(){
 if(!active||active.mode!=='standalone')return;
 const visits=[...db().visits].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,120);
 const options='<option value="">Elegir visita para guardar</option>'+visits.map(v=>'<option value="'+esc(v.id)+'" '+(active.visitId===v.id?'selected':'')+'>'+esc(v.client+' · '+v.date+' · '+v.description)+'</option>').join('');
 hooks.modal('⚠️ Leer código de error','<div class="eyr-work"><p>Fotografiá el display o cargá una imagen recibida por WhatsApp. Elegí la marca para obtener una referencia técnica.</p>'+
 '<div class="eyr-work-photo-actions"><button class="btn btn-primary" data-action="duo-open">📷 Diagnóstico con dos fotos</button><button class="btn btn-blue" data-action="work-error-camera">📷 Leer display</button>'+
 '<button class="btn" data-action="work-error-gallery">🖼️ Cargar foto</button></div>'+
 '<div class="form-grid"><div class="field"><label>Marca</label><select id="work-standalone-brand">'+brandOptions(active.brand||'')+'</select></div>'+
 '<div class="field"><label>Modelo (consultá etiqueta)</label><input id="work-standalone-model" list="eyr-known-error-models" maxlength="110" value="'+esc(active.model||'')+'" placeholder="Código exacto de modelo"><datalist id="eyr-known-error-models">'+modelSuggestions(active.brand)+'</datalist></div>'+
 '<div class="field full"><label>Código leído (confirmar)</label><input id="work-standalone-code" value="'+esc(active.chosenCode||'')+'" maxlength="24" placeholder="Ej.: CH05, E5, CF"></div></div>'+
 '<div class="eyr-work-photo-actions"><button class="btn btn-small btn-blue" data-action="work-error-review">📚 Consultar posible problema</button><button class="btn btn-small" data-action="work-error-library">📖 Ver biblioteca</button></div>'+
 errorMeaning(active.brand,active.chosenCode,active.model)+
 '<div class="eyr-work-warning">La interpretación debe coincidir con el modelo exacto del manual. Si no lo ingresás, EYR mostrará alternativas documentadas sin elegir una por vos.</div>'+
 '<div class="field"><label>Registrar en una visita</label><select id="work-standalone-visit">'+options+'</select></div>'+
 '<div class="form-actions"><button class="btn btn-primary" data-action="work-error-save">Guardar código en visita</button>'+
 '<button class="btn" data-action="work-close">Cerrar</button></div></div>',true);
}
function openStandalone(){active={mode:'standalone',chosenCode:'',raw:'',brand:'',model:'',visitId:''};renderStandalone();}
function saveStandalone(){
 rememberStandalone();
 const code=errorLib()?.normalizeCode(active.chosenCode)||'',visitId=active.visitId;
 if(!code||!visitId){hooks.toast('Confirmá el código y elegí una visita');return;}
 const r=reportByVisit(visitId,true);
 r.errorCode=code.slice(0,24);r.errorText=String(active?.raw||'').slice(0,1500);
 setReportErrorContext(r,active.brand,active.model);
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
 if(el.id==='work-standalone-visit'&&active?.mode==='standalone'){
  rememberStandalone();
  const v=db().visits.find(x=>x.id===active.visitId),eq=db().equipment.find(x=>x.id===v?.equipmentId);
  if(eq){active.brand=eq.brand||active.brand;active.model=eq.model||active.model;}
  renderStandalone();return true;
 }
 if(['work-standalone-brand','work-standalone-model','work-standalone-code'].includes(el.id)&&active?.mode==='standalone'){
  rememberStandalone();renderStandalone();return true;
 }
 if(['work-error-brand','work-error-model','work-error-code'].includes(el.id)&&active?.mode==='report'){
  sync();renderReport();return true;
 }
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
 if(action==='work-back-report'){if(active?.mode==='standalone')renderStandalone();else renderReport();return true;}
 if(action==='work-remove-photo'){removePhoto(el.dataset.id);return true;}
 if(action==='work-mark-photo'){markPhoto(el.dataset.id).catch(e=>hooks.toast('No se pudo marcar la foto'));return true;}
 if(action==='work-arrow-undo'){undoArrow();return true;}
 if(action==='work-save'){sync();hooks.toast('Informe guardado');return true;}
 if(action==='work-voice'){sync();if(window.EYRAndroid?.startVoiceInput)window.EYRAndroid.startVoiceInput();else hooks.toast('El dictado necesita la APK Android.');return true;}
 if(action==='work-error-camera'||action==='work-error-gallery'){errorCamera(action.endsWith('camera')?'camera':'gallery');return true;}
 if(action==='work-error-select'){selectError(el.dataset.code);return true;}
 if(action==='work-error-library'){showErrorCatalog();return true;}
 if(action==='work-error-catalog-select'){chooseCatalogError(el.dataset.code);return true;}
 if(action==='work-error-manual'){if(active?.mode==='report'){const r=record();r.errorText=String(active.lastErrorOCR||'');hooks.saveDB();renderReport();}else renderStandalone();return true;}
 if(action==='work-error-review'){
   if(active?.mode==='standalone'){rememberStandalone();renderStandalone();}
   else if(active?.mode==='report'){sync();renderReport();}
   return true;
  }
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
 possibleCodes,errorMeaning,errorContext,exportFull,importFull,onDeleteVisit,photoStore:store};
})();