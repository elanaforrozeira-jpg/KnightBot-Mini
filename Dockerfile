FROM node:20-bullseye-slim

# Install git + native build deps + yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    python3 \
    python3-pip \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    fontconfig \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto \
    && pip3 install --no-cache-dir yt-dlp \
    && fc-cache -fv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

# Try canvas rebuild (ok if fails)
RUN npm rebuild canvas --update-binary || echo "canvas rebuild skipped"

COPY . .

CMD ["node", "index.js"]
