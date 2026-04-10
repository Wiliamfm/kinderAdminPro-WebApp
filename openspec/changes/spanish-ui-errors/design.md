## Context

Actualmente, cuando ocurre un error en las operaciones con PocketBase (fallo de red, errores de validación del servidor, errores por defecto de PocketBase), los mensajes se muestran al usuario en inglés. El sistema ya tiene mensajes de error personalizados en español para muchos casos de validación de formularios y lógica de negocio, pero los errores que vienen directamente de la API de PocketBase o del navegador no se traducen.

### Estado actual
- Los errores de validación de formularios ya están en español (ej: "Nombre es obligatorio")
- Los errores de lógica de negocio en las librerías pocketbase ya tienen mensajes en español (ej: "No se encontró el trimestre asociado")
- Los errores de red y los mensajes por defecto de PocketBase aparecen en inglés

### Restricciones
- No modificar la lógica de negocio existente
- Mantener los mensajes de error en el servidor/consola en inglés (técnico)
- Solo traducir errores que se muestran al usuario final

## Goals / Non-Goals

**Goals:**
- Traducir mensajes de error comunes de PocketBase (Failed to fetch, Failed to create record, etc.) al español
- Traducir el mensaje de fallback cuando el error es desconocido
- Mantener compatibilidad con mensajes de error personalizados ya existentes

**Non-Goals:**
- No se traduce todo el sistema a español, solo los mensajes de error visibles al usuario
- No se modifican los mensajes de error en la consola del navegador (devtools)
- No se cambian los mensajes técnicos en el servidor

## Decisions

### 1. Ubicación de la lógica de traducción
**Decisión:** Agregar función de traducción en `src/lib/pocketbase/errors.ts`

**Alternativas consideradas:**
- Crear un nuevo archivo `i18n/errors.ts` - Descartado porque solo afecta a errores de PocketBase
- Traducir en cada componente - Descartado porque implica cambios en muchos archivos

**Justificación:** Centraliza la traducción en un solo lugar y cualquier error que pase por `normalizePocketBaseError` obtendrá automáticamente la traducción.

### 2. Estrategia de traducción
**Decisión:** Usar un mapa de traducciones simple (record) en lugar de una biblioteca de i18n completa

**Justificación:** Solo se necesitan traducir unos pocos mensajes de error, no es necesario el overhead de una biblioteca de internacionalización completa.

### 3. Cuándo aplicar la traducción
**Decisión:** Aplicar la traducción en `normalizePocketBaseError` antes de retornar el error

**Justificación:** Asegura que todos los errores que pasan por la normalización tengan el mensaje traducido, sin importar de dónde vengan.

## Risks / Trade-offs

- **Trade-off:** Los mensajes de error de PocketBase pueden cambiar con actualizaciones del servidor → Mitigación: La traducción es simple y flexible, fácilmente actualizable
- **Riesgo:** Alguns errores pueden tener mensajes personalizados en español que no deberían ser traducidos → Mitigación: Solo traducir mensajes conocidos en inglés, mantener los demás intactos

## Migration Plan

1. Modificar `src/lib/pocketbase/errors.ts` para agregar función de traducción
2. Aplicar traducción en `normalizePocketBaseError`
3. Probar que los errores conocidos se traduzcan correctamente
4. Verificar que errores personalizados (ya en español o con mensajes específicos) no se alteren

## Open Questions

- ¿Hay otros mensajes de error en inglés que debamos considerar além de los de PocketBase?
- ¿Quieres que también traduzcamos las etiquetas de la UI (labels, botones, etc.) o solo los mensajes de error?