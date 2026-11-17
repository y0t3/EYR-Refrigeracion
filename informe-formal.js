/* EYR 3.1 · Redactor de informes técnicos formal. Local, verificable y editable.
   Plantillas basadas en los informes EYR de Surrey y LG del 16/11/2026.
   No deduce causas, inexistencia de repuestos ni irreparabilidad por su cuenta. */
(function(){
'use strict';
const states={
 'sin-evaluar':'Sin evaluar','quemado':'Quemado','fuera-servicio':'Fuera de servicio','dañado':'Dañado','intermitente':'Falla intermitente','obstruido':'Obstruido','defectuoso':'Funcionamiento defectuoso'
};
const parts=[
 ['forzador','Motor forzador (ventilador) interior','el motor forzador (ventilador) de la unidad interior','masc'],
 ['plaqueta','Plaqueta electrónica interior','la placa electrónica de control de la unidad interior','fem'],
 ['compresor','Compresor exterior','el compresor de la unidad exterior','masc'],
 ['ventilador-ext','Ventilador exterior','el ventilador de la unidad exterior','masc'],
 ['placa-ext','Placa electrónica exterior','la placa electrónica de la unidad exterior','fem'],
 ['sensor','Sensor de temperatura','el sensor de temperatura','masc'],
 ['capacitor','Capacitor','el capacitor','masc'],
 ['otro','Otro componente','el componente indicado por el técnico','masc']
];
const issues=[
 ['no-enciende','No enciende o enciende de manera irregular'],
 ['no-responde','No responde a los comandos'],
 ['no-enfria','No enfría adecuadamente'],
 ['no-calienta','No calienta adecuadamente'],
 ['sin-aire','No circula aire por la unidad interior'],
 ['ruido','Presenta ruido anormal'],
 ['pierde-agua','Presenta filtración de agua'],
 ['corta','Se detiene durante su funcionamiento']
];
const statusOptions=(chosen)=>Object.entries(states).map(([key,label])=>'<option value="'+key+'" '+(chosen===key?'selected':'')+'>'+label+'</option>').join('');
const partOptions=(chosen)=>'<option value="">Elegir componente</option>'+parts.map(([key,label])=>'<option value="'+key+'" '+(key===chosen?'selected':'')+'>'+label+'</option>').join('');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const cap=s=>{const x=clean(s);return x?x[0].toLocaleUpperCase('es-AR')+x.slice(1):'';};
const sentence=s=>{const x=cap(s).replace(/[.]+$/,'');return x?x+'.':'';};
const join=(xs)=>xs.length<2?xs.join(''):xs.slice(0,-1).join(', ')+' y '+xs[xs.length-1];
const get=(key)=>parts.find(x=>x[0]===key);
const validState=s=>s&&s!=='sin-evaluar'&&states[s];
const lookups={stock:{
  'no-verificado':'No se verificó disponibilidad de repuestos',
  'disponible':'Se confirmó disponibilidad de repuestos compatibles',
  'sin-repuestos':'Se consultó y no se encontraron repuestos compatibles'},
  adaptation:{'no-evaluada':'No se evaluó adaptación','viable':'Se verificó una alternativa compatible','no-viable':'Se verificó que no es viable adaptar componentes compatibles'},
  cause:{'sin-determinar':'Causa no determinada','posible-tension':'Posible relación con baja tensión o variaciones, según evaluación técnica','desgaste':'Desgaste o antigüedad, según evaluación técnica','otra':'Otra hipótesis técnica, describir abajo'},
  recommendation:{'reparar':'Reparar componentes afectados','reemplazar-equipo':'Reemplazar el equipo completo','continuar-diagnostico':'Continuar verificaciones','verificar-instalacion':'Revisar instalación / suministro eléctrico'},
  purpose:{'general':'Informe técnico general','seguro':'Presentación ante aseguradora','cliente':'Entrega al cliente'},
  type:{'aire':'Aire acondicionado','split':'Aire acondicionado tipo split','heladera':'Heladera / refrigerador','comercial':'Equipo de refrigeración comercial','otro':'Otro equipo'}
};
let hooks=null,session=null;
function fresh(visit,client,eq,old){
 const f=old&&typeof old==='object'?JSON.parse(JSON.stringify(old)):{};
 const v=visit||{};
 return {
  type:f.type||'aire',brand:f.brand||eq?.brand||'',model:f.model||eq?.model||'',
  serial:f.serial||eq?.serial||'',plate:f.plate||eq?.specSnapshot?.refrigerant||'',
  clientName:f.clientName||v.client||client?.name||'',clientDoc:f.clientDoc||client?.cuit||'',
  clientAddress:f.clientAddress||v.address||client?.address||'',
  notes:f.notes||'',observed:Array.isArray(f.observed)?f.observed:[],
  findings:Array.isArray(f.findings)?f.findings:[{part:'',state:'sin-evaluar'}],
  stock:f.stock||'no-verificado',adaptation:f.adaptation||'no-evaluada',
  cause:f.cause||'sin-determinar',causeEvidence:f.causeEvidence||'',
  recommendation:f.recommendation||'continuar-diagnostico',purpose:f.purpose||'general',
  includePhotos:f.includePhotos!==false, sections:f.sections&&typeof f.sections==='object'?f.sections:null,
  custom:f.custom===true,updatedAt:f.updatedAt||''
 };
}
function suggestNotes(text){
 const input=clean(text).toLocaleLowerCase('es-AR');
 const found=[];
 // Son sugerencias, no afirmaciones: cada técnico debe comprobar el componente y su estado.
 const patterns=[
  ['forzador',/\b(forzador|ventilador\s+interior|motor\s+(?:de\s+)?(?:unidad\s+)?interior)\b/i],
  ['plaqueta',/\b(plaqueta|placa\s+(?:electr[oó]nica|de\s+control)\s*(?:interior)?)/i],
  ['compresor',/\b(compresor)\b/i],
  ['placa-ext',/\b(placa\s+exterior)\b/i],
  ['ventilador-ext',/\b(ventilador\s+exterior)\b/i],
  ['sensor',/\b(sensor)\b/i],
  ['capacitor',/\b(capacitor)\b/i]
 ];
 for(const [part,re] of patterns){
  const hit=re.exec(input);if(!hit)continue;
  // Sólo cuando la frase cercana atribuye explícitamente la condición.
  const following=input.slice(hit.index,hit.index+85).split(/[,;.\n]|\s+y\s+(?=la\s+|el\s+)/)[0];
  const before=input.slice(Math.max(0,hit.index-18),hit.index);
  let state='sin-evaluar';
  if(/\bquemad[oa]s?\b/i.test(following)||/\bquemad[oa]s?\b/i.test(before))state='quemado';
  else if(/\b(?:no\s+funciona|sin\s+funcionar|fuera\s+de\s+servicio)\b/.test(following))state='fuera-servicio';
  else if(/\bdañad[oa]s?\b/.test(following))state='dañado';
  found.push({part,state});
 }
 const observed=[];
 if(/\bno\s+enciende\b/.test(input))observed.push('no-enciende');
 if(/\bno\s+responde\b/.test(input))observed.push('no-responde');
 if(/\bno\s+(?:enfr[ií]a|tira\s+fr[ií]o)\b/.test(input))observed.push('no-enfria');
 if(/\bno\s+calienta\b/.test(input))observed.push('no-calienta');
 if(/\b(?:no\s+gira|no\s+circula\s+aire)\b/.test(input))observed.push('sin-aire');
 return {findings:found,observed};
}
function generate(f){
 const confirmed=(f.findings||[]).filter(x=>get(x.part)&&validState(x.state));
 const name=x=>get(x.part)[2];
 const status=x=>x.state==='quemado'?'presenta daño por quemadura':x.state==='fuera-servicio'?'se encuentra fuera de servicio':
  x.state==='intermitente'?'presenta funcionamiento intermitente':x.state==='dañado'?'presenta daños':
  x.state==='obstruido'?'se encuentra obstruido':'presenta funcionamiento defectuoso';
 const observed=(f.observed||[]).map(id=>issues.find(x=>x[0]===id)?.[1]).filter(Boolean);
 const obs=[];
 if(observed.length)obs.push('Durante la inspección técnica se constató que el equipo '+join(observed.map(x=>x.toLowerCase()))+'.');
 if(confirmed.length){
  obs.push('En la revisión de sus componentes se identificó que '+confirmed.map(x=>name(x)+' '+status(x)).join('; ')+'.');
 }else obs.push('No se consignaron componentes con fallas confirmadas. Se requiere completar las verificaciones técnicas para establecer un diagnóstico.');
 if(clean(f.notes))obs.push('Observaciones adicionales aportadas por el técnico: '+sentence(f.notes));
 const diagnosis=[];
 if(confirmed.length){
   diagnosis.push('Los hallazgos descriptos comprometen los siguientes componentes: '+join(confirmed.map(x=>name(x)))+'. El alcance de cada falla y su efecto sobre el funcionamiento se determinan según las pruebas realizadas.');
 }else diagnosis.push('Con la información registrada no resulta posible establecer una falla concluyente en los componentes del equipo.');
 if(f.cause==='posible-tension'){
  diagnosis.push('Según la evaluación técnica declarada, los daños podrían ser compatibles con anomalías de baja tensión o variaciones del suministro eléctrico. Esta relación no permite establecer por sí sola una causa definitiva.');
 }else if(f.cause==='desgaste'){
  diagnosis.push('De acuerdo con la evaluación técnica consignada, la antigüedad o el desgaste podrían haber contribuido a las fallas observadas, sin que ello constituya una determinación causal concluyente.');
 }else if(f.cause==='otra'&&clean(f.causeEvidence)){
  diagnosis.push('Hipótesis técnica indicada por el responsable: '+sentence(f.causeEvidence));
 }else if(f.cause==='sin-determinar')diagnosis.push('La causa de la anomalía no fue determinada de forma concluyente en esta inspección.');
 const partsText=[];
 if(f.stock==='sin-repuestos')partsText.push('Según la consulta de disponibilidad declarada por el técnico, no se encontraron repuestos compatibles para los componentes afectados.');
 else if(f.stock==='disponible')partsText.push('Se indicó que existen repuestos compatibles disponibles; su utilización debe verificarse contra la identificación exacta del equipo.');
 if(f.adaptation==='no-viable')partsText.push('De acuerdo con la evaluación técnica consignada, no se considera viable una adaptación que asegure compatibilidad eléctrica, funcionamiento correcto y condiciones de seguridad.');
 else if(f.adaptation==='viable')partsText.push('Se informó la existencia de una alternativa de reparación o adaptación compatible, pendiente de ejecución y verificación final.');
 let conclusion='';
 if(confirmed.length&&f.stock==='sin-repuestos'&&f.adaptation==='no-viable'){
  conclusion='Los componentes señalados presentan las fallas confirmadas en esta inspección. Ante la falta de repuestos compatibles y la imposibilidad de una adaptación técnicamente segura, el equipo se considera no reparable en las condiciones evaluadas. Se recomienda su reemplazo por uno de prestaciones equivalentes.';
 }else if(confirmed.length&&f.recommendation==='reparar'){
  conclusion='De acuerdo con los hallazgos consignados, se recomienda la reparación o sustitución de los componentes afectados, previa verificación de compatibilidad y posterior prueba de funcionamiento.';
 }else if(confirmed.length&&f.recommendation==='reemplazar-equipo'){
  conclusion='Se recomienda evaluar el reemplazo integral del equipo, teniendo en cuenta los daños identificados y las condiciones de reparación declaradas. Esta recomendación no implica por sí misma la inexistencia de repuestos.';
 }else conclusion='Con los elementos de verificación asentados en el presente informe, corresponde completar las comprobaciones necesarias antes de emitir una conclusión definitiva sobre la reparabilidad del equipo.';
 const recommendations=[];
 if(f.recommendation==='reparar')recommendations.push('Evaluar y realizar la reparación de los componentes afectados conforme a las especificaciones del fabricante.');
 if(f.recommendation==='reemplazar-equipo')recommendations.push('Evaluar el reemplazo integral del equipo por otro de prestaciones equivalentes.');
 if(f.recommendation==='continuar-diagnostico'&&!(confirmed.length&&f.stock==='sin-repuestos'&&f.adaptation==='no-viable'))recommendations.push('Realizar las comprobaciones técnicas complementarias necesarias para determinar el alcance de la falla.');
 if(confirmed.length&&f.stock==='sin-repuestos'&&f.adaptation==='no-viable')recommendations.push('Se recomienda el reemplazo integral del equipo por otro de prestaciones equivalentes, considerando las condiciones técnicas declaradas.');
 if(f.recommendation==='verificar-instalacion')recommendations.push('Verificar las condiciones de la instalación y la alimentación eléctrica conforme a las especificaciones del fabricante.');
 if(f.cause==='posible-tension')recommendations.push('Verificar el suministro eléctrico del inmueble y las condiciones de protección antes de poner el equipo en servicio.');
 return {
  observations:obs.join('\n\n'),
  diagnosis:diagnosis.join('\n\n'),
  reparability:partsText.join('\n\n'),
  conclusion,
  recommendations:recommendations.join('\n')
 };
}
function viewSection(f){
 const entries=[['observations','Observaciones de la inspección'],['diagnosis','Diagnóstico técnico'],['reparability','Repuestos y posibilidad de reparación'],['conclusion','Conclusión técnica'],['recommendations','Recomendaciones']];
 const secs=f.sections||{};
 return entries.filter(([k])=>k!=='reparability'||!!clean(secs.reparability)).map(([key,title])=>
  '<div class="field full"><label for="formal-text-'+key+'">'+title+'</label><textarea id="formal-text-'+key+'" rows="'+(key==='conclusion'?'4':'5')+'" maxlength="6000">'+esc(secs[key]||'')+'</textarea></div>').join('');
}
function radioOption(map,id,value){
 return Object.entries(map).map(([k,v])=>'<option value="'+k+'" '+(value===k?'selected':'')+'>'+esc(v)+'</option>').join('');
}
function itemRow(row,i){
 return '<div class="eyr-formal-part" data-formal-row="'+i+'"><div class="field"><label>Componente '+(i+1)+'</label>'+
  '<select data-formal-part="'+i+'">'+partOptions(row.part)+'</select></div>'+
  '<div class="field"><label>Estado comprobado</label><select data-formal-state="'+i+'">'+statusOptions(row.state)+'</select></div>'+
  '<button class="btn btn-small btn-danger" type="button" data-action="formal-remove-part" data-index="'+i+'">× Quitar</button></div>';
}
function visitOptions(){
 const data=hooks.getDB();
 return (data.visits||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,140)
  .map(v=>'<option value="'+esc(v.id)+'">'+esc((v.date||'')+' · '+(v.client||'Cliente')+' · '+(v.description||'Trabajo'))+'</option>').join('');
}
function formBody(){
 const f=session.data;let body='';
 const step=session.step;
 const bar='<div class="eyr-formal-steps"><span class="'+(step===1?'on':'')+'">1. Equipo y daños</span><span class="'+(step===2?'on':'')+'">2. Reparabilidad</span><span class="'+(step===3?'on':'')+'">3. Informe final</span></div>';
 if(step===1){
  body='<p class="eyr-formal-lead">Completá lo que pudiste verificar. Escribí como hablás: EYR te ayudará con la redacción.</p>'+
   '<div class="form-grid"><div class="field"><label>Cliente</label><input id="formal-client" maxlength="130" value="'+esc(f.clientName)+'"></div>'+
   '<div class="field"><label>DNI / CUIT (si corresponde)</label><input id="formal-doc" maxlength="40" value="'+esc(f.clientDoc)+'"></div>'+
   '<div class="field full"><label>Domicilio</label><input id="formal-address" maxlength="240" value="'+esc(f.clientAddress)+'"></div>'+
   '<div class="field"><label>Tipo de equipo</label><select id="formal-type">'+radioOption(lookups.type,'',f.type)+'</select></div>'+
   '<div class="field"><label>Marca</label><input id="formal-brand" value="'+esc(f.brand)+'" maxlength="70"></div>'+
   '<div class="field"><label>Modelo</label><input id="formal-model" value="'+esc(f.model)+'" maxlength="100"></div>'+
   '<div class="field"><label>Número de serie</label><input id="formal-serial" value="'+esc(f.serial)+'" maxlength="100"></div>'+
   '<div class="field full"><label>Datos de placa (opcional)</label><input id="formal-plate" value="'+esc(f.plate)+'" maxlength="170" placeholder="Ej.: R22, capacidad 5.280 W"></div></div>'+
   '<h3>📝 ¿Qué encontraron?</h3><p class="eyr-formal-help">Contalo con tus palabras. Ej.: «motor interior quemado y plaqueta dañada».</p>'+
   '<textarea id="formal-notes" rows="3" maxlength="1200" placeholder="Apuntes sencillos del técnico">'+esc(f.notes)+'</textarea>'+
   '<button class="btn btn-blue" data-action="formal-suggest" type="button">✨ Detectar componentes en mis notas</button>'+
   '<div class="eyr-formal-help">Las sugerencias no son un diagnóstico: confirmá el componente y su estado.</div>'+
   '<h3>Problemas que realmente se observaron</h3><div class="eyr-formal-checks">'+issues.map(([k,v])=>'<label><input type="checkbox" data-formal-observed="'+k+'" '+(f.observed.includes(k)?'checked':'')+'><span>'+esc(v)+'</span></label>').join('')+'</div>'+
   '<h3>Componentes y estado comprobado</h3><div class="eyr-formal-parts">'+f.findings.map(itemRow).join('')+'</div>'+
   '<button class="btn btn-small btn-blue" data-action="formal-add-part" type="button">+ Agregar componente</button>';
 }else if(step===2){
  body='<p class="eyr-formal-lead">Estas respuestas son importantes para un informe formal o de aseguradora. Seleccioná únicamente lo que se comprobó.</p>'+
   '<div class="field"><label>Disponibilidad de repuestos</label><select id="formal-stock">'+radioOption(lookups.stock,'',f.stock)+'</select></div>'+
   '<div class="field"><label>¿Se evaluó una adaptación o alternativa?</label><select id="formal-adaptation">'+radioOption(lookups.adaptation,'',f.adaptation)+'</select></div>'+
   '<div class="field"><label>Posible origen de la falla (según evaluación realizada)</label><select id="formal-cause">'+radioOption(lookups.cause,'',f.cause)+'</select></div>'+
   '<div class="field"><label>Fundamento adicional de la hipótesis (opcional)</label><textarea id="formal-cause-evidence" rows="3" maxlength="600" placeholder="Solo hechos y pruebas realmente realizados">'+esc(f.causeEvidence)+'</textarea></div>'+
   '<div class="field"><label>Recomendación del técnico</label><select id="formal-recommendation">'+radioOption(lookups.recommendation,'',f.recommendation)+'</select></div>'+
   '<div class="field"><label>¿A quién se presenta?</label><select id="formal-purpose">'+radioOption(lookups.purpose,'',f.purpose)+'</select></div>'+
   '<label class="eyr-formal-photo-option"><input type="checkbox" id="formal-photos" '+(f.includePhotos?'checked':'')+'><span>Incluir anexo con fotos que ya estén guardadas en el informe de esta visita</span></label>'+
   '<div class="eyr-work-warning">EYR no comprueba si existen repuestos ni cuál fue la causa real. Estas afirmaciones solo aparecerán cuando el técnico las indique expresamente.</div>';
 }else if(step===3){
  body='<p class="eyr-formal-lead">EYR preparó las secciones con lenguaje formal. Revisalas y corregí cualquier dato antes de generar el PDF.</p>'+
   '<div class="eyr-formal-review">'+viewSection(f)+'</div>'+
   '<div class="eyr-work-warning">El documento refleja exclusivamente las verificaciones y declaraciones realizadas por el técnico. Una explicación de código de error no sustituye la inspección ni acredita por sí sola una causa.</div>'+
   '<div class="eyr-formal-actions"><button type="button" class="btn btn-blue" data-action="formal-regenerate">↻ Rehacer redacción desde mis respuestas</button></div>';
 }
 const footer='<div class="eyr-formal-actions">'+
 (step>1?'<button class="btn" type="button" data-action="formal-prev">← Anterior</button>':'')+
 (step<3?'<button class="btn btn-primary" type="button" data-action="formal-next">Continuar →</button>':
 '<button class="btn btn-blue" type="button" data-action="formal-save">Guardar informe</button>'+
 '<button class="btn btn-primary" type="button" data-action="formal-pdf" data-mode="view">👁 Ver PDF</button>'+
 '<button class="btn btn-primary" type="button" data-action="formal-pdf" data-mode="share">↗ Enviar PDF</button>')+
 '<button class="btn" type="button" data-action="formal-close">Cerrar</button></div>';
 return '<div class="eyr-formal"><div class="eyr-formal-visit"><strong>'+esc(session.visit.client||'Visita')+'</strong><small>'+esc(session.visit.date||'')+' · '+esc(session.visit.description||'')+'</small></div>'+
 bar+body+footer+'</div>';
}
function render(){
 if(!session||!hooks)return;
 hooks.modal('📄 Informe técnico formal · EYR',formBody(),true);
}
function capture(){
 if(!session)return;
 const f=session.data;
 const value=(id,prop)=>{const el=document.getElementById(id);if(el)f[prop]=String(el.value||'').trim();};
 if(session.step===1){
  for(const [id,key] of [['formal-client','clientName'],['formal-doc','clientDoc'],['formal-address','clientAddress'],['formal-type','type'],['formal-brand','brand'],['formal-model','model'],['formal-serial','serial'],['formal-plate','plate'],['formal-notes','notes']])value(id,key);
  f.observed=issues.filter(([k])=>document.querySelector('[data-formal-observed="'+k+'"]')?.checked).map(x=>x[0]);
  const rows=[];
  for(let i=0;i<7;i++){const p=document.querySelector('[data-formal-part="'+i+'"]'),s=document.querySelector('[data-formal-state="'+i+'"]');if(p&&s)rows.push({part:p.value,state:s.value});}
  if(rows.length)f.findings=rows;
 }else if(session.step===2){
  for(const [id,key] of [['formal-stock','stock'],['formal-adaptation','adaptation'],['formal-cause','cause'],['formal-cause-evidence','causeEvidence'],['formal-recommendation','recommendation'],['formal-purpose','purpose']])value(id,key);
  const photo=document.getElementById('formal-photos');if(photo)f.includePhotos=photo.checked;
 }else if(session.step===3){
  f.sections=f.sections||{};
  for(const key of ['observations','diagnosis','reparability','conclusion','recommendations']){
   const el=document.getElementById('formal-text-'+key);if(el)f.sections[key]=String(el.value||'').trim().slice(0,6000);
  }
  f.custom=true;
 }
}
function open(visitId){
 if(!hooks)return;
 if(!visitId){chooseVisit();return;}
 const db=hooks.getDB(),visit=(db.visits||[]).find(v=>v.id===visitId);
 if(!visit){hooks.toast('Primero registrá una visita con el cliente y el equipo.');return;}
 const client=db.clients.find(c=>c.id===visit.clientId);
 const eq=db.equipment.find(e=>e.id===visit.equipmentId);
 const record=(db.reports||[]).find(r=>r.visitId===visitId);
 session={visit,data:fresh(visit,client,eq,record?.formal),step:1};
 render();
}
function chooseVisit(){
 if(!hooks)return;
 const db=hooks.getDB();
 if(!(db.visits||[]).length){hooks.toast('Registrá primero una visita en la Agenda.');return;}
 hooks.modal('Elegir visita para informe técnico',
 '<div class="eyr-formal"><p>Elegí el trabajo que vas a documentar. Los datos del cliente y equipo se completarán automáticamente.</p>'+
 '<div class="field"><label>Visita</label><select id="formal-choose-visit"><option value="">Elegir visita</option>'+visitOptions()+'</select></div>'+
 '<div class="eyr-formal-actions"><button class="btn btn-primary" data-action="formal-select-visit">Continuar</button><button class="btn" data-action="formal-close">Cerrar</button></div></div>',true);
}
function validateBasics(f){
 if(!clean(f.clientName)){hooks.toast('Completá el nombre del cliente.');return false;}
 if(!clean(f.brand)||!clean(f.model)){hooks.toast('Completá marca y modelo del equipo, o indicá “sin identificar” expresamente.');return false;}
 return true;
}
function next(){
 if(!session)return;
 capture();
 if(session.step===1&&!validateBasics(session.data))return;
 if(session.step===2){
  if(!session.data.sections||!session.data.custom)session.data.sections=generate(session.data);
  session.data.custom=!!session.data.custom;
 }
 session.step=Math.min(3,session.step+1);
 render();
}
function prev(){if(!session)return;capture();session.step=Math.max(1,session.step-1);render();}
function suggest(){
 capture();if(!session)return;
 const s=suggestNotes(session.data.notes);
 let added=0;
 const current=session.data.findings.filter(x=>x.part);
 for(const row of s.findings){
  if(!current.some(x=>x.part===row.part)){current.push(row);added++;}
 }
 session.data.findings=(current.length?current:[{part:'',state:'sin-evaluar'}]).slice(0,7);
 session.data.observed=[...new Set([...session.data.observed,...s.observed])];
 hooks.toast(added?'Se sugirieron '+added+' componente(s). Confirmá su estado antes de continuar.':'No detecté componentes nuevos; podés elegirlos en la lista.');
 render();
}
function changeParts(type,index){
 capture();if(!session)return;
 const f=session.data;
 if(type==='add'&&f.findings.length<7)f.findings.push({part:'',state:'sin-evaluar'});
 else if(type==='remove')f.findings.splice(index,1);
 if(!f.findings.length)f.findings=[{part:'',state:'sin-evaluar'}];
 render();
}
function regenerate(){
 capture();if(!session)return;
 if(!hooks.confirm('¿Querés reemplazar la redacción editada por un nuevo borrador basado en las respuestas?'))return;
 session.data.sections=generate(session.data);session.data.custom=false;render();
}
function saveData(){
 if(!session)return false;
 capture();
 if(!validateBasics(session.data))return false;
 const f=session.data;
 if(!f.sections||!f.custom)f.sections=generate(f);
 if(!clean(f.sections.conclusion)||!clean(f.sections.observations)){hooks.toast('Revisá observaciones y conclusión antes de guardar.');return false;}
 const db=hooks.getDB();db.reports=db.reports||[];
 let report=db.reports.find(r=>r.visitId===session.visit.id);
 if(!report){
  report={id:'informe_'+session.visit.id,visitId:session.visit.id,notes:'',errorCode:'',errorText:'',photos:[],updatedAt:new Date().toISOString()};
  db.reports.push(report);
 }
 report.formal={...JSON.parse(JSON.stringify(f)),updatedAt:new Date().toISOString()};
 report.updatedAt=new Date().toISOString();
 hooks.saveDB();return true;
}
async function pdf(mode){
 if(!saveData())return;
 try{
  hooks.toast('Preparando informe formal…');
  const db=hooks.getDB(),v=session.visit,f=session.data;
  const source=db.reports.find(r=>r.visitId===v.id),images=[];
  if(f.includePhotos&&hooks.photoStore)for(const meta of source?.photos||[]){
   try{const item=await hooks.photoStore('get',null,meta.id);
    if(item?.dataUrl?.startsWith('data:image/jpeg;base64,'))images.push({...meta,dataUrl:item.dataUrl});
   }catch(e){/* Foto que aún no existe en este dispositivo */}
  }
  if(!window.EYRFormalPDF?.report)throw Error('Generador de informe formal no disponible');
  const file=await window.EYRFormalPDF.report(f,v,db.settings,images);
  hooks.download(file,'EYR-Informe-Tecnico-'+String(v.date||'visita')+'-'+String(v.id).slice(-8)+'.pdf',mode);
 }catch(e){hooks.toast('No se pudo generar PDF: '+String(e.message||e));}
}
function handle(action,el){
 if(action==='formal-open'){open(el?.dataset?.id);return true;}
 if(action==='formal-select-visit'){const id=document.getElementById('formal-choose-visit')?.value;if(id)open(id);else hooks.toast('Seleccioná una visita.');return true;}
 if(action==='formal-close'){session=null;hooks.closeModal();return true;}
 if(!session)return false;
 if(action==='formal-next'){next();return true;}
 if(action==='formal-prev'){prev();return true;}
 if(action==='formal-suggest'){suggest();return true;}
 if(action==='formal-add-part'){changeParts('add');return true;}
 if(action==='formal-remove-part'){changeParts('remove',Number(el.dataset.index));return true;}
 if(action==='formal-regenerate'){regenerate();return true;}
 if(action==='formal-save'){if(saveData())hooks.toast('Informe técnico formal guardado.');return true;}
 if(action==='formal-pdf'){pdf(el.dataset.mode==='share'?'share':'view');return true;}
 return false;
}
function init(next){hooks=next;}
window.EYRFormalReport={init,open,handle,generate,suggestNotes,fresh,parts,issues};
})();
