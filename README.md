# collab-server

[![CI test](https://github.com/cofacts/collab-server/actions/workflows/ci.yml/badge.svg)](https://github.com/cofacts/collab-server/actions/workflows/ci.yml) [![Coverage Status](https://coveralls.io/repos/github/cofacts/collab-server/badge.svg?branch=test)](https://coveralls.io/github/cofacts/collab-server?branch=test)

A [hocuspocus](https://github.com/ueberdosis/hocuspocus) application that serves as a collaboration backend.

## Development
### Environment variables
Create `.env` file from `.env.sample` template

### Install node Dependencies
```
npm i
```

### Run on local machine
```
npm run dev
```

## Deploy
### build docker image
```
docker build -t collab-server .
```

## Test

To prepare test DB, first start an elastic search server on port 62223:

```
$ docker run -d -p "62223:9200" --name "rumors-test-db" docker.elastic.co/elasticsearch/elasticsearch-oss:6.3.2
# for apple silicon Mac:
$ docker run -d -p "62223:9200" --name "rumors-test-db" webhippie/elasticsearch:6.4

# If it says 'The name "rumors-test-db" is already in use',
# Just run:
$ docker start rumors-test-db
```

Then run this to start testing:

```
$ npm t
```

If you want to run test on a specific file (ex: `src/xxx/__tests__/ooo.js`), run:

```
$ npm t -- src/xxx/__tests__/ooo.js
```


When you want to update jest snapshot, run:

```
$ npm t -- -u
```
