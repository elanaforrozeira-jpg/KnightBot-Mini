FROM node:20-bullseye-slim

# Install all native build deps for canvas + fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    && fc-cache -fv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Install all deps (canvas is optional, won't fail build if it errors)
RUN npm install --legacy-peer-deps --ignore-optional || npm install --legacy-peer-deps

# Try to build canvas separately (ok if fails, fallback exists in code)
RUN npm rebuild canvas --update-binary || echo "canvas rebuild failed, using text fallback"

COPY . .

CMD ["node", "index.js"]
