// Prueba de pantallas EYR, sin servidor ni datos de usuarios.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const code=fs.readFileSync('app.js','utf8').replace(/\}\)\(\);\s*$/,
  'window.__SMOKE={db,render,home,clients,clientCard,clientHistory,clientEquipments,visitModal,whatsappNumber,openQuote,visitDetail,equipmentDetail,moneyValue,moneyDisplay,formatLiveMoney,quoteTotal,remitoTotal,quoteForm};})();');
assert(code.includes('window.__SMOKE='),'No se pudo cargar la app para prueba');
const nodes={'#view':{innerHTML:''},'#modal-root':{innerHTML:''},'#toast':{textContent:'',classList:{add(){},remove(){}}}};
const window={addEventListener(){},EYRAndroid:null,EYR_CATALOG_BASE:{models:[]}};
const document={querySelector:q=>nodes[q]||null,querySelectorAll:()=>[],addEventListener(){},getElementById:id=>nodes['#'+id]||null};
nodes['#modal-root'].querySelectorAll=()=>[];
const navigator={userAgent:'EYR-TEST'};
const location={protocol:'file:'};
const localStorage={getItem:()=>null,setItem(){}};
// Cargar primero la nueva pantalla y el motor de búsqueda de etiquetas.
const scanner=fs.readFileSync('label-scan.js','utf8');
new Function('window','document',scanner)(window,document);
const workshop=fs.readFileSync('workshop.js','utf8');
const errorCodes=fs.readFileSync('error-codes.js','utf8');
new Function('window',errorCodes)(window);
new Function('window','document','indexedDB','crypto',workshop)(window,document,undefined,{randomUUID:()=> 'smoke-uuid'});
const duo=fs.readFileSync('diagnostico-duo.js','utf8');
new Function('window','document',duo)(window,document);
const peer=fs.readFileSync('peer-sync.js','utf8');
new Function('window','document','localStorage','crypto',peer)(window,document,localStorage,{randomUUID:()=> 'smoke-device-uuid'});
new Function('window','document','navigator','location','localStorage','scrollTo','confirm','alert',code)(
  window,document,navigator,location,localStorage,()=>{},()=>true,()=>{});
const app=window.__SMOKE;assert(app,'La aplicación no inicia');
app.db.clients.push({id:'test-1',name:'Cliente de prueba',phone:'011 15 4567 8901',address:'Calle 123'});
app.db.equipment.push({id:'eq-1',clientId:'test-1',brand:'Surrey',model:'TEST-001'});
app.render();
const clientHTML=app.clients();
assert(clientHTML.includes('Cliente de prueba'));
assert(clientHTML.includes('client-whatsapp'));
assert(clientHTML.includes('1 equipo'));
assert(app.clientCard(app.db.clients[0]).includes('WhatsApp'));
app.visitModal(null);
assert(nodes['#modal-root'].innerHTML.includes('visit-form'),'No se pudo abrir Nueva visita');
app.clientHistory('test-1');
assert(nodes['#modal-root'].innerHTML.includes('eyr-history'),'No se pudo abrir Historial técnico');
app.clientEquipments('test-1');
assert(nodes['#modal-root'].innerHTML.includes('TEST-001'),'No se pudo abrir Equipos');
assert.equal(app.whatsappNumber('011 15 4567 8901'),'5491145678901');
assert.equal(app.whatsappNumber('+54 9 11 4567 8901'),'5491145678901');
assert.equal(app.whatsappNumber('15 4567 8901'),'');
console.log('OK: inicio, Clientes, WhatsApp, Nueva visita, Historial y Equipos');

const mockModel={id:'surrey-etiqueta-test',brand:'Surrey',model:'553NIQ12KN81F',
  url:'https://www.surrey.com.ar/test',series:'Serie de prueba',refrigerant:'R32'};
window.EYR_CATALOG_BASE.models.push(mockModel);
const recognizer=window.EYRLabelScan;
assert(recognizer,'Falta módulo de etiquetas');
assert.equal(recognizer.exactMatches('Marca: Surrey\\nMODEL: 553NIQ12KN81F',[mockModel]).length,1);
assert.equal(recognizer.exactMatches('Marca: Surrey\\nMODEL: OTROCODIGO',[mockModel]).length,0);
app.openQuote?.();
assert(nodes['#view'].innerHTML.includes('data-context="quote"'),'No se ofrece foto en Presupuesto');
recognizer.begin('quote','');
assert(nodes['#modal-root'].innerHTML.includes('label-gallery'),'No se ofrece cargar foto');
assert(nodes['#modal-root'].innerHTML.includes('label-camera'),'No se ofrece cámara');
recognizer.onNativeResult({text:'Surrey\nMODEL: 553NIQ12KN81F\nSERIE: X12345',source:'gallery'});
assert(nodes['#modal-root'].innerHTML.includes('surrey-etiqueta-test'),'No se reconoció el modelo en catálogo');
console.log('OK: identificación por foto, catálogo y presupuesto');

app.db.visits.push({id:'visit-smoke',client:'Cliente de prueba',clientId:'test-1',equipmentId:'eq-1',
 date:'2026-11-12',time:'12:00',description:'Prueba de informe y fotos',status:'realizada'});
app.visitDetail('visit-smoke');
assert(nodes['#modal-root'].innerHTML.includes('work-open-report'),'No aparece Informe en Visita');
app.equipmentDetail('eq-1');
assert(nodes['#modal-root'].innerHTML.includes('work-qr-open'),'No aparece QR en Equipo');
window.EYRWorkshop.openReport('visit-smoke');
assert(nodes['#modal-root'].innerHTML.includes('work-photo-choose'),'Faltan acciones de fotos');
assert(nodes['#modal-root'].innerHTML.includes('work-voice'),'Falta dictado');
assert(nodes['#modal-root'].innerHTML.includes('work-error-code'),'Falta registro de error');
assert.deepEqual(window.EYRWorkshop.possibleCodes('Falla CH05 en display'),['CH05']);
console.log('OK: Informe, Fotos, Dictado, QR y Errores del display');

const library=window.EYRErrorLibrary;
assert(library,'No se cargó el catálogo oficial de errores');
assert.equal(library.entries.length,99);
assert.equal(library.lookup('LG','CH05').title,'Comunicación entre unidades');
assert.equal(library.lookup('Samsung','CF').kind,'aviso');
assert.equal(library.lookup('Samsung','E5').title,'Sensor del intercambiador interior');
assert.equal(library.lookup('LG','E5'),null,'E5 de Samsung no debe atribuírsele a LG');
assert.equal(library.lookup('Carrier','CH05'),null,'No se puede inventar una ficha de Carrier');
assert.equal(library.lookup('Surrey','E5'),null);
assert.equal(library.normalizeCode('CH 5'),'CH05');
assert.deepEqual(window.EYRWorkshop.possibleCodes('CH 05 CF E6'),['CH05','CF','E6']);
window.EYRWorkshop.openReport('visit-smoke');
const reportRecord=app.db.reports.find(x=>x.visitId==='visit-smoke');
reportRecord.errorBrand='LG';
reportRecord.errorCode='CH05';
window.EYRWorkshop.openReport('visit-smoke');
assert(nodes['#modal-root'].innerHTML.includes('Comunicación entre unidades'),'Falta detalle en informe');
assert(nodes['#modal-root'].innerHTML.includes('Abrir manual del fabricante'),'Falta fuente oficial');
console.log('OK: base oficial por marca, OCR y posible problema en informe');

const examples=[
 ['Surrey','EH60','551PXQ12N81F','Sensor de ambiente'],
 ['BGH','E1','BP30CN','Sensor de ambiente'],
 ['BGH','E1','BS26WFCR','EEPROM de placa interior'],
 ['BGH','E1','BSI35WCCR','Comunicación interior/exterior'],
 ['Carrier','E3','CWC12RA','Memoria E2RAM'],
 ['Carrier','E3','53NQHE036','Ventilador interior'],
 ['Hitachi','60','PSC-A128EX','Comunicación central-exterior (equipos activos)']
];
for(const [brand,code,model,expected] of examples){
 const found=library.lookup(brand,code,model);
 assert(found,brand+' '+code+' '+model+' no encontrado');
 assert.equal(found.title,expected);
 assert.equal(found.verifiedForExactModel,true);
}
assert.equal(library.lookup('BGH','E1',''),null,'No inferir un significado sin modelo');
assert.equal(library.lookup('Carrier','E3',''),null);
assert.equal(library.lookup('Hitachi','60','RAS22'),null);
assert.equal(library.lookup('Philco','E1','96PHIN55HA2AN'),null);
assert(library.candidates('BGH','E1').length>=3);
assert.deepEqual(window.EYRWorkshop.possibleCodes('EH60 EC52 EH0B ELOC'),['EH60','EC52','EH0B','ELOC']);
assert.deepEqual(window.EYRWorkshop.possibleCodes('60 61', 'Hitachi','PSC-A128EX'),['60','61']);
assert.deepEqual(window.EYRWorkshop.possibleCodes('60 61', 'Hitachi',''),[],'No extraer temperaturas como alarmas sin modelo');
const fallback=window.EYRWorkshop.errorMeaning('BGH','E1','');
assert(fallback.includes('depende del modelo'),'Falta aviso de ambigüedad');
assert(fallback.includes('BP30CN'),'Falta listado de modelos posibles');
assert(window.EYRWorkshop.errorMeaning('Surrey','EH60','551PXQ12N81F').includes('Manual oficial del modelo'),'Falta señal de correspondencia del modelo');
assert(window.EYRWorkshop.errorMeaning('Philco','E1','96PHIN55HA2AN').includes('No se debe asignar automáticamente'),'Falta aviso por ausencia de fuente Philco');
window.EYRWorkshop.openStandalone();
assert(nodes['#modal-root'].innerHTML.includes('work-error-library'),'Falta acceso a biblioteca desde lector');
console.log('OK: 99 referencias, familias conflictivas, modelos y OCR extendido');

assert(app.home().includes('data-action="duo-open"'),'Falta entrada al diagnóstico de dos fotos desde Inicio');
window.EYRDoublePhoto.open();
assert(nodes['#modal-root'].innerHTML.includes('Foto 1 · Etiqueta del equipo'),'No abre etapa 1 del diagnóstico');
window.EYRDoublePhoto.onNativeResult({source:'duo-label-gallery',text:'BGH\nMODEL: BP30CN'});
assert(nodes['#modal-root'].innerHTML.includes('BP30CN'),'No detecta modelo en foto 1');
window.EYRDoublePhoto.handle('duo-next',{dataset:{}});
assert(nodes['#modal-root'].innerHTML.includes('Foto 2 · Display del aire'),'No abre etapa 2');
window.EYRDoublePhoto.onNativeResult({source:'duo-error-gallery',text:'E1'});
assert(nodes['#modal-root'].innerHTML.includes('Sensor de ambiente'),'No presenta la interpretación para BGH BP30CN');
console.log('OK: integración de dos fotos desde Inicio');

assert(app.home().includes('data-action="peer-open"'),'No aparece el botón Sincronizar de Inicio');
assert(window.EYRPeerSync,'Falta motor de sincronización');
assert.equal(app.moneyValue('850.000'),850000);
assert.equal(app.moneyValue('2.200.000'),2200000);
assert.equal(app.moneyValue('850.000,50'),850000.5);
assert.equal(app.moneyDisplay(850000),'850.000');
assert.equal(app.moneyDisplay(2200000),'2.200.000');
assert.equal(app.quoteTotal({mode:'detallado',items:[{qty:2,unit:'850.000'},{qty:1,unit:'500.000'}]}),2200000);
assert.equal(app.quoteTotal({mode:'global',globalPrice:'1.250.000'}),1250000);
assert.equal(app.remitoTotal({items:[{qty:2,unit:'850.000'},{qty:1,unit:'500.000'}]}),2200000);
const moneyInput={dataset:{money:'1'},value:'850000',selectionStart:6,setSelectionRange(a,b){this.caret=a}};
app.formatLiveMoney(moneyInput);
assert.equal(moneyInput.value,'850.000');
moneyInput.value='2500000';moneyInput.selectionStart=7;
app.formatLiveMoney(moneyInput);
assert.equal(moneyInput.value,'2.500.000');
assert.equal(moneyInput.caret,moneyInput.value.length);
console.log('OK: sincronizar teléfonos y separadores de miles en presupuestos y remitos');
