require('dotenv').config();
const express = require("express");
const http = require("http");
const app = express();
const cors = require("cors");
const { Server } = require("socket.io");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5174", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
})
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

    const taskCollection = client.db("taskMasterDB").collection('tasks');

    const userCollection = client.db("taskMasterDB").collection("users");


    // monitoring MongoDB Change Stream 
    const changeStream = taskCollection.watch();
    changeStream.on("change", (change) => {
      console.log("detect database changes:", change);

      if (change.operationType === "insert") {
        io.emit("task_added", change.fullDocument);
      } else if (change.operationType === "update") {
        io.emit("task_updated", { _id: change.documentKey._id, ...change.updateDescription.updatedFields });
      } else if (change.operationType === "delete") {
        io.emit("task_deleted", change.documentKey._id);
      }
    });


    //  WebSocket event for task update
    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("update_task", async ({ taskId, status }) => {
        await taskCollection.updateOne(
          { _id: new ObjectId(taskId) },
          { $set: { status } }
        );
      });

      socket.on("disconnect", () => {
        console.log("user disconnected", socket.id);
      });
    });

    app.post("/task", async (req, res) => {
      const task = req.body;
      const result = await taskCollection.insertOne(task);
      res.send(result);
    })

    app.get("/allTask", async (req, res) => {
      const result = await taskCollection.find().toArray();
      res.send(result);
    })

    app.post("/users", async (req, res) => {
      const userData = req.body;
      const query = { email: userData?.email };
      const userIsExist = await userCollection.findOne(query);

      if (userIsExist) {
        return res.send({message:"user is allReady exist",insertedId: null})
      }
      const result = await userCollection.insertOne(userData);
      res.send(result)
    })
    app.put("/taskUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const taskData = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          title: taskData?.title,
          description:taskData?.description
        }
      }
      const result = await taskCollection.updateOne(query, updatedDoc);
      res.send(result)
    })
    app.get("/singleTask/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await taskCollection.findOne(query);
      res.send(result);
    })
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

server.listen(port, () => {
  console.log(`🚀 Server is running on port: ${port}`);
});
// app.listen(port, () => {
//   console.log("task master is running on port: ", port)
// })





//  changeStream.on("change", (change) => {
//       console.log("detect database changes:", change);

//       if (change.operationType === "insert") {
//         io.emit("task_added", change.fullDocument);
//       } else if (change.operationType === "update") {
//         io.emit("task_updated", { _id: change.documentKey._id, ...change.updateDescription.updatedFields });
//       } else if (change.operationType === "delete") {
//         io.emit("task_deleted", change.documentKey._id);
//       }
//     });



//     //  WebSocket event for task update
//     io.on("connection", (socket) => {
//       console.log("User connected:", socket.id);

//       socket.on("update_task", async ({ taskId, status }) => {
//         await taskCollection.updateOne(
//           { _id: new ObjectId(taskId) },
//           { $set: { status } }
//         );
//       });

//       socket.on("disconnect", () => {
//         console.log("user disconnected", socket.id);
//       });
//     });

//     // faced all task
//     app.get("/allTask", async (req, res) => {
//       const result = await taskCollection.find().toArray();
//       res.send(result);
//     });

//   } catch (err) {
//     console.error("server error:", err);
//   }
// }

// run();

// server.listen(5000, () => {
//   console.log("server running: http://localhost:3000");
// });
