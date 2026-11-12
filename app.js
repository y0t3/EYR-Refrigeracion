(() => {
'use strict';
const KEY = 'eyr-refrigeracion-v1';
const DEFAULT_SETTINGS = {
 business:'EYR Refrigeración', cuit:'20-31933677-0', tax:'Monotributista',
 address:'Chorroarín 2957, Lanús Este, Gran Buenos Aires', phone:'+54 11 3296 0453',
 validity:15, conditions:'La fecha y horario de ejecución se coordinarán previamente con el cliente.\nLos trabajos se realizarán siguiendo los procedimientos técnicos y medidas de seguridad aplicables a cada intervención.',
 lastNumber:0, lastRemitoNumber:0
};
function pickFivePerBrand(models){
  const list=[],counts=new Map(),seen=new Set();
  for(const m of Array.isArray(models)?models:[]){
   if(!m||typeof m.brand!=='string'||typeof m.model!=='string'||typeof m.id!=='string'||seen.has(m.id))continue;
   const key=m.brand.trim().toLowerCase();
   if((counts.get(key)||0)>=5)continue;
   counts.set(key,(counts.get(key)||0)+1);seen.add(m.id);list.push(m);
  }
  return list;
 }
 const blankDB = () => ({version:5,clients:[],visits:[],quotes:[],remitos:[],serviceTemplates:[],equipment:[],catalogFeatured:[],catalogUpdatedAt:'',settings:{...DEFAULT_SETTINGS}});
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY));
  if(!raw||!Array.isArray(raw.clients)||!Array.isArray(raw.visits)||!Array.isArray(raw.quotes))throw Error('incompatible');
  const previouslySaved=Array.isArray(raw.catalogFeatured)?raw.catalogFeatured:(raw.catalogOnline||[]);
  const next={...blankDB(),...raw,
   remitos:Array.isArray(raw.remitos)?raw.remitos:[],
   serviceTemplates:Array.isArray(raw.serviceTemplates)?raw.serviceTemplates:[],
   equipment:Array.isArray(raw.equipment)?raw.equipment:[],
   catalogFeatured:pickFivePerBrand(previouslySaved),
   settings:{...DEFAULT_SETTINGS,...raw.settings,
    lastRemitoNumber:Math.max(Number(raw.settings?.lastRemitoNumber)||0,...(Array.isArray(raw.remitos)?raw.remitos:[]).map(x=>Number(x.number)||0))}
  };
  delete next.catalogOnline;
  // Migración v2.1 -> v2.2: se libera la lista completa, sin tocar equipos de clientes.
  if(Array.isArray(raw.catalogOnline)||!Array.isArray(raw.catalogFeatured)){
   try{localStorage.setItem(KEY,JSON.stringify(next))}catch(e){console.warn('Migración de catálogo',e)}
  }
  return next;
 }catch{return blankDB()}
 }
 
let db=load(), page='inicio', draft=null, search='', filter='todos', agendaView='lista', calendarMonth=null, calendarMode='mes', calendarSelectedDate=null, remitoDraft=null;
const navHistory=[];
function rememberScreen(){if(page && navHistory[navHistory.length-1]!==page)navHistory.push(page)}
const $ = s=>document.querySelector(s);
const uid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
const isoToday = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(n)||0);
const dateText = v => {if(!v)return 'Sin fecha';const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'})};
const dateLong = v => {if(!v)return '';const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})};
const plusDays = (v,n)=>{const [y,m,d]=(v||isoToday()).split('-').map(Number);const dt=new Date(y,m-1,d+Number(n||0));return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`};
const num = n => String(Math.max(0,n||0)).padStart(4,'0');
const price = v => Number(v)||0;
function save(){
 try{
  const json=JSON.stringify(db);localStorage.setItem(KEY,json);
  if(window.EYRAndroid){
   try{if(db.settings.autoBackup!==false&&typeof window.EYRAndroid.autoBackup==='function')window.EYRAndroid.autoBackup(json)}catch(ex){console.warn('Respaldo automático',ex)}
   try{if(typeof window.EYRAndroid.syncReminders==='function')window.EYRAndroid.syncReminders(JSON.stringify(db.visits.map(v=>({id:v.id,client:v.client,date:v.date,time:v.time,description:v.description||'',address:v.address||'',status:v.status,reminderMinutes:Number(v.reminderMinutes)||0}))))}catch(ex){console.warn('Avisos locales',ex)}
  }
 }catch(ex){toast('Sin espacio para guardar. Exportá una copia de seguridad.');console.error(ex)}
}
let toastTimer;function toast(s){const el=$('#toast');el.textContent=s;el.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.display='none',3700)}
const statusLabel={pendiente:'Pendiente',confirmada:'Confirmada',realizada:'Realizada',cancelada:'Cancelada',borrador:'Borrador',enviado:'Enviado',aceptado:'Aceptado',rechazado:'Rechazado'};
const tag = s=>`<span class="tag ${['realizada','aceptado','confirmada'].includes(s)?'ok':['cancelada','rechazado'].includes(s)?'danger':'warn'}">${statusLabel[s]||esc(s)}</span>`;
function empty(t,s){return `<div class="empty"><strong>${esc(t)}</strong><small>${esc(s)}</small></div>`}
function headings(title,description,action=''){return `<div class="page-head"><div><span class="eyebrow">EYR · Gestión</span><h1>${title}</h1><p>${description}</p></div>${action}</div>`}
function setPage(p){
 if(page!==p){
  if(page==='editar-presupuesto'||page==='editar-remito'){
   if(navHistory[navHistory.length-1]===p)navHistory.pop();
  }else rememberScreen();
 }
 if(page!==p&&page==='catalogo'){catalogTransient=null;catalogIndex=null;catalogIndexStatus='idle';catalogIndexPromise=null;catalogCloudRequest++;if(catalogSearchTimer)clearTimeout(catalogSearchTimer)}
 if(page!==p&&p==='catalogo'){catalogQuery='';catalogBrand='todas'}
 page=p;draft=null;remitoDraft=null;search='';filter='todos';closeModal();render();scrollTo({top:0,behavior:'instant'});
}
function returnToPreviousScreen(){
 if($('#modal-root')?.firstElementChild){closeModal();return true}
 if(page==='editar-presupuesto'||page==='editar-remito'){
  const old=page;page=navHistory.pop()||(old==='editar-presupuesto'?'presupuestos':'remitos');
  draft=null;remitoDraft=null;search='';filter='todos';render();scrollTo(0,0);return true;
 }
 let previous=navHistory.pop();
 while(previous===page&&navHistory.length)previous=navHistory.pop();
 if(previous&&previous!==page){page=previous;search='';filter='todos';render();scrollTo(0,0);return true}
 if(page!=='inicio'){page='inicio';search='';filter='todos';render();scrollTo(0,0);return true}
 return false;
}
window.EYRGoBack=returnToPreviousScreen;
function render(){document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const view=$('#view');view.innerHTML=`<div class="page">${page==='inicio'?home():page==='agenda'?agenda():page==='presupuestos'?quotes():page==='clientes'?clients():page==='configuracion'?settings():page==='remitos'?remitos():page==='frecuentes'?frecuentes():page==='catalogo'?catalogo():page==='editar-remito'?remitoForm():page==='editar-presupuesto'?quoteForm():home()}</div>`}
function home(){
 const pending=db.visits.filter(v=>['pendiente','confirmada'].includes(v.status)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const sent=db.quotes.filter(q=>q.status==='enviado').length, month=isoToday().slice(0,7);
 const monthly=db.quotes.filter(q=>(q.date||'').slice(0,7)===month).length;
 return `<div class="hero-eyr"><picture><source media="(max-width: 600px)" srcset="assets/banner-mobile.jpg"><img src="assets/banner-eyr.jpg" alt="EYR Refrigeración: fuego, hielo y dos técnicos con anteojos azules y la frase Es una app de Orellana.. no la entenderías!"></picture></div>
  <div class="eyr-welcome"><h1>❄️ ¡Hola, Orellana! ❄️</h1><p>${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p><div class="welcome-glow"></div></div>
  <div class="quick-grid" aria-label="Accesos directos"><button type="button" class="quick-card warm" data-page="agenda"><span class="quick-icon">📅</span><span class="quick-name">Agenda de visitas</span></button><button type="button" class="quick-card" data-page="presupuestos"><span class="quick-icon">📄</span><span class="quick-name">Presupuestos</span></button><button type="button" class="quick-card warm" data-page="remitos"><span class="quick-icon">📦</span><span class="quick-name">Remitos</span></button><button type="button" class="quick-card" data-page="clientes"><span class="quick-icon">👥</span><span class="quick-name">Clientes</span></button><button type="button" class="quick-card warm" data-page="frecuentes"><span class="quick-icon">🛠️</span><span class="quick-name">Trabajos frecuentes</span></button><button type="button" class="quick-card" data-page="configuracion"><span class="quick-icon">⚙️</span><span class="quick-name">Configuración</span></button></div>
  <div class="eyr-catalog-feature"><div><h2>📚 Catálogo técnico EYR</h2><p>Buscá modelos, refrigerantes, dimensiones, cañerías y fichas oficiales. Disponible sin conexión.</p></div><button class="btn btn-primary" data-page="catalogo">Ver catálogo técnico</button></div>
  <div class="stat-grid"><div class="stat"><div class="stat-label">Visitas pendientes</div><strong>${pending.length}</strong><span>Por realizar</span></div><div class="stat"><div class="stat-label">Presupuestos del mes</div><strong>${monthly}</strong><span>${new Date().toLocaleDateString('es-AR',{month:'long',year:'numeric'})}</span></div><div class="stat"><div class="stat-label">Enviados</div><strong>${sent}</strong><span>En seguimiento</span></div></div>
 <div class="grid-2"><section class="panel"><div class="panel-head"><h2>Próximas visitas</h2><button class="btn btn-small" data-page="agenda">Ver agenda</button></div>${pending.length?`<div class="item-list">${pending.slice(0,5).map(v=>visitCard(v,true)).join('')}</div>`:empty('Agenda libre','Agregá una visita para empezar a organizar tus trabajos.')}</section>
 <section class="panel"><div class="panel-head"><h2>Últimos presupuestos</h2><button class="btn btn-small" data-page="presupuestos">Ver todos</button></div>${db.quotes.length?`<div class="item-list">${[...db.quotes].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,4).map(quoteCard).join('')}</div>`:empty('Todavía no hay presupuestos','Creá el primero y generá un PDF con la identidad de EYR.')}</section></div>`
}
function mapSearchUrl(address){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(String(address||'').trim())}
function mapDirectionsUrl(address){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(String(address||'').trim())+'&travelmode=driving'}
function visitCard(v,compact=false){const address=String(v.address||'').trim();return `<div class="list-item"><div class="item-main"><strong>${esc(v.client||'Sin cliente')}</strong><small>${dateText(v.date)} · ${esc(v.time||'Sin hora')}</small>${address?`<div class="visit-address"><a class="address-link" href="${mapSearchUrl(address)}" target="_blank" rel="noopener noreferrer" title="Ver domicilio en Google Maps" aria-label="Ver ${esc(address)} en Google Maps">📍 ${esc(address)}</a></div>`:''}<small>${esc(v.description||'Visita técnica')}</small></div><div class="item-actions">${tag(v.status)}${address?`<a class="btn btn-small btn-blue" href="${mapDirectionsUrl(address)}" target="_blank" rel="noopener noreferrer" aria-label="Cómo llegar a ${esc(address)}">↗ Cómo llegar</a>`:''}<button class="btn btn-small" data-action="edit-visit" data-id="${v.id}">Editar</button>${compact?'':`<button class="btn btn-small btn-blue" data-action="quote-from-visit" data-id="${v.id}">Presupuestar</button>`}</div></div>`}
function calendarMonthShift(amount){const [year,month]=(calendarMonth||isoToday().slice(0,7)).split('-').map(Number);const d=new Date(year,month-1+amount,1);calendarMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function calendarGrid(visits){
 const monthKey=calendarMonth||isoToday().slice(0,7),[year,month]=monthKey.split('-').map(Number),first=new Date(year,month-1,1),last=new Date(year,month,0).getDate(),offset=(first.getDay()+6)%7,today=isoToday();
 const grouped={};for(const v of visits){if(v.date?.slice(0,7)!==monthKey)continue;(grouped[v.date]??=[]).push(v)}
 const title=first.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
 const days=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('');
 const count=Math.ceil((offset+last)/7)*7;
 const cells=Array.from({length:count},(_,index)=>{
  const number=index-offset+1;if(number<1||number>last)return '<div class="calendar-day empty-day" aria-hidden="true"></div>';
  const date=monthKey+'-'+String(number).padStart(2,'0'),items=grouped[date]||[];
  const events=items.slice(0,3).map(v=>{
   const label=(v.time?v.time+' · ':'')+(v.client||'Visita');
   return `<button type="button" class="calendar-event status-${esc(v.status||'pendiente')}" data-action="visit-detail" data-id="${esc(v.id)}" title="${esc(label+' — '+(v.description||'Visita técnica'))}" aria-label="${esc('Ver visita de '+(v.client||'cliente')+', '+dateText(v.date)+', '+(v.time||'sin hora'))}"><span class="calendar-event-time">${esc(v.time||'')}</span><span class="calendar-event-client">${esc(v.client||'Visita')}</span></button>`;
  }).join('');
  return `<div class="calendar-day ${date===today?'is-today':''} ${items.length?'has-visits':''}" aria-label="${esc(dateText(date))}"><div class="calendar-date"><button type="button" class="eyr-day-number" data-action="calendar-open-day" data-date="${date}" aria-label="Ver agenda del ${esc(dateText(date))}">${number}</button>${items.length?`<span class="calendar-count">${items.length}</span>`:''}</div><div class="calendar-events">${events}${items.length>3?`<button type="button" class="calendar-more" data-action="calendar-day" data-date="${date}" aria-label="Ver las ${items.length} visitas del ${esc(dateText(date))}">+${items.length-3} más</button>`:''}</div></div>`;
 }).join('');
 return `<div class="calendar-toolbar"><div><h2>${title[0].toUpperCase()+title.slice(1)}</h2><small>Seleccioná una visita para ver sus datos</small></div><div class="calendar-controls"><button type="button" class="btn btn-small" data-action="calendar-prev" aria-label="Mes anterior">‹</button><button type="button" class="btn btn-small" data-action="calendar-today">Hoy</button><button type="button" class="btn btn-small" data-action="calendar-next" aria-label="Mes siguiente">›</button></div></div>
 <div class="calendar-scroll"><div class="calendar-grid" role="group" aria-label="Calendario de ${esc(title)}">${days}${cells}</div></div><div class="calendar-legend"><span><i class="legend-pending"></i>Pendiente</span><span><i class="legend-confirmed"></i>Confirmada</span><span><i class="legend-done"></i>Realizada</span><span><i class="legend-canceled"></i>Cancelada</span></div>`;
}
function calAnchor(){return calendarSelectedDate||isoToday()}
function calModeChange(mode){
 if(!['mes','semana','dia'].includes(mode))return;
 if(calendarMode==='mes' && mode!=='mes'){
  const displayed=calendarMonth||isoToday().slice(0,7);
  if(!calAnchor().startsWith(displayed))calendarSelectedDate=displayed+'-01';
 }
 if(mode==='mes')calendarMonth=calAnchor().slice(0,7);
 calendarMode=mode;render();
}
function calMove(amount){
 if(calendarMode==='mes'){calendarMonthShift(amount);return}
 calendarSelectedDate=window.EYRCalendar.addDays(calAnchor(),amount*(calendarMode==='semana'?7:1));
 calendarMonth=calendarSelectedDate.slice(0,7);
}
function calShowDay(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return;calendarSelectedDate=date;calendarMonth=date.slice(0,7);calendarMode='dia';render()}
function calGoToday(){calendarSelectedDate=isoToday();calendarMonth=calendarSelectedDate.slice(0,7)}
function calendarViews(visits){if(calendarMode==='semana')return window.EYRCalendar.week(visits,calAnchor());if(calendarMode==='dia')return window.EYRCalendar.day(visits,calAnchor());return calendarGrid(visits)}
function agenda(){let arr=[...db.visits].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));if(filter!=='todos')arr=arr.filter(x=>x.status===filter);if(search)arr=arr.filter(x=>(x.client+' '+x.description+' '+x.address).toLowerCase().includes(search.toLowerCase()));return `${headings('Agenda de visitas','Organizá relevamientos, instalaciones, mantenimientos y reparaciones.','<button class="btn btn-primary" data-action="new-visit">+ Nueva visita</button>')}
 <div class="panel"><div class="agenda-view-switch"><span>${agendaView==='calendario'?({mes:'Vista mensual',semana:'Vista semanal',dia:'Vista diaria'}[calendarMode]||'Calendario'):'Listado de visitas'}</span><button type="button" class="btn btn-small btn-blue" data-action="toggle-calendar">${agendaView==='calendario'?'☷ Ver lista':'▦ Ver calendario'}</button></div>${agendaView==='calendario'? `<div class="eyr-view-tabs" role="group" aria-label="Vista del calendario">${[['mes','Mes'],['semana','Semana'],['dia','Día']].map(([key,title])=>`<button type="button" class="${calendarMode===key?'active':''}" data-action="calendar-mode" data-mode="${key}" aria-pressed="${calendarMode===key}">${title}</button>`).join('')}</div>`:''}<div class="searchbar"><input id="search-list" placeholder="Buscar cliente o trabajo" value="${esc(search)}" aria-label="Buscar visitas"><select id="filter-list" aria-label="Filtrar estado"><option value="todos">Todos los estados</option>${['pendiente','confirmada','realizada','cancelada'].map(x=>`<option value="${x}" ${filter===x?'selected':''}>${statusLabel[x]}</option>`).join('')}</select></div><div id="list-results">${agendaView==='calendario'?calendarViews(arr):arr.length?`<div class="item-list">${arr.map(v=>visitCard(v)).join('')}</div>`:empty('Sin visitas para mostrar','Probá otro filtro o registrá una nueva visita.')}</div></div>`}
function quoteTotal(q){if(q.mode==='global')return Math.max(0,price(q.globalPrice));return (q.items||[]).reduce((a,x)=>a+price(x.qty)*price(x.unit),0)}
function quoteTasks(q){return [...(q.title?[q.title]:[]),...(q.tasks||[])].map(x=>String(x||'').trim()).filter(Boolean)}
function quoteCard(q){return `<div class="list-item"><div class="item-main"><strong>N.º ${num(q.number)} · ${esc(q.client||'Sin cliente')}</strong><small>${esc(quoteTasks(q)[0]||'Servicio técnico')} · ${dateText(q.date)}</small><small><b>${fmt(quoteTotal(q))}</b></small></div><div class="item-actions">${tag(q.status)}<button class="btn btn-small" data-action="preview-quote" data-id="${q.id}">Vista previa</button><button class="btn btn-small btn-blue" data-action="pdf-quote" data-id="${q.id}">PDF ↓</button><button class="btn btn-small" data-action="view-quote" data-id="${q.id}">👁 Ver PDF</button><button class="btn btn-small btn-blue" data-action="share-quote" data-id="${q.id}">↗ Enviar</button>${q.visitId?`<button class="btn btn-small" data-action="visit-detail" data-id="${esc(q.visitId)}">📅 Ver visita</button>`:""}<button class="btn btn-small" data-action="edit-quote" data-id="${q.id}">Editar</button><button class="btn btn-small" data-action="duplicate-quote" data-id="${q.id}">Duplicar</button>${q.status==="aceptado"?`<button class="btn btn-small btn-blue" data-action="remito-from-quote" data-id="${q.id}">📦 Crear remito</button>`:""}<button class="btn btn-small btn-danger" data-action="delete-quote" data-id="${q.id}">Eliminar</button></div></div>`}
function quotes(){let arr=[...db.quotes].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));if(filter!=='todos')arr=arr.filter(x=>x.status===filter);if(search)arr=arr.filter(x=>(x.client+' '+quoteTasks(x).join(' ')+' '+num(x.number)).toLowerCase().includes(search.toLowerCase()));return `${headings('Presupuestos','Prepará, guardá y compartí presupuestos formales en PDF.','<button class="btn btn-primary" data-action="new-quote">+ Nuevo presupuesto</button>')}<div class="panel"><div class="searchbar"><input id="search-list" placeholder="Buscar cliente, trabajo o número" value="${esc(search)}" aria-label="Buscar presupuestos"><select id="filter-list" aria-label="Filtrar estado"><option value="todos">Todos los estados</option>${['borrador','enviado','aceptado','rechazado'].map(x=>`<option value="${x}" ${filter===x?'selected':''}>${statusLabel[x]}</option>`).join('')}</select></div><div id="list-results">${arr.length?`<div class="item-list">${arr.map(quoteCard).join('')}</div>`:empty('No hay presupuestos','Creá un presupuesto para generar tu primer PDF.')}</div></div>`}

function nameKey(v){return String(v||'').trim().toLocaleLowerCase('es-AR')}
function recordClientMatches(v,c){
 if(v.clientId)return v.clientId===c.id;
 if(nameKey(v.client)!==nameKey(c.name)||!v.client)return false;
 if(v.cuit&&c.cuit&&String(v.cuit).trim()!==String(c.cuit).trim())return false;
 return db.clients.filter(x=>nameKey(x.name)===nameKey(c.name)).length===1;
}
function linkedClient(v){
 if(v.clientId){const c=db.clients.find(x=>x.id===v.clientId);if(c)return c}
 const same=db.clients.filter(x=>nameKey(x.name)===nameKey(v.client));
 return same.length===1?same[0]:null
}
function clientHistory(id){
 const c=db.clients.find(x=>x.id===id);if(!c)return;
 const visits=db.visits.filter(v=>recordClientMatches(v,c));
 const quotes=db.quotes.filter(v=>recordClientMatches(v,c));
 const remitos=db.remitos.filter(v=>recordClientMatches(v,c));
 const items=[...visits.map(v=>({type:'visita',v,date:v.date||'',time:v.time||''})),...quotes.map(v=>({type:'presupuesto',v,date:v.date||'',time:''})),...remitos.map(v=>({type:'remito',v,date:v.date||'',time:''}))].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
 const rows=items.map(x=>{
  const type=x.type, v=x.v;
  const title=type==='visita'?'📅 Visita':type==='presupuesto'?'📄 Presupuesto N.º '+num(v.number):'📦 Remito N.º '+num(v.number);
  const detail=type==='visita'?(v.description||'Visita técnica')+' · '+(v.time||'Sin hora'):type==='presupuesto'?quoteTasks(v).join(', ').slice(0,140):v.items.map(i=>i.description).join(', ').slice(0,140);
  const action=type==='visita'?'visit-detail':type==='presupuesto'?'preview-quote':'preview-remito';
  return '<button type="button" class="eyr-history-event" data-action="'+action+'" data-id="'+esc(v.id)+'"><span>'+esc(dateText(x.date))+'</span><strong>'+esc(title)+'</strong><small>'+esc(detail)+'</small></button>';
 }).join('');
 const body='<div class="eyr-history-header"><b>'+esc(c.name)+'</b><small>'+visits.length+' visitas · '+quotes.length+' presupuestos · '+remitos.length+' remitos · '+equipmentForClient(c.id).length+' equipos</small><p>'+esc([c.address,c.phone,c.cuit].filter(Boolean).join(' · '))+'</p></div><div class="eyr-catalog-client-cta"><span>❄️ Equipos del cliente: <strong>'+equipmentForClient(c.id).length+'</strong></span><button class="btn btn-small btn-blue" data-action="client-equipment" data-id="'+esc(c.id)+'">Ver equipos</button></div><div class="eyr-history-timeline">'+(rows||empty('Sin antecedentes','Los servicios y documentos que vayas registrando se mostrarán aquí.'))+'</div><div class="form-actions"><button class="btn btn-blue" data-action="new-visit-client" data-id="'+esc(c.id)+'">+ Visita</button><button class="btn" data-action="quote-from-client" data-id="'+esc(c.id)+'">+ Presupuesto</button><button class="btn" data-action="remito-from-client" data-id="'+esc(c.id)+'">+ Remito</button></div>';
 modal('Historial técnico · '+c.name,body,true);
}
function templateOptions(){
 return '<option value="">Seleccionar trabajo guardado…</option>'+(db.serviceTemplates||[]).map(t=>'<option value="'+esc(t.id)+'">'+esc(t.description)+'</option>').join('');
}
function frecuentes(){
 const arr=[...(db.serviceTemplates||[])].sort((a,b)=>a.description.localeCompare(b.description,'es'));
 const cards=arr.map(t=>'<div class="eyr-template-card"><div><strong>'+esc(t.description)+'</strong><small>'+(Number(t.price)>0?fmt(t.price)+' · ':'')+(t.category==='materiales'?'Material':'Servicio')+' · Precio editable</small></div><div class="item-actions"><button class="btn btn-small" data-action="edit-template" data-id="'+esc(t.id)+'">Editar</button><button class="btn btn-small btn-danger" data-action="delete-template" data-id="'+esc(t.id)+'">Eliminar</button></div></div>').join('');
 return headings('Trabajos frecuentes','Descripciones reutilizables para presupuestos, remitos y visitas.','<button class="btn btn-primary" data-action="new-template">+ Nuevo trabajo</button>')+'<section class="panel"><div class="eyr-templates">'+(cards||empty('Sin trabajos guardados','Agregá los trabajos o materiales que repetís habitualmente.'))+'</div></section>';
}
function templateModal(id){
 const t=db.serviceTemplates.find(x=>x.id===id)||{id:'',description:'',price:0,category:'manoobra'};
 let html='<form id="template-form" data-id="'+esc(t.id)+'"><div class="form-grid">'+area('description','Descripción reutilizable',t.description,'full',3)+field('price','Precio sugerido (opcional)',t.price,'','number','min="0" step="0.01"')+'<div class="field"><label>Tipo de concepto</label><select name="category"><option value="manoobra" '+(t.category==='manoobra'?'selected':'')+'>Servicio / mano de obra</option><option value="materiales" '+(t.category==='materiales'?'selected':'')+'>Material</option></select></div></div><p class="footnote">El precio es una referencia editable para cada documento.</p><div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Guardar trabajo</button></div></form>';
 modal(t.id?'Editar trabajo frecuente':'Nuevo trabajo frecuente',html);
}
function remitoFromQuote(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 if(q.status!=='aceptado'){toast('Primero marcá el presupuesto como aceptado.');return}
 const old=db.remitos.find(x=>x.sourceQuoteId===q.id);
 if(old){closeModal();openRemito(old.id);toast('Este presupuesto ya tiene un remito vinculado.');return}
 let rows=q.mode==='global'?[{qty:1,description:quoteTasks(q).join(' · ')||'Trabajo presupuestado',unit:quoteTotal(q)}]:(q.items||[]).filter(x=>x.description).map(x=>({qty:Number(x.qty)||1,description:x.description,unit:Number(x.unit)||0}));
 if(!rows.length)rows=[{qty:1,description:quoteTasks(q).join(' · ')||'Trabajo presupuestado',unit:quoteTotal(q)}];
 const r=newRemitoDraft();const c=linkedClient(q);
 Object.assign(r,{clientId:q.clientId||c?.id||'',client:q.client,cuit:q.cuit||'',address:q.address||'',iva:c?.iva||'',visitId:q.visitId||'',sourceQuoteId:q.id,items:rows});
 remitoDraft=r;closeModal();rememberScreen();page='editar-remito';render();scrollTo(0,0);
}
function visitQuoteList(v){
 const linked=db.quotes.filter(q=>q.visitId===v.id);
 const list=linked.map(q=>'<button type="button" class="btn btn-small" data-action="preview-quote" data-id="'+esc(q.id)+'">N.º '+num(q.number)+' · '+fmt(quoteTotal(q))+'</button>').join('');
 return list?'<div class="visit-detail-row"><span>📄 Presupuestos vinculados</span><div class="eyr-related-links">'+list+'</div></div>':'';
}

/* EYR Catálogo híbrido — 5 fichas por marca sin conexión y consultas temporales. */
 let catalogQuery='', catalogBrand='todas', catalogClientId='';
 let catalogIndex=null, catalogIndexPromise=null, catalogIndexStatus='idle';
 let catalogTransient=null, catalogSearchTimer=null, catalogCloudRequest=0;
 const catalogCloudBase='https://y0t3.github.io/EYR-Refrigeracion';
 function officialCatalogUrl(url){
  try{const u=new URL(String(url||''));return u.protocol==='https:'&&['www.samsung.com','samsung.com','www.lg.com','lg.com','www.bgh.com.ar','bgh.com.ar'].includes(u.hostname)?u.href:''}
  catch{return ''}
 }
 function validCatalogModel(m){
  return m&&typeof m==='object'&&/^[a-z0-9][a-z0-9_-]{3,90}$/.test(m.id||'')&&typeof m.brand==='string'&&m.brand.length<70&&typeof m.model==='string'&&m.model.length<100&&!!officialCatalogUrl(m.url);
 }
 function catalogItems(){
  const featured=Array.isArray(db.catalogFeatured)&&db.catalogFeatured.length?db.catalogFeatured:window.EYR_CATALOG_BASE?.models||[];
  return pickFivePerBrand(featured.filter(validCatalogModel)).sort((a,b)=>a.brand.localeCompare(b.brand,'es')||a.model.localeCompare(b.model,'es'));
 }
 function findCatalogModel(id){return catalogItems().find(m=>m.id===id)||(catalogTransient?.id===id?catalogTransient:null)}
 function catalogMatches(){
  const query=catalogQuery.toLocaleLowerCase('es-AR').trim();
  return catalogItems().filter(m=>(catalogBrand==='todas'||m.brand===catalogBrand)&&(!query||[m.brand,m.model,m.series,m.refrigerant,m.type].join(' ').toLocaleLowerCase('es-AR').includes(query)));
 }
 function catalogIndexMatches(){
  const query=catalogQuery.toLocaleLowerCase('es-AR').trim();
  if(query.length<2||!catalogIndex)return [];
  const known=new Set(catalogItems().map(x=>x.id));
  return catalogIndex.models.filter(m=>!known.has(m.id)&&(catalogBrand==='todas'||m.brand===catalogBrand)&&[m.brand,m.model,m.series,m.refrigerant,m.type].join(' ').toLocaleLowerCase('es-AR').includes(query)).slice(0,30);
 }
 function catalogBrandOptions(){
  const brands=[...new Set([...catalogItems(),...(catalogIndex?.models||[])].map(m=>m.brand))].sort((a,b)=>a.localeCompare(b,'es'));
  return '<option value="todas">Todas las marcas</option>'+brands.map(x=>'<option value="'+esc(x)+'" '+(catalogBrand===x?'selected':'')+'>'+esc(x)+'</option>').join('');
 }
 async function catalogFetchJson(path){
  const url=catalogCloudBase+'/'+path+'?v='+Date.now();
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error('Sin respuesta del catálogo ('+response.status+')');
  return response.json();
 }
 function catalogRefreshResults(){
  if(page!=='catalogo')return;
  const box=$('#catalog-results');if(box)box.innerHTML=catalogResults();
  const select=$('#catalog-brand');if(select){select.innerHTML=catalogBrandOptions();select.value=catalogBrand}
 }
 async function catalogEnsureIndex(){
  if(catalogIndex)return catalogIndex;
  if(catalogIndexPromise)return catalogIndexPromise;
  catalogIndexStatus='loading';catalogRefreshResults();
  catalogIndexPromise=(async()=>{
   const data=await catalogFetchJson('catalogo-indice.json');
   if(data?.schema!==2||!Array.isArray(data.models)||data.models.length>30000)throw Error('Índice no compatible');
   const ids=new Set();
   for(const m of data.models){
    if(!m||!/^[a-z0-9][a-z0-9_-]{3,90}$/.test(m.id||'')||typeof m.brand!=='string'||m.brand.length>70||typeof m.model!=='string'||m.model.length>100||ids.has(m.id))throw Error('Modelo incorrecto en índice');
    ids.add(m.id);
   }
   catalogIndex={models:data.models,updated:data.updated||''};
   catalogIndexStatus='ready';return catalogIndex;
  })();
  try{return await catalogIndexPromise}
  catch(e){console.warn('Catálogo remoto',e);catalogIndexStatus='offline';return null}
  finally{catalogIndexPromise=null;catalogRefreshResults()}
 }
 async function catalogCloudDetail(id){
  const entry=catalogIndex?.models.find(m=>m.id===id);if(!entry)return toast('No se encontró ese modelo en línea.');
  const serial=++catalogCloudRequest;
  toast('Consultando ficha en GitHub…');
  try{
   const doc=await catalogFetchJson('catalogo/fichas/'+encodeURIComponent(id)+'.json');
   const m=doc?.model;
   if(doc.schema!==2||!validCatalogModel(m)||m.id!==id||m.brand!==entry.brand||m.model!==entry.model)throw Error('Ficha técnica no verificada');
   if(serial!==catalogCloudRequest)return;
   catalogTransient=m;
   catalogDetail(id);
  }catch(e){console.warn('Ficha en línea',e);toast('No pudimos abrir esa ficha. Comprobá la conexión e intentá nuevamente.')}
 }
 
function catalogPhotoUrl(m){
 try{
  const value=String(m?.photo||'');
  if(!value||value.length>500)return '';
  const u=new URL(value);
  if(u.protocol!=='https:'||!['images.samsung.com','www.lg.com','lg.com','d2pr1pn9ywx3vo.cloudfront.net'].includes(u.hostname))return '';
  return u.href;
 }catch{return ''}
}
function catalogPhoto(m,variation='card'){
 const url=catalogPhotoUrl(m),brand=String(m?.brand||''),model=String(m?.model||'');
 const label='Foto de '+brand+' '+model;
 const caption=url?String(m?.photoCredit||'Foto de referencia del modelo'):'Foto no disponible';
 return `<figure class="eyr-model-photo ${esc(variation)} ${url?'':'has-error'}">${url?`<img src="${esc(url)}" alt="${esc(label)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:''}<div class="eyr-photo-fallback"><span aria-hidden="true">❄️</span><strong>Foto no disponible</strong><small>Consultá la ficha del fabricante</small></div><figcaption>${esc(caption)}</figcaption></figure>`;
}
function catalogCard(m){
 const official=!!officialCatalogUrl(m.url);
 return `<article class="eyr-model-card">${catalogPhoto(m,'card')}<div class="eyr-model-head"><span class="eyr-model-brand">${esc(m.brand)}</span><span class="eyr-model-tag">Disponible sin conexión</span></div><h3>${esc(m.model)}</h3><p>${esc(m.series||m.type||'Aire acondicionado')}</p><div class="eyr-model-specs"><div><small>Refrigerante</small><strong>${esc(m.refrigerant||'No verificado')}</strong></div><div><small>Capacidad frío</small><strong>${esc(m.coolingBTU||m.coolingKW||'No verificado')}</strong></div></div><div class="eyr-model-actions"><button class="btn btn-small btn-blue" data-action="catalog-detail" data-id="${esc(m.id)}">📖 Ver ficha</button><button class="btn btn-small btn-primary" data-action="catalog-associate" data-id="${esc(m.id)}">+ Asociar</button></div></article>`;
 }
 function catalogCloudCard(m){
  return `<div class="eyr-cloud-hit"><div><strong>${esc(m.brand)} · ${esc(m.model)}</strong><small>${esc([m.series,m.refrigerant].filter(Boolean).join(' · ')||'Ficha del fabricante')}</small></div><button type="button" class="btn btn-small btn-blue" data-action="catalog-cloud-detail" data-id="${esc(m.id)}">☁️ Ver ficha</button></div>`;
 }
 function catalogResults(){
  const all=catalogItems(),local=catalogMatches(),remote=catalogIndexMatches(),query=catalogQuery.trim();
  if(!query){
   const brands=[...new Set(local.map(m=>m.brand))].sort((a,b)=>a.localeCompare(b,'es'));
   const groups=brands.map(brand=>{
     const models=local.filter(m=>m.brand===brand);
     return '<details class="eyr-featured-brand"><summary><span>❄️ '+esc(brand)+'</span><small>'+models.length+' ejemplos sin conexión</small></summary><div class="eyr-catalog-grid">'+models.map(catalogCard).join('')+'</div></details>';
   }).join('');
   return '<p class="eyr-catalog-count">5 ejemplos por marca · Tocá una marca para verlos</p><div class="eyr-featured-groups">'+groups+'</div>';
  }
  let note='';
  if(query.length<2)note='<p class="eyr-catalog-hint">Escribí al menos 2 caracteres para buscar en GitHub.</p>';
  else if(catalogIndexStatus==='loading')note='<p class="eyr-catalog-hint">☁️ Buscando modelos en GitHub…</p>';
  else if(catalogIndexStatus==='offline')note='<p class="eyr-catalog-hint">Sin conexión al catálogo. Los ejemplos y equipos de clientes siguen disponibles. <button type="button" class="btn btn-small" data-action="catalog-search-retry">Reintentar</button></p>';
  else if(catalogIndexStatus==='idle')note='<p class="eyr-catalog-hint">☁️ Consultando biblioteca en línea…</p>';
  else if(!local.length&&!remote.length)note='<p class="eyr-catalog-hint">No se encontró ese modelo. Revisá el código exacto o registralo manualmente.</p>';
  return `<p class="eyr-catalog-count">${local.length+remote.length} coincidencia${local.length+remote.length===1?'':'s'} ${catalogIndexStatus==='ready'?'entre ejemplos y GitHub':'en los ejemplos'}</p>${local.length?' <div class="eyr-catalog-grid">'+local.map(catalogCard).join('')+'</div>':''}${remote.length?'<h3 class="eyr-cloud-title">☁️ En GitHub · Consulta temporal</h3><div class="eyr-cloud-list">'+remote.map(catalogCloudCard).join('')+'</div>':''}${note}`;
 }
 function catalogo(){
  const who=catalogClientId?db.clients.find(c=>c.id===catalogClientId):null;
  return `${headings('Catálogo técnico','Encontrá un aire por marca o código de modelo.')}<section class="panel"><div class="eyr-catalog-intro"><div><h2>❄️ Fichas técnicas EYR</h2><p>Los ejemplos funcionan sin conexión. Si buscás otro modelo, EYR consulta GitHub y lo muestra sin guardarlo. Solo queda registrado si lo asociás a un cliente.</p></div><button class="btn btn-small btn-blue" data-action="catalog-update">↻ Renovar ejemplos</button></div>${who?'<div class="eyr-catalog-client-cta"><span>Asociando a: <strong>'+esc(who.name)+'</strong></span><button class="btn btn-small" data-action="catalog-clear-client">Quitar selección</button></div>':''}<div class="eyr-catalog-tools"><input id="catalog-search" autocomplete="off" placeholder="Buscar marca o modelo en GitHub…" aria-label="Buscar modelo" value="${esc(catalogQuery)}"><select id="catalog-brand" aria-label="Filtrar marca">${catalogBrandOptions()}</select></div><div id="catalog-results">${catalogResults()}</div><div class="eyr-catalog-new"><strong>¿No encontraste el equipo?</strong><p class="eyr-catalog-footer">Podés anotarlo para un cliente sin inventar datos técnicos. La búsqueda online requiere Internet; las fichas guardadas de tus clientes no.</p><div class="eyr-model-actions"><button class="btn btn-small" data-action="catalog-manual">+ Registrar equipo manual</button><button class="btn btn-small" data-action="catalog-find-web">🔎 Buscar en la web</button></div></div><p class="eyr-catalog-footer">Ejemplos locales: ${allNumberOfFeatured()} · Actualización: ${esc(db.catalogUpdatedAt||window.EYR_CATALOG_BASE?.updated||'No consultada')} · Confirmá la placa y el manual antes de intervenir.</p></section>`;
 }
 function allNumberOfFeatured(){return catalogItems().length}
 
function catalogSpecGrid(m){
 const specs=[['Marca',m.brand],['Modelo exacto',m.model],['Línea',m.series],['Tipo',m.type],['Refrigerante',m.refrigerant],['Capacidad frío (kW)',m.coolingKW],['Capacidad frío (BTU/h)',m.coolingBTU],['Unidad interior · An × Al × Prof',m.indoorSize],['Unidad exterior · An × Al × Prof',m.outdoorSize],['Peso unidad interior',m.indoorWeight],['Peso unidad exterior',m.outdoorWeight],['Conexión líquido',m.liquidPipe],['Conexión gas',m.gasPipe],['Tubería máxima',m.maxPipe],['Desnivel máximo',m.maxElevation],['Alimentación eléctrica',m.electrical]];
 return `<div class="eyr-model-detail">${specs.map(([name,v])=>`<div><span>${esc(name)}</span><strong>${esc(v||'No verificado')}</strong></div>`).join('')}</div>`;
}
function catalogDetail(id){
 const m=findCatalogModel(id);if(!m){toast('No se encontró la ficha de ese modelo.');return}
 const source=officialCatalogUrl(m.url),inCloud=catalogTransient?.id===id&&!catalogItems().some(x=>x.id===id);
 modal('Ficha técnica · '+m.model,`${catalogPhoto(m,'detail')}${inCloud?'<p class="eyr-cloud-label">☁️ Consulta temporal: esta ficha no queda guardada hasta que la asocies a un cliente.</p>':''}<p class="eyr-model-warning">Los datos corresponden al modelo exacto <strong>${esc(m.model)}</strong>. Antes de intervenir, verificá la placa, el manual y las instrucciones de seguridad.</p>${catalogSpecGrid(m)}${m.notes?'<p class="eyr-catalog-footer">🛠 '+esc(m.notes)+'</p>':''}${source?'<p><a class="eyr-catalog-source" target="_blank" rel="noopener noreferrer" href="'+esc(source)+'">🌐 Ficha oficial y documentación del fabricante</a></p>':''}<div class="form-actions"><button class="btn btn-primary" data-action="catalog-associate" data-id="${esc(m.id)}">+ Asociar a cliente</button><button class="btn" data-action="close-modal">Cerrar</button></div>`,true);
 }
 
function equipmentModel(item){return item.specSnapshot||findCatalogModel(item.catalogId)||null}
function clientEquipmentCards(clientId){
 const list=equipmentForClient(clientId);
 return `<div class="eyr-equipment-list">${list.map(item=>`<div class="eyr-equipment-card">${equipmentModel(item)?catalogPhoto(equipmentModel(item),'mini'):''}<div><strong>❄️ ${esc(equipmentName(item))}</strong><small>${esc(item.location||'Sin ubicación')}${item.serial?' · Serie: '+esc(item.serial):''}</small><small>${equipmentModel(item)?'Ficha técnica disponible':'Modelo anotado; ficha pendiente de verificar'}</small></div><div class="eyr-equipment-actions"><button type="button" class="btn btn-small btn-blue" data-action="equipment-detail" data-id="${esc(item.id)}">Ficha</button><button type="button" class="btn btn-small" data-action="equipment-edit" data-id="${esc(item.id)}">Editar</button></div></div>`).join('')||empty('Sin equipos registrados','Podés agregar los equipos de este cliente desde el Catálogo técnico.')}</div>`;
}
function clientEquipments(id){
 const c=db.clients.find(x=>x.id===id);if(!c)return;
 modal('Equipos · '+c.name,`<p class="eyr-catalog-footer">Equipos registrados para este cliente. Podés consultar sus datos y asociarlos a visitas.</p>${clientEquipmentCards(id)}<div class="form-actions"><button class="btn btn-primary" data-action="catalog-for-client" data-id="${esc(c.id)}">📚 Buscar equipo en catálogo</button><button class="btn" data-action="equipment-manual" data-id="${esc(c.id)}">+ Equipo manual</button></div>`,true);
}
function equipmentModal(equipmentId,catalogId,preselectedClientId){
 const old=(db.equipment||[]).find(x=>x.id===equipmentId);
 const model=findCatalogModel(catalogId||old?.catalogId)||old?.specSnapshot||null;
 if(!old&&!model&&!preselectedClientId&&db.clients.length===0){toast('Primero registrá un cliente para asociarle el equipo.');setPage('clientes');return}
 const item=old||{id:'',clientId:preselectedClientId||catalogClientId||'',catalogId:catalogId||'',brand:model?.brand||'',model:model?.model||'',location:'',serial:'',installedAt:'',notes:''};
 const fromCatalog=!!(model||item.catalogId);
 const clients=db.clients.slice().sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const clientsHTML=`<div class="field full"><label>Cliente *</label><select name="clientId" required><option value="">Elegir cliente</option>${clients.map(c=>`<option value="${esc(c.id)}" ${item.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>`;
 const details=fromCatalog?`<div class="field full"><label>Equipo seleccionado</label><strong>${esc(equipmentName({brand:model?.brand||item.brand,model:model?.model||item.model}))}</strong><small>Las especificaciones técnicas se toman de la ficha verificada.</small></div>`:`${field('brand','Marca',item.brand,'','text','required')}${field('model','Código de modelo (etiqueta)',item.model,'','text','required')}`;
 modal(old?'Editar equipo del cliente':'Asociar equipo a cliente',`<form id="equipment-form" data-id="${esc(item.id||'')}" data-catalog-id="${esc(model?.id||item.catalogId||'')}"><div class="form-grid">${clientsHTML}${details}${field('location','Ubicación (ej. dormitorio, cocina)',item.location,'full')}${field('serial','Número de serie (opcional)',item.serial,'full')}${field('installedAt','Fecha de instalación (opcional)',item.installedAt,'','date')}${area('notes','Observaciones particulares',item.notes,'full',3)}</div><p class="eyr-catalog-footer">Identificación por modelo: confirmá el código completo de la placa antes de usar especificaciones técnicas.</p><div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Guardar equipo</button></div></form>`,true);
}
function equipmentDetail(id){
 const item=(db.equipment||[]).find(x=>x.id===id);if(!item)return;
 const c=db.clients.find(x=>x.id===item.clientId),m=equipmentModel(item);
 const visits=db.visits.filter(v=>v.equipmentId===item.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 modal('Equipo · '+equipmentName(item),`${m?catalogPhoto(m,'detail'):''}<div class="eyr-history-header"><b>${esc(equipmentName(item))}</b><small>Cliente: ${esc(c?.name||'No encontrado')} · ${esc(item.location||'Ubicación no informada')}</small><p>${item.serial?'N.º de serie: '+esc(item.serial):'Sin número de serie'}${item.installedAt?' · Instalación: '+esc(dateText(item.installedAt)):''}</p></div>${item.notes?`<p class="eyr-catalog-footer">📝 ${esc(item.notes)}</p>`:''}${m?catalogSpecGrid(m):'<p class="eyr-model-warning">Equipo cargado manualmente. No se conocen aún las especificaciones del fabricante para este código.</p>'}${m&&officialCatalogUrl(m.url)?`<p><a class="eyr-catalog-source" target="_blank" rel="noopener noreferrer" href="${esc(officialCatalogUrl(m.url))}">🌐 Fuente técnica oficial</a></p>`:''}<h3>Historial de visitas de este equipo</h3>${visits.length?`<div class="eyr-history-timeline">${visits.map(v=>`<button class="eyr-history-event" data-action="visit-detail" data-id="${esc(v.id)}"><span>${esc(dateText(v.date))}</span><strong>${esc(v.description)}</strong></button>`).join('')}</div>`:empty('Sin intervenciones registradas','Cuando vinculás este equipo a una visita, su historial aparece aquí.')}<div class="form-actions"><button class="btn btn-blue" data-action="equipment-edit" data-id="${esc(item.id)}">Editar</button><button class="btn btn-primary" data-action="equipment-visit" data-id="${esc(item.id)}">+ Agendar visita</button><button class="btn btn-danger" data-action="equipment-delete" data-id="${esc(item.id)}">Eliminar equipo</button></div>`,true);
}
function equipmentVisit(id){
 const item=(db.equipment||[]).find(x=>x.id===id);if(!item)return;
 const c=db.clients.find(x=>x.id===item.clientId);closeModal();visitModal();
 const form=$('#visit-form');if(!form)return;
 if(c){form.elements.namedItem('clientId').value=c.id;form.elements.namedItem('client').value=c.name;form.elements.namedItem('address').value=c.address||''}
 const el=form.elements.namedItem('equipmentId');if(el){el.innerHTML='<option value="">Sin equipo asociado</option>'+equipmentForClient(item.clientId).map(e=>'<option value="'+esc(e.id)+'">'+esc(equipmentName(e)+' · '+(e.location||'Sin ubicación'))+'</option>').join('');el.value=item.id;}
 const desc=form.elements.namedItem('description');if(desc)desc.value='Servicio de '+equipmentName(item)+(item.location?' · '+item.location:'');
}
function catalogWebSearch(){
 const query=catalogQuery.trim();
 const u='https://www.google.com/search?q='+encodeURIComponent((query||'aire acondicionado split')+' ficha técnica manual site:samsung.com OR site:lg.com OR site:bgh.com.ar');
 window.open(u,'_blank','noopener,noreferrer');
}
async function catalogUpdate(){
 toast('Renovando los cinco ejemplos de cada marca…');
 try{
  const doc=await catalogFetchJson('catalogo-destacados.json');
  if(doc?.schema!==2||!Array.isArray(doc.models)||!doc.models.length||doc.models.length>80||doc.models.some(m=>!validCatalogModel(m)))throw Error('Archivo de ejemplos inválido');
  const picked=pickFivePerBrand(doc.models);
  if(picked.length!==doc.models.length)throw Error('Hay más de cinco ejemplos en una marca');
  db.catalogFeatured=picked;delete db.catalogOnline;
  db.catalogUpdatedAt=String(doc.updated||isoToday()).slice(0,32);
  save();render();toast('Ejemplos actualizados: '+picked.length+' fichas sin conexión.');
 }catch(e){console.warn('Actualización de ejemplos',e);toast('No se pudo actualizar. Los ejemplos actuales siguen disponibles.')}
 }
 
function clientCard(c){let count=db.quotes.filter(q=>recordClientMatches(q,c)).length;const equipmentCount=equipmentForClient(c.id).length;return `<div class="list-item"><div class="item-main"><strong>${esc(c.name)}</strong><small>${[c.phone,c.address,c.cuit].filter(Boolean).map(esc).join(' · ')||'Sin datos adicionales'}</small><small>${count} presupuesto${count===1?'':'s'} · ${equipmentCount} equipo${equipmentCount===1?'':'s'}</small></div><div class="item-actions"><button class="btn btn-small btn-blue" data-action="client-equipment" data-id="${c.id}">❄️ Equipos</button><button class="btn btn-small btn-primary" data-action="client-history" data-id="${c.id}">🕒 Historial técnico</button><button class="btn btn-small btn-blue" data-action="quote-from-client" data-id="${c.id}">Presupuestar</button><button class="btn btn-small" data-action="remito-from-client" data-id="${c.id}">Remito</button><button class="btn btn-small" data-action="edit-client" data-id="${c.id}">Editar</button><button class="btn btn-small btn-danger" data-action="delete-client" data-id="${c.id}">Eliminar</button></div></div>`}
function clients(){const arr=db.clients.filter(c=>(c.name+' '+c.phone+' '+c.cuit).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));return `${headings('Clientes','Visitas, presupuestos, remitos y equipos registrados en un mismo lugar.','<button class="btn btn-primary" data-action="new-client">+ Nuevo cliente</button>')}<section class="panel"><div class="searchbar"><input id="search-list" placeholder="Buscar por nombre, teléfono o CUIT" value="${esc(search)}" aria-label="Buscar clientes"></div><div id="list-results">${arr.length?`<div class="item-list">${arr.map(clientCard).join('')}</div>`:empty('Sin clientes','Agregá el primer cliente o crealo desde un presupuesto.')}</div></section>`}
function settings(){let s=db.settings;return `${headings('Configuración','Datos fijos de EYR y respaldo de información.')}
 <div class="grid-2"><form class="panel" id="settings-form"><div class="panel-head"><h2>Datos para los PDF</h2></div><div class="form-grid">${field('business','Nombre comercial',s.business,'full')}${field('cuit','CUIT',s.cuit)}${field('tax','Condición fiscal',s.tax)}${field('address','Domicilio',s.address,'full')}${field('phone','Teléfono',s.phone,'full')}${field('validity','Validez habitual (días)',s.validity,'','number')}${area('conditions','Condiciones predeterminadas',s.conditions,'full')}</div><div class="form-actions"><button class="btn btn-primary" type="submit">Guardar cambios</button></div></form>
 <div><section class="panel"><h2>Identidad EYR</h2><img style="width:100%;max-width:250px;display:block;margin:10px auto;border-radius:15px" src="assets/logo-marca.jpg" alt="Nuevo logo de EYR Refrigeración"><p>Identidad EYR: ícono azul para la app y logo con fondo blanco exclusivo para los presupuestos formales.</p></section><section class="panel" style="margin-top:17px"><h2>Copias de seguridad</h2><p>Los datos permanecen en este dispositivo. En Android podés guardar automáticamente un archivo JSON en Descargas/EYR Refrigeracion cada vez que cambien los registros.</p><label class="eyr-check"><input type="checkbox" form="settings-form" name="autoBackup" ${s.autoBackup!==false?'checked':''}> Respaldo automático local (Android)</label><p class="footnote">El respaldo se actualiza en el mismo celular; para protegerte ante pérdida o rotura, exportá también una copia a otro lugar seguro.</p><div class="btn-row"><button class="btn btn-blue" data-action="export">↓ Exportar copia</button><button class="btn" data-action="choose-import">↑ Importar copia</button></div><input id="import-json" type="file" accept="application/json,.json" hidden><p class="footnote">Importar reemplaza los datos actuales. Hacé una copia antes de cambiar de celular o borrar el navegador.</p></section></div></div>`}
function field(name,label,value='',className='',type='text',more=''){return `<div class="field ${className}"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${more}></div>`}
function area(name,label,value='',className='',rows=4){return `<div class="field ${className}"><label for="f-${name}">${label}</label><textarea id="f-${name}" name="${name}" rows="${rows}">${esc(value)}</textarea></div>`}
// Remitos de EYR: independientes de los presupuestos, con numeracion y copia local propias.
function remitoTotal(r){return (r?.items||[]).reduce((sum,it)=>sum+Math.max(0,Number(it.qty)||0)*Math.max(0,Number(it.unit)||0),0)}
function remitoCard(r){return `<div class="list-item"><div class="item-main"><strong>Remito N.º ${num(r.number)} · ${esc(r.client||'Sin cliente')}</strong><small>Emitido el ${dateText(r.date)} · ORIGINAL + DUPLICADO</small><small><b>${fmt(remitoTotal(r))}</b> · ${(r.items||[]).length} concepto(s)</small></div><div class="item-actions"><button class="btn btn-small" data-action="preview-remito" data-id="${esc(r.id)}">Vista previa</button><button class="btn btn-small btn-blue" data-action="pdf-remito" data-id="${esc(r.id)}">PDF ↓</button><button class="btn btn-small" data-action="view-remito" data-id="${esc(r.id)}">👁 Ver PDF</button><button class="btn btn-small btn-blue" data-action="share-remito" data-id="${esc(r.id)}">↗ Enviar</button>${r.sourceQuoteId?`<button class="btn btn-small" data-action="preview-quote" data-id="${esc(r.sourceQuoteId)}">📄 Presupuesto</button>`:""}<button class="btn btn-small" data-action="edit-remito" data-id="${esc(r.id)}">Editar</button><button class="btn btn-small" data-action="duplicate-remito" data-id="${esc(r.id)}">Duplicar</button><button class="btn btn-small btn-danger" data-action="delete-remito" data-id="${esc(r.id)}">Eliminar</button></div></div>`}
function remitos(){let arr=[...(db.remitos||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''));if(search)arr=arr.filter(r=>(r.client+' '+r.cuit+' '+r.address+' '+r.number+' '+(r.items||[]).map(i=>i.description).join(' ')).toLowerCase().includes(search.toLowerCase()));return `${headings('Remitos','Documentos claros, con total automático y dos copias en un solo PDF.','<button class="btn btn-primary" data-action="new-remito">+ Nuevo remito</button>')}<section class="panel remitos-list"><div class="remito-intro"><span class="remito-stamp">📦 REMITO</span><div><strong>Original y duplicado</strong><p>La aplicación conserva el historial de los remitos; cada PDF incluye las dos versiones y las firmas de conformidad.</p></div></div><div class="searchbar"><input id="search-list" placeholder="Buscar remito, cliente o trabajo" value="${esc(search)}" aria-label="Buscar remitos"></div><div id="list-results">${arr.length?`<div class="item-list">${arr.map(remitoCard).join('')}</div>`:empty('Todavía no hay remitos','Creá el primero para generar un PDF con ORIGINAL y DUPLICADO.')}</div></section>`}
function newRemitoDraft(){return {sourceQuoteId:'',visitId:'',id:null,number:Math.max(0,Number(db.settings.lastRemitoNumber)||0)+1,date:isoToday(),clientId:'',client:'',cuit:'',address:'',iva:'',items:[{qty:1,description:'',unit:0}]}}
function openRemito(id,clientId){closeModal();const old=(db.remitos||[]).find(x=>x.id===id);remitoDraft=old?JSON.parse(JSON.stringify(old)):newRemitoDraft();if(clientId)applyRemitoClient(remitoDraft,clientId);rememberScreen();page='editar-remito';render();scrollTo({top:0,behavior:'instant'})}
function applyRemitoClient(r,id){const c=db.clients.find(x=>x.id===id);if(c){r.clientId=c.id;r.client=c.name||'';r.cuit=c.cuit||'';r.address=c.address||'';r.iva=c.iva||r.iva||''}}
function remitoRow(it,index){return `<div class="remito-line-item"><div class="remito-line-top"><span>Concepto ${index+1}</span><button type="button" class="btn btn-small btn-danger" data-action="remove-remito-item" data-index="${index}">✕ Quitar</button></div><div class="remito-line-fields"><div class="field remito-qty"><label>Cantidad</label><input type="number" inputmode="decimal" step="0.01" min="0.01" data-remito-index="${index}" data-remito-field="qty" value="${esc(it.qty)}" aria-label="Cantidad de concepto ${index+1}"></div><div class="field remito-desc"><label>Descripción del trabajo o material</label><input type="text" data-remito-index="${index}" data-remito-field="description" placeholder="Ej.: Reparación y carga de gas" value="${esc(it.description)}" aria-label="Descripción de concepto ${index+1}"></div><div class="field remito-unit"><label>Precio unitario ($)</label><input type="number" inputmode="decimal" step="0.01" min="0" data-remito-index="${index}" data-remito-field="unit" value="${esc(it.unit)}" aria-label="Precio unitario de concepto ${index+1}"></div></div><div class="remito-line-subtotal">Importe: <strong>${fmt((Number(it.qty)||0)*(Number(it.unit)||0))}</strong></div></div>`}
function remitoForm(){const r=remitoDraft;if(!r)return '';const opts=`<option value="">Carga manual / nuevo cliente</option>${db.clients.map(c=>`<option value="${esc(c.id)}" ${r.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}`;return `${headings(r.id?'Editar remito':'Nuevo remito','Completá los datos y generá el PDF con original y duplicado.')}<div class="quote-layout"><form class="panel" id="remito-form"><div class="form-section"><h3>1. Datos del remito</h3><p class="section-desc">El logo y los datos de EYR se completan automáticamente.</p><div class="form-grid">${field('date','Fecha de emisión',r.date,'','date','required')}${field('number','Número de remito',num(r.number),'','text','inputmode="numeric" required')}<div class="field full"><label for="remito-clientId">Seleccionar cliente guardado (opcional)</label><select id="remito-clientId" name="clientId">${opts}</select></div>${field('client','Cliente / razón social',r.client,'full','text','required')}${field('cuit','CUIT / DNI',r.cuit)}${field('iva','Condición frente al IVA',r.iva)}${field('address','Dirección del cliente',r.address,'full')}<div class="field full"><label>Presupuesto relacionado (opcional)</label><select name="sourceQuoteId"><option value="">Sin presupuesto vinculado</option>${db.quotes.filter(q=>(!r.clientId&&!r.client)||(q.clientId&&q.clientId===r.clientId)||(nameKey(q.client)===nameKey(r.client))).map(q=>`<option value="${esc(q.id)}" ${r.sourceQuoteId===q.id?"selected":""}>N.º ${num(q.number)} · ${fmt(quoteTotal(q))} · ${esc(q.status)}</option>`).join("")}</select></div></div></div><div class="form-section"><h3>2. Trabajos y precios</h3><p class="section-desc">Ingresá cantidades y precios unitarios. El importe de cada línea y el total se calculan automáticamente.</p><div id="remito-rows">${(r.items||[]).map(remitoRow).join('')}</div><button type="button" class="btn btn-small btn-blue" data-action="add-remito-item">+ Agregar concepto</button><div class="eyr-picker"><select id="template-remito">${templateOptions()}</select><button type="button" class="btn btn-small btn-blue" data-action="use-template-remito">+ Trabajo frecuente</button></div><div class="total-box remito-total"><span><b>TOTAL DEL REMITO</b><br><small class="muted">Cantidad × precio unitario</small></span><strong id="remito-total-value">${fmt(remitoTotal(r))}</strong></div></div><div class="form-section"><h3>3. Copias y firmas</h3><p class="section-desc">El PDF se descarga con la hoja ORIGINAL y la DUPLICADA. Ambas incluyen los casilleros «Entregado por» y «Recibido por» para firma y aclaración.</p><div class="remito-copy-icons"><span>📃 ORIGINAL</span><span>📃 DUPLICADO</span><span>✍️ Firmas</span></div></div><div class="form-actions"><button type="button" class="btn" data-page="remitos">Cancelar</button><button type="button" class="btn" data-action="preview-remito-draft">Vista previa</button><button type="submit" class="btn btn-blue">Guardar remito</button><button type="button" class="btn btn-primary" data-action="save-pdf-remito">Guardar y generar PDF ↓</button></div></form><aside class="side-help"><h3>❄️ Remito EYR</h3><p>La información se guarda localmente, separada de tus presupuestos.</p><p>El PDF conserva un diseño blanco formal. Podés enviarlo por WhatsApp o correo.</p><p><b>Consejo:</b> generá respaldos desde Configuración para no perder los remitos al cambiar de teléfono.</p></aside></div>`}
function grabRemitoDraft(){if(!remitoDraft)return;const form=$('#remito-form');if(!form)return;for(const key of ['date','number','clientId','client','sourceQuoteId','cuit','iva','address']){const el=form.elements.namedItem(key);if(el)remitoDraft[key]=el.value}const items={};for(const el of form.querySelectorAll('[data-remito-index]')){const index=Number(el.dataset.remitoIndex);items[index]??={};items[index][el.dataset.remitoField]=el.value}if(Object.keys(items).length)remitoDraft.items=Object.keys(items).map(k=>items[k])}
function refreshRemitoTotal(){const total=$('#remito-total-value');if(total)total.textContent=fmt(remitoTotal(remitoDraft));for(const [i,row] of [...document.querySelectorAll('.remito-line-item')].entries()){const st=row.querySelector('.remito-line-subtotal strong');if(st)st.textContent=fmt((Number(remitoDraft.items[i]?.qty)||0)*(Number(remitoDraft.items[i]?.unit)||0))}}
function validateRemito(r){if(!String(r.client||'').trim()){toast('Ingresá el cliente del remito.');$('#remito-form [name="client"]')?.focus();return false}if(!r.date){toast('Ingresá una fecha.');return false}if(!/^\d{1,8}$/.test(String(r.number).trim())||Number(r.number)<1){toast('Ingresá un número de remito válido.');return false}if((db.remitos||[]).some(x=>x.id!==r.id&&Number(x.number)===Number(r.number))){toast('Ya existe un remito con ese número.');return false}if(!(r.items||[]).some(i=>String(i.description||'').trim())){toast('Agregá al menos un concepto.');return false}for(const item of r.items||[]){if(!String(item.description||'').trim())continue;if(!(Number(item.qty)>0)||!(Number(item.unit)>=0)){toast('Revisá la cantidad o el precio de los conceptos.');return false}}return true}
function persistRemito(){grabRemitoDraft();if(!validateRemito(remitoDraft))return null;const r=JSON.parse(JSON.stringify(remitoDraft));r.number=Number(r.number);r.items=(r.items||[]).filter(x=>String(x.description||'').trim()).map(i=>({qty:Math.max(0,Number(i.qty)||0),description:i.description.trim(),unit:Math.max(0,Number(i.unit)||0)}));if(!r.id){r.id=uid();r.createdAt=new Date().toISOString();db.remitos.push(r)}else{const idx=db.remitos.findIndex(x=>x.id===r.id);if(idx>=0)db.remitos[idx]=r;else db.remitos.push(r)}r.updatedAt=new Date().toISOString();db.settings.lastRemitoNumber=Math.max(Number(db.settings.lastRemitoNumber)||0,r.number);db.remitos[db.remitos.findIndex(x=>x.id===r.id)]=r;save();remitoDraft=JSON.parse(JSON.stringify(r));return r}
function printRemito(r,action='save'){
 try{
  if(!r||!window.EYRcreateRemitoPDF)throw Error('Generador de remitos no disponible');
  const blob=window.EYRcreateRemitoPDF(r,db.settings);
  const slug=(r.client||'Cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/gi,'-').slice(0,28);
  download(blob,`EYR-Remito-${num(r.number)}-${slug}.pdf`,action);
  if(action==='save')toast('Remito guardado. Usá Ver PDF o Enviar para abrirlo.');
 }catch(e){console.error(e);toast('No se pudo generar el remito: '+e.message)}
}
function remitoPreview(r){if(!r)return;const total=remitoTotal(r);const rows=(r.items||[]).filter(i=>String(i.description||'').trim()).map(it=>`<tr><td>${esc(it.qty)}</td><td>${esc(it.description)}</td><td>${fmt((Number(it.qty)||0)*(Number(it.unit)||0))}</td></tr>`).join('');modal(`Remito N.º ${num(r.number)}`,`<div class="preview-sheet remito-preview"><div class="remito-preview-header"><img src="assets/logo-pdf.jpg" alt="Logo EYR"><div><b>${esc(db.settings.business)}</b><div>CUIT: ${esc(db.settings.cuit)}</div><div>${esc(db.settings.tax)}</div><div>${esc(db.settings.address)}</div><div>${esc(db.settings.phone)}</div></div><div><b>REMITO</b><div>ORIGINAL</div><div>N.º ${num(r.number)}</div><div>Fecha: ${esc(dateText(r.date))}</div></div></div><div class="remito-preview-customer"><b>Cliente:</b> ${esc(r.client)}<br><b>CUIT / DNI:</b> ${esc(r.cuit||'—')}<br><b>Dirección:</b> ${esc(r.address||'—')}<br><b>Condición frente al IVA:</b> ${esc(r.iva||'—')}</div><table class="remito-preview-table"><thead><tr><th>Cantidad</th><th>Descripción</th><th>Precio</th></tr></thead><tbody>${rows}<tr><td colspan="2" style="text-align:right"><b>TOTAL</b></td><td><b>${fmt(total)}</b></td></tr></tbody></table><div class="remito-preview-signatures"><span>Entregado por (firma y aclaración)</span><span>Recibido por (firma y aclaración)</span></div><p class="remito-preview-note">El PDF también contiene una segunda página idéntica con la leyenda DUPLICADO.</p></div><div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cerrar</button><button type="button" class="btn btn-primary" data-action="pdf-remito-preview" data-id="${esc(r.id||'')}">Generar PDF ↓</button><button class="btn btn-blue" data-action="view-remito-preview" data-id="${esc(r.id||'')}">👁 Ver PDF</button><button class="btn btn-primary" data-action="share-remito-preview" data-id="${esc(r.id||'')}">↗ Enviar</button></div>`,true)}
function newDraft(){return {visitId:'',id:null,number:db.settings.lastNumber+1,date:isoToday(),clientId:'',client:'',cuit:'',phone:'',address:'',tasks:[''],mode:'global',globalPrice:0,items:[{description:'',category:'materiales',qty:1,unit:0}],validity:db.settings.validity,advance:0,conditions:db.settings.conditions,exclusions:'',observations:'',status:'borrador'}}
function openQuote(id,clientId,visit){closeModal();const old=db.quotes.find(q=>q.id===id);draft=old?JSON.parse(JSON.stringify(old)):newDraft();if(draft.title){draft.tasks=[draft.title,...(draft.tasks||[])];delete draft.title}if(clientId)applyClient(draft,clientId);if(visit){draft.client=visit.client||draft.client;draft.address=visit.address||draft.address;draft.tasks=[visit.description||'',...(draft.tasks||[]).filter(Boolean)].filter(Boolean);if(!draft.tasks.length)draft.tasks=[''];if(visit.clientId)applyClient(draft,visit.clientId);draft.visitId=visit.id}rememberScreen();page='editar-presupuesto';render();scrollTo(0,0)}
function applyClient(o,id){const c=db.clients.find(x=>x.id===id);if(c){Object.assign(o,{clientId:c.id,client:c.name,cuit:c.cuit||'',phone:c.phone||'',address:c.address||''})}}
function quoteForm(){const q=draft;const clientOpts=`<option value="">Carga manual / nuevo cliente</option>${db.clients.map(c=>`<option value="${c.id}" ${q.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}`;
 return `${headings(q.id?'Editar presupuesto':'Nuevo presupuesto','Completá el servicio, elegí cómo mostrar los precios y generá tu PDF.')}
 <div class="quote-layout"><form class="panel" id="quote-form"><div class="form-section"><h3>1. Datos del presupuesto</h3><p class="section-desc">Los datos comerciales de EYR ya están incorporados al PDF.</p><div class="form-grid">${field('date','Fecha de emisión',q.date,'','date','required')}${field('number','Número',num(q.number),'','text','disabled')}<div class="field full"><label for="f-clientId">Cliente guardado (opcional)</label><select name="clientId" id="f-clientId">${clientOpts}</select></div>${field('client','Nombre o razón social del cliente',q.client,'full','text','required')}${field('cuit','CUIT / DNI (opcional)',q.cuit)}${field('phone','Teléfono (opcional)',q.phone)}${field('address','Domicilio de la intervención',q.address,'full')}<div class="field full"><label>Visita vinculada (opcional)</label><select name="visitId"><option value="">Sin visita relacionada</option>${db.visits.filter(v=>(!q.clientId&&!q.client)||(v.clientId&&v.clientId===q.clientId)||(nameKey(v.client)===nameKey(q.client))).map(v=>`<option value="${esc(v.id)}" ${q.visitId===v.id?"selected":""}>${esc(dateText(v.date)+" · "+v.client+" · "+v.description.slice(0,45))}</option>`).join("")}</select></div></div></div>
 <div class="form-section"><h3>2. Alcance de los trabajos</h3><p class="section-desc">Cada línea representa una tarea. Podés agregar tantas como necesites.</p><div id="task-rows">${(q.tasks||[]).map((t,i)=>`<div class="task-row"><input aria-label="Tarea ${i+1}" data-task="${i}" type="text" placeholder="Ej.: Instalación de unidad evaporadora" value="${esc(t)}"><button type="button" class="btn btn-danger" data-action="remove-task" data-index="${i}" aria-label="Eliminar tarea">×</button></div>`).join('')}</div><button type="button" class="btn btn-small" data-action="add-task">+ Agregar tarea</button><div class="eyr-picker"><select id="template-quote">${templateOptions()}</select><button type="button" class="btn btn-small btn-blue" data-action="use-template-quote">+ Trabajo frecuente</button></div></div>
 <div class="form-section"><h3>3. Presentación de los precios</h3><p class="section-desc">Elegí qué verá el cliente. No cambia la descripción de las tareas.</p><div class="segmented" role="group" aria-label="Forma de presentar importes">${[['global','Precio global'],['rubros','Por rubros'],['detallado','Detallado por ítem']].map(([v,t])=>`<button type="button" class="${q.mode===v?'active':''}" data-action="set-mode" data-mode="${v}">${t}</button>`).join('')}</div>${q.mode==='global'?`<div class="form-grid">${field('globalPrice','Importe total ($)',q.globalPrice,'','number','min="0" step="0.01"')}</div>`:`<div id="item-rows">${(q.items||[]).map((it,i)=>`<div class="line-item"><input aria-label="Descripción" data-item="${i}" data-key="description" placeholder="Material o servicio" value="${esc(it.description)}"><select aria-label="Rubro" data-item="${i}" data-key="category">${[['materiales','Materiales'],['manoobra','Mano de obra'],['otros','Otros']].map(([v,t])=>`<option value="${v}" ${it.category===v?'selected':''}>${t}</option>`).join('')}</select><input type="number" aria-label="Cantidad" data-item="${i}" data-key="qty" value="${esc(it.qty)}" min="0" step="0.01"><input type="number" aria-label="Precio unitario" data-item="${i}" data-key="unit" value="${esc(it.unit)}" min="0" step="0.01"><button type="button" class="btn btn-danger btn-small remove" data-action="remove-item" data-index="${i}">× Quitar</button></div>`).join('')}</div><button type="button" class="btn btn-small" data-action="add-item">+ Agregar material o servicio</button>`}<div class="total-box"><span><b>Total del presupuesto</b><br><small class="muted">Calculado automáticamente</small></span><strong id="current-total">${fmt(quoteTotal(q))}</strong></div></div>
 <div class="form-section"><h3>4. Condiciones y observaciones</h3><p class="section-desc">El texto predeterminado puede editarse para cada presupuesto.</p><div class="form-grid">${field('validity','Validez del presupuesto (días)',q.validity,'','number','min="0"')}${field('advance','Anticipo solicitado (%)',q.advance,'','number','min="0" max="100"')}${area('conditions','Condiciones comerciales y técnicas',q.conditions,'full')}${area('exclusions','No incluye / exclusiones (opcional)',q.exclusions,'full',3)}${area('observations','Observaciones adicionales (opcional)',q.observations,'full',3)}<div class="field full"><label for="f-status">Estado del presupuesto</label><select name="status" id="f-status">${['borrador','enviado','aceptado','rechazado'].map(x=>`<option value="${x}" ${x===q.status?'selected':''}>${statusLabel[x]}</option>`).join('')}</select></div></div></div>
 <div class="form-actions"><button type="button" class="btn" data-page="presupuestos">Cancelar</button><button type="button" class="btn" data-action="preview-draft">Vista previa</button><button class="btn btn-blue" type="submit">Guardar presupuesto</button><button type="button" class="btn btn-primary" data-action="save-pdf-draft">Guardar y generar PDF ↓</button></div></form>
 <aside class="side-help"><h3>✦ Presupuesto EYR</h3><p>El logo y los datos comerciales se añaden automáticamente. Podés elegir un precio único, mostrar importes por rubro o detallar cada material.</p><p><b>Para compartir:</b> generá el PDF y envialo por WhatsApp o correo desde tu teléfono.</p><p><b>Sin conexión:</b> los datos se guardan únicamente en este navegador. Recordá exportar una copia de seguridad.</p></aside></div>`}
function grabDraft(){if(!draft)return;const form=$('#quote-form');if(!form)return;const fields=['date','clientId','client','visitId','cuit','phone','address','globalPrice','validity','advance','conditions','exclusions','observations','status'];for(const key of fields){const el=form.elements.namedItem(key);if(el)draft[key]=el.value}draft.tasks=[...form.querySelectorAll('[data-task]')].map(el=>el.value);let items={};for(const el of form.querySelectorAll('[data-item]')){let i=+el.dataset.item;items[i]??={};items[i][el.dataset.key]=el.value}if(Object.keys(items).length)draft.items=Object.values(items);}
function validateQuote(q){if(!q.client.trim()){toast('Ingresá el nombre del cliente.');$('#f-client')?.focus();return false}if(!quoteTasks(q).length){toast('Agregá al menos una tarea en la descripción del trabajo.');$('#task-rows input')?.focus();return false}if(!q.date){toast('Ingresá una fecha.');return false}return true}
function persistQuote(){grabDraft();if(!validateQuote(draft))return null;const q=JSON.parse(JSON.stringify(draft));q.globalPrice=Math.max(0,price(q.globalPrice));q.validity=Math.max(0,price(q.validity));q.advance=Math.max(0,Math.min(100,price(q.advance)));q.tasks=quoteTasks(q);delete q.title;q.items=(q.items||[]).filter(x=>String(x.description||'').trim()).map(x=>({description:x.description.trim(),category:x.category||'otros',qty:Math.max(0,price(x.qty)),unit:Math.max(0,price(x.unit))}));if(!q.id){q.id=uid();q.createdAt=new Date().toISOString();db.settings.lastNumber=Math.max(db.settings.lastNumber,q.number);db.quotes.push(q)}else{const i=db.quotes.findIndex(x=>x.id===q.id);if(i>=0)db.quotes[i]=q;else db.quotes.push(q)}q.updatedAt=new Date().toISOString();const i=db.quotes.findIndex(x=>x.id===q.id);db.quotes[i]=q;save();draft=JSON.parse(JSON.stringify(q));return q}
function modal(title,body,large=false){$('#modal-root').innerHTML=`<div class="modal-backdrop" data-action="backdrop-close"><div class="modal ${large?'large':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="close" data-action="close-modal" aria-label="Cerrar">×</button></div>${body}</div></div>`}
function closeModal(){$('#modal-root').innerHTML=''}
function clientModal(id){const c=db.clients.find(x=>x.id===id)||{id:'',name:'',phone:'',cuit:'',iva:'',address:'',notes:''};modal(c.id?'Editar cliente':'Nuevo cliente',`<form id="client-form" data-id="${c.id}"><div class="form-grid">${field('name','Nombre / razón social',c.name,'full','text','required')}${field('phone','Teléfono',c.phone)}${field('cuit','CUIT / DNI',c.cuit)}${field('iva','Condición frente al IVA (opcional)',c.iva||'')}${field('address','Domicilio',c.address,'full')}${area('notes','Observaciones internas',c.notes,'full',3)}</div><div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">Guardar cliente</button></div></form>`)}
function visitModal(id,initialDate){const v=db.visits.find(x=>x.id===id)||{id:'',clientId:'',client:'',date:initialDate||isoToday(),time:'09:00',address:'',description:'',status:'pendiente',notes:'',reminderMinutes:60,equipmentId:''};const clientOpts=`<option value="">Cliente no guardado</option>${db.clients.map(c=>`<option value="${c.id}" ${v.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}`;modal(v.id?'Editar visita':'Nueva visita',`<form id="visit-form" data-id="${v.id}"><div class="form-grid"><div class="field full"><label for="f-visitClientId">Cliente guardado (opcional)</label><select name="clientId" id="f-visitClientId">${clientOpts}</select></div>${field('client','Cliente',v.client,'full','text','required')}${field('date','Fecha',v.date,'','date','required')}${field('time','Hora',v.time,'','time','required')}${field('address','Domicilio',v.address,'full')}<div class="field full"><label>Equipo del cliente (opcional)</label><select name="equipmentId" id="visit-equipment-id"><option value="">Sin equipo asociado</option>${equipmentForClient(v.clientId).map(item=>`<option value="${esc(item.id)}" ${v.equipmentId===item.id?'selected':''}>${esc(equipmentName(item))} · ${esc(item.location||'Sin ubicación')}</option>`).join('')}</select><small>Seleccioná primero un cliente guardado para ver sus equipos.</small></div><p class="address-hint">Para ubicarlo mejor en el mapa, indicá calle, número, localidad y provincia.</p><div class="field full"><label>Descripción frecuente</label><div class="eyr-picker"><select id="template-visit">${templateOptions()}</select><button type="button" class="btn btn-small btn-blue" data-action="use-template-visit">Usar</button></div></div>${field('description','Trabajo / motivo',v.description,'full','text','required')}<div class="field full"><label for="f-status">Estado</label><select name="status" id="f-status">${['pendiente','confirmada','realizada','cancelada'].map(x=>`<option value="${x}" ${v.status===x?'selected':''}>${statusLabel[x]}</option>`).join('')}</select></div>${area('notes','Notas internas',v.notes,'full',3)}<div class="field full"><label>Recordatorio en el celular (Android)</label><select name="reminderMinutes"><option value="0" ${!Number(v.reminderMinutes)?"selected":""}>Sin recordatorio</option><option value="60" ${Number(v.reminderMinutes)===60?"selected":""}>1 hora antes</option><option value="1440" ${Number(v.reminderMinutes)===1440?"selected":""}>24 horas antes</option></select><small>Android puede retrasar el aviso si está activado el ahorro de batería.</small></div></div><div class="form-actions">${v.id?`<button type="button" class="btn btn-danger" data-action="delete-visit" data-id="${v.id}">Eliminar</button>`:''}<button type="button" class="btn" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">Guardar visita</button></div></form>`)}
function visitDetail(id){
 const v=db.visits.find(x=>x.id===id);if(!v){toast('Esa visita ya no está en la agenda.');return}
 const address=String(v.address||'').trim();
 modal('Detalle de la visita',`<div class="visit-detail"><div class="visit-detail-header"><strong>${esc(v.client||'Cliente')}</strong>${tag(v.status)}</div><div class="visit-detail-row"><span>📅 Fecha y hora</span><strong>${esc(dateText(v.date))} · ${esc(v.time||'Sin hora')}</strong></div><div class="visit-detail-row"><span>🛠 Trabajo / motivo</span><div>${esc(v.description||'Sin descripción')}</div></div>${address?`<div class="visit-detail-row"><span>📍 Domicilio</span><a href="${mapSearchUrl(address)}" target="_blank" rel="noopener noreferrer">${esc(address)}</a></div>`:''}${v.notes?`<div class="visit-detail-row"><span>📝 Notas internas</span><div class="visit-detail-notes">${esc(v.notes)}</div></div>`:''}${v.equipmentId?`<div class="visit-detail-row"><span>❄️ Equipo</span><button type="button" class="btn btn-small btn-blue" data-action="equipment-detail" data-id="${esc(v.equipmentId)}">${esc(equipmentName((db.equipment||[]).find(x=>x.id===v.equipmentId)||{}))}</button></div>`:''}${visitQuoteList(v)}</div><div class="form-actions">${address?`<a class="btn btn-blue" href="${mapDirectionsUrl(address)}" target="_blank" rel="noopener noreferrer">↗ Cómo llegar</a>`:''}<button type="button" class="btn" data-action="edit-visit" data-id="${esc(v.id)}">Editar</button><button type="button" class="btn btn-primary" data-action="quote-from-visit" data-id="${esc(v.id)}">Crear presupuesto</button></div>`,true);
}
function calendarDayDetail(date){
 const list=db.visits.filter(v=>v.date===date&&(filter==='todos'||v.status===filter)&&(!search||(v.client+' '+v.description+' '+v.address).toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 modal('Visitas · '+dateText(date),`<div class="calendar-day-list">${list.map(v=>`<button class="day-list-event" type="button" data-action="visit-detail" data-id="${esc(v.id)}"><span>${esc(v.time||'Sin hora')}</span><strong>${esc(v.client||'Cliente')}</strong>${tag(v.status)}</button>`).join('')||'<p>No hay visitas en este día.</p>'}</div><div class="form-actions"><button type="button" class="btn" data-action="close-modal">Cerrar</button></div>`);
}
function quotePreview(q){const list=quoteTasks(q);const rows=(q.items||[]).filter(x=>x.description);const cats=[['manoobra','Mano de obra'],['materiales','Materiales'],['otros','Otros']];const econ=q.mode==='global'?'':q.mode==='rubros'?cats.map(([k,t])=>{let sum=rows.filter(i=>i.category===k).reduce((a,i)=>a+price(i.qty)*price(i.unit),0);return sum?`<div class="detail-row"><span>${t}</span><strong>${fmt(sum)}</strong></div>`:''}).join(''):`<table><thead><tr><th>Descripción</th><th>Rubro</th><th>Importe</th></tr></thead><tbody>${rows.map(i=>`<tr><td>${esc(i.description)} (${price(i.qty)} × ${fmt(i.unit)})</td><td>${esc(({manoobra:'Mano de obra',materiales:'Materiales',otros:'Otros'})[i.category]||'Otros')}</td><td>${fmt(price(i.qty)*price(i.unit))}</td></tr>`).join('')}</tbody></table>`;
 const s=db.settings;const adv=price(q.advance);const total=quoteTotal(q);
 modal(`Vista previa · Presupuesto ${num(q.number)}`,`<div class="preview-sheet"><div class="preview-header"><img src="assets/logo-pdf.jpg" alt="Logo EYR"><div><strong>${esc(s.business)}</strong><br>CUIT: ${esc(s.cuit)}<br>${esc(s.tax)}<br>${esc(s.address)}<br>${esc(s.phone)}</div></div><div style="margin-top:21px">Fecha: <strong>${dateLong(q.date)}</strong><br>Cliente: <strong>${esc(q.client)}</strong>${q.cuit?`<br>CUIT / DNI: ${esc(q.cuit)}`:''}${q.address?`<br>Domicilio: ${esc(q.address)}`:''}</div><h2>PRESUPUESTO DE SERVICIO TÉCNICO</h2><h3>Descripción del trabajo</h3>${list.length?`<ul>${list.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<h3>Detalle económico</h3>${econ}<div class="preview-total"><span>TOTAL GENERAL</span><span>${fmt(total)}</span></div><h3>Condiciones comerciales</h3><div>Presupuesto válido por ${price(q.validity)} días corridos (hasta el ${dateText(plusDays(q.date,q.validity))}).</div>${adv?`<div>Anticipo del ${adv}%: ${fmt(total*adv/100)}. Saldo ${fmt(total*(100-adv)/100)}.</div>`:''}<div style="white-space:pre-wrap">${esc(q.conditions||'')}</div>${q.exclusions?`<h3>Exclusiones</h3><div style="white-space:pre-wrap">${esc(q.exclusions)}</div>`:''}${q.observations?`<h3>Observaciones</h3><div style="white-space:pre-wrap">${esc(q.observations)}</div>`:''}</div><div class="form-actions"><button class="btn" data-action="close-modal">Cerrar</button><button class="btn btn-primary" data-action="pdf-preview" data-id="${q.id||''}">Generar PDF ↓</button><button class="btn btn-blue" data-action="view-quote-preview" data-id="${q.id||''}">👁 Ver PDF</button><button class="btn btn-primary" data-action="share-quote-preview" data-id="${q.id||''}">↗ Enviar</button></div>`,true)}
function exportData(){const blob=new Blob([JSON.stringify({...db,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});download(blob,`EYR-Respaldo-${isoToday()}.json`);toast('Copia de seguridad descargada.')}
function download(blob,name,action='save'){
 if(window.EYRAndroid&&typeof window.EYRAndroid.saveFile==='function'){
  const reader=new FileReader();
  reader.onload=()=>window.EYRAndroid.saveFile(reader.result,name,blob.type||'application/octet-stream',action);
  reader.onerror=()=>toast('No se pudo preparar el archivo.');
  reader.readAsDataURL(blob);return;
 }
 if(action==='view'){
  const u=URL.createObjectURL(blob),w=window.open(u,'_blank');
  if(!w)toast('Permití ventanas emergentes para ver el PDF.');
  setTimeout(()=>URL.revokeObjectURL(u),60000);return;
 }
 if(action==='share'&&typeof File!=='undefined'&&navigator.share){
  const file=new File([blob],name,{type:blob.type||'application/pdf'});
  if(!navigator.canShare||navigator.canShare({files:[file]})){
   navigator.share({files:[file],title:name}).catch(err=>{if(err.name!=='AbortError')toast('No se pudo compartir el PDF.');});
   return;
  }
 }
 const u=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),5000);
 if(action==='share')toast('PDF descargado; compartilo desde Descargas.');
}
function printQuote(q,action='save'){
 try{
  if(!q||!window.EYRcreatePDF)throw Error('Generador PDF no cargado');
  const blob=window.EYRcreatePDF(q,db.settings,quoteTotal(q));
  const slug=(q.client||'Cliente').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/gi,'-').slice(0,30);
  download(blob,`EYR-Presupuesto-${num(q.number)}-${slug}.pdf`,action);
  if(action==='save')toast('Presupuesto guardado. Usá Ver PDF o Enviar para abrirlo.');
 }catch(e){console.error(e);toast('No se pudo generar el PDF: '+e.message)}
}
function handleAction(b,event){const a=b.dataset.action,id=b.dataset.id;
  
  if(a==='catalog-detail')return catalogDetail(id);
 if(a==='catalog-cloud-detail')return catalogCloudDetail(id);
 if(a==='catalog-search-retry'){catalogIndex=null;catalogIndexStatus='idle';return catalogEnsureIndex()}
 if(a==='catalog-associate')return equipmentModal(null,id);
 if(a==='catalog-manual')return equipmentModal(null,null,catalogClientId);
 if(a==='catalog-for-client'){catalogClientId=id;closeModal();setPage('catalogo');return}
 if(a==='catalog-clear-client'){catalogClientId='';render();return}
 if(a==='catalog-update')return catalogUpdate();
 if(a==='catalog-find-web')return catalogWebSearch();
 if(a==='client-equipment')return clientEquipments(id);
 if(a==='equipment-detail')return equipmentDetail(id);
 if(a==='equipment-edit')return equipmentModal(id);
 if(a==='equipment-manual')return equipmentModal(null,null,id);
 if(a==='equipment-visit')return equipmentVisit(id);
 if(a==='equipment-delete'){
    const item=(db.equipment||[]).find(x=>x.id===id);if(!item)return;
    if(!confirm('¿Eliminar este equipo del cliente? Las visitas anteriores conservarán sus datos pero dejarán de estar vinculadas.'))return;
    db.equipment=db.equipment.filter(x=>x.id!==id);
    db.visits.forEach(v=>{if(v.equipmentId===id)v.equipmentId=''});
    save();closeModal();render();toast('Equipo eliminado.');return
 }
 if(a==='client-history')return clientHistory(id);
 if(a==='remito-from-quote')return remitoFromQuote(id);
 if(a==='new-template')return templateModal();
 if(a==='edit-template')return templateModal(id);
 if(a==='delete-template'){if(!confirm('¿Eliminar este trabajo frecuente?'))return;db.serviceTemplates=db.serviceTemplates.filter(x=>x.id!==id);save();render();return}
 if(a==='quick-calendar'){setPage('agenda');agendaView='calendario';calGoToday();calendarMode='mes';render();return}
  
 if(a==='new-remito')return openRemito();if(a==='edit-remito')return openRemito(id);if(a==='remito-from-client')return openRemito(null,id);
 if(a==='duplicate-remito'){openRemito(id);remitoDraft.id=null;remitoDraft.number=Math.max(Number(db.settings.lastRemitoNumber)||0,...db.remitos.map(r=>Number(r.number)||0))+1;remitoDraft.date=isoToday();render();return}
 if(a==='delete-remito'){if(!confirm('¿Eliminar este remito?'))return;db.remitos=db.remitos.filter(r=>r.id!==id);save();render();return}
 if(a==='add-remito-item'){grabRemitoDraft();remitoDraft.items.push({qty:1,description:'',unit:0});render();return}
 if(a==='remove-remito-item'){grabRemitoDraft();remitoDraft.items.splice(Number(b.dataset.index),1);if(!remitoDraft.items.length)remitoDraft.items=[{qty:1,description:'',unit:0}];render();return}
 if(a==='preview-remito'){const r=db.remitos.find(x=>x.id===id);if(r)remitoPreview(r);return}
 if(a==='preview-remito-draft'){grabRemitoDraft();if(validateRemito(remitoDraft))remitoPreview(remitoDraft);return}
 if(a==='pdf-remito'){const r=db.remitos.find(x=>x.id===id);if(r)printRemito(r);return}
  if(a==='view-remito'||a==='share-remito'){const r=db.remitos.find(x=>x.id===id);if(r)printRemito(r,a==='view-remito'?'view':'share');return}
  if(a==='view-remito-preview'||a==='share-remito-preview'){const r=id?db.remitos.find(x=>x.id===id):remitoDraft;if(r)printRemito(r,a==='view-remito-preview'?'view':'share');return}
 if(a==='pdf-remito-preview'){const r=id?db.remitos.find(x=>x.id===id):remitoDraft;if(r)printRemito(r);return}
 if(a==='save-pdf-remito'){const r=persistRemito();if(r){printRemito(r);setPage('remitos')}return}
 if(a==='new-quote')return openQuote();if(a==='edit-quote')return openQuote(id);if(a==='quote-from-client')return openQuote(null,id);if(a==='quote-from-visit'){const v=db.visits.find(x=>x.id===id);if(!v)return;closeModal();return openQuote(null,null,v)}
 if(a==='new-visit-client'){
    const c=db.clients.find(x=>x.id===id);if(!c)return;
    closeModal();visitModal();
    const f=$('#visit-form');
    if(f){f.elements.namedItem('clientId').value=c.id;f.elements.namedItem('client').value=c.name;f.elements.namedItem('address').value=c.address||'';const selected=f.elements.namedItem('equipmentId');if(selected)selected.innerHTML='<option value="">Sin equipo asociado</option>'+equipmentForClient(c.id).map(item=>'<option value="'+esc(item.id)+'">'+esc(equipmentName(item)+' · '+(item.location||'Sin ubicación'))+'</option>').join('');}
    return
 }
 if(a==='new-client')return clientModal();if(a==='edit-client')return clientModal(id);
 if(a==='delete-client'){if(equipmentForClient(id).length){toast('Este cliente tiene equipos asociados. Eliminá primero sus equipos para evitar perder el vínculo técnico.');return}if(!confirm('¿Eliminar este cliente? Sus presupuestos anteriores se conservarán.'))return;db.clients=db.clients.filter(x=>x.id!==id);save();render();toast('Cliente eliminado.');return}
 if(a==='toggle-calendar'){agendaView=agendaView==='calendario'?'lista':'calendario';if(!calendarMonth)calendarMonth=isoToday().slice(0,7);render();return}
 if(a==='calendar-mode'){calModeChange(b.dataset.mode);return}
 if(a==='calendar-open-day'){calShowDay(b.dataset.date);return}
 if(a==='new-visit-calendar')return visitModal(null,calAnchor());
 if(a==='calendar-prev'){calMove(-1);render();return}
 if(a==='calendar-next'){calMove(1);render();return}
 if(a==='calendar-today'){calGoToday();render();return}
 if(a==='visit-detail')return visitDetail(id);
 if(a==='calendar-day')return calendarDayDetail(b.dataset.date);
 if(a==='new-visit')return visitModal();if(a==='edit-visit')return visitModal(id);
 if(a==='delete-visit'){if(!confirm('¿Eliminar esta visita?'))return;db.visits=db.visits.filter(x=>x.id!==id);save();closeModal();render();return}
 if(a==='delete-quote'){if(!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.'))return;db.quotes=db.quotes.filter(x=>x.id!==id);save();render();toast('Presupuesto eliminado.');return}
 if(a==='duplicate-quote'){openQuote(id);draft.id=null;draft.number=db.settings.lastNumber+1;draft.date=isoToday();draft.status='borrador';render();return}
 if(a==='preview-quote')return quotePreview(db.quotes.find(x=>x.id===id));
 if(a==='pdf-quote')return printQuote(db.quotes.find(x=>x.id===id));
  if(a==='view-quote'||a==='share-quote'){const q=db.quotes.find(x=>x.id===id);if(q)printQuote(q,a==='view-quote'?'view':'share');return}
  if(a==='view-quote-preview'||a==='share-quote-preview'){const q=id?db.quotes.find(x=>x.id===id):draft;if(q)printQuote(q,a==='view-quote-preview'?'view':'share');return}
 if(a==='use-template-quote'){grabDraft();const t=db.serviceTemplates.find(x=>x.id===$('#template-quote')?.value);if(!t){toast('Elegí un trabajo frecuente.');return}draft.tasks=(draft.tasks||[]).filter(Boolean);draft.tasks.push(t.description);if(draft.mode!=='global')draft.items.push({description:t.description,category:t.category||'manoobra',qty:1,unit:t.price||0});render();return}
 if(a==='use-template-remito'){grabRemitoDraft();const t=db.serviceTemplates.find(x=>x.id===$('#template-remito')?.value);if(!t){toast('Elegí un trabajo frecuente.');return}remitoDraft.items=remitoDraft.items.filter(i=>i.description);remitoDraft.items.push({qty:1,description:t.description,unit:t.price||0});render();return}
 if(a==='use-template-visit'){const f=$('#visit-form'),t=db.serviceTemplates.find(x=>x.id===f?.querySelector('#template-visit')?.value);if(!f||!t){toast('Elegí un trabajo frecuente.');return}const el=f.elements.namedItem('description');el.value=[el.value,t.description].filter(Boolean).join(' · ');return}
 if(a==='add-task'){grabDraft();draft.tasks.push('');render();$('#task-rows .task-row:last-child input')?.focus();return}
 if(a==='remove-task'){grabDraft();draft.tasks.splice(+b.dataset.index,1);if(!draft.tasks.length)draft.tasks.push('');render();return}
 if(a==='add-item'){grabDraft();draft.items.push({description:'',category:'materiales',qty:1,unit:0});render();return}
 if(a==='remove-item'){grabDraft();draft.items.splice(+b.dataset.index,1);if(!draft.items.length)draft.items.push({description:'',category:'materiales',qty:1,unit:0});render();return}
 if(a==='set-mode'){grabDraft();draft.mode=b.dataset.mode;render();return}
 if(a==='preview-draft'){grabDraft();if(!validateQuote(draft))return;quotePreview(draft);return}
 if(a==='save-pdf-draft'){const q=persistQuote();if(q){printQuote(q);setPage('presupuestos')}return}
 if(a==='pdf-preview'){if(id){const q=db.quotes.find(x=>x.id===id);if(q)printQuote(q)}else if(draft)printQuote(draft);return}
 if(a==='export')return exportData();if(a==='choose-import')return $('#import-json')?.click();
 if(a==='close-modal')return closeModal();if(a==='backdrop-close'){if(event.target===b)closeModal();return}
}
document.addEventListener('error',e=>{
 const img=e.target;
 if(img?.matches?.('.eyr-model-photo img'))img.closest('.eyr-model-photo')?.classList.add('has-error');
},true);
document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-page]');
  if(nav){e.preventDefault();return setPage(nav.dataset.page)}
  const b=e.target.closest('[data-action]');
  if(!b)return;
  // La capa de fondo del modal tiene data-action, pero jamás debe interceptar
  // clicks dentro del formulario: bloqueaba los botones Guardar cliente/visita.
  if(b.dataset.action==='backdrop-close'&&e.target!==b)return;
  e.preventDefault();return handleAction(b,e);
});
document.addEventListener('input',e=>{const el=e.target;if(el.id==='catalog-search'){
   catalogQuery=el.value;
   catalogRefreshResults();
   if(catalogSearchTimer)clearTimeout(catalogSearchTimer);
   if(catalogQuery.trim().length>=2&&!catalogIndex){
     catalogSearchTimer=setTimeout(()=>catalogEnsureIndex(),280);
   }
   return
 }
 if(el.id==='search-list'){search=el.value;const orig=page;let html=orig==='agenda'?agenda():orig==='presupuestos'?quotes():orig==='remitos'?remitos():orig==='clientes'?clients():'';const doc=new DOMParser().parseFromString(html,'text/html'),box=doc.querySelector('#list-results');if(box&&$('#list-results'))$('#list-results').innerHTML=box.innerHTML}
 if(el.closest('#quote-form')&&el.id!=='f-clientId'){grabDraft();if($('#current-total'))$('#current-total').textContent=fmt(quoteTotal(draft))}
 if(el.closest('#remito-form')&&el.id!=='remito-clientId'){grabRemitoDraft();refreshRemitoTotal()}});
document.addEventListener('change',async e=>{const el=e.target;
 if(el.id==='catalog-brand'){catalogBrand=el.value;catalogRefreshResults();if(catalogQuery.trim().length>=2&&!catalogIndex&&catalogIndexStatus!=='offline')catalogEnsureIndex();return}
 if(el.id==='filter-list'){filter=el.value;render();$('#search-list')?.focus();return}
 if(el.id==='remito-clientId'&&remitoDraft){grabRemitoDraft();if(el.value){applyRemitoClient(remitoDraft,el.value);render()}return}
 if(el.id==='f-clientId'&&draft){grabDraft();if(el.value){applyClient(draft,el.value);render()}return}
 if(el.id==='f-visitClientId'){
    const c=db.clients.find(x=>x.id===el.value);
    if(c){$('#visit-form [name=client]').value=c.name;$('#visit-form [name=address]').value=c.address||''}
    const selected=$('#visit-equipment-id');
    if(selected)selected.innerHTML='<option value="">Sin equipo asociado</option>'+equipmentForClient(el.value).map(item=>'<option value="'+esc(item.id)+'">'+esc(equipmentName(item)+' · '+(item.location||'Sin ubicación'))+'</option>').join('');
    return
 }
 if(el.id==='import-json'&&el.files?.[0]){try{const raw=JSON.parse(await el.files[0].text());if(!raw||!Array.isArray(raw.clients)||!Array.isArray(raw.visits)||!Array.isArray(raw.quotes)||typeof raw.settings!=='object')throw Error('El archivo no es un respaldo EYR válido');if(!confirm('Importar reemplazará todos los datos actuales de este dispositivo. ¿Continuar?'))return;db={...blankDB(),...raw,remitos:Array.isArray(raw.remitos)?raw.remitos:[],serviceTemplates:Array.isArray(raw.serviceTemplates)?raw.serviceTemplates:[],equipment:Array.isArray(raw.equipment)?raw.equipment:[],catalogFeatured:pickFivePerBrand(Array.isArray(raw.catalogFeatured)?raw.catalogFeatured:raw.catalogOnline||[]),settings:{...DEFAULT_SETTINGS,...raw.settings,lastRemitoNumber:Math.max(Number(raw.settings.lastRemitoNumber)||0,...(Array.isArray(raw.remitos)?raw.remitos:[]).map(r=>Number(r.number)||0))}};delete db.catalogOnline;save();setPage('inicio');toast('Respaldo importado correctamente.')}catch(err){console.error(err);toast('Error al importar: archivo no válido.')}finally{el.value=''}return}
});
document.addEventListener('submit',e=>{const form=e.target;e.preventDefault();
 if(form.id==='equipment-form'){
   const f=new FormData(form),clientId=String(f.get('clientId')||''),client=db.clients.find(c=>c.id===clientId);
   if(!client){toast('Elegí un cliente guardado.');return}
   let existing=(db.equipment||[]).find(x=>x.id===form.dataset.id);
   const m=findCatalogModel(form.dataset.catalogId)||existing?.specSnapshot||null;
   let brand=m?.brand||String(f.get('brand')||'').trim();
   let model=m?.model||String(f.get('model')||'').trim();
   if(!brand||!model){toast('Completá marca y código exacto del modelo.');return}
   if(!existing){existing={id:uid()};db.equipment.push(existing)}
   Object.assign(existing,{
      clientId, catalogId:m?.id||'',brand,model,
      location:String(f.get('location')||'').trim(),
      serial:String(f.get('serial')||'').trim(),
      installedAt:String(f.get('installedAt')||''),
      notes:String(f.get('notes')||'').trim(),
      specSnapshot:m?JSON.parse(JSON.stringify(m)):null
   });
   save();closeModal();render();toast('Equipo asociado al cliente.');return
 }
 if(form.id==='remito-form'){const r=persistRemito();if(r){toast('Remito guardado.');setPage('remitos')}return}
 if(form.id==='quote-form'){const q=persistQuote();if(q){toast('Presupuesto guardado.');setPage('presupuestos')}return}
 if(form.id==='settings-form'){const f=new FormData(form);for(const k of ['business','cuit','tax','address','phone','conditions'])db.settings[k]=String(f.get(k)||'').trim();db.settings.validity=Math.max(0,price(f.get('validity')));db.settings.autoBackup=f.get('autoBackup')==='on';save();toast('Datos de EYR actualizados.');render();return}
 if(form.id==='template-form'){
   const f=new FormData(form),description=String(f.get('description')||'').trim();
   if(!description){toast('Ingresá una descripción.');return}
   let t=db.serviceTemplates.find(x=>x.id===form.dataset.id);
   if(!t){t={id:uid()};db.serviceTemplates.push(t)}
   Object.assign(t,{description,price:Math.max(0,price(f.get('price'))),category:f.get('category')==='materiales'?'materiales':'manoobra'});
   save();closeModal();render();toast('Trabajo guardado.');return
 }
 if(form.id==='client-form'){
   const f=new FormData(form),id=form.dataset.id;
   const values={};for(const k of ['name','phone','cuit','iva','address','notes'])values[k]=String(f.get(k)||'').trim();
   if(!values.name){toast('Ingresá el nombre del cliente.');return}
   let c=db.clients.find(x=>x.id===id);
   if(!c){c={id:uid()};db.clients.push(c)}
   Object.assign(c,values);save();closeModal();render();toast('Cliente guardado.');return
  }
 if(form.id==='visit-form'){
   const f=new FormData(form),id=form.dataset.id;
   const values={};for(const k of ['clientId','client','date','time','address','description','status','notes','reminderMinutes','equipmentId'])values[k]=String(f.get(k)||'').trim();
   if(!values.client||!values.date||!values.description){toast('Completá cliente, fecha y trabajo.');return}
   if(values.equipmentId&&!equipmentForClient(values.clientId).some(x=>x.id===values.equipmentId)){toast('El equipo seleccionado no pertenece al cliente.');return}
   let v=db.visits.find(x=>x.id===id);
   if(!v){v={id:uid()};db.visits.push(v)}
   Object.assign(v,values);save();closeModal();render();toast('Visita guardada.');return
  }
});
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
window.addEventListener('storage',e=>{if(e.key===KEY){db=load();if(page!=='editar-presupuesto'&&page!=='editar-remito')render()}});
if(!navigator.userAgent.includes('EYRAndroid')&&'serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(e=>console.warn('Modo offline no disponible:',e));
render();
if(window.EYRAndroid&&typeof window.EYRAndroid.appReady==='function'){
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.EYRAndroid.appReady()));
}
if(window.EYRAndroid&&typeof window.EYRAndroid.syncReminders==='function')try{window.EYRAndroid.syncReminders(JSON.stringify(db.visits.map(v=>({id:v.id,client:v.client,date:v.date,time:v.time,description:v.description||'',address:v.address||'',status:v.status,reminderMinutes:Number(v.reminderMinutes)||0}))))}catch(e){console.warn('Recordatorios locales',e)}
})();