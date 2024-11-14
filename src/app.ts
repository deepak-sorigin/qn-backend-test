import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import logger from './logger';
import { configureRoutes } from './routes';

// create express app
const app = express();

// Middleware to parse incoming requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// init all routes
app.use('/api/v1', configureRoutes());

// Middleware to handle errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  // Set the status code and send the error message in the response
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('request detected');
  res.status(200).json({ status: 'UP' });
});

export default app;
