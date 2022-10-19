FROM openjdk:13
COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
CMD ["./gradlew", "runWriteToMongo", "--stacktrace", "--scan"]
