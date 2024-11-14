FROM node:20.10.0-alpine

#ENV NODE_ENV='staging'
#ENV PORT='3009'
#ENV AZURE_KEY_VAULT_URL='https://akv-2045-stg-001.vault.azure.net/'


WORKDIR /app

COPY package*.json .

RUN npm install

COPY . .

RUN npm run generate 

RUN npm run build

EXPOSE 3009

CMD [ "npm","start" ]
