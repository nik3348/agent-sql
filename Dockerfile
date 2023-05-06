FROM node:lts-slim

WORKDIR /app

COPY package.json ./

RUN apt-get update || : && apt-get install python3 -y || : && apt-get install build-essential -y

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD [ "npm", "run", "dev" ]
