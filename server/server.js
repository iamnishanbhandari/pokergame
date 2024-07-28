require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const socketio = require("socket.io");
const http = require("http");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");
const authRoutes = require("./routes/auth");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_ATLAS_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", (error) => {
  console.error("Connection error:", error);
});
db.once("open", () => {
  console.log("Connected to database");
});

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,UPDATE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept"
  );
  next();
});
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("waiting", () => {
    console.log("Client added to waiting room:", socket.id);
    socket.join("waitingRoom");
    const waitingClients = Array.from(
      io.sockets.adapter.rooms.get("waitingRoom") || []
    );
    io.to("waitingRoom").emit("waitingRoomData", {
      waiting: waitingClients,
    });

    if (waitingClients.length >= 2) {
      const [id1, id2] = waitingClients.slice(0, 2);
      const code = randomCodeGenerator(3);
      io.to(id1).emit("randomCode", { code });
      io.to(id2).emit("randomCode", { code });
      console.log(`Match made between ${id1} and ${id2} with code ${code}`);
      io.sockets.sockets.get(id1).leave("waitingRoom");
      io.sockets.sockets.get(id2).leave("waitingRoom");
      io.to("waitingRoom").emit("waitingRoomData", {
        waiting: Array.from(io.sockets.adapter.rooms.get("waitingRoom") || []),
      });
    }
  });

  socket.on("waitingDisconnection", (id) => {
    if (id) {
      console.log(`Client removed from waiting room: ${id}`);
      io.sockets.sockets.get(id).leave("waitingRoom");
    } else {
      console.log(`Client removed from waiting room: ${socket.id}`);
      socket.leave("waitingRoom");
    }
    const waitingClients = Array.from(
      io.sockets.adapter.rooms.get("waitingRoom") || []
    );
    io.to("waitingRoom").emit("waitingRoomData", {
      waiting: waitingClients,
    });
    socket.emit("waitingRoomData", { waiting: waitingClients });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

function randomCodeGenerator(length) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
