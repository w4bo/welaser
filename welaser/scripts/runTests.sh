#!/bin/bash
set -exo

cd testScripts
source venv/bin/activate
for FILE in *.py; do echo "$FILE"; python "$FILE"; done
for FILE in *.sh; do echo "$FILE"; "./${FILE}"; done
cd -