import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRouter from "./routes/user.routes.js"
import urlRouter from './routes/url.routes.js'
import { authenticationMiddleware } from './middlewares/auth.middleware.js';
const app = express();

const PORT = 3000 ?? process.env.PORT;

app.set('trust proxy', true);

// CORS configuration - must be before other middleware
app.use(cors({
  origin: '*', // Allow all origins (for production, specify your frontend URL)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());
app.use(authenticationMiddleware);

app.get('/', (req, res) => {
    return res.json({message: "server is running fine"})
})

app.use('/user', userRouter);
app.use(urlRouter)

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})
