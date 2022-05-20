#!/bin/bash
set -e

cd testScripts
for FILE in *.py; do echo $FILE; python $FILE; done
cd ..