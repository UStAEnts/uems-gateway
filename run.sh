tsc app.ts
docker build --tag uems-gateway:0.1 .
sudo docker run --publish 15450:15450 --detach uems-gateway:0.1
