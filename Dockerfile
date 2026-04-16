FROM ubuntu:22.04

# Setup basic curl to install Node.js
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Setup Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

# Setup App
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
