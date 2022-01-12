FROM python:3
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y openssh-client
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "-u", "missionManager.py"]
