## 1. Preparación

- [ ] 1.1 Revisar el código actual de `src/lib/pocketbase/errors.ts` para entender la estructura de normalización de errores

## 2. Implementación de traducción de errores

- [ ] 2.1 Crear función `translateErrorMessage(message: string): string` en `errors.ts` que contenga el mapa de traducciones
- [ ] 2.2 Traducir mensajes conocidos de PocketBase:
  - "Failed to fetch" → "Error al conectar con el servidor"
  - "Failed to create record" → "No se pudo crear el registro"
  - "Failed to update record" → "No se pudo actualizar el registro"
  - "Failed to delete record" → "No se pudo eliminar el registro"
  - "Unknown PocketBase request error" → "Ocurrió un error inesperado. Intenta de nuevo más tarde."
- [ ] 2.3 Modificar la función `normalizePocketBaseError` para aplicar la traducción al mensaje final
- [ ] 2.4 Verificar que los mensajes personalizados en español no sean alterados por la traducción

## 3. Verificación

- [ ] 3.1 Probar que los errores de red muestren el mensaje en español
- [ ] 3.2 Probar que los errores de PocketBase (create/update/delete) muestren mensajes en español
- [ ] 3.3 Verificar que errores con mensajes personalizados (ya en español) se muestren correctamente
- [ ] 3.4 Ejecutar las pruebas existentes para asegurar que no se rompió nada