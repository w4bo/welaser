#!/bin/bash
set -e

cd devices
./gradlew --stacktrace --scan
cd ..

cd testScripts
for FILE in *.py; do echo $FILE; python $FILE; done
cd ..