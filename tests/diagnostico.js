// EYR v2.9 · Recorrido real de dos fotos, modelo contextual y error.
const fs=require('node:fs'),assert=require('node:assert/strict');
const window={},events=[],inputs={};
const document={getElementById:id=>inputs[id]||null};
const loader=(filename,...extra)=>new Function('window','document','indexedDB','crypto',fs.readFileSync(filename,'utf8'))(
  window,document,undefined,{randomUUID:()=> 'unit-test-uuid'},...extra);
loader('label-scan.js');
loader('error-codes.js');
loader('workshop.js');
loader('diagnostico-duo.js');
const db={clients:[],visits:[{id:'v1',client:'Cliente BGH',date:'2026-11-12',description:'Revisión aire'}],
 equipment:[],reports:[{id:'informe_v1',visitId:'v1',notes:'Conservar observaciones',photos:[{id:'foto_previa',kind:'antes'}]}]};
let screen='',opened='',saved=0;
const hooks={
 getDB:()=>db,saveDB:()=>{saved++;},localModels:()=>[],remoteModels:()=>[],
 ensureIndex:async()=>null,confirm:()=>true,
 modal:(title,body)=>{screen=body;},closeModal:()=>{screen='';},
 toast:msg=>events.push('toast:'+msg),openReport:id=>{opened=id;},
 download(){},equipmentDetail(){}
};
window.EYRWorkshop.init(hooks);
window.EYRDoublePhoto.init(hooks);
const duo=window.EYRDoublePhoto,lib=window.EYRErrorLibrary;
assert(duo&&lib&&window.EYRLabelScan);
const label=duo.readFromPhoto('FABRICANTE BGH\nMODELO: BP30CN\nSERIE: ABC123456');
assert.equal(label.brand,'BGH');
assert.equal(label.model,'BP30CN');
assert(label.candidates.some(x=>x.brand==='BGH'&&x.model==='BP30CN'));
assert.equal(duo.readFromPhoto('MODELO: BP30CN').brand,'BGH','Modelo en manual permite identificar marca aunque OCR de logo falle');
window.EYRAndroid={scanLabel:src=>events.push(src)};
duo.open();
assert(screen.includes('Foto 1 · Etiqueta del equipo'));
assert(screen.includes('duo-gallery'));
duo.handle('duo-gallery',{dataset:{}});
assert(events.includes('duo-label-gallery'));
duo.onNativeResult({source:'duo-label-gallery',text:'BGH\nMODEL: BP30CN\nSERIE: ABC'});
assert(screen.includes('BP30CN'));
duo.handle('duo-next',{dataset:{}});
assert(screen.includes('Foto 2 · Display del aire'));
duo.handle('duo-camera',{dataset:{}});
assert(events.includes('duo-error-camera'));
duo.onNativeResult({source:'duo-error-camera',text:'E1'});
assert(screen.includes('Resultado de las dos fotografías'));
assert(screen.includes('Sensor de ambiente'),'BGH BP30CN + E1 debe mostrar error de sensor');
assert(screen.includes('Manual oficial del modelo'),'Modelo confirmado por la biblioteca');
assert.equal(db.reports[0].errorCode,undefined,'OCR no debe guardar informes automáticamente');
inputs['duo-visit']={value:'v1'};
duo.handle('duo-save',{dataset:{}});
assert.equal(opened,'v1');
assert.equal(db.reports.length,1,'No duplicar informe');
assert.equal(db.reports[0].notes,'Conservar observaciones');
assert.equal(db.reports[0].photos.length,1,'Conservar fotos previas');
assert.equal(db.reports[0].errorCode,'E1');
assert.equal(db.reports[0].errorBrand,'BGH');
assert.equal(db.reports[0].errorModel,'BP30CN');
assert.equal(db.reports[0].errorMeaning.title,'Sensor de ambiente');
assert(saved>0);
assert(!db.reports[0].image,'Nunca almacenar foto OCR implícitamente');
delete inputs['duo-visit'];
// El mismo E1 cambia de interpretación entre modelos.
duo.open();
duo.onNativeResult({source:'duo-label-camera',text:'BGH\nMODEL: BS26WFCR'});
duo.handle('duo-next',{dataset:{}});
duo.onNativeResult({source:'duo-error-gallery',text:'E1'});
assert(screen.includes('EEPROM de placa interior'),'E1 split debe tener significado de split');
assert(!screen.includes('Sensor de ambiente</strong>'),'No mezclar modelos');
// Modelo desconocido: preservar las alternativas, nunca inventar diagnóstico.
duo.open();
duo.onNativeResult({source:'duo-label-gallery',text:'BGH\nMODELO: ZX99999'});
duo.handle('duo-next',{dataset:{}});
duo.onNativeResult({source:'duo-error-gallery',text:'E1'});
assert(screen.includes('depende del modelo'),'Debe declarar que la interpretación es ambigua');
assert(screen.includes('BS26WFCR'),'Debe mostrar líneas documentadas');
// Varios códigos OCR: pedir confirmación; no elegir automáticamente.
duo.open();
duo.onNativeResult({source:'duo-label-gallery',text:'BGH\nMODEL: BP30CN'});
duo.handle('duo-next',{dataset:{}});
duo.onNativeResult({source:'duo-error-gallery',text:'E1 E2'});
assert(screen.includes('varios códigos posibles'));
assert(screen.includes('duo-pick-code'));
duo.handle('duo-pick-code',{dataset:{code:'E2'}});
assert(screen.includes('Sensor del evaporador'));
console.log('OK: dos fotos, lectura contextual, cambios de modelo, ambigüedad y guardado seguro');