// Pruebas de regresión de PDFs con precios editados usando puntos de miles.
// El bug histórico mostraba $250 en la fila pero $250.000 en el total.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const window={EYR_LOGO_JPEG_BASE64:Buffer.from('logo ficticio de prueba').toString('base64')};
new Function('window','atob','Blob',fs.readFileSync('pdf.js','utf8'))(window,atob,Blob);
new Function('window','atob','Blob',fs.readFileSync('remitos-pdf.js','utf8'))(window,atob,Blob);
const company={business:'EYR Refrigeración',tax:'Monotributista',cuit:'CUIT',phone:'12345678',address:'Buenos Aires'};
const base={number:2,date:'2026-11-13',client:'Cliente de prueba',tasks:['Instalación'],validity:15,
 advance:0,conditions:'Condiciones técnicas'};
async function content(blob){assert.equal(blob.type,'application/pdf');return Buffer.from(await blob.arrayBuffer()).toString('latin1')}
(async()=>{
 const item={description:'Instalación',category:'manoobra',qty:1,unit:'250.000'};
 const total=250000;
 const detailed=await content(window.EYRcreatePDF({...base,mode:'detallado',items:[item]},company,total));
 assert(detailed.includes('250.000'),'PDF detallado no contiene $250.000');
 assert((detailed.match(/250\.000/g)||[]).length>=3,'PDF: unidad, subtotal y total deben tener $250.000');
 const numeric=await content(window.EYRcreatePDF({...base,mode:'detallado',items:[{...item,unit:250000}]},company,total));
 assert((numeric.match(/250\.000/g)||[]).length>=3,'PDF de datos guardados');
 const grouped=await content(window.EYRcreatePDF({...base,mode:'rubros',items:[item]},company,total));
 assert((grouped.match(/250\.000/g)||[]).length>=2,'PDF por rubros');
 const remito={number:3,date:'2026-11-13',client:'Cliente de prueba',items:[{description:'Instalación',qty:1,unit:'250.000'}]};
 const remitoPDF=await content(window.EYRcreateRemitoPDF(remito,company));
 assert(remitoPDF.includes('250.000'),'Remito PDF faltan miles');
 assert((remitoPDF.match(/250\.000/g)||[]).length>=4,'Remito original + duplicado: filas y totales');
 const remitoSaved=await content(window.EYRcreateRemitoPDF({...remito,items:[{...remito.items[0],unit:250000}]},company));
 assert((remitoSaved.match(/250\.000/g)||[]).length>=4,'Remito PDF de datos numéricos');
 console.log('OK: PDFs y copias de remitos conservan $250.000 en detalle, subtotal y total');
})().catch(e=>{console.error(e);process.exitCode=1});
