// Prueba de pantallas EYR, sin servidor ni datos de usuarios.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const code=fs.readFileSync('app.js','utf8').replace(/\}\)\(\);\s*$/,
  'window.__SMOKE={db,render,clients,clientCard,clientHistory,clientEquipments,visitModal,whatsappNumber};})();');
assert(code.includes('window.__SMOKE='),'No se pudo cargar la app para prueba');
const nodes={'#view':{innerHTML:''},'#modal-root':{innerHTML:''},'#toast':{textContent:'',classList:{add(){},remove(){}}}};
const window={addEventListener(){},EYRAndroid:null,EYR_CATALOG_BASE:{models:[]}};
const document={querySelector:q=>nodes[q]||null,querySelectorAll:()=>[],addEventListener(){}};
const navigator={userAgent:'EYR-TEST'};
const location={protocol:'file:'};
const localStorage={getItem:()=>null,setItem(){}};
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
