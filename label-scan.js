/* EYR v2.5 - Reconocimiento de etiquetas: cámara, galería y coincidencia exacta.
   Las imágenes son temporales, nunca se envían a un servidor ni se guardan en db. */
(function(){
'use strict';
let hooks=null;
let state=null;
const brands=['Samsung','LG','Surrey','BGH','Hitachi','Philco','Carrier'];
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function norm(v){return String(v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');}
function exactMatches(text,models){
 const lines=String(text||'').split(/\r?\n/).map(norm).filter(Boolean);
 const seen=new Set();
 return (Array.isArray(models)?models:[]).filter(m=>{
  if(!m||typeof m.id!=='string'||seen.has(m.id))return false;
  seen.add(m.id);
  const key=norm(m.model);
  return key.length>=6&&lines.some(line=>line.includes(key));
 }).sort((a,b)=>norm(b.model).length-norm(a.model).length).slice(0,8);
}
function inferredModel(text){
 const lines=String(text||'').split(/\r?\n/);
 for(const line of lines){
   const m=line.toUpperCase().match(/(?:MODELO|MODEL|MOD\.?|CODIGO|CÓDIGO)\s*(?:NO\.?|N[°º]|NRO\.?)?\s*[:=\-]?\s*([A-Z0-9][A-Z0-9/._\-]{5,32})/);
   if(m)return m[1];
 }
 return '';
}
function inferredSerial(text){
 const lines=String(text||'').split(/\r?\n/);
 for(const line of lines){
   const m=line.toUpperCase().match(/(?:SERIAL|SERIE|S\s*\/\s*N|S\.?N\.?)\s*(?:NO\.?|N[°º])?\s*[:=\-]?\s*([A-Z0-9][A-Z0-9/_\-]{3,35})/);
   if(m)return m[1];
 }
 return '';
}
function inferredBrand(text){
 const upper=String(text||'').toUpperCase();
 return brands.find(brand=>new RegExp('(?:^|[^A-Z])'+brand.toUpperCase()+'(?:$|[^A-Z])','m').test(upper))||'';
}
function candidates(){
 if(!state||!state.text)return [];
 return exactMatches(state.text,[...hooks.localModels(),...hooks.remoteModels()]);
}
function getInputs(){
 const brand=document.getElementById('eyr-label-brand');
 const model=document.getElementById('eyr-label-model');
 const serial=document.getElementById('eyr-label-serial');
 return {brand:String(brand?.value||'').trim().slice(0,70),
         model:String(model?.value||'').trim().slice(0,100),
         serial:String(serial?.value||'').trim().slice(0,100)};
}
function rememberInputs(){
 if(!state)return;
 const values=getInputs();
 state.brand=values.brand;state.model=values.model;state.serial=values.serial;
}
function summary(){
 if(!state)return '';
 const matches=candidates();
 const items=matches.map(m=>'<div class="eyr-scan-match"><div><span class="eyr-scan-match-tag">'+
  (hooks.localModels().some(x=>x.id===m.id)?'✓ Sin conexión':'☁️ GitHub')+
  '</span><strong>'+esc(m.brand)+' · '+esc(m.model)+'</strong><small>Coincidencia exacta del código. Confirmá que sea el equipo de la etiqueta.</small></div>'+
  '<div class="eyr-scan-match-actions"><button type="button" class="btn btn-small" data-action="label-spec" data-id="'+esc(m.id)+'">📖 Ficha</button>'+
  '<button type="button" class="btn btn-small btn-primary" data-action="label-use" data-id="'+esc(m.id)+'">Usar modelo</button></div></div>').join('');
 let notice='';
 if(state.text)notice=matches.length?'<div class="eyr-scan-ok">✓ Se encontraron '+matches.length+' coincidencia(s) exacta(s).</div>':
   '<div class="eyr-scan-note">El catálogo no tiene una coincidencia exacta por ahora. Revisá el código leído y usá la carga manual si corresponde.</div>';
 else notice='<div class="eyr-scan-note">Fotografiá la etiqueta o elegí una imagen recibida por WhatsApp. La lectura automática funciona en la APK de Android.</div>';
 if(state.checking) notice+='<div class="eyr-scan-note">☁️ Consultando otros modelos en GitHub…</div>';
 if(state.offline) notice+='<div class="eyr-scan-note">Sin internet: disponibles únicamente los modelos integrados en la APK.</div>';
 const spec=state.spec?'<div class="eyr-scan-spec"><h3>Ficha técnica encontrada</h3><p class="eyr-catalog-footer">Las especificaciones pertenecen al código exacto del catálogo; verificá la placa y el manual.</p>'+hooks.specHTML(state.spec)+'</div>':'';
 return '<div class="eyr-label-scan">'+
  '<p class="eyr-scan-intro">Identificá el modelo sin escribir códigos largos. La foto se analiza localmente y no se guarda automáticamente.</p>'+
  '<div class="eyr-scan-options"><button type="button" class="eyr-scan-option" data-action="label-camera"><span>📷</span><strong>Sacar foto</strong><small>Etiqueta frente al equipo</small></button>'+
  '<button type="button" class="eyr-scan-option" data-action="label-gallery"><span>🖼️</span><strong>Cargar foto</strong><small>Imagen de WhatsApp o galería</small></button></div>'+
  '<input id="eyr-label-file" type="file" accept="image/*" hidden>'+
  (state.filename?'<p class="eyr-scan-filename">📎 '+esc(state.filename)+'</p>':'')+
  (state.busy?'<div class="eyr-scan-loading">Analizando etiqueta en el celular…</div>':'')+
  (state.error?'<div class="eyr-scan-error">'+esc(state.error)+'</div>':'')+
  notice+
  (state.text?'<details class="eyr-scan-text"><summary>Texto leído de la etiqueta</summary><pre>'+esc(state.text)+'</pre></details>':'')+
  (items?'<h3 class="eyr-scan-subtitle">Coincidencias del catálogo</h3>'+items:'')+
  spec+
  '<div class="eyr-scan-manual"><h3>Confirmar o corregir los datos</h3><div class="form-grid">'+
  '<div class="field"><label for="eyr-label-brand">Marca</label><input id="eyr-label-brand" maxlength="70" value="'+esc(state.brand)+'" placeholder="Ej.: Surrey"></div>'+
  '<div class="field"><label for="eyr-label-model">Modelo exacto</label><input id="eyr-label-model" maxlength="100" value="'+esc(state.model)+'" placeholder="Código completo de la placa"></div>'+
  '<div class="field full"><label for="eyr-label-serial">N.º de serie (opcional)</label><input id="eyr-label-serial" maxlength="100" value="'+esc(state.serial)+'"></div></div>'+
  '<p class="eyr-catalog-footer">Si usás estos datos manualmente, no se agregan especificaciones técnicas no verificadas.</p>'+
  '<div class="eyr-scan-actions"><button type="button" class="btn btn-blue" data-action="label-manual">Usar datos corregidos</button>'+
  '<button type="button" class="btn" data-action="label-search">🔎 Buscar código en catálogo</button></div></div>'+
  '<div class="form-actions"><button type="button" class="btn" data-action="label-close">Cerrar</button></div>'+
  '</div>';
}
function show(){if(state&&hooks)hooks.modal('📷 Identificar equipo por etiqueta',summary(),true);}
async function checkRemote(){
 if(!state||!state.text)return;
 const current=state;
 current.checking=true;show();
 try{const idx=await hooks.ensureIndex();if(state!==current)return;current.offline=!idx;}
 catch(e){if(state!==current)return;current.offline=true;}
 finally{if(state===current){current.checking=false;show();}}
}
function begin(context,clientId){
 if(!hooks)return;
 state={context:context||'catalog',clientId:clientId||'',text:'',brand:'',model:'',serial:'',busy:false,checking:false,offline:false,error:'',filename:'',spec:null};
 show();
}
function take(source){
 if(!state||state.busy)return;
 rememberInputs();state.spec=null;state.error='';
 if(window.EYRAndroid&&typeof window.EYRAndroid.scanLabel==='function'){
  state.busy=true;show();
  try{window.EYRAndroid.scanLabel(source);}
  catch(e){state.busy=false;state.error='No se pudo abrir la cámara o galería.';show();}
 }else{
  // La versión web admite elegir el archivo, pero no posee el OCR nativo de Android.
  state.busy=false;
  show();
  const input=document.getElementById('eyr-label-file');
  if(input){if(source==='camera')input.setAttribute('capture','environment');else input.removeAttribute('capture');input.click();}
 }
}
function browserFile(file){
 if(!state||!file)return;
 state.filename=String(file.name||'Foto seleccionada').slice(0,120);
 state.error='Esta versión web no tiene lector de texto. En la APK de Android la foto se lee automáticamente; acá podés completar los datos de la etiqueta a mano.';
 show();
}
function onNativeResult(result){
 if(!state)return;
 state.busy=false;
 if(result?.cancelled){show();return;}
 if(result?.error){state.error=String(result.error).slice(0,240);show();return;}
 const txt=String(result?.text||'').trim().slice(0,14000);
 state.text=txt;
 state.filename=result?.source==='camera'?'Foto tomada':'Foto seleccionada';
 state.brand=inferredBrand(txt)||state.brand;
 state.model=inferredModel(txt)||state.model;
 state.serial=inferredSerial(txt)||state.serial;
 state.error=txt?'':'No se leyó texto. Probá otra foto con mejor luz, enfoque y la etiqueta completa.';
 show();
 if(txt)checkRemote();
}
async function choose(id,viewOnly){
 if(!state||state.busy)return;
 rememberInputs();state.error='';state.busy=true;show();
 const current=state;
 try{
  const model=await hooks.resolveModel(id);
  if(state!==current)return;
  state.busy=false;
  if(!model)throw Error('No se pudo cargar la ficha técnica de ese modelo.');
  if(viewOnly){state.spec=model;show();return;}
  hooks.apply(state.context,state.clientId,model,state.serial);
  state=null;
 }catch(e){if(state!==current)return;state.busy=false;state.error=String(e.message||'No se pudo consultar el catálogo.').slice(0,220);show();}
}
function useManual(){
 if(!state)return;
 const data=getInputs();
 if(!data.brand||!data.model||norm(data.model).length<5){state.error='Completá la marca y el código exacto del modelo (mínimo 5 caracteres).';show();return;}
 const current=state;
 hooks.apply(current.context,current.clientId,{brand:data.brand,model:data.model},data.serial);
 state=null;
}
function search(){
 if(!state)return;
 rememberInputs();
 const query=state.model;
 if(!query){state.error='Primero escribí o escaneá un modelo para buscarlo.';show();return;}
 state.text='MODELO: '+query;
 state.error='';
 state.spec=null;
 show();
 checkRemote();
}
function handle(action,id){
 if(action==='label-open'){begin(id?.context,id?.clientId);return;}
 if(action==='label-camera'){take('camera');return;}
 if(action==='label-gallery'){take('gallery');return;}
 if(action==='label-spec'){choose(id,true);return;}
 if(action==='label-use'){choose(id,false);return;}
 if(action==='label-manual'){useManual();return;}
 if(action==='label-search'){search();return;}
 if(action==='label-close'){state=null;hooks.closeModal();return;}
}
window.EYRLabelScan={init:h=>{hooks=h;},begin,handle,onNativeResult,browserFile,exactMatches,inferredModel,inferredSerial,norm};
})();
