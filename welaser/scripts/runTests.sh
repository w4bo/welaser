#!/bin/bash
set -e

cd devices
./gradlew
cd ..

cd testScripts
for FILE in *.py; do echo $FILE; python $FILE; done
cd ..