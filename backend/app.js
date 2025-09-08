import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import usersRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import saleItemRoutes from './routes/saleItemRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes prefix `/api`
app.use('/api/users', usersRoutes);
//app.use('/api/products', productRoutes);
//app.use('/api/categories', categoryRoutes);
//app.use('/api/sales', saleRoutes);
//app.use('/api/sale-items', saleItemRoutes);
//app.use('/api/stock', stockRoutes);
//app.use('/api/expenses', expenseRoutes);

// health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Root
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

export default app;
