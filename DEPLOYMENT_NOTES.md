# Deployment Fix for Steel Sigma Optimizer Backend

## Issue Analysis
The Cloud Run deployment for `steel-sigma-optimizer` was failing with the error:
> "The user-provided container failed to start and listen on the port defined provided by the PORT=8000 environment variable within the allocated timeout."

This was caused by a missing system dependency in the runtime Docker image (`python:3.11-slim`). Specifically, `libgomp1` (GCC OpenMP) is required by machine learning libraries such as `scikit-learn`, `xgboost`, and `lightgbm`, which are used in the backend. Without this library, the application crashes immediately on startup due to an `ImportError`.

## The Fix
Update `backend/Dockerfile` in the `steel-sigma-optimizer` repository to install `libgomp1` in the final runtime stage.

### Corrected Dockerfile Content

```dockerfile
# Multi-stage build for Python backend with ML packages
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ \
    cmake \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

# Install runtime dependencies
# Added libgomp1 for ML libraries (XGBoost, LightGBM, scikit-learn)
RUN apt-get update && apt-get install -y \
    libpq5 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY . .

# Copy and make entrypoint executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create directories for models and data
RUN mkdir -p /app/models /app/data /app/logs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Add user's local bin to PATH
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application via entrypoint (handles DB init + server start)
ENTRYPOINT ["/app/entrypoint.sh"]
```
