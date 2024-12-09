require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Gerencianet = require('gerencianet');
const options = {
    client_id: process.env.GERENCIANET_CLIENT_ID,
    client_secret: process.env.GERENCIANET_CLIENT_SECRET,
    sandbox: true // Defina como "false" quando for para produção
};
const gn = new Gerencianet(options);


// Configurações do servidor
const app = express();
const PORT = 3000;
const SECRET_KEY = "minha_chave_secreta";

// Middlewares
app.use(bodyParser.json());
app.use(cors());

// Conexão com o banco de dados
const db = new sqlite3.Database('./carteira.db');

// Inicialização do banco de dados
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telefone TEXT UNIQUE,
        senha TEXT,
        saldo_total REAL DEFAULT 0,
        saldo_bonus REAL DEFAULT 0,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        tipo TEXT,
        valor REAL,
        data_transacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS investimentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        valor REAL,
        data_investimento DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_liberacao DATETIME,
        ultimo_bonus DATETIME,
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    )`);
});

// Função auxiliar para autenticação
function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Token não fornecido." });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido." });
        req.user = user;
        next();
    });
}

// Rota de Login
app.post('/auth/login', (req, res) => {
    const { telefone, senha } = req.body;
  
    if (!telefone || !senha) {
      return res.status(400).json({ error: 'Telefone e senha são obrigatórios.' });
    }
  
    db.get('SELECT * FROM usuarios WHERE telefone = ?', [telefone], async (err, user) => {
      if (err) return res.status(500).json({ error: 'Erro no servidor.' });
  
      if (!user || !(await bcrypt.compare(senha, user.senha))) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }
  
      const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ message: 'Login realizado com sucesso.', token });
    });
  });
  
//rota de cadastro
app.post('/auth/register', (req, res) => {
    const { telefone, senha } = req.body;

    if (!telefone || !senha) {
        return res.status(400).json({ error: "Telefone e senha são obrigatórios." });
    }

    db.get('SELECT * FROM usuarios WHERE telefone = ?', [telefone], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        if (user) {
            return res.status(400).json({ error: "Usuário já cadastrado." });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);
        db.run('INSERT INTO usuarios (telefone, senha) VALUES (?, ?)', [telefone, hashedPassword], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const token = jwt.sign({ id: this.lastID }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ message: "Cadastro realizado com sucesso.", token });
        });
    });
});

// Rota para saque de bônus
app.post('/bonus/sacar', authenticateToken, (req, res) => {
    db.get('SELECT saldo_bonus FROM usuarios WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || user.saldo_bonus <= 0) {
            return res.status(400).json({ error: "Sem saldo de bônus disponível." });
        }

        db.run('UPDATE usuarios SET saldo_bonus = 0, saldo_total = saldo_total + ? WHERE id = ?', [user.saldo_bonus, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.run('INSERT INTO transacoes (usuario_id, tipo, valor) VALUES (?, ?, ?)', [req.user.id, 'Saque Bônus', user.saldo_bonus]);
            res.json({ message: "Bônus sacado com sucesso.", valor: user.saldo_bonus });
        });
    });
});

// Rota para geração de bônus diário
app.post('/bonus/gerar', (req, res) => {
    const hoje = new Date().toISOString().split('T')[0]; 

    db.all('SELECT * FROM investimentos WHERE data_liberacao > ?', [hoje], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) {
            return res.json({ message: "Nenhum investimento ativo para gerar bônus." });
        }

        rows.forEach((investimento) => {
            const ultimaData = investimento.ultimo_bonus ? investimento.ultimo_bonus.split('T')[0] : null;
            if (ultimaData === hoje) {
                return; 
            }

            const bonusDiario = (investimento.valor * 3.33) / 100;

            db.run('UPDATE usuarios SET saldo_bonus = saldo_bonus + ? WHERE id = ?', [bonusDiario, investimento.usuario_id], (err) => {
                if (err) console.error('Erro ao atualizar saldo de bônus:', err.message);
            });

            db.run('UPDATE investimentos SET ultimo_bonus = ? WHERE id = ?', [hoje, investimento.id], (err) => {
                if (err) console.error('Erro ao atualizar última data de bônus:', err.message);
            });
        });

        res.json({ message: "Bônus diário gerado com sucesso para usuários com investimentos ativos!" });
    });
});

// Rota para investimentos
app.post('/investimentos', authenticateToken, (req, res) => {
    const { valor } = req.body;
    if (!valor || valor <= 0) {
        return res.status(400).json({ error: "Valor de investimento inválido." });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.get('SELECT saldo_total FROM usuarios WHERE id = ?', [req.user.id], (err, user) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }

            if (!user || user.saldo_total < valor) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: "Saldo insuficiente para investimento." });
            }

            const dataLiberacao = new Date();
            dataLiberacao.setDate(dataLiberacao.getDate() + 15);

            db.run('INSERT INTO investimentos (usuario_id, valor, data_liberacao) VALUES (?, ?, ?)', [req.user.id, valor, dataLiberacao], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                db.run('UPDATE usuarios SET saldo_total = saldo_total - ? WHERE id = ?', [valor, req.user.id], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    db.run('COMMIT');
                    res.json({ message: "Investimento realizado com sucesso.", valor, dataLiberacao });
                });
            });
        });
    });
});

// Rota para obter resumo de investimentos ativos
app.get('/usuario/investimentos-ativos', authenticateToken, (req, res) => {
    db.all(
        'SELECT valor, data_investimento, data_liberacao FROM investimentos WHERE usuario_id = ? AND data_liberacao > CURRENT_TIMESTAMP ORDER BY data_investimento DESC',
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({ investimentos_ativos: rows });
        }
    );
});

// Rota para depósitos
app.post('/depositos', authenticateToken, async (req, res) => {
    const { valor } = req.body;

    if (!valor || typeof valor !== 'number' || valor <= 80) {
        return res.status(400).json({ error: "Valor de depósito inválido. Insira um valor maior ou igual 80." });
    }

    try {
        // Configuração do pagamento com Gerencianet
        const paymentData = {
            items: [
                {
                    name: "Depósito na Carteira",
                    value: parseFloat(valor.toFixed(2)) * 100, 
                    amount: 1,
                },
            ],
            shippings: [
                {
                    name: "Frete",
                    value: 0
                }
            ],
            metadata: {
                usuarioId: req.user.id,
            },
            payment: {
                method: "pix", 
                pix: {
                    expires_in: 3600, // Tempo de expiração do QR Code (1 hora)
                    additional_information: "Depósito na Carteira de Investimentos",
                },
            },
        };

        // Criação da cobrança
        const response = await gn.createCharge({}, paymentData);

        // Retornando link do QR Code
        const qrCode = response.data.links.find(link => link.rel === 'qr_code').href;
        res.json({ qrCode });
    } catch (error) {
        console.error("Erro ao criar cobrança no Gerencianet:", error.message);
        res.status(500).json({ error: "Erro ao gerar QR Code. Por favor, tente novamente mais tarde." });
    }
});

//rota para receber notificações 
app.post('/webhook', async (req, res) => {
    try {
        const { data, resource } = req.body;
        const { usuarioId, valor } = data.metadata;

        // Verificar o status do pagamento
        if (resource.status === 'paid') {
            // Atualize o saldo do usuário no banco de dados
            db.run('UPDATE usuarios SET saldo_total = saldo_total + ? WHERE id = ?', [valor / 100, usuarioId], (err) => {
                if (err) console.error('Erro ao atualizar saldo:', err.message);
            });
            // Registre a transação no histórico
            db.run('INSERT INTO transacoes (usuario_id, tipo, valor) VALUES (?, ?, ?)', [usuarioId, 'Depósito', valor / 100]);
        }

        res.sendStatus(200); // Indique sucesso
    } catch (error) {
        console.error('Erro na webhook do Gerencianet:', error.message);
        res.sendStatus(500); // Indique falha
    }
});

// Rota para obter últimas transações do usuário
app.get('/usuario/ultimas-transacoes', authenticateToken, (req, res) => {
    db.all(
        'SELECT tipo, valor, data_transacao FROM transacoes WHERE usuario_id = ? ORDER BY data_transacao DESC LIMIT 5',
        [req.user.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({ ultimas_transacoes: rows });
        }
    );
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
