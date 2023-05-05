import 'reflect-metadata';
import path from 'path';
import multer from 'multer';
import express, { Express, Request, Response } from 'express';
import { RetrievalQAChain, loadQARefineChain } from "langchain/chains";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { OpenAI } from "langchain/llms/openai";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { SqlDatabase } from "langchain/sql_db";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { createSqlAgent, SqlToolkit } from "langchain/agents";
import { AppDataSource } from './data-source';
import { Users } from './entity/User';

import dotenv from 'dotenv';
dotenv.config();

const app: Express = express();
const port = process.env.PORT;
const openai_api_key = process.env.OPENAI_API_KEY;
const config = { openAIApiKey: openai_api_key, temperature: 0.7, cache: true };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
});
const upload = multer({ storage: storage });

AppDataSource.initialize().then(async () => {
  app.get('/', async (req: Request, res: Response) => {
    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: AppDataSource,
    });

    const toolkit = new SqlToolkit(db);
    const model = new OpenAI(config);
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

  app.get('/dashboard', function (req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
  });

  app.post('/upload', upload.single('pdf'), async (req, res) => {
    const loader = new PDFLoader('uploads/' + req.file?.filename);
    const docs = await loader.load();    
    const model = new OpenAI(config);
    const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
    const chain = new RetrievalQAChain({
      combineDocumentsChain: loadQARefineChain(model),
      retriever: vectorStore.asRetriever(),
    });
    
    const response = await chain.call({
      query: req.body.prompt,
    });
    res.send(response);
  });

  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
}).catch(error => console.log(error))
