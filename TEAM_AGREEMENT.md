# CONTRATO DE EQUIPO Y COMPROMISO DE CALIDAD: "PROYECTO DE DESARROLLO"

Al colocar nuestro nombre, los miembros de este equipo aceptamos trabajar bajo los estándares profesionales de desarrollo establecidos en nuestra formación. Nos comprometemos a respetar este flujo de trabajo para garantizar que el software no solo sea funcional, sino **técnicamente sólido y auditable**.

## 1. Nuestros Mandamientos de Desarrollo (Protocolo Obligatorio)

1. **Inspección antes de programar:** Ningún desarrollador escribirá código sin antes realizar una **Bitácora de Inspección de Caja Blanca** sobre el módulo a intervenir. Analizar la lógica interna es obligatorio.
2. **No hay código sin Issue:** Toda tarea debe existir como *Issue* en el Milestone. La Issue debe incluir la referencia a la Bitácora de Inspección aprobada.
3. **Respeto por la rama principal:** Nadie hará commits directamente a `main` ni a `develop`. Todo trabajo nace en una rama independiente (`feat/`, `fix/`).
4. **Calidad en las entregas (PR Gate):** Ningún Pull Request será aceptado si no incluye la Bitácora de Inspección y el cumplimiento estricto de los *Criterios de Aceptación*.
5. **Instructor Gatekeeper:** El Instructor actúa como el único filtro final de calidad. Si el código no cumple el PROYECTO DE DESARROLLO o la inspección es superficial, el PR será rechazado sin excepciones.
6. **La Meta es el 100%:** El ciclo de desarrollo termina cuando el Milestone llega al 100% y todas las pruebas de integración han sido satisfactorias.

---

## 2. El Flujo de Trabajo (Pipeline)

Para avanzar en el proyecto, cada aprendiz debe cumplir este proceso secuencial:

1. **Análisis:** Realizar la inspección de caja blanca del código actual.
2. **Registro:** Subir la `Bitácora de Inspección` a la carpeta `docs/inspections/` dentro de su rama de trabajo.
3. **Issue:** Crear la tarea en GitHub vinculada a la Bitácora.
4. **Desarrollo:** Programar en la rama (`feat/`) siguiendo la lógica inspeccionada.
5. **Revisión:** Crear el PR y solicitar revisión al Instructor (Gatekeeper).
6. **Merge:** Integración a `develop` solo tras la aprobación oficial.

---

## 3. Firmas Digitales de Compromiso

| Rol | Nombre | Usuario GitHub | Firma |
| :--- | :--- | :--- | :--- |
| **Líder de Proyecto** | __________________ | `@` | [ ] |
| **Desarrollador** | __________________ | `@` | [ ] |
| **Desarrollador** | __________________ | `@` | [ ] |

> *"El éxito de este PROYECTO DE DESARROLLO no depende de quién escriba más código, sino de quién demuestre mejor comprensión y rigor técnico en su análisis."*