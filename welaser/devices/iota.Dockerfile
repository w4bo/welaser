FROM gradle:7.5.1-jdk11
COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
CMD ["gradle", "runIotAgent", "--stacktrace", "--scan"]