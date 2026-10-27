
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const app = express();
const porta = process.env.PORT || 4000;

// Configurações do Express
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Modelo de usuário
const usuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    sobrenome: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    senha: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Usuario = mongoose.model('Usuario', usuarioSchema);

// Cadastro de usuário
app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, sobrenome, email, senha } = req.body;

    if (
      typeof nome !== 'string' ||
      typeof sobrenome !== 'string' ||
      typeof email !== 'string' ||
      typeof senha !== 'string' ||
      !nome.trim() ||
      !sobrenome.trim() ||
      !email.trim() ||
      !senha
    ) {
      return res.status(400).json({
        mensagem: 'Preencha todos os campos corretamente.',
      });
    }

    if (senha.length < 8) {
      return res.status(400).json({
        mensagem: 'A senha deve possuir pelo menos 8 caracteres.',
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    const usuarioExistente = await Usuario.findOne({
      email: emailNormalizado,
    });

    if (usuarioExistente) {
      return res.status(409).json({
        mensagem: 'Este e-mail já está cadastrado.',
      });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    await Usuario.create({
      nome: nome.trim(),
      sobrenome: sobrenome.trim(),
      email: emailNormalizado,
      senha: senhaHash,
    });

    return res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso!',
    });
  } catch (erro) {
    if (erro.code === 11000) {
      return res.status(409).json({
        mensagem: 'Este e-mail já está cadastrado.',
      });
    }

    console.error('Erro ao cadastrar usuário:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível realizar o cadastro.',
    });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (
      typeof email !== 'string' ||
      typeof senha !== 'string' ||
      !email.trim() ||
      !senha
    ) {
      return res.status(400).json({
        mensagem: 'Informe o e-mail e a senha.',
      });
    }

    const usuario = await Usuario.findOne({
      email: email.trim().toLowerCase(),
    });

    if (
      !usuario ||
      !(await bcrypt.compare(senha, usuario.senha))
    ) {
      return res.status(401).json({
        mensagem: 'E-mail ou senha inválidos.',
      });
    }

    // O login é validado, mas ainda não cria uma sessão.
    return res.status(200).json({
      mensagem: 'Login validado com sucesso!',
    });
  } catch (erro) {
    console.error('Erro ao realizar login:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível realizar o login.',
    });
  }
});

// Consulta de usuários
app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select('-senha -__v')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(usuarios);
  } catch (erro) {
    console.error('Erro ao consultar usuários:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível consultar os usuários.',
    });
  }
});

// Inicialização do servidor
async function iniciar() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        'A variável MONGO_URI não foi definida no arquivo .env.'
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('Conectado ao MongoDB!');

    app.listen(porta, () => {
      console.log(`Express rodando em http://localhost:${porta}`);
      console.log(`API de usuários: http://localhost:${porta}/api/usuarios`);
    });
  } catch (erro) {
    console.error('Erro ao iniciar o servidor:', erro.message);
    process.exit(1);
  }
}

iniciar();
