### **Capa de Modelo (`product.model.js`)**

El **Modelo** es el "especialista" encargado de interactuar directamente con los datos. Su función es realizar las operaciones de lectura, creación, actualización y eliminación (CRUD), abstrayendo esa lógica para que al Controlador no le importe cómo se guardan las cosas.

En este archivo, aplicamos lógica pura de JavaScript para manipular el arreglo de productos que reside en la memoria.

---

#### **Métodos y Lógica de Manipulación**

A continuación, explicamos qué hace cada método y qué herramientas de JavaScript utiliza:

1.  **`findAll` (Obtener todo):**
    * **Propósito:** Retorna el arreglo completo de productos tal cual existe en ese momento.
    * **Lógica:** Es un acceso directo al almacén de datos (`productsData`).

2.  **`findById` (Buscar uno):**
    * **Propósito:** Localizar un único producto mediante su ID.
    * **Lógica:** Utiliza el método **`.find()`**, que recorre el arreglo y devuelve el primer objeto que cumpla la condición (`p.id === id`).

3.  **`create` (Registrar):**
    * **Propósito:** Agregar un nuevo producto al listado.
    * **Lógica:** * Genera un **ID automático** sumando 1 al largo actual del arreglo.
        * Usa el **Operador Spread (`...`)** para combinar el nuevo ID con los datos recibidos (`name`, `price`).
        * Agrega el objeto al final del arreglo con **`.push()`**.

4.  **`update` (Modificar):**
    * **Propósito:** Editar los detalles de un producto existente.
    * **Lógica:**
        * Busca la posición (índice) con **`.findIndex()`**. Si no lo encuentra, retorna `null`.
        * Realiza una **fusión de datos**: mantiene lo que ya existía (`productsData[index]`) y lo sobrescribe con los campos nuevos (`updatedFields`).

5.  **`delete` (Eliminar):**
    * **Propósito:** Quitar un producto del sistema definitivamente.
    * **Lógica:**
        * Busca el índice del producto. Si no existe, devuelve `false`.
        * Utiliza **`.splice(index, 1)`**, que es el comando de JavaScript para "recortar" o quitar un elemento de un arreglo basándose en su posición.

---

#### **Conceptos Clave para el Aprendiz**

* **Búsqueda por Índice vs. Búsqueda por Objeto:** * `.find()` nos da el **objeto completo**. Es ideal para mostrar información.
    * `.findIndex()` nos da la **posición (número)**. Es necesario cuando queremos modificar o borrar algo en una ubicación específica.
* **Operador Spread (`...`):** Es una forma moderna y limpia de "copiar" todas las propiedades de un objeto dentro de otro.
* **Persistencia Volátil:** Recuérdales a tus estudiantes que, como estamos usando un arreglo, si el servidor se reinicia (o Nodemon lo hace al guardar cambios), los productos creados o eliminados volverán a su estado original.