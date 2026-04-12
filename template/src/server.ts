import config from './app/config';
import app from './app';

const port = config.port;

async function bootstrap() {
  try {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.log(err);
  }
}

bootstrap();
