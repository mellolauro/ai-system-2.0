sudo apt update
sudo apt install nodejs npm -y

Clonar o repositório

npm install

criar .env

npx prisma generate
npx prisma db push 

npm install -g pm2

pm2 start src/server.js --name ai-system-api
pm2 save
pm2 startup

sudo ufw allow 3000
