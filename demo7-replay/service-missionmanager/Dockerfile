FROM openjdk:11
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl python3 python3-pip python3-dev python3-setuptools python3-wheel openssh-client
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python3", "-u", "missionManager.py"]
