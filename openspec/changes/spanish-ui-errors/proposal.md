## Why

El sistema muestra mensajes de error en inglés cuando falla la comunicación con PocketBase o cuando el servidor devuelve errores genéricos como "Failed to fetch" o "Failed to create record". Aunque los mensajes de validación de formularios ya están en español, los errores de red y los errores por defecto de PocketBase aparecen en inglés, creando una experiencia inconsistente para el usuario.

## What Changes

- Agregar una capa de traducción en `src/lib/pocketbase/errors.ts` que convierte mensajes de error genéricos de PocketBase a español
- Actualizar el mensaje de fallback "Unknown PocketBase request error" a español
- Asegurar que todos los errores mostrados al usuario en la UI estén en español

## Capabilities

### New Capabilities

- **spanish-error-messages**: Traducción de mensajes de error de PocketBase al español para todos los casos donde el error se muestra al usuario final

### Modified Capabilities

- Ninguna - no hay cambios en los requisitos de funcionalidades existentes

## Impact

- `src/lib/pocketbase/errors.ts` - lógica de normalización de errores
- Todos los archivos de rutas (pages) que muestran errores al usuario mediante `getErrorMessage` ya que heredan automáticamente los mensajes traducidos