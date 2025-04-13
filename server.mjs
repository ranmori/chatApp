import express from "express";
import cors from "cors"

import { createServer } from "http" // import http from "http"
import { Server } from "socket.io" // import {Server} from "socket.io"
import mongoose, { model, Schema } from "mongoose"; // import mongoose from "mongoose"
import dotenv from "dotenv"; // import dotenv from "dotenv"


const app = express();
// load the environment variables
dotenv.config();

const httpserver = createServer(app);
const io = new Server(httpserver, { 
    cors: {
        origin: "http://localhost:5173",       
        methods: ["GET", "POST"],
        credentials: true,
    }
}) // create a new server instance
// create a new server instance with the cors options

const PORT= process.env.PORT || 3018;
const MONGODB_URI= process.env.MONGODB_URI || "mongodb://localhost:27017/ChatApp";
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
})); // use cors to allow cross-origin requests
app.use(express.urlencoded({extended: true})); // use express to parse the urlencoded data
app.use(express.json());
   
// create a new schema for the messages
 
const MessageSchema= new Schema({
    roomId:{
        type: String,
        required: true,
    },
    sender:{
        type: String,
        required: true,
    },
    receiver:{
        type: String,
        required: true,
    },
    message:{
        type: String,
        required: true,
    },
    timestamp:{
        type: Date,
        default: Date.now,
    },
    read:{
        type: Boolean,
        default: false,
    },
    // add the read status
    // add the timestamp
    // add the sender and receiver
    // add the message
})

// determine the schema types
const userSchema= new Schema({
    email:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    username:{
        type: String,
        required: true
    },
    onlineStatus:{
        type: Boolean,
        required: true
    },
})
// make it a modal
const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", MessageSchema);
// create the express app

// connect to the database
mongoose.connect(MONGODB_URI, {
// ensure the connection string is parsed
    useNewUrlParser: true,
    // use the new parser by ensuring a better server discovery
    useUnifiedTopology: true
}).then(() => { 
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
})

const users = {} // create a new object to store the users

// create a new socket instance
io.on("connection", socket => {

    console.log("New user connected", socket.id); // log the new user
    let currentroomId = null // create a new variable to store the current room id

    socket.on("join", ({username, roomId}) => { // listen for the join event
        currentroomId = roomId // set the current room id
        socket.join(roomId); // join the room
        users[socket.id] = username; // add the user to the users object
        console.log(`${username} joined room ${roomId}`); // log the user and room
        socket.to(roomId).emit("message", {user: "admin", text: `${username} has joined!`}); // send a message to the room
        
        // Send the updated user list to everyone in the room
        const userList = Object.values(users);
        io.to(roomId).emit("userList", userList);
    })
    
   socket.on("sendMessage", async ({message, roomId}) => { // listen for the sendMessage event
       io.to(roomId).emit("message", {user: users[socket.id], text: message}); // send the message to the room
       console.log(`${users[socket.id]}: ${message}`); // log the message

       try {
           const newMessage = new Message({ // create a new message object
               roomId, // set the room id
               sender: users[socket.id], // set the sender
               receiver: "all", // Default to "all" for group messages
               message // set the message
           });
           await newMessage.save(); // save the message to the database
       } catch (err) {
           console.error(err); // log the error
       }
    });
    
    socket.on("disconnect", () => { // listen for the disconnect event
        const username = users[socket.id];
        if (username && currentroomId) {
            console.log("user disconnected", username); // log the user
            socket.to(currentroomId).emit("message", {user: "admin", text: `${username} has left!`}); // send a message to the room
            
            // Remove user and update user list
            delete users[socket.id]; // delete the user from the users object
            const userList = Object.values(users);
            io.to(currentroomId).emit("userList", userList);
        }
    });
    
    socket.on("typing", ({roomId}) => {
        socket.to(roomId).emit("typing", {user: users[socket.id]}); // send a typing event to the room
    })
})// listen for the connection event

app.get("/users", async (req, res) => { // create a new route to get the users
    try {  // try to get the users
        const users = await User.find(); // find all the users
        res.status(200).json(users); // send the users as a response
    } catch (err) {
        console.error(err); // log the error
        res.status(500).json({ message: "Internal Server Error" }); // send an error response
    }
});

app.post("/users", async (req, res) => { // create a new route to create a user
    try {
        const { email, password, username } = req.body; // get the email, password and username from the request body
        const user = new User({
            email,
            password, // Note: In production, you should hash the password before saving
            username,
            onlineStatus: false
        });
        await user.save(); // save the user to the database
        res.status(201).json(user); // send the user as a response
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get("/messages", async (req, res) => { // create a new route to get the messages
    try {
        const messages = await Message.find(); // find all the messages
        res.status(200).json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post("/messages", async (req, res) => { // create a new route to create a message
    try {
        const { roomId, sender, receiver, message } = req.body; // get the roomId, sender, receiver and message from the request body
        const newMessage = new Message({
            roomId,
            sender,
            receiver,
            message
        });
        await newMessage.save(); // save the message to the database
        res.status(201).json(newMessage); // send the message as a response
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Start the server after MongoDB connects
httpserver.listen(PORT, () => { // listen for the server
    console.log(`listening to ${PORT}`); 
});