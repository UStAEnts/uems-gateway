docker build --tag uems-gateway:0.1 .
docker run --publish 15450:15450 --detach uems-gateway:0.1
