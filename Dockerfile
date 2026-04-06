FROM node:20-bullseye-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
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

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./

# Step 1: Install only required (non-optional) packages
RUN npm install --legacy-peer-deps --omit=optional

# Step 2: Try optional packages - build won't fail if these error out
RUN npm install --legacy-peer-deps \
    @bochilteam/scraper \
    @bochilteam/scraper-tiktok \
    @bochilteam/scraper-facebook \
    ruhend-scraper mumaker lottie-node lottie-web canvas \
    || echo "[INFO] Some optional packages skipped - non-critical"

# canvas native rebuild (ok if fails)
RUN npm rebuild canvas --update-binary || echo "canvas rebuild skipped"

COPY . .

CMD ["node", "index.js"]
