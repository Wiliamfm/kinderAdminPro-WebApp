## ADDED Requirements

### Requirement: Traducción de errores de PocketBase a español
El sistema SHALL traduce automáticamente los mensajes de error de PocketBase al español cuando el error se muestra al usuario final.

#### Scenario: Error de red (Failed to fetch)
- **WHEN** la solicitud a PocketBase falla por error de red
- **THEN** el mensaje mostrado al usuario SHALL ser "Error al conectar con el servidor"

#### Scenario: Error al crear registro (Failed to create record)
- **WHEN** PocketBase retorna error al crear un registro
- **THEN** el mensaje SHALL ser traduceado a "No se pudo crear el registro"

#### Scenario: Error al actualizar registro (Failed to update record)
- **WHEN** PocketBase retorna error al actualizar un registro
- **THEN** el mensaje SHALL ser traduceado a "No se pudo actualizar el registro"

#### Scenario: Error al eliminar registro (Failed to delete record)
- **WHEN** PocketBase retorna error al eliminar un registro
- **THEN** el mensaje SHALL ser traduceado a "No se pudo eliminar el registro"

#### Scenario: Error desconocido (Unknown error)
- **WHEN** ocurre un error no categorizado
- **THEN** el mensaje SHALL ser "Ocurrió un error inesperado. Intenta de nuevo más tarde."

### Requirement: Mensajes de error personalizados preservados
El sistema SHALL preservar los mensajes de error personalizados que ya están en español o que contienen información específica del negocio.

#### Scenario: Error personalizado en español
- **WHEN** un error tiene un mensaje personalizado en español (ej: "No se encontró el trimestre asociado")
- **THEN** el mensaje SHALL ser mostrado sin modificación

#### Scenario: Error con mensaje específico del servidor
- **WHEN** el servidor devuelve un mensaje de error específico
- **THEN** el mensaje SHALL ser mostrado sin modificación (excepto si es un mensaje conocido de PocketBase en inglés)