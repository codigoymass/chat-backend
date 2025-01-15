## Backend Chat

### Requisitos para la instalación
Debes tener estas versiones para correr la aplicación backend:

- node v22.5.0
- npm v10.8.2

### Instalación
Debes realizar lo siguiente:
1. Descargar el proyecto de github
2. Instalar las dependencias con npm install
3. Correr el proyecto con npm run dev
4. Validar el servidor el puerto 4000

### Base de datos
La base de datos se encuentra en un proveedor externo, es una base de datos SQLite administrada por [turso](https://turso.tech/). La estructura está diseñada de la siguiente manera:

```sql
CREATE TABLE users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255),
  username VARCHAR(255),
  password VARCHAR(255),
  role_type VARCHAR(100),
  active TINYINT(1),
  created_at DATETIME
);

CREATE TABLE messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content VARCHAR(255),
  is_block TINYINT(1),
  created_by_user_id INTEGER,
  created_at DATETIME
);

CREATE TABLE message_replies(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER,
  created_by_user_id INTEGER,
  content VARCHAR(255),
  is_block TINYINT(1),
  created_at DATETIME
);
```

- La tabla de usuarios, encargada de guardar el registro de todos los usuarios de la plataforma (podemos separar los usuarios con rol moderador de los estudiantes).
- La tabla de messages, encargada de guardar todos los mensajes realizados por cada uno de los usuarios.
- La tabla message_replies, encargada de guardar las respuestas de los mensajes realizados.