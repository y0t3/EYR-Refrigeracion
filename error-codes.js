/* EYR v2.7 · Biblioteca de referencia de errores con fuentes oficiales.
   Todas son referencias GENERALES por marca; no implican compatibilidad verificada con el modelo exacto.
   No subir fotos ni inferir reparaciones a partir del OCR. */
(function(){
'use strict';
const brands=['Samsung','LG','Surrey','BGH','Hitachi','Philco','Carrier'];
const SOURCES={
  LG_GENERAL:'https://www.lg.com/ar/soporte/ayuda-producto/CT32005513-20155047720009',
  LG_SUPPORT:'https://www.lg.com/ar/soporte/ayuda-producto/CT20084080-20155402835359',
  SAMSUNG:'https://www.samsung.com/ar/support/home-appliances/check-out-the-displayed-error-codes-on-the-indoor-unit-air-conditioner/',
  SAMSUNG_NEW:'https://www.samsung.com/ar/support/home-appliances/error-codes-on-your-samsung-indoor-air-conditioner/'
};
const entries=[
  {
    "brand": "LG",
    "code": "CH05",
    "title": "Comunicación entre unidades",
    "description": "La unidad interior y la exterior no se están comunicando correctamente.",
    "check": "Verificar alimentación y conexiones según el manual específico; ante persistencia, revisión de servicio técnico.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT20084080-20155402835359"
  },
  {
    "brand": "LG",
    "code": "CH53",
    "title": "Comunicación entre unidades",
    "description": "Se detectó un problema de comunicación entre la unidad interior y la exterior.",
    "check": "Verificar alimentación y conexiones de comunicación según el modelo; solicitar revisión si persiste.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT20084080-20155402835359"
  },
  {
    "brand": "LG",
    "code": "CH10",
    "title": "Ventilador interior",
    "description": "El sistema informa un problema relacionado con el ventilador de la unidad interior.",
    "check": "Revisar si existe obstrucción visible; las comprobaciones eléctricas corresponden a personal calificado.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT32005513-20155047720009"
  },
  {
    "brand": "LG",
    "code": "CH67",
    "title": "Ventilador exterior",
    "description": "El sistema informa un problema relacionado con el ventilador de la unidad exterior.",
    "check": "Revisar obstrucciones visibles con el equipo seguro; requiere diagnóstico técnico si persiste.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT32005513-20155047720009"
  },
  {
    "brand": "LG",
    "code": "CH66",
    "title": "Comunicación o conexión de tuberías",
    "description": "Puede existir una anomalía en la comunicación o en la conexión de tuberías entre unidades.",
    "check": "Verificar instalación y conexiones según el manual del modelo. No intervenir el circuito sin procedimientos adecuados.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT32005513-20155047720009"
  },
  {
    "brand": "LG",
    "code": "CH93",
    "title": "Comunicación o alimentación exterior",
    "description": "Se informa una comunicación inestable entre unidades; en determinados modelos también puede indicar falta de alimentación exterior.",
    "check": "Comprobar las condiciones de alimentación externa y conexiones conforme al manual; si persiste, servicio técnico.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT32005513-20155047720009"
  },
  {
    "brand": "LG",
    "code": "CH07",
    "title": "Modo de operación incompatible",
    "description": "En algunos sistemas multisplit, diferentes unidades pueden estar solicitando modos incompatibles (frío/calor).",
    "check": "Comprobar la selección de modo en las unidades vinculadas y el manual del sistema.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT32005513-20155047720009"
  },
  {
    "brand": "LG",
    "code": "CH90",
    "title": "Comprobación de instalación",
    "description": "El equipo puede señalar una anomalía durante la prueba inicial de funcionamiento o instalación.",
    "check": "Consultar las conexiones de tuberías y el procedimiento de puesta en marcha específico del equipo.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT32005513-20155047720009"
  },
  {
    "brand": "LG",
    "code": "CH91",
    "title": "Comprobación de instalación",
    "description": "El equipo puede señalar una anomalía durante la prueba inicial de funcionamiento o instalación.",
    "check": "Consultar las conexiones de tuberías y el procedimiento de puesta en marcha específico del equipo.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT32005513-20155047720009"
  },
  {
    "brand": "LG",
    "code": "CH32",
    "title": "Protección del circuito / compresor",
    "description": "La guía de LG agrupa este código entre las incidencias relacionadas con refrigerante, compresor o protección del sistema exterior.",
    "check": "No asumir falta de gas sin medir y revisar el manual del modelo; diagnóstico profesional.",
    "kind": "error",
    "source": "https://www.lg.com/ar/soporte/ayuda-producto/CT20084080-20155402835359"
  },
  {
    "brand": "Samsung",
    "code": "CF",
    "title": "Aviso de limpieza del filtro",
    "description": "El equipo recuerda que corresponde limpiar o revisar el filtro de la unidad interior.",
    "check": "Limpiar o sustituir el filtro siguiendo el manual; restablecer el aviso según el modelo.",
    "kind": "aviso",
    "source": "https://www.samsung.com/ar/support/home-appliances/error-codes-on-your-samsung-indoor-air-conditioner/"
  },
  {
    "brand": "Samsung",
    "code": "CL",
    "title": "Limpieza automática activa",
    "description": "El equipo está ejecutando la función de autolimpieza; no necesariamente indica una avería.",
    "check": "Esperar a que finalice el proceso y comprobar el manual del modelo.",
    "kind": "aviso",
    "source": "https://www.samsung.com/ar/support/home-appliances/error-codes-on-your-samsung-indoor-air-conditioner/"
  },
  {
    "brand": "Samsung",
    "code": "DF",
    "title": "Descongelamiento automático",
    "description": "En modo calefacción, el equipo realiza el descongelamiento de la unidad exterior.",
    "check": "Es una función normal en ciertos modelos; consultar si se repite de modo anormal o no calienta.",
    "kind": "aviso",
    "source": "https://www.samsung.com/ar/support/home-appliances/check-out-the-displayed-error-codes-on-the-indoor-unit-air-conditioner/"
  },
  {
    "brand": "Samsung",
    "code": "E5",
    "title": "Sensor del intercambiador interior",
    "description": "El manual de soporte describe un sensor del intercambiador interior en circuito abierto o cortocircuito.",
    "check": "Revisión de sensor, conexiones y valores eléctricos por personal calificado según el modelo.",
    "kind": "error",
    "source": "https://www.samsung.com/ar/support/home-appliances/check-out-the-displayed-error-codes-on-the-indoor-unit-air-conditioner/"
  },
  {
    "brand": "Samsung",
    "code": "E6",
    "title": "Sensor del intercambiador exterior",
    "description": "El soporte informa un posible circuito abierto o cortocircuito del sensor del intercambiador exterior.",
    "check": "Verificar sensor y conexiones conforme al manual del modelo; revisión profesional.",
    "kind": "error",
    "source": "https://www.samsung.com/ar/support/home-appliances/check-out-the-displayed-error-codes-on-the-indoor-unit-air-conditioner/"
  },
  {
    "brand": "Samsung",
    "code": "E7",
    "title": "Sensor de temperatura de calefacción",
    "description": "Se informa una anomalía de circuito abierto o cortocircuito en el sensor de temperatura del calentador.",
    "check": "Revisión del sensor y circuito por servicio técnico según el modelo.",
    "kind": "error",
    "source": "https://www.samsung.com/ar/support/home-appliances/check-out-the-displayed-error-codes-on-the-indoor-unit-air-conditioner/"
  }
];
const normalizeBrand=b=>brands.find(x=>x.toLowerCase()===String(b||'').trim().toLowerCase())||'';
function normalizeCode(v){
 const s=String(v||'').toUpperCase().trim().replace(/[\s._-]/g,'');
 if(!/^[A-Z0-9]{2,12}$/.test(s))return '';
 if(/^CH\d$/.test(s))return 'CH0'+s.slice(2);
 return s;
}
function lookup(brand,code,model){
 const b=normalizeBrand(brand),c=normalizeCode(code);
 if(!b||!c)return null;
 const rec=entries.find(x=>x.brand===b&&x.code===(b==='Samsung'&&c==='CI'?'CL':c));
 if(!rec)return null;
 return {...rec,model:String(model||'').trim().slice(0,110),
   validation:'guia-general-de-marca',verifiedForExactModel:false};
}
function matches(code){
 const c=normalizeCode(code);return c?entries.filter(x=>x.code===c):[];
}
window.EYRErrorLibrary={brands,entries,SOURCES,lookup,matches,normalizeBrand,normalizeCode};
})();