// Prueba de pantallas EYR, sin servidor ni datos de usuarios.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const code=fs.readFileSync('app.js','utf8').replace(/\}\)\(\);\s*$/,
  'window.__SMOKE={db,render,clients,clientCard,clientHistory,clientEquipments,visitModal,whatsappNumber,openQuote,visitDetail,equipmentDetail};})();');
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
new Function('window','document','indexedDB','crypto',workshop)(window,document,undefined,{randomUUID:()=> 'smoke-uuid'});
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
