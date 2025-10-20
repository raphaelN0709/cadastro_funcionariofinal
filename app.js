const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Arquivos JSON
const DB_FILE = path.join(__dirname, 'pessoa.json');
const ADMIN_FILE = path.join(__dirname, 'admin.json');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'chave1',
  resave: false,
  saveUninitialized: false
}));

// Funções auxiliares
function readDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function readAdmins() {
  if (!fs.existsSync(ADMIN_FILE)) fs.writeFileSync(ADMIN_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
}

// Rotas front-end
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/painel', (req, res) => {
  if (req.session.isAdmin) {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'painel.html'));
  } else {
    res.redirect('/admin');
  }
});

// API de login
app.post('/api/login', (req, res) => {
  const { user, senha } = req.body;
  console.log('Tentando login com:', user, senha);

  const admins = readAdmins();
  const encontrado = admins.find(a =>
    a.user.trim() === user.trim() &&
    a.senha.trim() === senha.trim()
  );

  if (encontrado) {
    req.session.isAdmin = true;
    res.status(200).json({ message: 'Login realizado com sucesso' });
  } else {
    res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }
});

// Rotas API funcionários
app.get('/api/employees', (req, res) => {
  const employees = readDB();
  res.json(employees);
});

app.post('/api/employees', (req, res) => {
  const employees = readDB();

  if (employees.some(emp => emp.cpf === req.body.cpf)) {
    return res.status(400).json({ error: 'CPF já cadastrado' });
  }

  const newEmployee = {
    id: Date.now(),
    nome: req.body.nome,
    cpf: req.body.cpf,
    rg: req.body.rg,
    conta_bancaria: req.body.conta_bancaria,
    endereco: req.body.endereco,
    funcao: req.body.funcao,
    vinculo: req.body.vinculo,
    tipo: req.body.tipo
  };

  employees.push(newEmployee);
  writeDB(employees);
  res.status(201).json(newEmployee);
});

app.put('/api/employees/:id', (req, res) => {
  const employees = readDB();
  const id = parseInt(req.params.id);
  const index = employees.findIndex(emp => emp.id === id);

  if (index !== -1) {
    employees[index] = { ...employees[index], ...req.body };
    writeDB(employees);
    res.json(employees[index]);
  } else {
    res.status(404).json({ error: 'Funcionário não encontrado' });
  }
});

app.delete('/api/employees/:id', (req, res) => {
  const employees = readDB();
  const id = parseInt(req.params.id);
  const filtered = employees.filter(emp => emp.id !== id);

  if (filtered.length < employees.length) {
    writeDB(filtered);
    res.json({ message: 'Funcionário deletado' });
  } else {
    res.status(404).json({ error: 'Funcionário não encontrado' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
