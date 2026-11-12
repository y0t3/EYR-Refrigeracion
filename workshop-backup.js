/* EYR v2.6 - Respaldo ZIP autocontenido de datos y fotos (método STORE). */
(function(){
'use strict';
const TE=new TextEncoder(),TD=new TextDecoder();
const nameOk=/^photos\/[A-Za-z0-9_-]{6,90}\.jpg$/;
function little16(d,p,v){d.setUint16(p,v,true);}
function little32(d,p,v){d.setUint32(p,v>>>0,true);}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function concat(items){const out=new Uint8Array(items.reduce((n,x)=>n+x.length,0));let i=0;for(const x of items){out.set(x,i);i+=x.length;}return out;}
function fromBase64(s){const raw=atob(s),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.slice(i,i+8192));return btoa(s);}
function exportZip(db,photos){
 const referenced=new Set((db.reports||[]).flatMap(r=>(r.photos||[]).map(p=>p.id)));
 const entries=[['eyr.json',TE.encode(JSON.stringify({...db,exportedAt:new Date().toISOString(),archiveFormat:'eyr-complete-v1'},null,2))]];
 for(const id of referenced){
  if(!/^[A-Za-z0-9_-]{6,90}$/.test(id))throw Error('Identificador de fotografía inválido');
  const data=photos.find(p=>p.id===id)?.dataUrl;
  if(!data?.startsWith('data:image/jpeg;base64,'))throw Error('Falta una foto del informe: '+id);
  entries.push(['photos/'+id+'.jpg',fromBase64(data.split(',')[1])]);
 }
 if(entries.reduce((n,x)=>n+x[1].length,0)>70*1024*1024)throw Error('Copia demasiado grande; exportá las fotos en etapas');
 const local=[],central=[];let offset=0;
 for(const [name,data] of entries){
  const label=TE.encode(name),crc=crc32(data);
  const lh=new Uint8Array(30),lv=new DataView(lh.buffer);
  little32(lv,0,0x04034b50);little16(lv,4,20);little16(lv,6,0);little16(lv,8,0);
  little32(lv,14,crc);little32(lv,18,data.length);little32(lv,22,data.length);little16(lv,26,label.length);
  const ch=new Uint8Array(46),cv=new DataView(ch.buffer);
  little32(cv,0,0x02014b50);little16(cv,4,20);little16(cv,6,20);
  little32(cv,16,crc);little32(cv,20,data.length);little32(cv,24,data.length);
  little16(cv,28,label.length);little32(cv,42,offset);
  local.push(lh,label,data);central.push(ch,label);offset+=lh.length+label.length+data.length;
 }
 const cdir=concat(central),eocd=new Uint8Array(22),view=new DataView(eocd.buffer);
 little32(view,0,0x06054b50);little16(view,8,entries.length);little16(view,10,entries.length);
 little32(view,12,cdir.length);little32(view,16,offset);
 return new Blob([...local,cdir,eocd],{type:'application/zip'});
}
async function importZip(file){
 if(file.size>85*1024*1024)throw Error('Respaldo demasiado grande');
 const bytes=new Uint8Array(await file.arrayBuffer()),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-66000);p--)if(v.getUint32(p,true)===0x06054b50){end=p;break;}
 if(end<0)throw Error('El archivo no es un ZIP válido');
 const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),start=v.getUint32(end+16,true);
 if(!count||count>700||start+size>end)throw Error('Estructura ZIP inválida');
 let pos=start,total=0;const found=new Map();
 for(let i=0;i<count;i++){
  if(pos+46>bytes.length||v.getUint32(pos,true)!==0x02014b50)throw Error('Índice ZIP inválido');
  const method=v.getUint16(pos+10,true),crc=v.getUint32(pos+16,true),len=v.getUint32(pos+20,true),unz=v.getUint32(pos+24,true);
  const nameLen=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true),off=v.getUint32(pos+42,true);
  const name=TD.decode(bytes.slice(pos+46,pos+46+nameLen));
  if((name!=='eyr.json'&&!nameOk.test(name))||found.has(name)||method!==0||len!==unz)throw Error('Contenido no permitido en la copia');
  if(off+30>bytes.length||v.getUint32(off,true)!==0x04034b50)throw Error('Archivo ZIP incompleto');
  const skip=v.getUint16(off+26,true)+v.getUint16(off+28,true),p=off+30+skip;
  if(p+len>bytes.length)throw Error('Foto o respaldo truncado');
  const data=bytes.slice(p,p+len);if(crc32(data)!==crc)throw Error('Error de integridad en '+name);
  total+=len;if(total>75*1024*1024)throw Error('Respaldo demasiado grande');
  found.set(name,data);pos+=46+nameLen+extra+comment;
 }
 if(!found.has('eyr.json'))throw Error('Faltan los datos EYR');
 let db;try{db=JSON.parse(TD.decode(found.get('eyr.json')));}catch(e){throw Error('JSON de EYR inválido')}
 if(!db||!Array.isArray(db.clients)||!Array.isArray(db.visits)||!Array.isArray(db.quotes)||typeof db.settings!=='object'||!Array.isArray(db.reports))throw Error('No es una copia completa de EYR');
 const photoIds=new Set(db.reports.flatMap(r=>(r.photos||[]).map(p=>p.id)));
 const photos=[];
 for(const id of photoIds){
  const key='photos/'+id+'.jpg';const data=found.get(key);
  if(!data)throw Error('Falta fotografía '+id);
  if(data.length<4||data[0]!==0xff||data[1]!==0xd8)throw Error('Formato de foto no válido');
  photos.push({id,dataUrl:'data:image/jpeg;base64,'+toBase64(data)});
 }
 return {db,photos};
}
window.EYRWorkshopBackup={exportZip,importZip,crc32};
})();