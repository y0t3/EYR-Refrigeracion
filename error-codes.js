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
const scoped=[
  {
    "brand": "Surrey",
    "code": "E1",
    "family": "Portátil 551JPH0901",
    "models": [
      "551JPH0901",
      "551JPH09"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/551JPH09-01U.pdf",
    "title": "Sensor de temperatura ambiente",
    "description": "El manual indica una anomalía del sensor de temperatura de la habitación.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E2",
    "family": "Portátil 551JPH0901",
    "models": [
      "551JPH0901",
      "551JPH09"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/551JPH09-01U.pdf",
    "title": "Sensor del evaporador",
    "description": "El manual indica un problema en el sensor de temperatura del evaporador.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E4",
    "family": "Portátil 551JPH0901",
    "models": [
      "551JPH0901",
      "551JPH09"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/551JPH09-01U.pdf",
    "title": "Comunicación del panel",
    "description": "El manual indica una falla de comunicación con el panel de visualización.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "P1",
    "family": "Portátil 551JPH0901",
    "models": [
      "551JPH0901",
      "551JPH09"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/551JPH09-01U.pdf",
    "title": "Bandeja inferior llena",
    "description": "La protección indica acumulación de agua en la bandeja inferior.",
    "check": "Comprobar nivel de agua y drenaje según el manual del equipo. Si la protección persiste, consultar servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E1",
    "family": "Portátil 551IDQ1201F",
    "models": [
      "551IDQ1201F",
      "551IDQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IDQ1201F-01IURM.pdf",
    "title": "Sensor de temperatura ambiente",
    "description": "Error del sensor de temperatura de la habitación.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E2",
    "family": "Portátil 551IDQ1201F",
    "models": [
      "551IDQ1201F",
      "551IDQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IDQ1201F-01IURM.pdf",
    "title": "Sensor del evaporador",
    "description": "Error del sensor de temperatura del evaporador.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E3",
    "family": "Portátil 551IDQ1201F",
    "models": [
      "551IDQ1201F",
      "551IDQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IDQ1201F-01IURM.pdf",
    "title": "Sensor del condensador",
    "description": "Error del sensor de temperatura del condensador.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E4",
    "family": "Portátil 551IDQ1201F",
    "models": [
      "551IDQ1201F",
      "551IDQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IDQ1201F-01IURM.pdf",
    "title": "Comunicación del display",
    "description": "Error de comunicación del panel de visualización.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "P1",
    "family": "Portátil 551IDQ1201F",
    "models": [
      "551IDQ1201F",
      "551IDQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IDQ1201F-01IURM.pdf",
    "title": "Bandeja inferior llena",
    "description": "El manual indica protección por depósito de agua lleno.",
    "check": "Comprobar nivel de agua y drenaje según el manual del equipo. Si la protección persiste, consultar servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E1",
    "family": "Portátil 551IPQ12",
    "models": [
      "551IPQ12",
      "551IPQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IPQ12-01IM.pdf",
    "title": "Sensor de temperatura ambiente",
    "description": "Error del sensor de temperatura de la habitación.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E2",
    "family": "Portátil 551IPQ12",
    "models": [
      "551IPQ12",
      "551IPQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IPQ12-01IM.pdf",
    "title": "Sensor del evaporador",
    "description": "Error del sensor de temperatura del evaporador.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E3",
    "family": "Portátil 551IPQ12",
    "models": [
      "551IPQ12",
      "551IPQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IPQ12-01IM.pdf",
    "title": "Sensor del condensador",
    "description": "Error del sensor de temperatura del condensador.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "E4",
    "family": "Portátil 551IPQ12",
    "models": [
      "551IPQ12",
      "551IPQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IPQ12-01IM.pdf",
    "title": "Comunicación del panel",
    "description": "Error de comunicación del panel de visualización.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "P1",
    "family": "Portátil 551IPQ12",
    "models": [
      "551IPQ12",
      "551IPQ1201"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Uno_551IPQ12-01IM.pdf",
    "title": "Bandeja inferior llena",
    "description": "Protección por bandeja inferior llena.",
    "check": "Comprobar nivel de agua y drenaje según el manual del equipo. Si la protección persiste, consultar servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "EH60",
    "family": "Portátil R32 551PXQ12N81F",
    "models": [
      "551PXQ12N81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Portatil_551PXQ12N81F.pdf",
    "title": "Sensor de ambiente",
    "description": "El equipo indica una anomalía del sensor de temperatura ambiente.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "EH61",
    "family": "Portátil R32 551PXQ12N81F",
    "models": [
      "551PXQ12N81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Portatil_551PXQ12N81F.pdf",
    "title": "Sensor del evaporador",
    "description": "El equipo indica una anomalía del sensor de temperatura del evaporador.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "EC52",
    "family": "Portátil R32 551PXQ12N81F",
    "models": [
      "551PXQ12N81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Portatil_551PXQ12N81F.pdf",
    "title": "Sensor del condensador",
    "description": "El manual relaciona este código con el sensor del condensador (si aplica al ejemplar).",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "EH0B",
    "family": "Portátil R32 551PXQ12N81F",
    "models": [
      "551PXQ12N81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Portatil_551PXQ12N81F.pdf",
    "title": "Comunicación del panel",
    "description": "Error de comunicación con el panel de visualización.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "ELOC",
    "family": "Portátil R32 551PXQ12N81F",
    "models": [
      "551PXQ12N81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Portatil_551PXQ12N81F.pdf",
    "title": "Detección de pérdida de refrigerante",
    "description": "El equipo informa una falla relacionada con la detección de fugas (según versión).",
    "check": "No asumir fuga confirmada por un solo aviso; aplicar procedimiento del fabricante y herramientas apropiadas.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "P1",
    "family": "Portátil R32 551PXQ12N81F",
    "models": [
      "551PXQ12N81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Portatil_551PXQ12N81F.pdf",
    "title": "Bandeja inferior llena",
    "description": "La bandeja inferior acumuló agua; se activa la protección.",
    "check": "Comprobar nivel de agua y drenaje según el manual del equipo. Si la protección persiste, consultar servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "DF",
    "family": "Split inverter R32 553NIQ serie F",
    "models": [
      "553NIQ09GN81F",
      "553NIQ12KN81F",
      "553NIQ18GN81F",
      "553NIQ22GN81F",
      "619NIQ09GN81F",
      "619NIQ12KN81F",
      "619NIQ18GN81F",
      "619NIQ22GN81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Split_Inverter_R-32_MIAGSU01.pdf",
    "title": "Descongelamiento",
    "description": "Se está ejecutando el ciclo de descongelamiento del equipo.",
    "check": "Es una indicación de funcionamiento; esperar la finalización normal.",
    "kind": "aviso",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "FP",
    "family": "Split inverter R32 553NIQ serie F",
    "models": [
      "553NIQ09GN81F",
      "553NIQ12KN81F",
      "553NIQ18GN81F",
      "553NIQ22GN81F",
      "619NIQ09GN81F",
      "619NIQ12KN81F",
      "619NIQ18GN81F",
      "619NIQ22GN81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Split_Inverter_R-32_MIAGSU01.pdf",
    "title": "Calefacción de 8 °C",
    "description": "Se encuentra activada la función de mantenimiento de temperatura cercana a 8 °C.",
    "check": "Revisar la configuración del control y el manual específico.",
    "kind": "aviso",
    "scope": "documented-series"
  },
  {
    "brand": "Surrey",
    "code": "CL",
    "family": "Split inverter R32 553NIQ serie F",
    "models": [
      "553NIQ09GN81F",
      "553NIQ12KN81F",
      "553NIQ18GN81F",
      "553NIQ22GN81F",
      "619NIQ09GN81F",
      "619NIQ12KN81F",
      "619NIQ18GN81F",
      "619NIQ22GN81F"
    ],
    "source": "https://www.surrey.com.ar/productos/manuales/Manual_Split_Inverter_R-32_MIAGSU01.pdf",
    "title": "Autolimpieza",
    "description": "El display puede mostrar autolimpieza en algunas variantes compatibles de la línea.",
    "check": "Esperar finalización y verificar que la función esté disponible en este modelo.",
    "kind": "aviso",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E1",
    "family": "Portátil BP30CN",
    "models": [
      "BP30CN"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/01/68b005234-man-uso-portatil-comp-bgh-bp30cn-merged-2-manuales-en-1-M4Q.pdf",
    "title": "Sensor de ambiente",
    "description": "Anomalía del sensor de temperatura ambiente; posibles conexiones, sensor o placa.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E2",
    "family": "Portátil BP30CN",
    "models": [
      "BP30CN"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/01/68b005234-man-uso-portatil-comp-bgh-bp30cn-merged-2-manuales-en-1-M4Q.pdf",
    "title": "Sensor del evaporador",
    "description": "Anomalía del sensor de caño evaporador; posibles conexiones, sensor o placa.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E3",
    "family": "Portátil BP30CN",
    "models": [
      "BP30CN"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/01/68b005234-man-uso-portatil-comp-bgh-bp30cn-merged-2-manuales-en-1-M4Q.pdf",
    "title": "Sensor del condensador",
    "description": "Anomalía del sensor de caño condensador; posibles conexiones, sensor o placa.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "EA",
    "family": "Portátil BP30CN",
    "models": [
      "BP30CN"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/01/68b005234-man-uso-portatil-comp-bgh-bp30cn-merged-2-manuales-en-1-M4Q.pdf",
    "title": "Comunicación display-placa",
    "description": "Posible falla del cable, conectores o circuito entre display y placa principal.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E5",
    "family": "Portátil BP30CN",
    "models": [
      "BP30CN"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/01/68b005234-man-uso-portatil-comp-bgh-bp30cn-merged-2-manuales-en-1-M4Q.pdf",
    "title": "Bandeja de agua llena",
    "description": "La bandeja de condensados está llena y el equipo pide drenaje.",
    "check": "Comprobar nivel de agua y drenaje según el manual del equipo. Si la protección persiste, consultar servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E1",
    "family": "Portátil BP35WCAR",
    "models": [
      "BP35WCAR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-portatil-Modelo-BP35WCAR.pdf",
    "title": "Sensor de ambiente",
    "description": "Anomalía del sensor de temperatura ambiente.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E2",
    "family": "Portátil BP35WCAR",
    "models": [
      "BP35WCAR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-portatil-Modelo-BP35WCAR.pdf",
    "title": "Sensor del evaporador",
    "description": "Anomalía del sensor de caño evaporador.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E3",
    "family": "Portátil BP35WCAR",
    "models": [
      "BP35WCAR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-portatil-Modelo-BP35WCAR.pdf",
    "title": "Sensor del condensador",
    "description": "Anomalía del sensor de caño condensador.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E4",
    "family": "Portátil BP35WCAR",
    "models": [
      "BP35WCAR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-portatil-Modelo-BP35WCAR.pdf",
    "title": "Comunicación display-placa",
    "description": "Posible anomalía en el enlace entre el display y la placa principal.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "P1",
    "family": "Portátil BP35WCAR",
    "models": [
      "BP35WCAR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-portatil-Modelo-BP35WCAR.pdf",
    "title": "Bandeja de agua llena",
    "description": "El equipo señala la necesidad de vaciar el depósito de condensados.",
    "check": "Comprobar nivel de agua y drenaje según el manual del equipo. Si la protección persiste, consultar servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E1",
    "family": "Split BS on/off (WFCR/WCCR/CP)",
    "models": [
      "BS26WFCR",
      "BS26WCCR",
      "BS35WFCR",
      "BS35WCCR",
      "BS53WFCR",
      "BS45CP",
      "BS55CP"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-Modelos-BS26WFCRBS26WCCRBS35WFCRBS35WCCRBS53WFCRBS45CPBS55CP.pdf",
    "title": "EEPROM de placa interior",
    "description": "El equipo informa una anomalía de memoria EEPROM de la placa interior.",
    "check": "Verificar alimentación, conectores y placa según procedimiento del fabricante; no reemplazar componentes por el código solamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E2",
    "family": "Split BS on/off (WFCR/WCCR/CP)",
    "models": [
      "BS26WFCR",
      "BS26WCCR",
      "BS35WFCR",
      "BS35WCCR",
      "BS53WFCR",
      "BS45CP",
      "BS55CP"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-Modelos-BS26WFCRBS26WCCRBS35WFCRBS35WCCRBS53WFCRBS45CPBS55CP.pdf",
    "title": "Detección de cruce por cero",
    "description": "El microcontrolador de la placa no detecta correctamente el cruce por cero de la señal.",
    "check": "Verificar alimentación, conectores y placa según procedimiento del fabricante; no reemplazar componentes por el código solamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E3",
    "family": "Split BS on/off (WFCR/WCCR/CP)",
    "models": [
      "BS26WFCR",
      "BS26WCCR",
      "BS35WFCR",
      "BS35WCCR",
      "BS53WFCR",
      "BS45CP",
      "BS55CP"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-Modelos-BS26WFCRBS26WCCRBS35WFCRBS35WCCRBS53WFCRBS45CPBS55CP.pdf",
    "title": "Ventilador interior",
    "description": "El ventilador interior no está trabajando correctamente.",
    "check": "Comprobar funcionamiento de ventilador, motor y conexiones con procedimiento seguro.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E5",
    "family": "Split BS on/off (WFCR/WCCR/CP)",
    "models": [
      "BS26WFCR",
      "BS26WCCR",
      "BS35WFCR",
      "BS35WCCR",
      "BS53WFCR",
      "BS45CP",
      "BS55CP"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-Modelos-BS26WFCRBS26WCCRBS35WFCRBS35WCCRBS53WFCRBS45CPBS55CP.pdf",
    "title": "Sensor de ambiente",
    "description": "Sensor de temperatura ambiente abierto o en cortocircuito.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E6",
    "family": "Split BS on/off (WFCR/WCCR/CP)",
    "models": [
      "BS26WFCR",
      "BS26WCCR",
      "BS35WFCR",
      "BS35WCCR",
      "BS53WFCR",
      "BS45CP",
      "BS55CP"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-Modelos-BS26WFCRBS26WCCRBS35WFCRBS35WCCRBS53WFCRBS45CPBS55CP.pdf",
    "title": "Sensor de caño interior",
    "description": "Sensor de caño abierto o en cortocircuito.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "EC",
    "family": "Split BS on/off (WFCR/WCCR/CP)",
    "models": [
      "BS26WFCR",
      "BS26WCCR",
      "BS35WFCR",
      "BS35WCCR",
      "BS53WFCR",
      "BS45CP",
      "BS55CP"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-Modelos-BS26WFCRBS26WCCRBS35WFCRBS35WCCRBS53WFCRBS45CPBS55CP.pdf",
    "title": "Detección de pérdida de refrigerante",
    "description": "Se activó el aviso de posible fuga de refrigerante.",
    "check": "Revisar estado de instalación y el procedimiento diagnóstico; el código por sí solo no demuestra una fuga.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E7",
    "family": "Split BS55CP (códigos adicionales)",
    "models": [
      "BS55CP"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-Modelos-BS26WFCRBS26WCCRBS35WFCRBS35WCCRBS53WFCRBS45CPBS55CP.pdf",
    "title": "Sensor de caño de unidad exterior",
    "description": "Sensor de caño de la unidad exterior abierto o en cortocircuito.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E9",
    "family": "Split BS55CP (códigos adicionales)",
    "models": [
      "BS55CP"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/07/Manual-AA-Modelos-BS26WFCRBS26WCCRBS35WFCRBS35WCCRBS53WFCRBS45CPBS55CP.pdf",
    "title": "Comunicación entre unidades",
    "description": "El manual indica pérdida de comunicación entre unidades.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E0",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Placa electrónica",
    "description": "Falla electrónica informada por la placa interior.",
    "check": "Verificar alimentación, conectores y placa según procedimiento del fabricante; no reemplazar componentes por el código solamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E1",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Comunicación interior/exterior",
    "description": "Falla de comunicación entre la unidad interior y exterior.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E2",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Cruce por cero de placa",
    "description": "El microcontrolador no detecta el paso por cero de la señal.",
    "check": "Verificar alimentación, conectores y placa según procedimiento del fabricante; no reemplazar componentes por el código solamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E3",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Velocidad del ventilador interior",
    "description": "La velocidad del ventilador interior queda fuera del rango esperado.",
    "check": "Comprobar conjunto ventilador, conectores y control del motor según manual.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E4",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Sensor de ambiente",
    "description": "Sensor de temperatura ambiente abierto o en cortocircuito.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "E5",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Sensor de caño interior",
    "description": "Sensor de caño interior abierto o en cortocircuito.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "EC",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Aviso relacionado con refrigerante",
    "description": "El sistema indica una anomalía en la supervisión de pérdida de refrigerante.",
    "check": "No concluir falta de refrigerante sin diagnóstico por personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "F0",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Protección por sobrecorriente",
    "description": "El sistema activó una protección relacionada con exceso de corriente.",
    "check": "Revisión eléctrica y del compresor por personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "F1",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Sensor de ambiente exterior",
    "description": "Sensor de temperatura ambiente exterior abierto o en cortocircuito.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "F2",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Sensor de caño condensador",
    "description": "Sensor de temperatura del condensador abierto o en cortocircuito.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "F3",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Sensor de descarga del compresor",
    "description": "Sensor de temperatura de descarga abierto o en cortocircuito.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "F4",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Placa electrónica exterior",
    "description": "Anomalía electrónica indicada en el módulo exterior.",
    "check": "Verificar alimentación, conectores y placa según procedimiento del fabricante; no reemplazar componentes por el código solamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "F5",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Ventilador exterior",
    "description": "La velocidad del ventilador exterior está fuera del rango normal.",
    "check": "Revisión del motor, ventilador y controles por servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "P0",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Protección IPM / IGBT",
    "description": "Protección del módulo electrónico de potencia relacionada con corriente elevada.",
    "check": "Diagnóstico técnico de módulo, alimentación y compresor; no rearmar repetidamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "P1",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Protección por tensión anormal",
    "description": "Protección por sobretensión o baja tensión.",
    "check": "Comprobar suministro eléctrico y conexiones con instrumentos adecuados.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "P2",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Protección térmica IPM",
    "description": "El módulo de potencia alcanzó un umbral de temperatura de protección.",
    "check": "Revisión del módulo electrónico y su refrigeración por servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "BGH",
    "code": "P4",
    "family": "Split inverter BSI35WCCR / BSI53WCCR",
    "models": [
      "BSI35WCCR",
      "BSI53WCCR"
    ],
    "source": "https://bgh.com.ar/wp-content/uploads/2020/10/manual-68B007053A-BGH-AB-ROS-INV.pdf",
    "title": "Accionamiento del compresor inverter",
    "description": "Se detectó una anomalía en el accionamiento del compresor inverter.",
    "check": "Revisar inverter, compresor y alimentación siguiendo procedimiento de servicio.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E0",
    "family": "Conducto 53NQHE018–072",
    "models": [
      "53NQHE018",
      "53NQHE024",
      "53NQHE030",
      "53NQHE036",
      "53NQHE048",
      "53NQHE060",
      "53NQHE072"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2018/06/53NQHE018-072-00MU-1.pdf",
    "title": "Memoria EEPROM",
    "description": "Mal funcionamiento de la memoria programable del control.",
    "check": "Verificar alimentación, conectores y placa según procedimiento del fabricante; no reemplazar componentes por el código solamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E3",
    "family": "Conducto 53NQHE018–072",
    "models": [
      "53NQHE018",
      "53NQHE024",
      "53NQHE030",
      "53NQHE036",
      "53NQHE048",
      "53NQHE060",
      "53NQHE072"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2018/06/53NQHE018-072-00MU-1.pdf",
    "title": "Ventilador interior",
    "description": "Problema en el funcionamiento del ventilador interior.",
    "check": "Verificar ventilador, motor y conexiones según manual.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E4",
    "family": "Conducto 53NQHE018–072",
    "models": [
      "53NQHE018",
      "53NQHE024",
      "53NQHE030",
      "53NQHE036",
      "53NQHE048",
      "53NQHE060",
      "53NQHE072"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2018/06/53NQHE018-072-00MU-1.pdf",
    "title": "Sensor de ambiente interior",
    "description": "Mal funcionamiento del sensor de temperatura de la unidad interior.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E5",
    "family": "Conducto 53NQHE018–072",
    "models": [
      "53NQHE018",
      "53NQHE024",
      "53NQHE030",
      "53NQHE036",
      "53NQHE048",
      "53NQHE060",
      "53NQHE072"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2018/06/53NQHE018-072-00MU-1.pdf",
    "title": "Sensor de evaporador",
    "description": "Anomalía del sensor de temperatura de la serpentina evaporadora.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "EC",
    "family": "Conducto 53NQHE018–072",
    "models": [
      "53NQHE018",
      "53NQHE024",
      "53NQHE030",
      "53NQHE036",
      "53NQHE048",
      "53NQHE060",
      "53NQHE072"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2018/06/53NQHE018-072-00MU-1.pdf",
    "title": "Detección de pérdida de refrigerante",
    "description": "El sistema señala error en el proceso de detección de pérdidas.",
    "check": "No asumir fuga confirmada sin pruebas de servicio.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "EE",
    "family": "Conducto 53NQHE018–072",
    "models": [
      "53NQHE018",
      "53NQHE024",
      "53NQHE030",
      "53NQHE036",
      "53NQHE048",
      "53NQHE060",
      "53NQHE072"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2018/06/53NQHE018-072-00MU-1.pdf",
    "title": "Alarma de nivel de agua",
    "description": "Se activó el aviso de nivel de agua.",
    "check": "Comprobar nivel de agua y drenaje según el manual del equipo. Si la protección persiste, consultar servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "F2",
    "family": "Conducto 53NQHE018–072",
    "models": [
      "53NQHE018",
      "53NQHE024",
      "53NQHE030",
      "53NQHE036",
      "53NQHE048",
      "53NQHE060",
      "53NQHE072"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2018/06/53NQHE018-072-00MU-1.pdf",
    "title": "Sensor de unidad exterior",
    "description": "Error registrado por el sensor de la unidad exterior.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "FA",
    "family": "Conducto 53NQHE018–072",
    "models": [
      "53NQHE018",
      "53NQHE024",
      "53NQHE030",
      "53NQHE036",
      "53NQHE048",
      "53NQHE060",
      "53NQHE072"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2018/06/53NQHE018-072-00MU-1.pdf",
    "title": "Comunicación interior",
    "description": "La unidad indica un problema de comunicación interna.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E1",
    "family": "Compacto CWC09/12/18/22RA",
    "models": [
      "CWC09RA",
      "CWC12RA",
      "CWC18RA",
      "CWC22RA"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2012/10/CWC-RA-00-MUI.pdf",
    "title": "Validación de código",
    "description": "Falla de verificación o validación del código en el control.",
    "check": "Apagar/reiniciar conforme al manual; si se repite, servicio técnico.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E2",
    "family": "Compacto CWC09/12/18/22RA",
    "models": [
      "CWC09RA",
      "CWC12RA",
      "CWC18RA",
      "CWC22RA"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2012/10/CWC-RA-00-MUI.pdf",
    "title": "Datos almacenados",
    "description": "Se detectó una pérdida o alteración de datos almacenados en el control.",
    "check": "Verificar alimentación, conectores y placa según procedimiento del fabricante; no reemplazar componentes por el código solamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E3",
    "family": "Compacto CWC09/12/18/22RA",
    "models": [
      "CWC09RA",
      "CWC12RA",
      "CWC18RA",
      "CWC22RA"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2012/10/CWC-RA-00-MUI.pdf",
    "title": "Memoria E2RAM",
    "description": "Pérdida irrecuperable de datos de memoria E2RAM.",
    "check": "Verificar alimentación, conectores y placa según procedimiento del fabricante; no reemplazar componentes por el código solamente.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E4",
    "family": "Compacto CWC09/12/18/22RA",
    "models": [
      "CWC09RA",
      "CWC12RA",
      "CWC18RA",
      "CWC22RA"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2012/10/CWC-RA-00-MUI.pdf",
    "title": "Sensor de temperatura ambiente",
    "description": "Problema del sensor de temperatura ambiente.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "E5",
    "family": "Compacto CWC09/12/18/22RA",
    "models": [
      "CWC09RA",
      "CWC12RA",
      "CWC18RA",
      "CWC22RA"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2012/10/CWC-RA-00-MUI.pdf",
    "title": "Sensor de serpentina",
    "description": "Problema del sensor de temperatura de serpentina.",
    "check": "Revisar sensor, ficha y cableado según el manual de este modelo; la verificación eléctrica corresponde a personal capacitado.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Carrier",
    "code": "FL",
    "family": "Compacto CWC09/12/18/22RA",
    "models": [
      "CWC09RA",
      "CWC12RA",
      "CWC18RA",
      "CWC22RA"
    ],
    "source": "https://www.carrier.com.ar/wp-content/uploads/2012/10/CWC-RA-00-MUI.pdf",
    "title": "Recordatorio de filtro",
    "description": "Aviso de verificación del estado del filtro.",
    "check": "Limpiar el filtro conforme al manual y restablecer el aviso según instrucciones.",
    "kind": "aviso",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "60",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Comunicación central-exterior (equipos activos)",
    "description": "La central detecta pérdida de comunicación de red cuando hay unidades interiores encendidas.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "61",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Comunicación interior-central (equipos activos)",
    "description": "La central detecta comunicación interrumpida con la unidad interior activa.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "63",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Configuración H-LINK incompatible",
    "description": "La central indica combinación inconsistente de controladores.",
    "check": "Verificar especificación y configuración H-LINK en los controles compatibles.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "64",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Comunicación central-exterior (equipos parados)",
    "description": "La central informa pérdida de comunicación cuando no hay interiores encendidos.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "65",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Comunicación interior-central (equipos parados)",
    "description": "Se interrumpe la comunicación de la unidad interior parada con la central.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "S10",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Comunicación PIO1",
    "description": "El panel central no puede comunicarse con el módulo PIO1.",
    "check": "Revisar alimentación y conexiones de red de control siguiendo el manual.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "S11",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Comunicación PIO2",
    "description": "El panel central no puede comunicarse con el módulo PIO2.",
    "check": "Revisar alimentación y conexiones de red de control siguiendo el manual.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "S20",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Capacidad de memoria interna",
    "description": "La central reporta almacenamiento interno insuficiente.",
    "check": "Consultar fabricante o servicio de mantenimiento del controlador.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "S21",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Escritura de datos",
    "description": "Anomalía al escribir datos, posiblemente por memoria o soporte.",
    "check": "Verificar soporte de almacenamiento y consultar al servicio si se repite.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "S22",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Lectura de datos",
    "description": "Error de carga o lectura de información.",
    "check": "Revisar soporte y consultar al servicio si se repite.",
    "kind": "error",
    "scope": "documented-series"
  },
  {
    "brand": "Hitachi",
    "code": "S23",
    "family": "Sistema central PSC-A128EX",
    "models": [
      "PSC-A128EX",
      "PSCA128EX"
    ],
    "source": "https://documentation.hitachiaircon.com/fr/fr/controles/psc-a128ex/download/R0000026321_JCH",
    "title": "Comunicación del adaptador",
    "description": "No se comunica correctamente la central con un adaptador de expansión.",
    "check": "Comprobar conexión, cableado y módulos conforme al esquema eléctrico del modelo, con la alimentación desconectada.",
    "kind": "error",
    "scope": "documented-series"
  }
];
entries.push(...scoped);
const normalizeBrand=b=>brands.find(x=>x.toLowerCase()===String(b||'').trim().toLowerCase())||'';
function normalizeCode(v){
 const s=String(v||'').toUpperCase().trim().replace(/[\s._-]/g,'');
 if(!/^[A-Z0-9]{2,12}$/.test(s))return '';
 if(/^CH\d$/.test(s))return 'CH0'+s.slice(2);
 return s;
}
function exactModel(entry,model){
 if(!entry.models||!entry.models.length)return false;
 const m=String(model||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 return !!m&&entry.models.some(x=>String(x).toUpperCase().replace(/[^A-Z0-9]/g,'')===m);
}
function candidates(brand,code){
 const b=normalizeBrand(brand),c=normalizeCode(code);
 if(!b||!c)return [];
 return entries.filter(x=>x.brand===b&&x.code===c);
}
function lookup(brand,code,model){
 const b=normalizeBrand(brand),c=normalizeCode(code),m=String(model||'').trim().slice(0,110);
 if(!b||!c)return null;
 const found=candidates(b,c);
 const scopedExact=found.find(x=>x.scope==='documented-series'&&exactModel(x,m));
 if(scopedExact)return {...scopedExact,model:m,validation:'manual-modelo-exacto',verifiedForExactModel:true};
 const general=found.find(x=>!x.scope||x.scope==='guia-general-de-marca');
 if(general)return {...general,model:m,validation:'guia-general-de-marca',verifiedForExactModel:false};
 return null;
}
function matches(code){const c=normalizeCode(code);return c?entries.filter(x=>x.code===c):[];}
function coverage(){
 const grouped={};
 for(const brand of brands)grouped[brand]={brand,records:entries.filter(x=>x.brand===brand).length,
  models:[...new Set(entries.filter(x=>x.brand===brand&&x.family).flatMap(x=>x.models||[]))].length,
  modelsList:[...new Set(entries.filter(x=>x.brand===brand&&x.family).flatMap(x=>x.models||[]))].sort(),
  series:[...new Set(entries.filter(x=>x.brand===brand&&x.family).map(x=>x.family))]};
 return grouped;
}
window.EYRErrorLibrary={brands,entries,SOURCES,lookup,matches,candidates,coverage,exactModel,normalizeBrand,normalizeCode};
})();