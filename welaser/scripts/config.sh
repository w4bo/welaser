cp .env.example .env
sed -i "s/127.0.0.1/$(hostname -I | cut -d' ' -f1)/g" .env
sed -i 's+/path/to/code/here+'$(pwd)'+g' .env
cp mosquitto/pwfile.example mosquitto/pwfile
cp service-dashboard/public/env.js.example service-dashboard/public/env.js
sed -i "s/127.0.0.1/$(hostname -I | cut -d' ' -f1)/g" service-dashboard/public/env.js

