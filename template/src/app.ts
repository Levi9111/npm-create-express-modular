import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import router from './app/routes/index';
import notFound from './app/middlewares/notFound';
import globalErrorHandler from './app/middlewares/globalErrorhandler';

const app: Application = express();

//parsers
app.use(express.json());
app.use(cors());

// application routes
app.use('/api/v1', router);

app.get('/', (_req: Request, res: Response) => {
  res.send('Welcome to Express Modular Server!');
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
