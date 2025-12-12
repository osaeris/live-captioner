# Use a lightweight base
FROM python:3.11-slim

# Install only what Flask needs
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*



WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py /app/app.py
COPY static /app/static

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["/usr/local/bin/python3", "-u", "app.py"]
