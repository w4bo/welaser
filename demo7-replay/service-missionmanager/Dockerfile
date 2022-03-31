#FROM openjdk:11
#RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release python3 python3-pip python3-dev python3-setuptools python3-wheel openssh-client

#RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
#RUN echo \
#      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
#      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
#RUN apt-get update
#RUN apt-get install -y docker-ce docker-ce-cli containerd.io

FROM docker:dind

RUN apk add ca-certificates curl openjdk11 python3 py3-pip # python3 python3-dev python3-pip

WORKDIR /usr/src/app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python3", "-u", "missionManager.py"]
