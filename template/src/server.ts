import app from './app';

const port = 5000;

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
