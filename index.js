require('dotenv').config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require('mongodb');



app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jo0u1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const taskCollection = client.db("taskMaster").collection('tasks');
    const userCollection = client.db("taskMaster").collection("users");

      // Create a Task
    app.post("/tasks", async (req, res) => {
      try {
        const task = req.body;
        task.timestamp = new Date();
        const result = await taskCollection.insertOne(task);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error creating task", error });
      }
    });


    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('task master on fire')
})

app.listen(port, () => {
  console.log("task master is running on port: ",port)
})