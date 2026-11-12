/* EYR: vista semanal y diaria. No modifica ni almacena datos de clientes. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parse = value => { const [y,m,d] = String(value).split('-').map(Number); return new Date(y,m-1,d || 1,12); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays = (value,n) => { const d=parse(value);d.setDate(d.getDate()+n);return iso(d); };
  const monday = value => { const d=parse(value);d.setDate(d.getDate()-(d.getDay()+6)%7);return iso(d); };
  const label = (date,opts) => parse(date).toLocaleDateString('es-AR',opts);
  const today = () => { const d=new Date();return iso(d); };
  const statuses = {pendiente:'Pendiente',confirmada:'Confirmada',realizada:'Realizada',cancelada:'Cancelada'};
  const toolbar = (title,description) => `<div class="calendar-toolbar eyr-cal-toolbar"><div><h2>${esc(title)}</h2><small>${esc(description)}</small></div><div class="calendar-controls"><button class="btn btn-small" type="button" data-action="calendar-prev" aria-label="Período anterior">‹</button><button class="btn btn-small" type="button" data-action="calendar-today">Hoy</button><button class="btn btn-small" type="button" data-action="calendar-next" aria-label="Período siguiente">›</button></div></div>`;
  const eventButton = (v, detailed=false) => `<button type="button" class="calendar-event status-${esc(v.status||'pendiente')}" data-action="visit-detail" data-id="${esc(v.id)}" aria-label="${esc('Ver visita '+(v.client||'Cliente')+' del '+v.date)}"><span class="calendar-event-time">${esc(v.time||'Sin hora')}</span><span class="calendar-event-client">${esc(v.client||'Visita')}</span>${detailed?`<span class="eyr-week-description">${esc(v.description||'Visita técnica')}</span>`:''}</button>`;
  function week(visits,selected){
    const start=monday(selected),end=addDays(start,6),a=parse(start),b=parse(end);
    const inMonth=a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear();
    const heading=inMonth?`${a.getDate()} al ${label(end,{day:'numeric',month:'long',year:'numeric'})}`:`${label(start,{day:'numeric',month:'short',year:a.getFullYear()===b.getFullYear()?undefined:'numeric'})} – ${label(end,{day:'numeric',month:'short',year:'numeric'})}`;
    const days=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    const cards=days.map((day,i)=>{
      const date=addDays(start,i),items=visits.filter(v=>v.date===date);
      return `<section class="eyr-week-card ${date===today()?'is-today':''} ${date===selected?'is-selected':''}"><button class="eyr-week-heading" type="button" data-action="calendar-open-day" data-date="${date}" aria-label="Ver el día ${esc(date)}"><span>${day}</span><strong>${parse(date).getDate()}</strong><small>${label(date,{month:'short'})}</small><em>${items.length} ${items.length===1?'visita':'visitas'}</em></button><div class="eyr-week-events">${items.slice(0,5).map(v=>eventButton(v,true)).join('')||'<span class="eyr-week-empty">Sin visitas</span>'}${items.length>5?`<button class="eyr-more" type="button" data-action="calendar-open-day" data-date="${date}">+${items.length-5} más</button>`:''}</div></section>`;
    }).join('');
    return toolbar(heading,'Tocá una visita o el día para ver sus detalles')+`<div class="eyr-week-scroll" tabindex="0" aria-label="Siete días de la semana"><div class="eyr-week-track">${cards}</div></div><p class="eyr-week-hint">Deslizá horizontalmente para recorrer los siete días.</p>`;
  }
  function day(visits,selected){
    const items=visits.filter(v=>v.date===selected).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
    const groups=new Map(),noTime=[];
    for(const v of items){
      const valid=/^([01]\d|2[0-3]):[0-5]\d$/.exec(v.time||'');
      if(!valid){noTime.push(v);continue;}
      const hour=Number(valid[1]);if(!groups.has(hour))groups.set(hour,[]);groups.get(hour).push(v);
    }
    const hours=[...groups.keys()],start=Math.min(8,...hours),end=Math.max(20,...hours);
    const slots=Array.from({length:end-start+1},(_,i)=>{
      const hour=start+i;
      const entries=(groups.get(hour)||[]).map(v=>`<button type="button" class="eyr-hour-event status-${esc(v.status||'pendiente')}" data-action="visit-detail" data-id="${esc(v.id)}"><span class="eyr-hour-time">${esc(v.time)}</span><span class="eyr-hour-info"><strong>${esc(v.client||'Visita')}</strong><small>${esc(v.description||'Visita técnica')}</small>${v.address?`<small>📍 ${esc(v.address)}</small>`:''}</span><span class="eyr-hour-status">${esc(statuses[v.status]||'Pendiente')}</span></button>`).join('');
      return `<div class="eyr-hour-slot"><time>${String(hour).padStart(2,'0')}:00</time><div class="eyr-hour-content">${entries||'<div class="eyr-hour-empty"></div>'}</div></div>`;
    }).join('');
    const other=noTime.length?`<section class="eyr-untimed"><h3>Sin horario definido</h3>${noTime.map(v=>eventButton(v,true)).join('')}</section>`:'';
    const title=label(selected,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    return toolbar(title[0].toUpperCase()+title.slice(1),`${items.length} ${items.length===1?'visita':'visitas'} · Agenda por horario`)+`<div class="eyr-day-actions"><button class="btn btn-small btn-blue" type="button" data-action="new-visit-calendar">+ Agregar visita este día</button></div><div class="eyr-day-timeline">${slots}</div>${other}`;
  }
  window.EYRCalendar={week,day,addDays,monday};
})();