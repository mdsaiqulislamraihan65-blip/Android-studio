FROM ubuntu:22.04

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    zip \
    git \
    openjdk-17-jdk \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Setup Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# Setup Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O android_tools.zip
RUN unzip -q android_tools.zip -d ${ANDROID_HOME}/cmdline-tools
RUN mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest
RUN rm android_tools.zip

# Accept licenses and install platform tools
RUN yes | sdkmanager --licenses
RUN sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# Setup App
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
