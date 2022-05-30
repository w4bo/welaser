FROM gradle:7.4.2-jdk11
COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
# CMD ["./gradlew", "runIotAgent", "--stacktrace"]
CMD ["gradle", "runIotAgent", "--stacktrace", "--scan"]