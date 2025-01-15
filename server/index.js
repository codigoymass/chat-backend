import express from "express";
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import { db } from './database.js';
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs';
import { format } from 'date-fns';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const port = process.env.PORT ?? 4000;

const app = express();
app.use(express.json());
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000'
  }
});

io.on('connection', async(socket) => {
  const token = socket.handshake.auth.token;
  try {
    const user = jwt.verify(token, process.env.JWT_TOKEN);
    socket.user = user;
    console.log('Usuarrio conectado');
  } catch (err) {
    console.log('Autenticación fallida. Error: ' + err);
    socket.disconnect();
  }

  // Mensaje enviado
  socket.on('message:update', () => {
    console.log('Actualizar mensajes');
    socket.emit('message:receive');
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
})

app.get('/', (req, res) => {
  res.send('<h1>Servidor activo</h1>');
})

/**
 * 
 * Login usuario
 * 
 */
app.post('/api/login', async(req, res) => {
  try {

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(200).json({
        error: true,
        data: 'Datos obligatorios'
      });
    }

    const user = await db.execute({
      sql: 'SELECT id, name, username, password, role_type, active FROM users WHERE username = :username;',
      args: { username }
    });

    if(user.rows.length == 0) {
      return res.status(200).json({
        error: true,
        data: 'Usuario no encontrado'
      });
    }

    const is_valid = await bcrypt.compare(password, user.rows[0].password);

    if(is_valid) {
      const token = jwt.sign({ id: user.rows[0].id, username: user.rows[0].username, role_type: user.rows[0].role_type }, process.env.JWT_TOKEN, { expiresIn: "1h" });
      return res.status(200).json({
        error: false,
        data: {
          user: {
            id: user.rows[0].id,
            name: user.rows[0].name,
            username: user.rows[0].username,
            role_type: user.rows[0].role_type
          },
          token
        }
      });
    } else {
      return res.status(200).json({
        error: true,
        data: 'Datos incorrectos'
      });
    }
  } catch (error) {
    return res.status(200).json({
      error: true,
      data: `Error al tratar de iniciar sesión. Error: ${error }`
    });
  }
})

/**
 * 
 * Registro usuario
 * 
 */
app.post('/api/register', async(req, res) => {
  const {
    name,
    username,
    password
  } = req.body;

  if(!name || !username || !password) {
    return res.status(200).json({
      error: true,
      data: 'Datos obligatorios'
    });
  }

  const is_user_exists = await db.execute({
    sql: 'SELECT username FROM users WHERE username = :username;',
    args: {
      username
    }
  });

  if(is_user_exists.rows.length > 0) {
    return res.status(200).json({
      error: true,
      data: 'El usuario ya existe, por favor ingresa otro'
    });
  }

  const hash_password = await bcrypt.hash(password, 10);

  const user = await db.execute({
    sql: 'INSERT INTO users(name, username, password, role_type, active, created_at) VALUES(:name, :username, :password, :role_type, :active, :created_at)',
    args: {
      name,
      username,
      password: hash_password,
      role_type: 'student',
      active: 1,
      created_at: format(Date.now(), 'yyyy-MM-dd HH:mm:ss')
    }
  });

  const { password: _, ...publicUser } = user;

  res.status(200).json({
    error: false,
    data: 'El usuario ha sido creado',
    user: publicUser
  });
})

app.get('/api/messages', async(req, res) => {
  const messages = await db.execute('SELECT m.*, u.username, u.role_type FROM messages m INNER JOIN users u ON u.id = m.created_by_user_id;');
  return res.status(200).json(messages);
})

app.post('/api/messages', async(req, res) => {

  const { id } = await jwt.verify(req.headers.authentication, process.env.JWT_TOKEN);

  try {
  
    const { content } = req.body;
    const message = await db.execute({
      sql: 'INSERT INTO messages(content, is_block, created_by_user_id, created_at) VALUES(:content, 0, :user_id, :created_at)',
      args: {
        content,
        user_id: id,
        created_at: format(Date.now(), 'yyyy-MM-dd HH:mm:ss')
      }
    });
  
    return res.status(200).json({
      error: false,
      data: message
    });
  } catch(error) {
    return res.status(200).json({
      error: true,
      data: `Error al guardar el mensaje. Error: ${error}`
    });
  }
})

server.listen(port, () => {
  console.log(`Servidor corriendo en puerto: ${port}`);
})