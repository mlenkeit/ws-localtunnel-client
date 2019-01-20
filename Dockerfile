FROM node:10.14.0-alpine

COPY package.json .
COPY package-lock.json .
RUN npm install --production

COPY client.js .
COPY bin/client bin/

CMD ./bin/client -t $LT_API_TOKEN -h $LT_HOST -r $LT_REALM -p $LT_PORT
