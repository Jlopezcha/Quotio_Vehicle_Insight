import 'dotenv/config';
import express from 'express';
import { connectdb } from '../config/db.js';
import authRoutes from './routes/auth.js';
import carRoutes from './routes/cars.js';
import carDetailsRoutes from './routes/carDetails.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import cors from "cors";
import recallRoutes from './routes/recalls.js';
import estimateRoutes from './routes/estimate.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

connectdb();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:9000"
];

app.use(cors({
  origin: allowedOrigins
}));



app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/car-details', carDetailsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/estimate', estimateRoutes);
app.use('/api/recalls', recallRoutes);

//RAG endpoints
app.post('/api/rag-mileage-estimator', async (req, res) => {
    const {make, model, year} = req.body;
    const response = await fetch("http://127.0.0.1:9000/rag-estimate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ make, model, year}),
    });

    res.json(await response.json());
});

app.post('/api/rag-reliability', async (req, res) => {
    const {make, model, year} = req.body;
    const response = await fetch("http://127.0.0.1:9000/rag-reliability", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ make, model, year}),
    });

    res.json(await response.json());
});

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  console.log(err.stack);
  if (!err.status) {
    err.status = 500;
    err.message = 'Internal Server Error';
  }
  res.status(err.status).json({ error: err.message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
}

export default app;
