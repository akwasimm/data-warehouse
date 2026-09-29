FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# psycopg[binary] ships its own libpq, so no apt layer is needed.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health', timeout=4).status == 200 else 1)"

# Reach the warehouse's existing dwh-pg container by default. DWH_PASSWORD is
# deliberately absent: bake a credential into an image and it ends up in every
# layer, every `docker history`, and every push. Provide it at run time --
# docker compose already does, and Render reads it from the environment.
ENV DWH_DIALECT=postgres \
    DWH_HOST=host.docker.internal \
    DWH_PORT=5433 \
    DWH_DATABASE=datawarehouse \
    DWH_USER=postgres

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
