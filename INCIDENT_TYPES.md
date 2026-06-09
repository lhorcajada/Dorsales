## Guía de Incidencias del Sistema de Dorsales

### Overview
El sistema registra automáticamente incidencias durante las operaciones de asignación de dorsales. Cada incidencia captura:
- **kind**: Tipo técnico de incidencia
- **title**: Título descriptivo (en español)
- **description**: Explicación detallada
- **status**: pending/review/resolved
- **severity**: low/medium/high
- **source**: RPC que generó la incidencia (claim_dorsal, reserve_dorsal, release_dorsal_lock)

---

## Incidencias por Fuente

### 1. claim_dorsal (Confirmación final de dorsal)

#### contest_closed (pending/medium)
- **Título:** "Intento fuera de ventana"
- **Causa:** Se intentó confirmar un dorsal cuando el concurso está cerrado
  - is_enabled = false
  - is_paused = true
  - Antes de opens_at o después de closes_at
  - opens_at o closes_at no configuradas
- **Acción recomendada:** Revisar si el usuario tiene un reloj desincronizado

#### child_missing (review/medium)
- **Título:** "Hijo no registrado"
- **Causa:** La cuenta intenta confirmar dorsal pero el hijo no existe
- **Acción recomendada:** Verificar que el hijo está registrado correctamente

#### ownership_mismatch (review/high)
- **Título:** "Hijo no vinculado al usuario"
- **Causa:** Intento de confirmar dorsal de un hijo de otra cuenta (ataque potencial)
- **Acción recomendada:** Revisar logs de seguridad, identificar si es intento malicioso

#### dorsal_missing (review/medium)
- **Título:** "Dorsal inexistente"
- **Causa:** Se solicita un dorsal fuera del rango 1-100
- **Acción recomendada:** Revisar si hay error en frontend o intento de manipulación

#### dorsal_locked (pending/low)
- **Título:** "Dorsal bloqueado"
- **Causa:** Intento de confirmar un dorsal bloqueado por administración
- **Acción recomendada:** Informar al usuario sobre por qué está bloqueado

#### dorsal_already_reserved (pending/low)
- **Título:** "Dorsal ya reservado"
- **Causa:** Intento de confirmar un dorsal que otro usuario tenía temporalmente seleccionado
- **Acción recomendada:** Usuario puede seleccionar otro dorsal

#### duplicate_assignment (review/high)
- **Título:** "Dorsal ya asignado"
- **Causa:** Race condition: dos usuarios intentaron confirmar el mismo dorsal simultáneamente
- **Acción recomendada:** El sistema reintentó pero falló. Usuario debe seleccionar otro.

#### duplicate_child_assignment (review/high)
- **Título:** "El menor ya tiene dorsal"
- **Causa:** El hijo ya tiene un dorsal permanentemente asignado (segunda intención de cambio)
- **Acción recomendada:** Contactar con admin si necesita cambiar; el sistema NO permite cambios automáticos

#### unexpected_error (review/high)
- **Título:** "Error en la asignación"
- **Causa:** Error no previsto en la BD o validación desconocida
- **Acción recomendada:** Revisar logs de DB, contactar con soporte técnico

---

### 2. reserve_dorsal (Selección temporal de dorsal)

Comparte la mayoría de tipos con claim_dorsal, más:

#### dorsal_already_assigned (review/medium)
- **Título:** "Dorsal ya tiene asignación permanente"
- **Causa:** Intento de reservar temporalmente un dorsal ya confirmado
- **Acción recomendada:** Usuario debe seleccionar un dorsal disponible

---

### 3. release_dorsal_lock (Liberación de selección temporal)

#### dorsal_missing (review/medium)
- **Título:** "Intento de liberar dorsal inexistente"

#### unauthorized_release (review/high)
- **Título:** "Intento no autorizado de liberar dorsal"
- **Causa:** Usuario intenta liberar un dorsal reservado por otro
- **Acción recomendada:** Revisar si es intento malicioso

#### unexpected_error (review/high)
- **Causa:** Error no previsto en liberación

---

## Criterios de Severidad

| Severity | Significado | Ejemplos |
|----------|------------|----------|
| low | Comportamiento normal, retryable | contest_closed, dorsal_locked, dorsal_already_reserved |
| medium | Validación fallida, revisar datos | child_missing, dorsal_missing, ownership_mismatch |
| high | Posible ataque, race condition, error crítico | duplicate_assignment, duplicate_child_assignment, unauthorized_release, unexpected_error |

---

## Criterios de Estado

| Status | Significado |
|--------|-----------|
| pending | Incidente automático, no necesita revisión inmediata |
| review | Requiere revisión manual, posible intención maliciosa |
| resolved | Admin ha revisado y marcado como resuelto |

---

## Acciones del Admin

En `/admin/incidents`:
1. Filtrar por status, severity o source
2. Revisar detalles: email, dorsal, usuario, timestamp
3. Marcar como resuelto si se ha investigado

## Para Desarrollo

### Agregar una nueva incidencia:

En `supabase/migrations/TIMESTAMP_incident.sql`:
```sql
elsif sqlerrm = 'Your error message' then
  v_incident_kind := 'your_new_kind';
  v_incident_status := 'pending';  -- o 'review'
  v_incident_severity := 'low';    -- o 'medium' o 'high'
  v_incident_title := 'Human readable title';
  v_incident_description := 'Detailed explanation';
```

En `Front/src/features/admin/IncidentsScreen.tsx`:
```typescript
const INCIDENT_KIND_LABELS: Record<string, string> = {
  ...
  your_new_kind: 'Your Human Label',
};
```

---

**Última actualización:** 2026-06-09 (Migración 000023_restore_incident_logging.sql)
