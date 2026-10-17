# OWNER: DevOps / Lead
# TASK: Write instructions to containerize the Python worker

FROM python:3.11-slim

# Disable bytecode generation and enable unbuffered terminal logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Install dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker application code
COPY . /app/worker

# Run the worker daemon
CMD ["python", "-m", "worker.worker"]