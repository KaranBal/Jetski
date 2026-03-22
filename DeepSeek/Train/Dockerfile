# Use PyTorch with CUDA support as base
FROM pytorch/pytorch:2.2.2-cuda12.1-cudnn8-devel

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install AI/ML stack for Reinforcement Learning (GRPO)
# TRL with vLLM support enables efficient GRPO rollouts
RUN pip install --no-cache-dir \
    transformers \
    accelerate \
    datasets \
    trl[vllm] \
    deepspeed \
    gcsfs \
    fsspec \
    sentencepiece

# Set work directory
WORKDIR /app

# Copy training script
COPY train_grpo.py /app/train_grpo.py

# Ensure correct permissions
RUN chmod +x /app/train_grpo.py

# Command to run (will be overwritten by K8s Job args usually)
CMD ["python", "train_grpo.py"]
