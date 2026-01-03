const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { config } = require('./src/config');
const { authenticateToken } = require('./src/middleware/auth');
const { bootstrapDatabase } = require('./src/db/bootstrap');
const { sendSuccess, sendError } = require('./src/utils/response');

const app = express();

// Middlewares
app.use(helmet());
app.disable('x-powered-by');
app.use(
  cors({
    origin: config.cors.origins,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);
app.use(morgan('combined'));
app.use(express.json());

// Rotas
const authRoutes = require('./src/routes/auth');
const empresasRoutes = require('./src/routes/empresas');
const cipasRoutes = require('./src/routes/cipas');
const tarefasRoutes = require('./src/routes/tarefas');
const riscosRoutes = require('./src/routes/riscos');
const usuariosRoutes = require('./src/routes/usuarios');
const alertasRoutes = require('./src/routes/alertas');
const auditRoutes = require('./src/routes/audit');
const nrRoutes = require('./src/routes/nr');
const notificationsRoutes = require('./src/routes/notifications');
const checklistsRoutes = require('./src/routes/checklists');
const incidentsRoutes = require('./src/routes/incidents');
const documentsRoutes = require('./src/routes/documents');
const eventosRoutes = require('./src/routes/eventos');
const treinamentosRoutes = require('./src/routes/treinamentos');
const acoesRoutes = require('./src/routes/acoes');

// Health check (público)
app.get('/api/health', (req, res) => {
  return sendSuccess(res, {
    data: { status: 'OK' },
    message: 'SST SaaS API está funcionando'
  });
});

// Auth (login/register públicos; demais protegidos no router)
app.use('/api/auth', authRoutes);

// Protege todas as demais rotas /api
app.use('/api', authenticateToken);

app.use('/api/empresas', empresasRoutes);
app.use('/api/cipas', cipasRoutes);
app.use('/api/tarefas', tarefasRoutes);
app.use('/api/riscos', riscosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/nr', nrRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/treinamentos', treinamentosRoutes);
app.use('/api/acoes', acoesRoutes);

// 404
app.use('*', (req, res) => {
  return sendError(
    res,
    {
      message: 'Rota não encontrada',
      meta: { path: req.originalUrl }
    },
    404
  );
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  return sendError(res, { message: 'Erro interno', meta: { details: err.message } }, 500);
});

const start = async () => {
  try {
    await bootstrapDatabase();

    app.listen(config.port, () => {
      console.log(`Servidor rodando na porta ${config.port}`);
    });
  } catch (error) {
    console.error('Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
};

start();
