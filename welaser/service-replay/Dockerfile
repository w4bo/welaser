FROM docker:dind
RUN apk add curl openjdk11 python3 py3-pip
WORKDIR /usr/src/app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "-u", "replayExecutor.py"]
