import 'reflect-metadata';
import express, { Express, Request, Response } from 'express';
import { OpenAI } from "langchain/llms/openai";
import { SqlDatabase } from "langchain/sql_db";
import { createSqlAgent, SqlToolkit } from "langchain/agents";
import { AppDataSource } from './data-source';
import { Users } from './entity/User';

import dotenv from 'dotenv';
dotenv.config();

const app: Express = express();
const port = process.env.PORT;
const openai_api_key = process.env.OPENAI_API_KEY;

AppDataSource.initialize().then(async () => {
  app.get('/', async (req: Request, res: Response) => {
    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: AppDataSource,
    });

    const toolkit = new SqlToolkit(db);
    const model = new OpenAI({ openAIApiKey: openai_api_key, temperature: 0.7 });
    const executor = createSqlAgent(model, toolkit);

    const input = `List users`;
    console.log(`Executing with input "${input}"...`);

    const result = await executor.call({ input });
    console.log(`Got output ${result.output}`);
    console.log(
      `Got intermediate steps ${JSON.stringify(
        result.intermediateSteps,
        null,
        2
      )}`
    );

    res.status(200).send(result);
  });

  app.get('/create', async (req: Request, res: Response) => {
    const user = new Users()
    user.firstname = 'Timber'
    user.lastname = 'Saw'
    user.age = 25

    AppDataSource.manager.save(user)
      .then(user => {
        console.log('Saved a new user with id: ' + user.id)
        res.status(200).send();
      })
      .catch(error => console.log(error))
  });

  app.get('/read', async (req: Request, res: Response) => {
    AppDataSource.manager.find(Users)
      .then(users => {
        console.log('Loaded users: ', users)
        res.status(200).send(users);
      })
      .catch(error => console.log(error))
  });

  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
}).catch(error => console.log(error))
