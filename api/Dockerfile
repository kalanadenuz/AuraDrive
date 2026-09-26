# OWNER: DevOps / Lead
# TASK: Write instructions to containerize the FastAPI app

FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first for Docker cache optimization
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire API module
COPY . /app/api

# Expose FastAPI default port
EXPOSE 8000

# Run Uvicorn pointing to the main FastAPI instance
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]