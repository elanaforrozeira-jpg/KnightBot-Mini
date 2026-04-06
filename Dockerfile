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

# Install required deps — optional ones can fail safely
RUN npm install --legacy-peer-deps --omit=optional || \
    npm install --legacy-peer-deps --omit=optional --ignore-scripts

# Try optional packages separately (ok if they fail)
RUN npm install --legacy-peer-deps \
    @bochilteam/scraper \
    @bochilteam/scraper-tiktok \
    @bochilteam/scraper-facebook \
    ruhend-scraper \
    mumaker \
    lottie-node \
    lottie-web \
    canvas || echo "Optional packages skipped — non-critical"

# canvas rebuild (ok if fails)
RUN npm rebuild canvas --update-binary || echo "canvas rebuild skipped"

COPY . .

CMD ["node", "index.js"]
