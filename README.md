# qn-backend-app

Backend app for frontend.

## Setup local env

Copy sample.env to .env file and update the configuration.

## Update env variable in docker-compose file

Add your environment variable here in bellow section of docker-compose file.

services:
api:
environment:

## Build and run the Docker containers locally:

`docker-compose up --build`

## Access the API

Once the containers are up and running, you can access the API at http://localhost:3000/health.

## Setup DB on your local machine

### Start the containers:

```
docker-compose -f docker-mongo-compose.yml up
```

### Initialize the replica set:

Connect to one of the MongoDB instances and initiate the replica set:

```
docker exec -it qn_mongo1 mongosh -u root -p root
```

In the Mongo shell, run the following commands:

```
use admin
```

```
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "qn_mongo1:27017" },
    { _id: 1, host: "qn_mongo2:27017" },
    { _id: 2, host: "qn_mongo3:27017" }
  ]
})
```

<!-- Trigger pipeline with this line 4 -->
