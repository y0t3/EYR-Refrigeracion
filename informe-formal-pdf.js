/* EYR · Informe formal según diseño de informes técnicos del 16/11/2026.
   Reproduce franja azul, tabla de equipo, recuadro de conclusión, firmas y anexo. */
(function(){
'use strict';
const W=1060,H=1498,L=111,R=955,INK='#172936',NAVY='#173f5a',CYAN='#0784ac',
  MUTED='#546b7b',LIGHT='#e8f1f5',BORDER='#d0dee6',MAX=1334;
const clean=x=>String(x??'').replace(/\r/g,'');
function canvasPage(){const c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);return {c,g};}
const font=(g,size=18,bold=false)=>{g.font=(bold?'bold ':'')+size+'px Arial,sans-serif';g.textBaseline='alphabetic';};
function text(g,s,x,y,size=18,bold=false,color=INK){font(g,size,bold);g.fillStyle=color;g.fillText(String(s??''),x,y);}
function hline(g,y,from=L,to=R){g.strokeStyle=BORDER;g.lineWidth=1;g.beginPath();g.moveTo(from,y);g.lineTo(to,y);g.stroke();}
function date(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(v||'');}
function wrapLines(g,value,maxWidth,size=18,bold=false){
 font(g,size,bold);
 const out=[];
 for(const block of clean(value).split('\n')){
  if(!block.trim()){out.push('');continue;}
  let current='';
  for(const word of block.trim().split(/\s+/)){
   if(g.measureText(word).width>maxWidth){
    if(current){out.push(current);current='';}
    let segment='';
    for(const ch of word){
     if(segment&&g.measureText(segment+ch).width>maxWidth){out.push(segment);segment='';}
     segment+=ch;
    }
    current=segment;continue;
   }
   const candidate=current?current+' '+word:word;
   if(current&&g.measureText(candidate).width>maxWidth){out.push(current);current=word;}
   else current=candidate;
  }
  if(current)out.push(current);
 }
 return out;
}
function header(g,title,subtitle,dateLabel){
 g.fillStyle=CYAN;g.fillRect(0,0,222,29);g.fillStyle=NAVY;g.fillRect(222,0,W-222,29);
 text(g,title,L,167,33,true,NAVY);
 text(g,subtitle,L,204,16,false,MUTED);
 if(dateLabel){
  text(g,'Fecha:',730,204,15,true,INK);
  text(g,dateLabel,790,204,15,false,INK);
 }
}
function make(){const p=canvasPage();pages.push(p);return p;}
let pages=[],pg=null,g=null,y=0,visitDate='';
function nextPage(continuation=false){
 pg=make();g=pg.g;
 header(g,'INFORME TÉCNICO'+(continuation?' · Continuación':''),'Evaluación técnica de equipo de refrigeración',date(visitDate));
 y=250;
}
function ensure(height=40){if(y+height>MAX)nextPage(true);}
function paragraph(value,{size=17.2,line=26,bold=false,color=INK,left=L,width=R-L,space=11}={}){
 const lines=wrapLines(g,value,width,size,bold);
 for(const ln of lines){
  if(!ln){y+=Math.round(line*.65);continue;}
  ensure(line+4);text(g,ln,left,y,size,bold,color);y+=line;
 }
 y+=space;
}
function section(title){
 ensure(85);y+=9;text(g,title,L,y,20.5,true,NAVY);y+=32;
}
function block(name,value){
 section(name);paragraph(value,{size:17.5,line:27,space:7});
}
function equipmentRow(label,value){
 if(!clean(value).trim())return;
 const lines=wrapLines(g,value,R-L-188,16.8);
 const height=Math.max(38,lines.length*24+14);
 ensure(height+2);
 g.fillStyle=LIGHT;g.fillRect(L,y,171,height);
 text(g,label,L+13,y+24,15.5,false,INK);
 let yy=y+25;
 for(const line of lines){text(g,line,L+188,yy,16.8,false,INK);yy+=24;}
 hline(g,y+height);y+=height;
}
function conclusion(value){
 if(!String(value||'').trim())return;
 section('Conclusión técnica');
 const size=18.2,line=29,lines=wrapLines(g,value,R-L-44,size,true);
 const boxHeight=Math.max(77,lines.length*line+39);
 ensure(boxHeight+5);
 g.fillStyle=LIGHT;g.fillRect(L-10,y-12,R-L+10,boxHeight);
 g.fillStyle=CYAN;g.fillRect(L-11,y-12,5,boxHeight);
 let yy=y+17;
 for(const lineText of lines){text(g,lineText,L+11,yy,size,true,NAVY);yy+=line;}
 y+=boxHeight+4;
}
function recommendation(textValue){
 if(!String(textValue||'').trim())return;
 section('Recomendaciones');
 const list=clean(textValue).split(/\n+/).map(x=>x.trim()).filter(Boolean);
 let n=0;
 for(const item of list){
  const itemLines=wrapLines(g,item,R-L-30,17.2);
  ensure(itemLines.length*26+12);text(g,String(++n)+'.',L,y,17,true,NAVY);
  for(let j=0;j<itemLines.length;j++){text(g,itemLines[j],L+24,y,17.2,false,INK);y+=26;}
  y+=8;
 }
}
function signatures(){
 ensure(128);
 y+=32;
 g.strokeStyle=MUTED;g.lineWidth=1;
 g.beginPath();g.moveTo(L,y);g.lineTo(370,y);g.moveTo(530,y);g.lineTo(795,y);g.stroke();
 text(g,'Firma y aclaración del técnico responsable',L,y+25,13.8,false,MUTED);
 text(g,'Sello / datos profesionales, si corresponde',530,y+25,13.8,false,MUTED);
 y+=66;
}
function footer(g,pageNum,total,company,dateLabel){
 hline(g,1415,L,R);
 text(g,(company.business||'EYR Refrigeración')+' | Informe técnico | '+dateLabel,L,1441,13.5,false,MUTED);
 font(g,13.5);g.fillStyle=MUTED;const label='Página '+pageNum+' de '+total;
 g.fillText(label,R-g.measureText(label).width,1441);
}
function imgLoad(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Fotografía inválida'));image.src=url;});}
function drawImageFit(g,img,x,top,w,h){
 const scale=Math.min(w/img.width,h/img.height),iw=img.width*scale,ih=img.height*scale;
 const rect={x:x+(w-iw)/2,y:top+(h-ih)/2,w:iw,h:ih};
 g.drawImage(img,rect.x,rect.y,rect.w,rect.h);return rect;
}
function arrows(g,r,list){
 for(const a of list||[]){
  if(!a||!Number.isFinite(a.x1+a.y1+a.x2+a.y2))continue;
  const x=r.x+a.x1*r.w,y=r.y+a.y1*r.h,xx=r.x+a.x2*r.w,yy=r.y+a.y2*r.h;
  const angle=Math.atan2(yy-y,xx-x),head=14;
  g.save();g.strokeStyle='#f55a17';g.fillStyle='#f55a17';g.lineWidth=5;g.lineCap='round';
  g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();
  g.beginPath();g.moveTo(xx,yy);g.lineTo(xx-head*Math.cos(angle-.55),yy-head*Math.sin(angle-.55));
  g.lineTo(xx-head*Math.cos(angle+.55),yy-head*Math.sin(angle+.55));g.closePath();g.fill();g.restore();
 }
}
async function photoAnnex(photos){
 const valid=(photos||[]).filter(x=>x?.dataUrl?.startsWith('data:image/jpeg;base64,')).slice(0,8);
 let index=0;
 for(let i=0;i<valid.length;i+=2){
  const pp=make(),ctx=pp.g;
  header(ctx,'ANEXO FOTOGRÁFICO','Registro fotográfico asociado a la evaluación técnica',null);
  let yy=244;
  for(const p of valid.slice(i,i+2)){
   const h=454;
   try{
    const img=await imgLoad(p.dataUrl);
    const rect=drawImageFit(ctx,img,L+60,yy,R-L-120,h);
    arrows(ctx,rect,p.arrows);
   }catch(e){text(ctx,'Imagen no disponible',L+55,yy+200,19,false,MUTED);}
   const caption='Fotografía '+(++index)+'. '+String(p.caption||'Registro del equipo').slice(0,125);
   const lines=wrapLines(ctx,caption,R-L,15.5,false);
   let start=yy+482;
   for(const line of lines.slice(0,2)){text(ctx,line,L,start,15.5,false,MUTED);start+=22;}
   yy+=550;
  }
  paragraphOnPage(ctx,'Las imágenes documentan los elementos registrados en esta intervención; la evaluación y las conclusiones técnicas constan en el informe.',L,1375,R-L,12.5);
 }
}
function paragraphOnPage(ctx,s,x,yPos,width,size){
 const lines=wrapLines(ctx,s,width,size);for(let i=0;i<lines.length;i++)text(ctx,lines[i],x,yPos+i*(size+3),size,false,MUTED);
}
async function report(form,visit,company,photos){
 if(!window.EYRWorkshopPDF?.createPDF)throw Error('Motor PDF EYR no disponible');
 pages=[];pg=null;g=null;y=0;visitDate=visit.date||new Date().toISOString().slice(0,10);
 const subtype=form.purpose==='seguro'?'Evaluación técnica para presentación ante aseguradora':
 form.purpose==='cliente'?'Informe técnico para entrega al cliente':'Evaluación técnica del equipo';
 nextPage(); // En el primer encabezado, se usa el subtítulo específico del informe.
 g.fillStyle='#fff';g.fillRect(L,184,625,29);text(g,subtype,L,204,16,false,MUTED);
 section('Datos del técnico responsable');
 paragraph((company.business||'EYR Refrigeración')+' | CUIT '+(company.cuit||'No informado')+' | '+(company.tax||''),{size:17,line:25,space:0});
 paragraph((company.address||'')+' | Tel.: '+(company.phone||''),{size:15,line:24,space:3});
 section('Datos del cliente');
 paragraph((form.clientName||visit.client||'Sin identificar')+(form.clientDoc?' | DNI / CUIT '+form.clientDoc:''),{size:17.4,line:26,bold:true,space:0});
 if(form.clientAddress)paragraph(form.clientAddress,{size:16.2,line:25,space:2});
 section('Equipo evaluado');
 const types={aire:'Aire acondicionado',split:'Aire acondicionado tipo split',heladera:'Heladera / refrigerador',comercial:'Equipo de refrigeración comercial',otro:'Otro equipo'};
 equipmentRow('Tipo de equipo',types[form.type]||types.aire);
 equipmentRow('Marca y modelo',[form.brand,form.model].filter(Boolean).join(' - '));
 equipmentRow('Número de serie',form.serial||'No informado');
 if(form.plate)equipmentRow('Datos de placa',form.plate);
 const sections=form.sections||{};
 block('Observaciones de la inspección',sections.observations||'Sin observaciones asentadas.');
 block('Diagnóstico técnico',sections.diagnosis||'Sin diagnóstico consignado.');
 if(sections.reparability?.trim())block('Disponibilidad de repuestos y posibilidad de reparación',sections.reparability);
 conclusion(sections.conclusion||'La evaluación no permite determinar la condición del equipo.');
 recommendation(sections.recommendations);
 const closing=form.purpose==='seguro'
  ?'Se extiende el presente informe para su presentación y evaluación ante la compañía aseguradora correspondiente.'
  :'Se emite el presente informe para dejar constancia de la evaluación técnica realizada.';
 y+=5;paragraph(closing,{size:15.4,line:23,space:5});
 signatures();
 await photoAnnex(form.includePhotos?photos:[]);
 for(let i=0;i<pages.length;i++)footer(pages[i].g,i+1,pages.length,company,date(visitDate));
 return window.EYRWorkshopPDF.createPDF(pages.map(x=>x.c));
}
window.EYRFormalPDF={report};
})();
