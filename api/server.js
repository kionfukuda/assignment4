/* eslint linebreak-style: ["error", "windows"] */
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { MongoClient } = require('mongodb');

const url = process.env.DB_URL || 'mongodb+srv://kfukuda:qi941211@freecluster-qs5ar.mongodb.net/productlist?retryWrites=true';

let db;

const CategoryType = {
  shirts: 'Shirts',
  jeans: 'Jeans',
  jackets: 'Jackets',
  sweaters: 'Sweaters',
  accessories: 'Accessories',
};

async function productList() {
  const products = await db.collection('products').find({}).toArray();
  return products;
}

async function getNextSequence(name) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { current: 1 } },
    { returnOriginal: false },
  );
  return result.value.current;
}

async function productAdd(_, { product }) {
  const newProduct = Object.assign({}, product);
  newProduct.id = await getNextSequence('products');

  const result = await db.collection('products').insertOne(newProduct);
  const savedProduct = await db.collection('products')
    .findOne({ _id: result.insertedId });
  return savedProduct;
}

async function connectToDb() {
  const client = new MongoClient(url, { useNewUrlParser: true });
  await client.connect();
  console.log('Connected to MongoDB at', url);
  db = client.db();
}

const resolvers = {
  Query: {
    productList,
  },
  Mutation: {
    productAdd,
  },
  CategoryType,
};

const server = new ApolloServer({
  typeDefs: fs.readFileSync('schema.graphql', 'utf-8'),
  resolvers,
});

const app = express();

app.use(express.static('public'));

server.applyMiddleware({ app, path: '/graphql' });

const port = process.env.API_SERVER_PORT || 3000;

(async function start() {
  try {
    await connectToDb();
    app.listen(port, () => {
      console.log(`API server started on port ${port}`);
    });
  } catch (err) {
    console.log('ERROR:', err);
  }
}());
