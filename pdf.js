/* Generador PDF autónomo para EYR. Sin dependencias, servicios ni fuentes remotas. */
(() => {
'use strict';
const W=595.28,H=841.89,M=43,R=W-M,MAX_Y=770;
const C={ink:[.09,.16,.25],muted:[.36,.44,.52],blue:[.13,.39,.64],orange:[.90,.39,.19],line:[.83,.87,.91],pale:[.94,.97,.99]};
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(n)||0);
const prettyDate=v=>{if(!v)return '';let [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})};
const plusDays=(v,n)=>{let [y,m,d]=(v||'2000-01-01').split('-').map(Number);let z=new Date(y,m-1,d+Number(n||0));return `${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,'0')}-${String(z.getDate()).padStart(2,'0')}`};
function latin(s){const repl={0x2018:39,0x2019:39,0x201C:34,0x201D:34,0x2013:45,0x2014:45,0x2022:149,0x20AC:128,0x2026:133,0x00A0:32};const out=[];for(let ch of String(s)){let code=ch.codePointAt(0);out.push(code<=255?code:(repl[code]??63))}return Uint8Array.from(out)}
function bytesUnion(...arr){let len=arr.reduce((s,b)=>s+b.length,0),out=new Uint8Array(len),off=0;for(let b of arr){out.set(b,off);off+=b.length}return out}
function base64Bytes(s){const raw=atob(s),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function pdfesc(s){const bs=latin(s),ret=[];for(const c of bs){if(c===40||c===41||c===92)ret.push(92);ret.push(c)}return Array.from(ret,x=>String.fromCharCode(x)).join('')}
function n(x){return (+x).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')||'0'}
function color(c){return c.map(n).join(' ')}
function measure(s,size,bold=false){if(typeof document!=='undefined'){const canvas=measure.canvas||(measure.canvas=document.createElement('canvas'));const cx=canvas.getContext('2d');cx.font=`${bold?'bold ':''}${size}px Helvetica,Arial,sans-serif`;return cx.measureText(String(s)).width}return String(s).length*size*(bold?.56:.52)}
function splitLines(s,size,maxWidth,bold=false){const result=[];for(const para of String(s??'').replace(/\r/g,'').split('\n')){if(!para.trim()){result.push('');continue}let line='';for(let w of para.split(/\s+/).filter(Boolean)){let candidate=line?line+' '+w:w;if(measure(candidate,size,bold)<=maxWidth){line=candidate;continue}if(line){result.push(line);line=''}while(measure(w,size,bold)>maxWidth&&w.length>1){let k=w.length-1;while(k>1&&measure(w.slice(0,k),size,bold)>maxWidth)k--;result.push(w.slice(0,k));w=w.slice(k)}line=w}result.push(line)}return result}
function pdfQuote(q,company,total){
 const pages=[];let page=null,y=0;
 function op(s){page.ops.push(s)}
 function line(x1,yy1,x2,yy2,col=C.line,th=.7){op(`${color(col)} RG ${n(th)} w ${n(x1)} ${n(H-yy1)} m ${n(x2)} ${n(H-yy2)} l S\n`)}
 function fillrect(x,yy,w,h,col){op(`${color(col)} rg ${n(x)} ${n(H-yy-h)} ${n(w)} ${n(h)} re f\n`)}
 function tx(s,x,yy,size=10,bold=false,col=C.ink,align='left'){s=String(s??'');if(!s)return;if(align==='right')x-=measure(s,size,bold);else if(align==='center')x-=measure(s,size,bold)/2;op(`BT /F${bold?2:1} ${n(size)} Tf ${color(col)} rg 1 0 0 1 ${n(x)} ${n(H-yy)} Tm (${pdfesc(s)}) Tj ET\n`)}
 function newPage(){page={ops:[]};pages.push(page);fillrect(0,0,W,7,C.blue);
 // Logo preserves the source EYR letters and fire / ice artwork.
 op(`q 78 0 0 68 43 ${n(H-101)} cm /Im0 Do Q\n`);
 const head=company.business||'EYR Refrigeración';tx(head,R,48,12,true,C.ink,'right');tx('CUIT: '+(company.cuit||''),R,64,8.6,false,C.ink,'right');tx(company.tax||'',R,77,8.6,false,C.ink,'right');
 const addresses=splitLines(company.address||'',8.2,270);addresses.slice(0,2).forEach((s,i)=>tx(s,R,90+i*11,8.2,false,C.ink,'right'));
 tx('Tel.: '+(company.phone||''),R,112,8.4,false,C.ink,'right');line(M,127,R,127,C.line,1);y=144}
 function ensure(needed=15){if(y+needed>MAX_Y)newPage()}
 function paragraph(s,size=9.7,indent=0,col=C.ink,bold=false,leading=15){for(let str of splitLines(s,size,R-M-indent,bold)){ensure(leading);tx(str,M+indent,y,size,bold,col);y+=leading}}
 function title(s){ensure(38);y+=5;tx(s,M,y+4,12.5,true,C.ink);y+=21;line(M,y,R,y,C.line,.65);y+=11}
 function itemBullet(s){let chunks=splitLines(s,9.6,R-M-26);ensure(chunks.length*14+3);tx('•',M+7,y,12,true,C.orange);for(let t of chunks){tx(t,M+23,y,9.6,false,C.ink);y+=14}y+=3}
 function totalBox(label,val){ensure(51);fillrect(M,y,R-M,44,C.pale);fillrect(M,y,4,44,C.orange);tx(label,M+16,y+27,11,true,C.ink);tx(money(val),R-13,y+27,15,true,C.blue,'right');y+=54}
 function tableRow(label,val,bold=false){const rows=splitLines(label,9.2,365,bold);const h=Math.max(24,rows.length*13+10);ensure(h);fillrect(M,y,R-M,h,bold?C.pale:[1,1,1]);rows.forEach((s,i)=>tx(s,M+8,y+16+i*13,9.2,bold));tx(money(val),R-9,y+16,9.4,bold,C.ink,'right');line(M,y+h,R,y+h,C.line,.55);y+=h}
 function smallLabel(key,val){if(!val)return;ensure(17);tx(key+':',M,y,9.4,true);tx(val,M+Math.min(110,measure(key+':',9.4,true)+8),y,9.4);y+=18}
 newPage();smallLabel('Fecha',prettyDate(q.date));smallLabel('Cliente',q.client);if(q.cuit)smallLabel('CUIT / DNI',q.cuit);if(q.address)paragraph('Domicilio del servicio: '+q.address,9.4,0,C.ink,false,16);y+=8;
 ensure(54);line(M,y,R,y,C.line,1);y+=24;tx('PRESUPUESTO DE SERVICIO TÉCNICO',W/2,y,14.5,true,C.ink,'center');y+=17;line(M,y,R,y,C.line,1);y+=16;
 title('Descripción del trabajo');paragraph(q.title||'Servicio técnico',10.4,0,C.ink,true,15);
 if((q.tasks||[]).some(t=>String(t).trim())){y+=8;ensure(20);tx('Alcance de los trabajos',M,y,10.2,true);y+=19;for(const t of q.tasks.filter(x=>String(x).trim()))itemBullet(t)}
 y+=6;title('Detalle económico');
 if(q.mode==='rubros'){
 const types=[['manoobra','Mano de obra'],['materiales','Materiales'],['otros','Otros']];for(const [cat,label] of types){const amount=(q.items||[]).filter(i=>i.category===cat).reduce((s,i)=>s+(Number(i.qty)||0)*(Number(i.unit)||0),0);if(amount)tableRow(label,amount,true)}
 }else if(q.mode==='detallado'){
 const types={materiales:'Materiales',manoobra:'Mano de obra',otros:'Otros'};for(const item of q.items||[]){if(!item.description)continue;let amount=(Number(item.qty)||0)*(Number(item.unit)||0),quantity=Number(item.qty)||0;tableRow(`${item.description} (${quantity} × ${money(item.unit)}) · ${types[item.category]||'Otros'}`,amount)}
 }
 totalBox('TOTAL GENERAL',total);
 title('Condiciones comerciales');paragraph(`Presupuesto válido por ${Math.max(0,Number(q.validity)||0)} días corridos, hasta el ${prettyDate(plusDays(q.date,q.validity))}.`,9.4,0,C.ink,false,15);
 const a=Math.max(0,Math.min(100,Number(q.advance)||0));if(a){y+=3;paragraph(`Anticipo del ${a}%: ${money(total*a/100)}. Saldo contra finalización: ${money(total*(100-a)/100)}.`,9.4,0,C.ink,false,15)}
 if(q.conditions){y+=5;paragraph(q.conditions,9.4,0,C.ink,false,15)}
 if(q.exclusions){y+=10;title('Exclusiones');paragraph(q.exclusions,9.4,0,C.ink,false,15)}
 if(q.observations){y+=10;title('Observaciones');paragraph(q.observations,9.4,0,C.ink,false,15)}
 for(let i=0;i<pages.length;i++){page=pages[i];line(M,794,R,794,C.line,.65);tx(company.business||'EYR Refrigeración',M,810,8,false,C.muted);tx(`Presupuesto N.º ${String(q.number||0).padStart(4,'0')} · Página ${i+1} de ${pages.length}`,R,810,8,false,C.muted,'right')}
 const objects=[null];const add=bytes=>{objects.push(bytes);return objects.length-1};const str=s=>latin(s);
 const cat=add(null),pagesRef=add(null),f1=add(str('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
 const f2=add(str('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
 const imageData=base64Bytes(window.EYR_LOGO_JPEG_BASE64||'');if(!imageData.length)throw Error('Logo no disponible');
 const im=add(bytesUnion(str(`<< /Type /XObject /Subtype /Image /Width 500 /Height 438 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageData.length} >>\nstream\n`),imageData,str('\nendstream')));
 const pageRefs=[];
 for(const p of pages){let cont=str(p.ops.join(''));let contents=add(bytesUnion(str(`<< /Length ${cont.length} >>\nstream\n`),cont,str('\nendstream')));let pageId=add(str(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${n(W)} ${n(H)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject << /Im0 ${im} 0 R >> >> /Contents ${contents} 0 R >>`));pageRefs.push(pageId)}
 objects[cat]=str(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);objects[pagesRef]=str(`<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map(x=>`${x} 0 R`).join(' ')}] >>`);
 let pos=0,parts=[];const offset=[];function push(b){parts.push(b);pos+=b.length}
 push(str('%PDF-1.4\n%âãÏÓ\n'));for(let i=1;i<objects.length;i++){offset[i]=pos;push(str(`${i} 0 obj\n`));push(objects[i]);push(str('\nendobj\n'))}
 const xref=pos;push(str(`xref\n0 ${objects.length}\n0000000000 65535 f \n`));for(let i=1;i<objects.length;i++)push(str(`${String(offset[i]).padStart(10,'0')} 00000 n \n`));push(str(`trailer\n<< /Size ${objects.length} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`));return new Blob([bytesUnion(...parts)],{type:'application/pdf'})
}
window.EYRcreatePDF=pdfQuote;
})();