FROM openjdk:21
COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
CMD ["./gradlew", "runWriteImages", "--stacktrace", "--scan"]
