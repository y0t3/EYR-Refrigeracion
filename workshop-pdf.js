/* EYR v2.6: PDF técnico con fotos y QR, renderizado localmente. */
(function(){
'use strict';
const W=1060,H=1498;
function page(){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,W,H);return {c,g};}
function heading(g,title,sub){g.fillStyle='#08325a';g.fillRect(0,0,W,158);g.fillStyle='#ff8d26';g.fillRect(0,150,W,9);g.fillStyle='white';g.font='bold 43px Arial';g.fillText('EYR Refrigeración',63,74);g.font='24px Arial';g.fillText(title,63,122);g.fillStyle='#667588';g.font='19px Arial';g.fillText(sub||'',64,195);}
function rule(g,y){g.strokeStyle='#d9e6ee';g.lineWidth=2;g.beginPath();g.moveTo(65,y);g.lineTo(995,y);g.stroke();}
function wrap(g,value,x,y,width,fontsize,line,maxY){g.font=fontsize+'px Arial';g.fillStyle='#263b4f';const tokens=String(value||'').replace(/\r/g,'').split(/(\s+)/),parts=[];let at=y;function flush(){if(!parts.length)return true;if(at>maxY)return false;g.fillText(parts.join('').trim(),x,at);parts.length=0;at+=line;return true;}for(const token of tokens){if(token.includes('\n')){const bits=token.split('\n');for(let i=0;i<bits.length;i++){if(bits[i])parts.push(bits[i]);if(i<bits.length-1&&!flush())return at;}continue;}if(g.measureText(parts.join('')+token).width>width&&parts.length&&!flush())return at;if(g.measureText(token).width>width){for(const char of token){if(g.measureText(parts.join('')+char).width>width&&!flush())return at;parts.push(char);}}else parts.push(token);}flush();return at;}
function field(g,name,value,y){g.font='bold 18px Arial';g.fillStyle='#46718f';g.fillText(name.toUpperCase(),67,y);return wrap(g,value||'—',67,y+35,910,25,34,y+99)+25;}
function footer(g,n,total){rule(g,1400);g.font='18px Arial';g.fillStyle='#526b7e';g.fillText('EYR · Informe de servicio técnico',67,1437);g.textAlign='right';g.fillText(String(n)+' / '+String(total),990,1437);g.textAlign='left';}
function image(data){return new Promise((ok,fail)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=()=>fail(Error('Imagen dañada'));img.src=data;});}
function drawContain(g,img,x,y,w,h){const k=Math.min(w/img.width,h/img.height),iw=img.width*k,ih=img.height*k;
 const pos={x:x+(w-iw)/2,y:y+(h-ih)/2,w:iw,h:ih};g.drawImage(img,pos.x,pos.y,iw,ih);return pos;}
function arrow(g,pos,a){
 if(!pos||!a)return;
 const x=pos.x+a.x1*pos.w,y=pos.y+a.y1*pos.h,xx=pos.x+a.x2*pos.w,yy=pos.y+a.y2*pos.h;
 const angle=Math.atan2(yy-y,xx-x),head=17;
 g.save();g.strokeStyle='#ff621e';g.fillStyle='#ff621e';g.lineWidth=7;g.lineCap='round';
 g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();
 g.beginPath();g.moveTo(xx,yy);g.lineTo(xx-head*Math.cos(angle-.55),yy-head*Math.sin(angle-.55));
 g.lineTo(xx-head*Math.cos(angle+.55),yy-head*Math.sin(angle+.55));g.closePath();g.fill();g.restore();
}
function ascii(s){return new TextEncoder().encode(s);}
function join(parts){const out=new Uint8Array(parts.reduce((n,x)=>n+x.length,0));let i=0;for(const p of parts){out.set(p,i);i+=p.length;}return out;}
function jpeg(c){const b64=c.toDataURL('image/jpeg',.78).split(',')[1],raw=atob(b64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function createPDF(pages){
 if(!pages.length)throw Error('No hay páginas');
 const objs=[null],add=x=>(objs.push(x),objs.length-1),catalog=add(null),root=add(null),refs=[];
 for(const c of pages){
  const bytes=jpeg(c);
  const img=add(join([ascii('<< /Type /XObject /Subtype /Image /Width '+W+' /Height '+H+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n'),bytes,ascii('\nendstream')]));
  const ops=ascii('q 595.28 0 0 841.89 0 0 cm /Im0 Do Q\n');
  const stream=add(join([ascii('<< /Length '+ops.length+' >>\nstream\n'),ops,ascii('endstream')]));
  refs.push(add(ascii('<< /Type /Page /Parent '+root+' 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+img+' 0 R >> >> /Contents '+stream+' 0 R >>')));
 }
 objs[catalog]=ascii('<< /Type /Catalog /Pages '+root+' 0 R >>');
 objs[root]=ascii('<< /Type /Pages /Count '+refs.length+' /Kids ['+refs.map(n=>n+' 0 R').join(' ')+'] >>');
 const arr=[],offsets=[0];let pos=0;function push(x){arr.push(x);pos+=x.length;}
 push(ascii('%PDF-1.4\n'));
 for(let i=1;i<objs.length;i++){offsets[i]=pos;push(ascii(i+' 0 obj\n'));push(objs[i]);push(ascii('\nendobj\n'));}
 const xref=pos;push(ascii('xref\n0 '+objs.length+'\n0000000000 65535 f \n'));
 for(let i=1;i<objs.length;i++)push(ascii(String(offsets[i]).padStart(10,'0')+' 00000 n \n'));
 push(ascii('trailer\n<< /Size '+objs.length+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF'));
 return new Blob([join(arr)],{type:'application/pdf'});
}
async function report(rec,visit,photos,client,eq){
 const pg=[],p=page(),g=p.g;heading(g,'INFORME TÉCNICO',visit.date||'');let y=250;
 y=field(g,'Cliente',visit.client||client?.name||'',y);
 y=field(g,'Trabajo',visit.description||'Servicio técnico',y);
 y=field(g,'Fecha y horario',String(visit.date||'')+' · '+String(visit.time||''),y);
 if(eq)y=field(g,'Equipo',(eq.brand||'')+' '+(eq.model||''),y);
 if(rec.errorCode){
  y=field(g,'Código observado',String(rec.errorBrand||'')+' '+String(rec.errorCode),y);
  if(rec.errorMeaning?.title){
   y=field(g,'Referencia oficial de la marca (orientativa)',String(rec.errorMeaning.title),y);
   y=field(g,'Posible problema',String(rec.errorMeaning.description||'').slice(0,250),y);
  }
 }
 rule(g,y);y+=48;g.font='bold 28px Arial';g.fillStyle='#114c7a';g.fillText('Observaciones técnicas',67,y);y+=46;
 const note=String(rec.notes||'Sin observaciones adicionales').slice(0,10000),words=note.split(/\s+/);let paragraphs=[],buffer=[];
 for(const w of words){if((buffer.join(' ')+' '+w).length>650){paragraphs.push(buffer.join(' '));buffer=[];}buffer.push(w);}
 if(buffer.length)paragraphs.push(buffer.join(' '));if(!paragraphs.length)paragraphs=['Sin observaciones'];
 wrap(g,paragraphs[0],67,y,925,23,38,1350);pg.push(p.c);
 for(let i=1;i<paragraphs.length;i++){const next=page();heading(next.g,'OBSERVACIONES (continuación)',visit.date||'');wrap(next.g,paragraphs[i],67,255,925,23,38,1330);pg.push(next.c);}
 const fotos=(photos||[]).filter(x=>x?.dataUrl?.startsWith('data:image/jpeg;base64,')).slice(0,12);
 for(let i=0;i<fotos.length;i+=2){
   const next=page();heading(next.g,'REGISTRO FOTOGRÁFICO',visit.client||'');
   for(let k=0;k<2;k++){
    const f=fotos[i+k];if(!f)continue;
    const y0=235+k*580;
    next.g.fillStyle='#e8f1f8';next.g.fillRect(60,y0,940,485);
    try{const pos=drawContain(next.g,await image(f.dataUrl),65,y0+5,930,425);for(const a of f.arrows||[])arrow(next.g,pos,a);}
    catch(e){next.g.fillStyle='#567';next.g.font='23px Arial';next.g.fillText('Imagen no disponible',90,y0+130);}
    next.g.fillStyle='#194c76';next.g.font='bold 22px Arial';
    const kind=({antes:'ANTES',despues:'DESPUÉS',detalle:'DETALLE'})[f.kind]||'FOTO';
    next.g.fillText(kind+' · '+String(f.caption||'Sin descripción').slice(0,60),74,y0+472);
   }
   pg.push(next.c);
 }
 for(let i=0;i<pg.length;i++)footer(pg[i].getContext('2d'),i+1,pg.length);
 return createPDF(pg);
}
async function qrSticker(data,eq,client){
 const p=page();heading(p.g,'ETIQUETA DE IDENTIFICACIÓN',client?.name||'');
 drawContain(p.g,await image(data),175,255,710,710);
 p.g.fillStyle='#0b355a';p.g.textAlign='center';p.g.font='bold 34px Arial';
 p.g.fillText(String(eq.brand||'EYR').slice(0,25),W/2,1060);
 p.g.font='28px Arial';p.g.fillText(String(eq.model||'').slice(0,35),W/2,1110);
 p.g.font='21px Arial';p.g.fillText('Escaneá con EYR para abrir este equipo',W/2,1168);p.g.textAlign='left';
 footer(p.g,1,1);return createPDF([p.c]);
}
window.EYRWorkshopPDF={report,qrSticker,createPDF};
})();