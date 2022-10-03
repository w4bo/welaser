# FROM gradle:7.5.1-jdk11
FROM openjdk:12
COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
# CMD ["./gradlew", "runIotAgent", "--stacktrace"]
CMD ["./gradlew", "runIotAgent", "--stacktrace", "--scan"]
