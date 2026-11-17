// EYR v3.1 · Regresión de redacción guiada y PDF formal sin servicios externos.
const fs=require('node:fs'),assert=require('node:assert/strict');
const emitted=[],dom={};
const document={
 getElementById:id=>dom[id]||null,
 querySelector:()=>null,
 createElement:tag=>tag==='canvas'?canvas():null
};
function canvas(){
 const ctx={
  fillStyle:'',font:'',lineWidth:1,textBaseline:'alphabetic',
  fillRect(){},strokeRect(){},fillText(t){emitted.push(String(t));},
  measureText(t){return {width:String(t).length*8.4}},
  beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},closePath(){},
  drawImage(){},save(){},restore(){},setTransform(){},arc(){},clip(){},
 };
 const c={width:1060,height:1498,getContext:()=>ctx,
  toDataURL:()=> 'data:image/jpeg;base64,'+Buffer.from([255,216,255,217]).toString('base64')};
 return c;
}
class ImageStub{
 constructor(){this.width=600;this.height=400;this.onload=null;this.onerror=null;}
 set src(url){if(String(url).startsWith('data:'))this.onload?.();else this.onerror?.();}
}
const window={};
const run=(name,args)=>new Function(...args,fs.readFileSync(name,'utf8'));
run('workshop-pdf.js',['window','document','Image','TextEncoder','atob','Blob'])(window,document,ImageStub,TextEncoder,atob,Blob);
run('informe-formal-pdf.js',['window','document','Image'])(window,document,ImageStub);
run('informe-formal.js',['window','document'])(window,document);
const formal=window.EYRFormalReport;
assert(formal&&window.EYRFormalPDF?.report);
const specimen=formal.fresh({id:'v1',client:'Cliente ejemplo',date:'2026-11-16',address:'Lanús, Buenos Aires'},
 {cuit:'22.222.222'},{brand:'LG',model:'LS-H186G3L0',serial:'712KAW000017'});
assert.equal(specimen.model,'LS-H186G3L0');
const guess=formal.suggestNotes('Motor forzador quemado y plaqueta dañada. No enciende ni responde a comandos.');
assert(guess.findings.some(x=>x.part==='forzador'&&x.state==='quemado'));
assert(guess.findings.some(x=>x.part==='plaqueta'));
assert(guess.observed.includes('no-enciende'));
specimen.findings=[{part:'forzador',state:'quemado'},{part:'plaqueta',state:'quemado'}];
const cautious=formal.generate(specimen);
assert(!cautious.conclusion.includes('no reparable'),'Sin comprobar repuestos no se puede concluir irreparabilidad');
assert(!cautious.diagnosis.includes('baja tensión'),'No atribuir causa sin declaración');
specimen.stock='sin-repuestos';specimen.adaptation='no-viable';
specimen.recommendation='reemplazar-equipo';specimen.purpose='seguro';
const verified=formal.generate(specimen);
assert(verified.conclusion.includes('no reparable'));
assert(verified.reparability.includes('no se encontraron repuestos compatibles'));
assert(verified.reparability.includes('no se considera viable una adaptación'));
assert(verified.observations.includes('placa electrónica'));
assert(!verified.diagnosis.includes('baja tensión'));
const possible=formal.generate({...specimen,cause:'posible-tension'});
assert(possible.diagnosis.includes('podrían ser compatibles'),'Hipótesis causal debe ser condicional');
assert(!possible.diagnosis.includes('se confirmó una causa'));
const db={clients:[{id:'c1',name:'Cliente ejemplo',cuit:'22.222.222',address:'Lanús'}],
 visits:[{id:'v1',clientId:'c1',client:'Cliente ejemplo',date:'2026-11-16',address:'Lanús',description:'Revisión',equipmentId:'e1'}],
 equipment:[{id:'e1',clientId:'c1',brand:'LG',model:'LS-H186G3L0',serial:'712KAW000017'}],
 reports:[{id:'informe_v1',visitId:'v1',notes:'Informe de visita original',photos:[{id:'foto_1',kind:'antes'}]}],
 settings:{business:'EYR Refrigeración',cuit:'20-31933677-0',tax:'Monotributista',address:'Lanús',phone:'123'}};
let shown='',saved=0,lastBlob=null;
formal.init({getDB:()=>db,saveDB:()=>{saved++},modal:(title,html)=>{shown=html},
 closeModal(){},toast(){},download:(blob,name)=>{lastBlob=blob},
 confirm:()=>true,photoStore:async()=>null});
formal.open('v1');
assert(shown.includes('Equipo y daños'));
assert(shown.includes('LS-H186G3L0'));
assert(shown.includes('Detectar componentes'));
formal.handle('formal-next',{dataset:{}});
assert(shown.includes('Reparabilidad'));
formal.handle('formal-next',{dataset:{}});
assert(shown.includes('Informe final'));
assert(shown.includes('formal-text-conclusion'));
formal.handle('formal-save',{dataset:{}});
assert(saved>0);
assert.equal(db.reports.length,1,'No duplicar informes');
assert.equal(db.reports[0].notes,'Informe de visita original','No reemplazar observaciones originales');
assert.equal(db.reports[0].photos.length,1,'No borrar fotografías existentes');
assert(db.reports[0].formal?.sections?.conclusion,'El informe redactado debe persistir');
(async()=>{
 const generated=await window.EYRFormalPDF.report({...specimen,sections:verified,includePhotos:false},db.visits[0],db.settings,[]);
 assert(generated instanceof Blob);
 assert.equal(generated.type,'application/pdf');
 const bytes=Buffer.from(await generated.arrayBuffer());
 assert(bytes.slice(0,8).toString('ascii').startsWith('%PDF-1.'));
 const joined=emitted.join(' | ');
 assert(joined.includes('INFORME TÉCNICO'));
 assert(joined.includes('Datos del técnico responsable'));
 assert(joined.includes('712KAW000017'));
 assert(joined.includes('Conclusión técnica'));
 assert(joined.includes('Página 1 de'));
 assert(joined.includes('compañía aseguradora'));
 const withPhotos=await window.EYRFormalPDF.report({...specimen,sections:verified,includePhotos:true},db.visits[0],db.settings,
  [{dataUrl:'data:image/jpeg;base64,'+Buffer.from([255,216,255,217]).toString('base64'),caption:'Placa del fabricante',arrows:[]}]);
 assert(withPhotos.size>generated.size,'La segunda página con fotos incrementa el PDF');
 assert(emitted.includes('ANEXO FOTOGRÁFICO'));
 assert(emitted.some(x=>x.includes('Fotografía 1.')));
 console.log('OK: redactor formal condicionado, guardado seguro y PDF con anexos fotográficos');
})().catch(e=>{console.error(e);process.exitCode=1});
