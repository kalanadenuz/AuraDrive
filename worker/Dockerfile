# OWNER: DevOps / Lead
# TASK: Production-ready containerization for asynchronous image processor worker

FROM python:3.11-slim

# Disable bytecode generation and enable unbuffered terminal logging
ENV PYTHONTDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install native image manipulation headers and curl for debugging/health
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg-dev \
    zlib1g-dev \
    libwebp-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy worker application code into module path
COPY . /app/worker

# Run the worker daemon as an executable module
CMD ["python", "-m", "worker.worker"]