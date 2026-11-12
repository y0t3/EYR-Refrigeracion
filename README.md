# EYR Refrigeración · Gestión local

Aplicación web progresiva (PWA) para gestionar **clientes, visitas y presupuestos**, con identidad visual EYR y generación directa de PDF sin librerías ni servidores externos.

## Funciones de la versión 1.0

- Agenda de visitas con fecha, hora, cliente, domicilio, descripción y estado.
- Fichero de clientes con CUIT/DNI, teléfono, domicilio y notas.
- Presupuestos numerados con tareas independientes y tres modalidades de importes: **precio global**, **por rubros** y **detalle por ítem**.
- Opciones de validez, anticipo porcentual, condiciones, exclusiones y observaciones.
- Vista previa del documento y **descarga de PDF** con logo EYR, datos comerciales, totales y paginación automática.
- Estados de seguimiento, duplicación de presupuestos e historial.
- Almacenamiento local en `localStorage`, con **exportación/importación de respaldo `.json`**.
- Uso sin conexión después de la primera visita mediante `service worker` (al instalar desde una URL HTTPS).
- App para PC y celular, sin Firebase, APIs, cuentas ni suscripciones.

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

## Mejoras posteriores posibles

Plantillas de tareas frecuentes, recordatorios, filtro mensual avanzado, numeración configurable, importación CSV y distintos estilos de cabecera del PDF.