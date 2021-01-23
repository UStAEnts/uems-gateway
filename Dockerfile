FROM node:current-alpine

# Setup where to store the app
WORKDIR /user/app

# Normally we want to run the cached built one
CMD ["npm", "run", "start:old"]

# This app exposes an API on this port
EXPOSE 15450

# Copy in package.json file and package-lock.json if its present
# This means that everything will be redone if the dependencies change
# (but also if you add new scripts and stuff)
COPY package*.json ./

# Mark this as a development image which will enable more in-depth logging and
# stuff like that
ENV NODE_ENV=dev

# Install the dependencies! This will be the longest step
RUN npm install

# Copy in the source files to the root of the project. These will be filtered by
# .dockerignore
COPY . .

# As we are running 'start' this relies on the built version of the project, so build it
# (if it is present)
RUN npm run build --if-present
