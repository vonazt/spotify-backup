import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import { ApolloServer, AuthenticationError } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { SpotifySchema } from './graphql';
import authRoutes from './routes/auth';
import authMiddleware from './middleware/auth';
import { repository } from './repositories';

dotenv.config();

const start = async () => {
  const schema = await buildSchema({ resolvers: [SpotifySchema] });

  try {
    await mongoose.connect(
      `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@violet.zoqgo.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`,
      { useNewUrlParser: true, useUnifiedTopology: true },
    );
    console.log(`Connected to MongoDB`);
  } catch (err) {
    console.error(`Error connecting to MongoDB`, err);
  }

  const app = express();
  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use('/', authRoutes);
  // app.use(authMiddleware);

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const accessToken = await repository.validateToken(
        req.headers.accesstoken as string,
        req.headers.refreshtoken as string,
      );
      if (!accessToken) throw new AuthenticationError(`Access token and refresh token have expired. Please login to Spotify again`);
      return { accessToken };
    },
  });

  server.applyMiddleware({ app, path: '/graphql' });

  app.listen({ port: process.env.SERVER_PORT }, () => {
    console.log(
      `Server listening on http://localhost:${process.env.SERVER_PORT}\nApollo Server listening on http://localhost:${process.env.SERVER_PORT}/graphql`,
    );
  });
};

start();
