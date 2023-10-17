FROM python:3.11.2
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "-u", "server.py"]
