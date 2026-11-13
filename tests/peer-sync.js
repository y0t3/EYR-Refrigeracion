// EYR v3.0 · pruebas de mezcla segura sin conexión, borrados y formatos monetarios.
const assert=require('node:assert/strict'),fs=require('node:fs');
const storage=new Map();
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const window={},document={getElementById(){return null}};
const crypto={randomUUID:()=> 'b0d7adfe-53b8-4f74-a913-c57437e26b11'};
new Function('window','document','localStorage','crypto',fs.readFileSync('peer-sync.js','utf8'))(window,document,localStorage,crypto);
const sync=window.EYRPeerSync;
assert(sync&&sync.myId);
const local={clients:[{id:'c1',name:'Cliente 1',updatedAt:'2026-11-10T10:00:00Z'}],
 visits:[{id:'v1',clientId:'c1',client:'Cliente 1',description:'Control',date:'2026-11-11',updatedAt:'2026-11-10T12:00:00Z'}],
 equipment:[],quotes:[{id:'q1',number:1,client:'Cliente 1',status:'borrador'}],remitos:[],serviceTemplates:[],
 reports:[{id:'r1',visitId:'v1',notes:'Informe local',photos:[{id:'foto_123',kind:'antes'}],updatedAt:'2026-11-10T10:00:00Z'}],
 settings:{business:'EYR',lastNumber:1,lastRemitoNumber:0},syncDeleted:{}};
const hooks={getDB:()=>local,modal(){},toast(){},closeModal(){},hasEditing:()=>false,apply(){}};
sync.init(hooks);
const remote={schema:'eyr-nearby-v1',device:'other-phone',sentAt:'2026-11-13T12:00:00Z',
 records:{clients:[{id:'c1',name:'Cliente actualizado',updatedAt:'2026-11-11T10:00:00Z'},
  {id:'c2',name:'Cliente 2',updatedAt:'2026-11-13T11:00:00Z'}],
  visits:[{id:'v2',clientId:'c2',client:'Cliente 2',description:'Instalación',date:'2026-11-15',updatedAt:'2026-11-13T11:00:00Z'}],
  equipment:[],quotes:[{id:'q2',number:1,client:'Cliente 2',status:'enviado'}],remitos:[],serviceTemplates:[],
  reports:[{id:'r1',visitId:'v1',notes:'Observaciones desde otro teléfono',photos:[{id:'fake_remote_photo'}],updatedAt:'2026-11-12T10:00:00Z'}]},
 syncDeleted:{},lastNumbers:{quote:1,remito:0}};
const m=sync.merge(local,remote);
assert.equal(m.data.clients.length,2);
assert.equal(m.data.clients.find(x=>x.id==='c1').name,'Cliente actualizado');
assert.equal(m.data.visits.length,2);
assert(m.data.visits.some(v=>v.id==='v2'));
assert.equal(m.data.reports[0].notes,'Observaciones desde otro teléfono');
assert.deepEqual(m.data.reports[0].photos,[{id:'foto_123',kind:'antes'}]);
assert.equal(m.stats.numberConflicts.length,1,'Debe avisar colisión de números presupuestarios');
assert(m.stats.conflicts.some(x=>x.type==='clients'),'Debe informar edición concurrente');
assert(!m.data.settings.address,'No debe sobrescribir configuración local');
const snap=sync.snapshot(local);
assert.equal(snap.schema,'eyr-nearby-v1');
assert.deepEqual(snap.records.reports[0].photos,[],'Fotos nunca salen del teléfono');
assert(!JSON.stringify(snap).includes('foto_123'));
const old=db=>structuredClone(db);
const a=old(local);
sync.baselineNow(a);
a.visits.push({id:'v3',client:'Nuevo cliente',description:'Nuevo turno',date:'2026-11-16'});
a.clients=a.clients.filter(c=>c.id!=='c1');
sync.touch(a,'2026-11-13T14:10:00Z');
assert(a.visits.find(v=>v.id==='v3').updatedAt,'Alta sin fecha');
assert(a.syncDeleted.clients.c1,'Borrado no replicable');
const other=old(local);
other.clients[0].updatedAt='2026-11-10T10:00:00Z';
const deleteSnap=sync.snapshot(a);deleteSnap.device='remote-peer';
const after=sync.merge(other,deleteSnap);
assert(!after.data.clients.some(x=>x.id==='c1'),'El borrado debería llegar al otro teléfono');
assert(after.data.visits.some(x=>x.id==='v3'),'La nueva visita debería llegar al otro teléfono');
console.log('OK: unión bidireccional, altas, cambios, borrados, fotos locales y conflictos de numeración');
