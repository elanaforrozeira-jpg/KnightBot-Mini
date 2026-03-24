FROM node:20-bullseye-slim

# Install all native build deps for canvas + fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
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
    && fc-cache -fv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Full install (canvas needs native compile, so NOT --omit=dev for build step)
RUN npm install

COPY . .

CMD ["node", "index.js"]
