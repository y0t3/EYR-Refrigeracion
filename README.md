# EYR Refrigeración · Gestión local

Aplicación web progresiva (PWA) para gestionar **clientes, visitas y presupuestos**, con identidad visual EYR y generación directa de PDF sin librerías ni servidores externos.

## Funciones de la versión 1.2 — Fuego & Hielo

- Agenda de visitas con fecha, hora, cliente, domicilio, descripción y estado.
- Fichero de clientes con CUIT/DNI, teléfono, domicilio y notas.
- Presupuestos numerados con tareas independientes y tres modalidades de importes: **precio global**, **por rubros** y **detalle por ítem**.
- Opciones de validez, anticipo porcentual, condiciones, exclusiones y observaciones.
- Vista previa del documento y **descarga de PDF** con logo EYR, datos comerciales, totales y paginación automática.
- Estados de seguimiento, duplicación de presupuestos e historial.
- Almacenamiento local en `localStorage`, con **exportación/importación de respaldo `.json`**.
- Uso sin conexión después de la primera visita mediante `service worker` (al instalar desde una URL HTTPS).
- App para PC y celular, sin Firebase, APIs, cuentas ni suscripciones.

## Diseño Fuego & Hielo y APK Android

- Interfaz oscura de alto contraste, con fuego y agua decorativos, banner de los dos técnicos y navegación luminosa. Las tarjetas y botones son funcionales: la imagen del mockup no reemplaza a la app.
- Ícono azul EYR para instalar en el celular; logo blanco EYR exclusivo para PDF.
- Se incluye proyecto Android nativo ligero (WebView con archivos locales bajo HTTPS virtual). El APK funciona sin servidor y mantiene datos localmente.
- **Compilación en GitHub Actions**: workflow `.github/workflows/android-apk.yml` produce el APK debug. En GitHub → **Actions** → **EYR · Compilar APK Android**, descargar el artefacto `EYR-Refrigeracion-APK` y extraer `app-debug.apk` para instalar.
- En Android 10+ el botón PDF guarda en **Descargas / EYR Refrigeracion**. Importación JSON habilitada con selector de archivos nativo.
- No hay sincronización: cada instalación usa un almacén distinto. Antes de cambiar de la PWA al APK, exportá el respaldo JSON e importalo en la APK.
- La versión debug es para pruebas personales; para distribuirla ampliamente conviene generar una versión release firmada.

## Ejecutar

### GitHub Pages

1. Abrir **Settings → Pages** del repositorio.
2. En **Build and deployment**, seleccionar **Deploy from a branch**.
3. Elegir `main` y `/ (root)`; guardar.
4. La URL esperada será `https://y0t3.github.io/EYR-Refrigeracion/` cuando GitHub confirme la publicación.
5. Abrir desde el celular y usar **Agregar a pantalla de inicio / Instalar**.

### En una computadora, de forma local

Se puede abrir `index.html` directamente para gestionar los datos y descargar PDF, siempre que el navegador permita `localStorage` en archivos locales. Para probar el modo instalable y el almacenamiento offline con un origen estable, iniciar un servidor local desde la carpeta:

```bash
python -m http.server 8000
```

Y abrir `http://localhost:8000/`.

## Almacenamiento y privacidad

**GitHub solo almacena el código y los recursos gráficos.** Los datos de clientes, visitas y presupuestos permanecen en el almacenamiento local del navegador y **no se sincronizan automáticamente** entre dispositivos. No usar modo incógnito. Borrar datos del navegador puede destruir los registros; exportar respaldos frecuentemente desde **Configuración → Exportar copia**. Para cambiar de equipo, exportar en el anterior e importar en el nuevo.

Los PDF se crean íntegramente en el dispositivo. La aplicación no realiza facturación electrónica ni verifica certificaciones normativas; las condiciones comerciales deben revisarse para cada trabajo.

## Estructura

- `index.html`: estructura y navegación.
- `styles.css`: diseño adaptable PC/celular.
- `app.js`: gestión de agenda, clientes, presupuestos y respaldos.
- `pdf.js`: motor PDF autónomo con saltos de página automáticos.
- `logo-data.js`: copia codificada del logo para insertarlo en PDF sin conexión.
- `assets/`: logos EYR proporcionados por el propietario y variantes recortadas para interfaces.
- `manifest.webmanifest` y `sw.js`: instalación y funcionamiento sin conexión.
- `eyr-theme.css`: diseño Fuego & Hielo sobre la base existente.
- `android/`: proyecto para APK de Android; `.github/workflows/android-apk.yml`: compilación automatizada.

## Mejoras posteriores posibles

Plantillas de tareas frecuentes, recordatorios, filtro mensual avanzado, numeración configurable, importación CSV y distintos estilos de cabecera del PDF.


## Remitos (v1.3)

- Nuevo módulo local de remitos, independiente de presupuestos, con numeración propia.
- Cliente, CUIT/DNI, domicilio, condición frente al IVA y conceptos (cantidad, descripción, precio unitario).
- Total automático. PDF A4 formal de **Original y Duplicado** con casilleros de firmas.
- El generador se ejecuta en el dispositivo sin servicios externos; los remitos se incluyen en los respaldos JSON.
- En Android 15 o superior se respetan las áreas de barra de estado y navegación.

## v1.4 - Corrección Android y formularios

- Barra de estado y navegación Android con fondo azul oscuro e indicadores blancos, respetando insets.
- Corregida la delegación de clicks dentro de modales, que cancelaba el envío de los formularios de clientes y visitas.
- La validación ya no crea registros incompletos.

## v1.5 - Presupuestos, envío y navegación

- Encabezado de presupuestos más compacto: logo más grande y datos comerciales a su lado.
- **Ver PDF** y **Enviar** en listados y vistas previas de presupuestos y remitos.
- Android guarda el documento en Descargas/EYR Refrigeracion y abre el visor PDF o el selector de compartir (WhatsApp disponible según la instalación).
- El botón Atrás cierra ventanas, vuelve a la pantalla anterior y evita salir por accidente; en Inicio se requiere pulsarlo dos veces para salir.
- Se mantiene la misma base local y los respaldos JSON.


## Calendario v1.6

En Agenda > Ver calendario ahora hay tres vistas: **Mes**, **Semana** (tira de siete días desplazable horizontalmente) y **Día** (franjas horarias con detalles de visitas). Las visitas se pueden abrir desde cualquiera de las vistas; los filtros por estado y búsqueda se mantienen. El botón Hoy vuelve a la fecha actual y las flechas recorren meses, semanas o días según la vista. Desde la vista diaria se puede agendar directamente una visita para ese día. Todo sigue guardado localmente.

## Versión 1.7: clientes, trabajos frecuentes y Android local
- Se eliminó la barra superior redundante y los accesos duplicados "Historial" y "Ubicación". Menú principal: Inicio, Agenda, Presupuestos, Remitos, Clientes, Trabajos frecuentes y Ajustes.
- **Historial técnico de clientes** con visitas, presupuestos y remitos vinculados. Los registros antiguos sin identificador solo se relacionan por nombre cuando la coincidencia es única.
- Visitas enlazadas con presupuestos y accesos directos para consultar el presupuesto desde la visita. Un presupuesto **aceptado** se convierte en remito (reutiliza cliente, descripción, cantidades, precios y total). La conversión consulta remitos existentes para evitar duplicados involuntarios.
- Catálogo local de trabajos frecuentes con descripciones y precios sugeridos (opcionales/editables), disponible desde formularios de visitas, presupuestos y remitos.
- Recordatorios locales **Android**, 1 o 24 horas antes, configurados por visita. Requieren permiso de notificaciones; Android puede retrasar las alarmas por ahorro de batería. En la PWA la agenda funciona, pero no se programan avisos nativos.
- Respaldo local automático Android al guardar cambios en **Descargas/EYR Refrigeracion/EYR-Respaldo-Automatico.json**, con opción de desactivarlo desde Ajustes. El JSON es texto legible; protejé el teléfono. Se recomienda exportar una copia a otro lugar ante pérdida/rotura del equipo.
- Mantenimiento de base de datos local anterior, sin borrar clientes ni documentación.

## v1.8: ícono de notificaciones

- Icono monocromático EYR, blanco sobre fondo transparente, creado en resoluciones Android mdpi–xxxhdpi para el símbolo de notificaciones y barra de estado.
- Notificación desplegada con logo azul de la app a color (`largeIcon`) y acento celeste. Se mantiene intacto el ícono del lanzador y el contenido de los recordatorios.
- Recordatorios existentes siguen programados; los avisos nuevos mostrarán los íconos correctos. No se modifican los datos locales.

## v1.9 · Portada de inicio y firma de actualizaciones

La portada aprobada Fuego & Hielo se presenta sobre la WebView en Android hasta que termina de dibujarse la app (con un límite de seguridad). Se conserva íntegra usando ajuste de aspecto. En Android 12+ el sistema puede mostrar inicialmente su icono estándar durante una fracción de segundo, antes de esta portada nativa.

Las APK previas se firmaban con claves de depuración temporales. Para actualizar futuras instalaciones conservando los datos es obligatorio reutilizar una clave de firma privada estable en todas las versiones. No se debe publicar la clave privada en este repositorio público. El proyecto de Android admite firma con las credenciales GitHub Secrets `EYR_KEYSTORE_B64`, `EYR_KEYSTORE_PASSWORD`, `EYR_KEY_ALIAS`, `EYR_KEY_PASSWORD`. Antes de instalar una versión con nueva firma, exportá JSON e importalo después de esa única migración.


## Catálogo técnico v2.0 (primer lanzamiento)

- Nueva sección Catálogo técnico: búsqueda por marca, modelo, serie y refrigerante, filtros de marca y fichas con especificaciones y enlaces a documentación oficial.
- Modelos iniciales con fuente verificada de Samsung y LG en `catalogo-modelos.json`. El conjunto inicial está también embebido en `catalogo-data.js` para consulta sin red.
- Botón Buscar actualizaciones desde GitHub Pages: carga opcional de un JSON de catálogo más reciente sin recompilar Android. Valida fuentes oficiales y guarda resultados localmente. Sin automatismos ni servicio remoto obligatorio.
- Asociación de equipos a clientes: ubicación, serie, fecha de instalación, observaciones; se conservan fichas en una instantánea para consultas posteriores. Un modelo no incluido puede registrarse manualmente y queda marcado sin especificaciones verificadas.
- Equipos visibles desde Clientes y su historial, y relacionables con visitas. Se mantiene el almacenamiento local y el respaldo JSON.
- **Seguridad técnica:** la app nunca deduce refrigerante ni conexiones de modelos similares. Siempre confirmar placa, modelo exacto y manual antes de trabajar.

## v2.1: foto principal por modelo

- Fotos de los cinco modelos iniciales: cuatro imágenes oficiales Samsung y una publicación comercial del modelo LG exacto (con fuente identificada).
- Imagen única en tarjeta, ficha grande y equipo asociado al cliente. Si falla la carga o no hay conexión, aparece «Foto no disponible», nunca una imagen inventada de un equipo distinto.
- Las imágenes se cargan bajo demanda por HTTPS; para verlas por primera vez se necesita Internet. La ficha técnica de texto sigue disponible sin conexión.
- Catálogo actualizable: el archivo JSON admite `photo` y `photoCredit` para modelos nuevos, con validación de dominios conocidos y sin permitir inyección de HTML.


## v2.2 — Catálogo híbrido: 5 por marca + nube temporal

- La pantalla principal muestra secciones plegables por marca, con **cinco fichas de ejemplo disponibles sin Internet** por cada una. La versión inicial incluye cinco Samsung y cinco LG.
- Con al menos dos caracteres en el buscador, EYR consulta bajo demanda `catalogo-indice.json` de GitHub Pages (índice de nombres/modelos, no ficha completa). El índice solo vive en memoria mientras se consulta, sin guardarse en localStorage.
- Al abrir un resultado en línea, se descarga **solo** `catalogo/fichas/<id>.json`; se comprueba modelo e identidad de la fuente oficial y se muestra la ficha temporalmente. No se guarda si solo se consulta.
- **Asociar a cliente** sí guarda una copia técnica en `equipment[].specSnapshot` y conserva la serie, ubicación, notas y visitas vinculadas. La ficha puede consultarse después sin Internet.
- **Renovar ejemplos** descarga únicamente `catalogo-destacados.json`, con máximo cinco fichas por marca. No descarga toda la biblioteca, y no requiere APK nueva para cambiar destacados.
- Migración de EYR v2.1: la colección antigua `catalogOnline` pasa a cinco destacados por marca, se elimina del almacenamiento persistente y **no se borran los equipos de clientes**. Los respaldos JSON de versiones anteriores siguen admitidos.
- El Service Worker no cachea el índice, destacados remotos ni las fichas individuales en línea; el navegador puede aplicar caché de imágenes/HTTP temporal según sus propias reglas.
- Fichas en GitHub Pages: `catalogo-modelos.json` se mantiene como archivo maestro de edición, `catalogo-indice.json` índice, `catalogo-destacados.json` destacados y `catalogo/fichas/` fichas individuales. Para ampliar, se publican esos archivos coordinadamente.


## v2.3 · Cinco nuevas marcas en Catálogo técnico

- Se suman **Surrey, BGH, Hitachi, Philco y Carrier**. Hay cinco ejemplos offline por marca, 35 en total. La biblioteca remota arrancó con **44 modelos**.
- Se publican las 25 fichas nuevas como archivos individuales bajo `catalogo/fichas/`; consulta sin descargarlas todas.
- Se amplía la lista de dominios de fabricantes y servicios oficiales permitidos y las fotos HTTPS verificadas para series y modelos puntuales.
- En la migración desde v2.2 se añaden nuevas marcas sin reemplazar las selecciones previas ni modificar clientes, visitas, presupuestos, remitos o equipos guardados.
- Los datos técnicos no confirmados permanecen vacíos («No verificado»), jamás se infieren por semejanza.

## Ampliación de biblioteca online · 12/11/2026 (sin nueva APK)

- Se añadieron **11 fichas bajo demanda**: Surrey 553NIQ09GN81F y 553NIQ12KN81F; BGH BSI35WCGT y BSI53WCGT; Hitachi HSPE2700FCINV y HSPE6400FCINV; Philco 96PHIN39HC2AWFPI y 96PHIN90HC3AWFPI; Carrier 53TCA1006, 53TCA1306 y 53HQV035.
- Total: **55 modelos** en `catalogo-modelos.json` e `catalogo-indice.json`; se añadieron 11 archivos en `catalogo/fichas/`.
- No cambian `catalogo-destacados.json` ni `catalogo-data.js`: siguen siendo **35 ejemplos offline, cinco por marca**. No requiere recompilar APK, instalar ni migrar datos.
- Los campos sin evidencia técnica oficial se dejaron vacíos. Antes de instalar, cargar refrigerante o intervenir, verificar manual y placa de la unidad exacta.


## v2.4 · WhatsApp directo para clientes

- En Clientes y en Historial técnico, el número conserva su presentación y además permite abrir WhatsApp con un botón verde.
- Android intenta abrir WhatsApp o WhatsApp Business en el número correspondiente; si no está instalado, usa el enlace oficial. La PWA usa `wa.me`.
- Se admiten formatos argentinos habituales (+54 9, 011 15 y códigos de área). Los números incompletos se muestran sin botón para evitar abrir un destinatario erróneo.
- No se edita el número original, no se agendan contactos y no cambian clientes, equipos, presupuestos, remitos, visitas ni respaldos.
