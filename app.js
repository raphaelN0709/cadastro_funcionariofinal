require("dotenv").config();

const express = require("express");
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// === Middlewares ===
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'chave1_padrao_se_nao_definido',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true se usar HTTPS
}));

// === Configuração do Nodemailer ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// === Schema e Model (Mongoose) ===
const employeeSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  rg: { type: String },
  conta_bancaria: { type: String },
  endereco: { type: String },
  funcao: { type: String },
  vinculo: { type: String },
  tipo: { type: String },
  data_validade_certificado: { type: Date },
  ultimo_aviso_email_certificado: { type: Date }
});

const Employee = mongoose.model('Employee', employeeSchema);

// === Função para envio de e-mail ===
async function sendExpiryWarningEmail(employee, daysRemaining, isUrgent = false) {
  if (employee.ultimo_aviso_email_certificado) {
    const lastSent = new Date(employee.ultimo_aviso_email_certificado);
    const today = new Date();
    if (lastSent.toDateString() === today.toDateString()) return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_DESTINO,
    subject: `${isUrgent ? '⚠️ AVISO URGENTE' : 'Aviso'} de Vencimento de Certificado - ${employee.nome}`,
    html: `
      ${isUrgent ? '<p style="color: red; font-weight: bold;">ATENÇÃO: Este é um aviso urgente!</p>' : ''}
      <p>Prezado(a) administrador(a),</p>
      <p>O certificado de <b>${employee.nome}</b> (CPF: ${employee.cpf}) está próximo do vencimento.</p>
      <p>Data de validade: <b>${new Date(employee.data_validade_certificado).toLocaleDateString('pt-BR')}</b></p>
      <p>Faltam apenas <b>${daysRemaining} dias</b> para o vencimento.</p>
      <p>Atenciosamente,</p>
      <p>Equipe de Gerenciamento</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`E-mail enviado com sucesso para ${employee.nome}`);

    await Employee.findByIdAndUpdate(employee._id, {
      ultimo_aviso_email_certificado: new Date()
    });
  } catch (error) {
    console.error(`Erro ao enviar e-mail para ${employee.nome}:`, error.message);
  }
}

// === Função principal de verificação ===
async function checkAndSendExpiryEmails() {
  const employees = await Employee.find({ data_validade_certificado: { $exists: true } });
  const today = new Date();
  const oneDay = 1000 * 60 * 60 * 24;

  for (const emp of employees) {
    if (!emp.data_validade_certificado) continue;

    const expiryDate = new Date(emp.data_validade_certificado);
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / oneDay);

    if (daysRemaining > 0 && daysRemaining <= 30) {
      const lastSentDate = emp.ultimo_aviso_email_certificado ? new Date(emp.ultimo_aviso_email_certificado) : null;
      const isAlreadySentToday = lastSentDate && lastSentDate.toDateString() === today.toDateString();

      if (daysRemaining <= 15 && !isAlreadySentToday) {
        console.log(`Certificado de ${emp.nome} vence em ${daysRemaining} dias (URGENTE)`);
        await sendExpiryWarningEmail(emp, daysRemaining, true);
      } else if (daysRemaining <= 30 && !lastSentDate) {
        console.log(`Certificado de ${emp.nome} vence em ${daysRemaining} dias (PRIMEIRO AVISO)`);
        await sendExpiryWarningEmail(emp, daysRemaining);
      }
    }
  }
}

// === Rotas Front-end ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html')));
app.get('/admin/painel', (req, res) => {
  if (req.session.isAdmin) res.sendFile(path.join(__dirname, 'public', 'admin', 'painel.html'));
  else res.redirect('/admin');
});

// === API Login Admin ===
app.post('/api/login', (req, res) => {
  const { user, senha } = req.body;
  if (user === process.env.ADMIN_USER && senha === process.env.ADMIN_PASS) {
    req.session.isAdmin = true;
    res.status(200).json({ message: 'Login realizado com sucesso' });
  } else {
    res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }
});

// === API Funcionários ===
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/employees/expiring', async (req, res) => {
  try {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const expiring = await Employee.find({
      data_validade_certificado: { $gt: today, $lte: in30Days }
    });
    res.json(expiring);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const existing = await Employee.findOne({ cpf: req.body.cpf });
    if (existing) return res.status(400).json({ error: 'CPF já cadastrado' });

    const newEmp = new Employee(req.body);
    await newEmp.save();
    res.status(201).json(newEmp);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updated) res.json(updated);
    else res.status(404).json({ error: 'Funcionário não encontrado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);
    if (deleted) res.json({ message: 'Funcionário deletado' });
    else res.status(404).json({ error: 'Funcionário não encontrado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === Rota chamada pelo CRON JOB do Render ou manual ===
app.get('/api/check-emails', async (req, res) => {
  try {
    await checkAndSendExpiryEmails();
    res.status(200).json({ message: 'Verificação de e-mails concluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao verificar certificados:', error);
    res.status(500).json({ error: error.message });
  }
});

// === Conexão com MongoDB e inicialização do servidor ===
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado ao MongoDB com sucesso!");
    app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("❌ Erro ao conectar ao MongoDB:", err.message);
    process.exit(1);
  });
