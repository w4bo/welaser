#!/bin/bash

# Declare an array of string with type
declare -a StringArray=("137.204.74.56" "10.100.201.6" "localhost" "127.0.0.1" "1026" "192.168.0.6" "0\.0\.0\.0")

# Iterate the string array using for loop
for val in ${StringArray[@]}; do
  echo "Checking for $val"
  grep -nwr '.' -e $val --exclude='*IPs.sh' --exclude='README.md'
  echo "---"
done

# find . -type f  -exec sed -i 's/137.204.74.56/10.100.201.6/g' {} +
# find . -type f  -exec sed -i 's/10.100.201.6/137.204.74.56/g' {} +
