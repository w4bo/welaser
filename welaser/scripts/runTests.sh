#!/bin/bash
set -exo

cd testScripts
for FILE in *.py; do echo $FILE; python $FILE; done
cd ..