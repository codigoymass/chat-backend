import express from "express";
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import { db } from './database.js';
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs';
import { format } from 'date-fns';
import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT ?? 4000;

const app = express();
app.use(express.json());
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000'
  }
});

io.on('connection', (socket) => {
  console.log('Usuario conectado');

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
})

app.get('/', (req, res) => {
  res.send('<h1>Backend chat</h1>');
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
      return res.status(400).json({
        error: true,
        data: 'Datos obligatorios'
      });
    }

    const user = await db.execute({
      sql: 'SELECT id, name, username, password, role_type, active FROM users WHERE username = :username;',
      args: { username }
    });

    if(user.rows.length == 0) {
      return res.status(401).json({
        error: true,
        data: 'Usuario no encontrado'
      });
    }

    bcrypt.compare(password, user.rows[0].password, function(err, result) {
      if(result) {
        const token = jwt.sign({ username }, process.env.JWT_TOKEN, { expiresIn: "1h" });
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
        return res.status(401).json({
          error: true,
          data: 'Datos incorrectos'
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
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
    return res.status(400).json({
      error: true,
      msg: 'Datos obligatorios'
    });
  }

  bcrypt.hash(password, 10, async(err, hash) => {
    await db.execute({
      sql: 'INSERT INTO users(name, username, password, role_type, active, created_at) VALUES(:name, :username, :password, :role_type, :active, :created_at)',
      args: {
        name,
        username,
        password: hash,
        role_type: 'student',
        active: 1,
        created_at: format(Date.now(), 'yyyy-MM-dd HH:mm:ss')
      }
    });
  });

  res.status(200).json({
    error: false,
    msg: 'El usuario ha sido creado',
  });
})

server.listen(port, () => {
  console.log(`Servidor corriendo en puerto: ${port}`);
})