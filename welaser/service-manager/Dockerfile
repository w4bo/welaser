FROM docker:dind
RUN apk add ca-certificates curl openjdk14 python3 py3-pip gettext
WORKDIR /usr/src/app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python3", "-u", "missionManager.py"]
