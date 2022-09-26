FROM gradle:7.5.1-jdk11
COPY src /usr/src/myapp/src
COPY build.gradle /usr/src/myapp
COPY .env /usr/src/myapp
WORKDIR /usr/src/myapp
CMD ["gradle", "check", "runMission", "--stacktrace", "--scan"]