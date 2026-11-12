/* EYR v2.9 · Diagnóstico con dos fotografías.
   Etapa 1: foto de etiqueta → marca/modelo. Etapa 2: foto de display → código y referencia.
   OCR completamente local vía APK. Las fotos no se guardan ni se envían. */
(function(){
'use strict';
let hooks=null,session=null;
function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function norm(v){return String(v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');}
function brands(){return window.EYRErrorLibrary?.brands||['Samsung','LG','Surrey','BGH','Hitachi','Philco','Carrier'];}
function pickBrand(text){
 const input=String(text||'').toUpperCase();
 return brands().find(b=>new RegExp('(^|[^A-Z])'+b.toUpperCase()+'($|[^A-Z])','m').test(input))||'';
}
function readFromPhoto(text){
 const plain=String(text||'').slice(0,14000);
 const candidates=[];
 const ls=window.EYRLabelScan;
 const all=[...(hooks?.localModels?.()||[]),...(hooks?.remoteModels?.()||[])];
 const known=ls?.exactMatches?.(plain,all)||[];
 for(const x of known)if(x?.brand&&x?.model&&!candidates.some(y=>norm(y.brand)===norm(x.brand)&&norm(y.model)===norm(x.model)))
  candidates.push({brand:x.brand,model:x.model,source:'catalogo'});
 const lines=plain.split(/\r?\n/).map(norm).filter(Boolean),coverage=window.EYRErrorLibrary?.coverage?.()||{};
 for(const [b,info] of Object.entries(coverage)){
  for(const model of info.modelsList||[]){
   const key=norm(model);
   if(key.length<6||!lines.some(line=>line.includes(key)))continue;
   if(!candidates.some(x=>norm(x.brand)===norm(b)&&norm(x.model)===key))
    candidates.push({brand:b,model,source:'manual'});
  }
 }
 const indicated=ls?.inferredModel?.(plain)||'';
 let brand=pickBrand(plain),model=indicated,confidence='';
 if(indicated){
  const match=candidates.find(x=>norm(x.model)===norm(indicated));
  if(match){brand=brand||match.brand;model=match.model;confidence='catalogo';}
  else confidence='texto-etiqueta';
 }else if(candidates.length===1){brand=brand||candidates[0].brand;model=candidates[0].model;confidence='catalogo';}
 else if(candidates.length>1){
  const sorted=[...candidates].sort((a,b)=>norm(b.model).length-norm(a.model).length);
  if(sorted.length>1&&norm(sorted[0].model)!==norm(sorted[1].model)&&norm(sorted[0].model).includes(norm(sorted[1].model))){
   // Con prefijos que se pisan, no inferir el modelo.
   confidence='';
  }
 }
 if(!brand&&model){
  const possible=candidates.filter(c=>norm(c.model)===norm(model));
  if(possible.length===1)brand=possible[0].brand;
 }
 return {brand,model,confidence,candidates:candidates.slice(0,12)};
}
function getField(id,fallback){
 const el=document.getElementById(id);
 return el?String(el.value||''):String(fallback||'');
}
function saveLabelFields(){
 if(!session)return;
 const b=getField('duo-brand',session.brand),m=getField('duo-model',session.model);
 session.brand=window.EYRErrorLibrary?.normalizeBrand?.(b)||'';
 session.model=m.trim().slice(0,100);
}
function saveDisplayFields(){
 if(!session)return;
 const code=getField('duo-code',session.code);
 session.code=window.EYRErrorLibrary?.normalizeCode?.(code)||'';
 const visit=document.getElementById('duo-visit');
 if(visit)session.visitId=String(visit.value||'');
}
function selectedCode(){
 const lib=window.EYRErrorLibrary;
 return lib?.lookup?.(session?.brand,session?.code,session?.model)||null;
}
function errorInfo(){
 if(!session?.code)return '<div class="eyr-work-warning">No se pudo leer un código. Podés repetir la foto o escribir el código observado.</div>';
 return window.EYRWorkshop?.errorMeaning?.(session.brand,session.code,session.model)||'';
}
function visitOptions(){
 const visits=[...(hooks?.getDB?.().visits||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,150);
 return '<option value="">Seleccionar visita (opcional)</option>'+visits.map(v=>'<option value="'+esc(v.id)+'" '+(session.visitId===v.id?'selected':'')+'>'+esc([v.client||'Cliente',v.date||'',v.description||''].filter(Boolean).join(' · '))+'</option>').join('');
}
function brandOptions(){
 return '<option value="">Elegir marca</option>'+brands().map(b=>'<option value="'+esc(b)+'" '+(b===session.brand?'selected':'')+'>'+esc(b)+'</option>').join('');
}
function modelOptions(){
 const coverage=window.EYRErrorLibrary?.coverage?.();
 const list=(coverage?.[session.brand]?.modelsList||[]).slice(0,200);
 return list.map(x=>'<option value="'+esc(x)+'"></option>').join('');
}
function scanButtons(stage){
 const first=stage==='label',what=first?'etiqueta':'display';
 return '<div class="eyr-duo-capture"><button type="button" class="eyr-duo-capture-btn" data-action="duo-camera"><span>📷</span><b>Sacar foto</b><small>Foto de '+what+'</small></button>'+
 '<button type="button" class="eyr-duo-capture-btn" data-action="duo-gallery"><span>🖼️</span><b>Cargar imagen</b><small>Desde WhatsApp o galería</small></button></div>';
}
function steps(){
 return '<div class="eyr-duo-steps"><div class="'+(session.step==='label'?'current':'complete')+'">1 · Identificar equipo</div><div class="'+(session.step==='display'?'current':session.step==='result'?'complete':'')+'">2 · Leer error</div></div>';
}
function labelScreen(){
 const c=session.candidates||[];
 const matches=c.length?'<div class="eyr-duo-matches"><b>Modelos que aparecen en la etiqueta</b>'+
 c.map(x=>'<button type="button" class="btn btn-small" data-action="duo-select-model" data-brand="'+esc(x.brand)+'" data-model="'+esc(x.model)+'">'+esc(x.brand+' · '+x.model)+'</button>').join('')+'</div>':'';
 const hint=session.labelText
  ?'<div class="eyr-duo-notice '+(session.brand&&session.model?'good':'')+'">'+
    (session.brand&&session.model?'✓ Lectura obtenida: confirmá la marca y el modelo antes de continuar.':'La lectura no encontró marca y modelo claros. Podés elegir otra foto o completar los datos manualmente.')+'</div>'
  :'<div class="eyr-duo-notice">Primero elegí la foto de la etiqueta de fábrica. No se guarda en la aplicación.</div>';
 return steps()+'<h3>📋 Foto 1 · Etiqueta del equipo</h3>'+scanButtons('label')+
 (session.busy?'<div class="eyr-duo-loading">Leyendo etiqueta en el teléfono…</div>':'')+
 (session.error?'<div class="eyr-duo-error">'+esc(session.error)+'</div>':'')+
 hint+matches+
 '<div class="form-grid"><div class="field"><label>Marca</label><select id="duo-brand">'+brandOptions()+'</select></div>'+
 '<div class="field"><label>Modelo exacto</label><input id="duo-model" list="duo-known-models" maxlength="100" value="'+esc(session.model)+'" placeholder="Código de la etiqueta">'+
 '<datalist id="duo-known-models">'+modelOptions()+'</datalist></div></div>'+
 (session.labelText?'<details class="eyr-duo-ocr"><summary>Ver texto reconocido en la etiqueta</summary><pre>'+esc(session.labelText)+'</pre></details>':'')+
 '<div class="form-actions"><button class="btn btn-primary" data-action="duo-next">Continuar al display</button><button class="btn" data-action="duo-close">Cerrar</button></div>';
}
function displayScreen(){
 return steps()+'<div class="eyr-duo-device"><span>❄️</span><div><small>Equipo identificado</small><strong>'+esc(session.brand)+' · '+esc(session.model)+'</strong></div><button class="btn btn-small" data-action="duo-back-label">Editar</button></div>'+
 '<h3>⚠️ Foto 2 · Display del aire</h3>'+scanButtons('display')+
 (session.busy?'<div class="eyr-duo-loading">Leyendo el código en el teléfono…</div>':'')+
 (session.error?'<div class="eyr-duo-error">'+esc(session.error)+'</div>':'')+
 '<div class="eyr-duo-notice">Usaremos la marca y el modelo de la primera foto para consultar el código. Podés cargar una foto que te mandó el cliente.</div>'+
 '<div class="form-actions"><button class="btn btn-blue" data-action="duo-back-label">Volver a etiqueta</button><button class="btn" data-action="duo-manual-code">Escribir código</button></div>';
}
function resultScreen(){
 const codes=session.codes||[];
 const hint=selectedCode();
 return steps()+'<div class="eyr-duo-device"><span>❄️</span><div><small>Equipo identificado</small><strong>'+esc(session.brand)+' · '+esc(session.model)+'</strong></div><button class="btn btn-small" data-action="duo-back-label">Editar</button></div>'+
 '<h3>🔎 Resultado de las dos fotografías</h3>'+
 (codes.length>1?'<p class="eyr-work-help">La foto contiene varios códigos posibles. Seleccioná el que efectivamente se ve en el display.</p>'+
 '<div class="eyr-duo-candidates">'+codes.map(c=>'<button class="btn btn-small" data-action="duo-pick-code" data-code="'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div>':'')+
 '<div class="field"><label>Código del display (confirmar)</label><input id="duo-code" maxlength="24" value="'+esc(session.code)+'" placeholder="Ej.: E1, CH05, EH60"></div>'+
 '<div class="eyr-duo-actions"><button class="btn btn-small btn-blue" data-action="duo-review">📚 Consultar código</button><button class="btn btn-small" data-action="duo-back-display">📷 Otra foto del display</button></div>'+
 errorInfo()+
 (hint?'<div class="eyr-duo-notice good">'+(hint.verifiedForExactModel?'✓ La referencia corresponde a ese modelo documentado.':'Referencia general de la marca; confirmar con el manual del modelo.')+'</div>':'')+
 '<div class="eyr-duo-save"><h3>📁 Guardar en un trabajo</h3><p class="eyr-work-help">Podés vincular el resultado al informe de una visita. Las fotos usadas para leer no se guardan.</p>'+
 '<select id="duo-visit">'+visitOptions()+'</select>'+
 '<div class="form-actions"><button class="btn btn-primary" data-action="duo-save">Guardar en visita</button>'+
 '<button class="btn" data-action="duo-new">Nueva consulta</button><button class="btn" data-action="duo-close">Cerrar</button></div></div>'+
 (session.errorText?'<details class="eyr-duo-ocr"><summary>Ver texto leído del display</summary><pre>'+esc(session.errorText)+'</pre></details>':'');
}
function render(){
 if(!session||!hooks)return;
 hooks.modal('📷 Diagnóstico con dos fotos','<div class="eyr-work eyr-duo">'+
 '<p class="eyr-duo-lead">Dos fotos, una consulta: EYR reconoce el equipo y consulta el error usando su modelo.</p>'+
 (session.step==='label'?labelScreen():session.step==='display'?displayScreen():resultScreen())+'</div>',true);
}
function open(){
 if(!hooks)return;
 session={step:'label',busy:false,brand:'',model:'',labelText:'',errorText:'',code:'',codes:[],candidates:[],error:'',visitId:'',generation:0};
 render();
}
async function refreshMatches(expected){
 try{
  await hooks.ensureIndex?.();
  if(session!==expected||session.step!=='label'||!session.labelText)return;
  const result=readFromPhoto(session.labelText);
  // Respetar las correcciones escritas mientras se consultaba el índice remoto.
  const brandField=document.getElementById('duo-brand'),modelField=document.getElementById('duo-model');
  if(brandField&&brandField.value)session.brand=window.EYRErrorLibrary?.normalizeBrand(brandField.value)||'';
  if(modelField&&modelField.value)session.model=String(modelField.value).trim().slice(0,100);
  if(!session.brand&&result.brand)session.brand=result.brand;
  if(!session.model&&result.model)session.model=result.model;
  session.candidates=result.candidates;
  render();
 }catch(e){/* la app trabaja también offline */}
}
function onLabelOCR(value){
 if(!session||session.step!=='label')return;
 session.busy=false;
 if(value?.cancelled){render();return;}
 if(value?.error){session.error=String(value.error).slice(0,220);render();return;}
 const text=String(value?.text||'').slice(0,14000);
 session.labelText=text;session.error=text?'':'No se leyó texto en la etiqueta. Probá con mejor luz o cargá la marca/modelo.';
 session.brand='';session.model='';session.candidates=[];
 if(text){
  const result=readFromPhoto(text);
  session.brand=result.brand;session.model=result.model;session.candidates=result.candidates;
 }
 render();
 if(text)refreshMatches(session);
}
function onErrorOCR(value){
 if(!session||session.step!=='display')return;
 session.busy=false;
 if(value?.cancelled){render();return;}
 if(value?.error){session.error=String(value.error).slice(0,220);render();return;}
 session.errorText=String(value?.text||'').slice(0,1500);
 session.codes=window.EYRWorkshop?.possibleCodes?.(session.errorText,session.brand,session.model)||[];
 session.code=session.codes.length===1?session.codes[0]:'';
 session.error='';
 session.step='result';
 render();
}
function onNativeResult(value){
 if(value?.source?.startsWith('duo-label-'))onLabelOCR(value);
 else if(value?.source?.startsWith('duo-error-'))onErrorOCR(value);
}
function capture(source){
 if(!session||session.busy)return;
 if(!window.EYRAndroid?.scanLabel){
  hooks.toast('La lectura automática de fotos está disponible en la APK de Android. Podés completar los campos manualmente.');
  return;
 }
 if(session.step==='label')saveLabelFields();
 if(session.step==='result')saveDisplayFields();
 if(session.step==='result')session.step='display';
 session.error='';session.busy=true;
 const stage=session.step==='label'?'label':'error';
 render();
 try{window.EYRAndroid.scanLabel('duo-'+stage+'-'+source);}
 catch(e){session.busy=false;session.error='No se pudo abrir la cámara o galería.';render();}
}
function next(){
 if(!session||session.step!=='label')return;
 saveLabelFields();
 if(!session.brand){session.error='Seleccioná la marca antes de continuar.';render();return;}
 if(!session.model||norm(session.model).length<4){session.error='Ingresá o confirmá el modelo de la etiqueta (mínimo cuatro caracteres).';render();return;}
 session.step='display';session.error='';render();
}
function showManualCode(){
 if(!session)return;
 session.step='result';session.errorText='';session.codes=[];session.code='';render();
}
function saveResult(){
 if(!session||session.step!=='result')return;
 saveDisplayFields();
 const visit=(hooks.getDB().visits||[]).find(v=>v.id===session.visitId);
 if(!session.code){hooks.toast('Confirmá primero el código que aparece en el display.');render();return;}
 if(!visit){hooks.toast('Elegí la visita donde querés guardar el diagnóstico.');render();return;}
 const db=hooks.getDB();
 db.reports=Array.isArray(db.reports)?db.reports:[];
 let r=db.reports.find(x=>x.visitId===visit.id);
 if(r?.errorCode&&r.errorCode!==session.code&&!hooks.confirm('Esta visita ya tiene un código de error registrado. ¿Querés reemplazarlo?'))return;
 if(!r){r={id:'informe_'+visit.id,visitId:visit.id,notes:'',errorCode:'',errorText:'',photos:[],updatedAt:''};db.reports.push(r);}
 const lib=window.EYRErrorLibrary;
 const info=lib?.lookup?.(session.brand,session.code,session.model)||null;
 r.errorCode=session.code;
 r.errorBrand=session.brand;
 r.errorModel=session.model;
 r.errorText=session.errorText;
 r.errorMeaning=info?{code:info.code,title:info.title,description:info.description,source:info.source,kind:info.kind,scope:info.validation,family:info.family||'',verifiedForExactModel:!!info.verifiedForExactModel}:null;
 r.updatedAt=new Date().toISOString();
 hooks.saveDB();
 const visitId=visit.id;session=null;hooks.openReport?.(visitId);
 hooks.toast('Diagnóstico registrado en la visita. Las fotos no se guardaron.');
}
function handle(action,el){
 if(action==='duo-open'){open();return true;}
 if(!session)return false;
 if(action==='duo-camera'){capture('camera');return true;}
 if(action==='duo-gallery'){capture('gallery');return true;}
 if(action==='duo-select-model'){
  saveLabelFields();
  session.brand=window.EYRErrorLibrary?.normalizeBrand(el.dataset.brand)||'';
  session.model=String(el.dataset.model||'').slice(0,100);session.error='';render();return true;
 }
 if(action==='duo-next'){next();return true;}
 if(action==='duo-back-label'){if(session.step==='result')saveDisplayFields();session.step='label';session.error='';render();return true;}
 if(action==='duo-back-display'){saveDisplayFields();session.step='display';session.error='';render();return true;}
 if(action==='duo-manual-code'){showManualCode();return true;}
 if(action==='duo-pick-code'){session.code=String(el.dataset.code||'');render();return true;}
 if(action==='duo-review'){saveDisplayFields();render();return true;}
 if(action==='duo-save'){saveResult();return true;}
 if(action==='duo-new'){open();return true;}
 if(action==='duo-close'){session=null;hooks.closeModal();return true;}
 return false;
}
function fileChange(el){
 if(!session)return false;
 if(el.id==='duo-brand'&&session.step==='label'){
  saveLabelFields();render();return true;
 }
 if(el.id==='duo-model'&&session.step==='label'){
  saveLabelFields();return true;
 }
 if(el.id==='duo-code'&&session.step==='result'){
  saveDisplayFields();render();return true;
 }
 if(el.id==='duo-visit'&&session.step==='result'){
  saveDisplayFields();return true;
 }
 return false;
}
function init(next){hooks=next;}
window.EYRDoublePhoto={init,open,handle,fileChange,onNativeResult,readFromPhoto};
})();