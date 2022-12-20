FROM openjdk:21
COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
CMD ["./gradlew", "runWriteToMongo", "--stacktrace", "--scan"]
