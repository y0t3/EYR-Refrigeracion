# Firma estable de Android — EYR Refrigeración

Este repositorio **no contiene la clave privada**. La identidad pública de la firma esperada está en `android/signing-cert-sha256.txt`.

## Primer alta de firma en GitHub Actions

1. Desde un equipo de confianza, conservá de forma privada el paquete de firma EYR (archivo `.p12`, contraseña y alias). **Nunca lo subas al repositorio ni lo compartas**.
2. En [Settings > Secrets and variables > Actions](https://github.com/y0t3/EYR-Refrigeracion/settings/secrets/actions), creá cuatro *repository secrets*:
   - `EYR_KEYSTORE_B64`: contenido binario del `.p12` codificado en base64, **sin saltos de línea**.
   - `EYR_KEYSTORE_PASSWORD`: contraseña del almacén.
   - `EYR_KEY_ALIAS`: alias de la clave.
   - `EYR_KEY_PASSWORD`: contraseña de la clave.
3. Alternativa con la herramienta oficial GitHub CLI: `gh secret set -R y0t3/EYR-Refrigeracion --app actions -f EYR-SECRETS.env` desde la carpeta privada; **jamás** publicar ese archivo.
4. En [Actions > EYR · Compilar APK Android](https://github.com/y0t3/EYR-Refrigeracion/actions/workflows/android-apk.yml), usá **Run workflow** en `main`.
5. Solo se distribuirá el artefacto **EYR-Refrigeracion-ESTABLE**. El flujo verifica la firma y bloquea una APK si su certificado no coincide con el esperado.

## Actualizaciones posteriores

- Mantener sin cambios el `applicationId`: `com.eyr.refrigeracion`.
- Incrementar el `versionCode` en `android/app/build.gradle` en cada APK nueva.
- Reutilizar **el mismo** `.p12`, alias y contraseñas para todas las versiones.
- No instalar paquetes de depuración o firmados con otra clave.

## Una sola migración desde versiones temporales

Si la versión instalada fue firmada con una clave de depuración distinta, **Android no permite actualizarla encima**. Exportar primero el JSON de respaldo desde Ajustes; verificarlo fuera del dispositivo, desinstalar la anterior, instalar la primera APK estable y después importar el JSON. Desde ese momento las futuras APK estables se actualizarán encima normalmente.

**Atención:** si se pierde la clave de firma, la continuidad de actualizaciones de esta APK independiente no está garantizada. Guardar al menos dos copias seguras del material privado.
