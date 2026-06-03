### **Capa de Controlador (`product.controller.js`)**

El **Controlador** actúa como el "cerebro" o el director de orquesta de nuestra aplicación. Su función principal es recibir las peticiones del usuario, decidir qué lógica debe aplicarse y enviar una respuesta clara de vuelta al cliente.

En este proyecto, hemos estandarizado las respuestas para que el Frontend siempre reciba la misma estructura, facilitando el manejo de datos y errores.

---

#### **Estructura Estándar de Respuesta (JSON)**

Todas nuestras funciones en el controlador devuelven un objeto con las siguientes propiedades:
* **`success`**: Un valor booleano (`true`/`false`) que indica si la operación fue exitosa.
* **`message`**: Un texto descriptivo de lo que sucedió (ej: "Producto creado correctamente").
* **`data`**: El contenido o resultado de la operación (el producto o la lista).
* **`errors`**: Un arreglo destinado a detallar errores específicos (útil para validaciones futuras).

---

#### **Funciones y Lógica Aplicada**

A continuación, se describen las responsabilidades de cada método dentro del controlador:

1.  **`getAllProducts` (Listar todo):**
    * Pide al Modelo la lista completa de productos.
    * Responde con un estado **200 OK** y la lista de datos.

2.  **`getProductById` (Búsqueda Individual):**
    * Extrae el **ID** de los parámetros de la URL (`req.params`).
    * Convierte el ID a número y lo busca en el Modelo.
    * **Validación:** Si el producto no existe, responde con un **404 Not Found**. Si ocurre un fallo técnico, responde con un **500 Internal Server Error**.

3.  **`createProduct` (Registro):**
    * Recibe los datos del nuevo producto desde el cuerpo de la petición (`req.body`).
    * **Validación de campos:** Si falta el nombre o el precio, detiene la operación con un **400 Bad Request**.
    * Si todo es correcto, responde con un **201 Created**.

4.  **`updateProduct` (Edición):**
    * Recibe el ID por la URL y los nuevos datos por el cuerpo (`body`).
    * Intenta actualizar el recurso a través del Modelo.
    * Si el ID no existe en el sistema, informa al usuario con un **404 Not Found**.

5.  **`deleteProduct` (Eliminación):**
    * Identifica el producto a eliminar mediante su ID.
    * Utiliza un bloque `try-catch` para manejar errores inesperados durante la eliminación.
    * Si el producto se borra exitosamente, responde con un mensaje de confirmación.

---

#### **Resumen de Códigos de Estado Utilizados**

* **`200 OK`**: La solicitud fue exitosa.
* **`201 Created`**: El recurso se creó con éxito.
* **`400 Bad Request`**: Los datos enviados por el usuario son incorrectos o incompletos.
* **`404 Not Found`**: El recurso solicitado (ID) no existe.
* **`500 Internal Server Error`**: Ocurrió un error inesperado en el servidor.