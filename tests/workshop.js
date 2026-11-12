// Prueba ZIP completa con datos y fotos originales. Sin internet ni cliente real.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const window={};
new Function('window','TextEncoder','TextDecoder','Blob','DataView','Uint8Array','atob','btoa',
 fs.readFileSync('workshop-backup.js','utf8'))(window,TextEncoder,TextDecoder,Blob,DataView,Uint8Array,atob,btoa);
const z=window.EYRWorkshopBackup;assert(z,'Falta el motor de respaldos ZIP');
const bytes=new Uint8Array([0xff,0xd8,0xff,0xe0,0x00,0x10,0xff,0xd9]),str=Buffer.from(bytes).toString('base64');
const photoId='foto_test12345';
const db={clients:[{id:'1',name:'Prueba'}],visits:[{id:'v1'}],quotes:[],settings:{business:'EYR'},
 reports:[{visitId:'v1',photos:[{id:photoId,kind:'antes'}]}]};
(async()=>{
 const archive=z.exportZip(db,[{id:photoId,dataUrl:'data:image/jpeg;base64,'+str}]);
 assert.equal(archive.type,'application/zip');
 const restored=await z.importZip(archive);
 assert.equal(restored.db.clients[0].name,'Prueba');
 assert.equal(restored.photos.length,1);
 assert.equal(restored.photos[0].id,photoId);
 assert.equal(restored.photos[0].dataUrl,'data:image/jpeg;base64,'+str);
 console.log('OK: ZIP completo conserva clientes, informes y fotografías');
})().catch(e=>{console.error(e);process.exitCode=1;});
