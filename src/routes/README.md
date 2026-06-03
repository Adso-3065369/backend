### **Verbos HTTP y Acciones de la API (`product.routes.js`)**

Para interactuar con nuestros productos, utilizamos los **Verbos HTTP**, que actúan como "órdenes" o "acciones" que el cliente le envía al servidor. Aquí explicamos qué hace cada uno en nuestro proyecto:

* **GET (Obtener):**
    * **Ruta `/` (`getAllProducts`):** Se usa para solicitar la lista completa de todos los productos guardados en el almacén.
    * **Ruta `/:id` (`getProductById`):** Se usa para buscar un producto específico. El servidor revisa el ID enviado en la URL y, si lo encuentra, devuelve solo ese producto.

*  **POST (Crear):**
    * **Ruta `/` (`createProduct`):** Se utiliza para registrar un producto nuevo. Aquí el cliente envía la información (nombre, precio) en el cuerpo de la petición para que el servidor la agregue al arreglo.

* **PUT (Actualizar):**
    * **Ruta `/:id` (`updateProduct`):** Se usa cuando queremos modificar los datos de un producto que ya existe. Usamos el ID para localizarlo y enviamos los nuevos datos para sobrescribir los anteriores.

* **DELETE (Eliminar):**
    * **Ruta `/:id` (`deleteProduct`):** Se utiliza para dar de baja un producto. El servidor busca el ID indicado y lo elimina permanentemente del arreglo de datos.

---

### **Resumen de Rutas (Endpoints)**

| Verbo | Ruta (URL) | Acción en el Controlador | Propósito |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | `getAllProducts` | Listar todo el inventario. |
| **GET** | `/:id` | `getProductById` | Ver detalle de un solo producto. |
| **POST** | `/` | `createProduct` | Agregar un producto nuevo. |
| **PUT** | `/:id` | `updateProduct` | Editar un producto existente. |
| **DELETE** | `/:id` | `deleteProduct` | Eliminar un producto del sistema. |