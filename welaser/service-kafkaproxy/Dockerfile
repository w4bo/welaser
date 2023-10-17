FROM node:19
WORKDIR /app
COPY ["package.json", "package-lock.json", "./"]
RUN npm install
COPY . .
USER node
CMD ["npm", "run", "mystart"]
