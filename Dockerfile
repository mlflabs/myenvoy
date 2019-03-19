
FROM node:10-alpine
ENV VERSION=2 PORT=80

# ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

COPY . /opt/app

WORKDIR /opt/app


# Extras:
# RUN apk --update add make python gcc g++

# Globally installed NPMs:
# RUN npm install -g nodemon
# RUN apk add --no-cache --virtual .gyp python make g++ \
#    && npm install -- production \
#    && npm install -g pm2 \
#    && apk del .gyp 
    

RUN npm install --production
RUN npm install -g pm2

# logs by default are in logs
RUN mkdir -p logs

EXPOSE ${PORT}

# npm start, make sure to have a start attribute in "scripts" in package.json
CMD pm2 --output logs/out.log --error logs/error.log start npm -- start
