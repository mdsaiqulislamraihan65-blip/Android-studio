FROM node:20-bullseye-slim

WORKDIR /app

# Install bash and basic utils just in case needed for runtime setup
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y curl wget unzip zip git bash sudo && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
