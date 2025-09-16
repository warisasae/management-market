// app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import usersRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import authRoutes from './routes/authRoutes.js'; 
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();

// Middlewares
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

// Routes prefix `/api`
app.use('/api/auth', authRoutes);        // ← เพิ่มบรรทัดนี้
app.use('/api/users', usersRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/uploads', express.static('uploads')); // เปิดให้เสิร์ฟไฟล์โลโก้
app.use('/api/settings', settingRoutes);
app.use('/api/uploads', uploadRoutes);    // ← เพิ่มบรรทัดนี้

// health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Root
app.get('/', (_req, res) => res.send('API is running 🚀'));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status =
    err.status ||
    (err.code === 'P2025' ? 404 :
     err.code === 'P2002' ? 409 :
     err.code === 'P2003' ? 409 : 500);
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

export default app;
