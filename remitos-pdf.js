/* EYR - Remitos ORIGINAL y DUPLICADO, PDF A4 sin librerias ni servicios externos. */
(() => {
'use strict';
const W=595.28,H=841.89,M=36,R=W-M,FS=840;
const INK=[.12,.15,.20],GRAY=[.43,.48,.54],LINE=[.72,.75,.78],PALE=[.968,.978,.988],WHITE=[1,1,1];
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>'$'+new Intl.NumberFormat('es-AR',{minimumFractionDigits:0,maximumFractionDigits:2}).format(num(v));
const date=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(v||'')};
function latin(s){const rep={0x2018:39,0x2019:39,0x201c:34,0x201d:34,0x2013:45,0x2014:45,0x2022:149,0x2026:133,0x00a0:32,0x20ac:128};const b=[];for(const ch of String(s??'')){const n=ch.codePointAt(0);b.push(n<=255?n:(rep[n]??63))}return Uint8Array.from(b)}
function concat(...xs){const out=new Uint8Array(xs.reduce((n,a)=>n+a.length,0));let i=0;for(const a of xs){out.set(a,i);i+=a.length}return out}
function decode(s){const a=atob(s),o=new Uint8Array(a.length);for(let i=0;i<a.length;i++)o[i]=a.charCodeAt(i);return o}
function esc(s){const out=[];for(const b of latin(s)){if(b===40||b===41||b===92)out.push('\\');out.push(String.fromCharCode(b))}return out.join('')}
const n=x=>Number(x).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');const c=x=>x.map(n).join(' ');
function width(text,size,bold=false){if(typeof document!=='undefined'){const e=width.c||(width.c=document.createElement('canvas'));const ctx=e.getContext('2d');ctx.font=`${bold?'bold ':''}${size}px Helvetica,Arial,sans-serif`;return ctx.measureText(String(text)).width}return String(text).length*size*(bold?.55:.52)}
function wrap(src,size,max,bold=false){const result=[];for(const part of String(src??'').replace(/\r/g,'').split('\n')){let line='';for(let word of part.trim().split(/\s+/).filter(Boolean)){const t=line?line+' '+word:word;if(width(t,size,bold)<=max){line=t;continue}if(line){result.push(line);line=''}while(word.length>1&&width(word,size,bold)>max){let q=word.length-1;while(q>1&&width(word.slice(0,q),size,bold)>max)q--;result.push(word.slice(0,q));word=word.slice(q)}line=word}result.push(line)}return result}
function createRemitoPDF(remito,company){
 if(!remito||!Array.isArray(remito.items))throw Error('Remito inválido');
 const entries=remito.items.filter(it=>String(it.description||'').trim()&&num(it.qty)>0).map(it=>({...it,qty:num(it.qty),unit:num(it.unit)}));
 if(!entries.length)throw Error('Agregá al menos un concepto');
 const total=entries.reduce((a,it)=>a+it.qty*it.unit,0);const pages=[];let p=null,y=0,copy='ORIGINAL',copyPage=0;
 function op(s){p.ops.push(s)}
 function line(x1,y1,x2,y2,col=LINE,th=.7){op(`${c(col)} RG ${n(th)} w ${n(x1)} ${n(H-y1)} m ${n(x2)} ${n(H-y2)} l S\n`)}
 function rect(x,yy,w,h,col=LINE,th=.7){op(`${c(col)} RG ${n(th)} w ${n(x)} ${n(H-yy-h)} ${n(w)} ${n(h)} re S\n`)}
 function fill(x,yy,w,h,col=PALE){op(`${c(col)} rg ${n(x)} ${n(H-yy-h)} ${n(w)} ${n(h)} re f\n`)}
 function tx(text,x,yy,size=9,bold=false,col=INK,align='left'){
  const s=String(text??'');if(!s)return;if(align==='right')x-=width(s,size,bold);if(align==='center')x-=width(s,size,bold)/2;
  op(`BT /F${bold?2:1} ${n(size)} Tf ${c(col)} rg 1 0 0 1 ${n(x)} ${n(H-yy)} Tm (${esc(s)}) Tj ET\n`)
 }
 function textBox(text,x,top,maxW,size=9,leading=13,bold=false){const lines=wrap(text,size,maxW,bold);for(let i=0;i<lines.length;i++)tx(lines[i],x,top+i*leading,size,bold);return lines.length*leading}
 function header(isContinuation){
  p={ops:[],copy,copyPage:++copyPage};pages.push(p);
  const top=36,logoX=M+5,logoW=102,logoH=92,companyX=151,companyW=222,rightX=384,rightW=R-rightX;
  op(`q ${n(logoW)} 0 0 ${n(logoH)} ${n(logoX)} ${n(H-top-logoH)} cm /Im0 Do Q\n`);
  rect(companyX,top,companyW,98,LINE,.8);rect(rightX,top,rightW,98,LINE,.8);
  tx(company.business||'EYR Refrigeración',companyX+9,top+19,11.3,true);
  tx('CUIT: '+(company.cuit||''),companyX+9,top+39,8.9);
  tx(company.tax||'Monotributista',companyX+9,top+53,8.7);
  const addr=wrap(company.address||'',8.3,companyW-16);
  addr.slice(0,2).forEach((t,i)=>tx(t,companyX+9,top+68+i*10,8.3));
  tx('TEL: '+(company.phone||''),companyX+9,top+91,8.1);
  tx('REMITO',rightX+rightW/2,top+19,13,true,INK,'center');
  tx(copy+(isContinuation?' (CONT.)':''),rightX+rightW/2,top+38,9.6,true,INK,'center');
  tx('Nº: '+String(remito.number||0).padStart(4,'0'),rightX+10,top+59,9.4,true);
  tx('Fecha: '+date(remito.date),rightX+10,top+79,9.2);
  y=149;
  // Bloque de destinatario, dos columnas como en el modelo aportado.
  rect(M,y,R-M,76,LINE,.8);line(M+260,y,M+260,y+76);line(M,y+38,R,y+38);
  tx('CLIENTE:',M+9,y+16,8.4,true);textBox(remito.client,M+67,y+16,187,8.5,10);
  tx('CUIT / DNI:',M+270,y+16,8.4,true);textBox(remito.cuit||'',M+339,y+16,170,8.5,10);
  tx('Dirección:',M+9,y+54,8.4,true);textBox(remito.address||'',M+67,y+54,187,8.5,10);
  tx('Condición frente al IVA:',M+270,y+54,8.1,true);textBox(remito.iva||'',M+408,y+54,97,8.3,10);
  y+=98;
  fill(M,y,R-M,32,PALE);rect(M,y,R-M,32,LINE,.8);
  line(M+65,y,M+65,y+32);line(R-114,y,R-114,y+32);
  tx('Cantidad',M+8,y+21,9.5,true);tx('Descripción',M+73,y+21,9.5,true);tx('Precio',R-102,y+21,9.5,true);
  y+=32;
 }
 function item(it){const lines=wrap(it.description,9.2,R-M-198),height=Math.max(39,lines.length*14+17);
  if(y+height>690){header(true)}
  rect(M,y,R-M,height,LINE,.6);line(M+65,y,M+65,y+height);line(R-114,y,R-114,y+height);
  tx(new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(it.qty),M+32,y+21,9.5,false,INK,'center');
  lines.forEach((s,i)=>tx(s,M+73,y+21+i*14,9.2));tx(money(it.qty*it.unit),R-8,y+21,9.3,false,INK,'right');
  y+=height;
 }
 function summary(){
  if(y+127>728){header(true)}
  fill(M,y,R-M,37,PALE);rect(M,y,R-M,37,LINE,.8);
  line(R-114,y,R-114,y+37);
  tx('TOTAL',R-125,y+24,11.8,true,INK,'right');tx(money(total),R-8,y+24,12,true,INK,'right');
  y+=69;
  const leftW=(R-M)/2;
  rect(M,y,R-M,74,LINE,.8);line(M+leftW,y,M+leftW,y+74);line(M,y+31,R,y+31);
  tx('Entregado por (firma y aclaración)',M+9,y+20,9,true);
  tx('Recibido por (firma y aclaración)',M+leftW+9,y+20,9,true);
 }
 for(const label of ['ORIGINAL','DUPLICADO']){
  copy=label;copyPage=0;header(false);for(const it of entries)item(it);summary();
 }
 for(let i=0;i<pages.length;i++){
  p=pages[i];line(M,794,R,794,LINE,.5);
  tx(company.business||'EYR Refrigeración',M,810,8,false,GRAY);
  tx('Remito '+String(remito.number||0).padStart(4,'0')+' - '+p.copy+' - Pág. '+p.copyPage,R,810,8,false,GRAY,'right');
 }
 const objects=[null],add=x=>(objects.push(x),objects.length-1),str=latin;
 const cat=add(null),pagesRoot=add(null),font=add(str('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')),
 bold=add(str('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
 const logo=decode(window.EYR_LOGO_JPEG_BASE64||'');if(!logo.length)throw Error('Logo EYR no disponible');
 const im=add(concat(str(`<< /Type /XObject /Subtype /Image /Width 500 /Height 438 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`),logo,str('\nendstream')));
 const pageRefs=[];
 for(const page of pages){const stream=str(page.ops.join(''));const cont=add(concat(str(`<< /Length ${stream.length} >>\nstream\n`),stream,str('\nendstream')));
  pageRefs.push(add(str(`<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 ${n(W)} ${n(H)}] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> /XObject << /Im0 ${im} 0 R >> >> /Contents ${cont} 0 R >>`)));
 }
 objects[cat]=str(`<< /Type /Catalog /Pages ${pagesRoot} 0 R >>`);objects[pagesRoot]=str(`<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map(i=>i+' 0 R').join(' ')}] >>`);
 let pos=0;const parts=[],offset=[];
 function push(b){parts.push(b);pos+=b.length}
 push(str('%PDF-1.4\n%âãÏÓ\n'));
 for(let i=1;i<objects.length;i++){offset[i]=pos;push(str(i+' 0 obj\n'));push(objects[i]);push(str('\nendobj\n'))}
 const xref=pos;push(str('xref\n0 '+objects.length+'\n0000000000 65535 f \n'));
 for(let i=1;i<objects.length;i++)push(str(String(offset[i]).padStart(10,'0')+' 00000 n \n'));
 push(str(`trailer\n<< /Size ${objects.length} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`));
 return new Blob([concat(...parts)],{type:'application/pdf'});
}
window.EYRcreateRemitoPDF=createRemitoPDF;
})();