require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const setupRoutes = require('./routes/setup');
const adminRoutes = require('./routes/admin');
const citizensRoutes = require('./routes/citizens');
const servicesRoutes = require('./routes/services');
const dossiersRoutes = require('./routes/dossiers');
const officialRoutes = require('./routes/official');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/setup', setupRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/citizens', citizensRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/dossiers', dossiersRoutes);
app.use('/api/v1/official', officialRoutes);
app.use('/api/v1/reports', reportsRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Lỗi hệ thống',
      details: err.details
    }
  });
});

app.listen(PORT, () => {
  console.log(`Cổng DVC đang chạy tại http://localhost:${PORT}`);
});
