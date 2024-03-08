const { log } = require("console");
const express = require("express");
const app = express();

const http = require("http");
const path = require("path");
const server = http.createServer(app);
const { Server } = require("socket.io");
const { Socket } = require("socket.io-client");
const ACTIONS = require("./action");

const io = new Server(server);

app.use(express.static("build"));


const userSocketMap = {};

function getAllConnectedClients(roomid) {
  return Array.from(io.sockets.adapter.rooms.get(roomid) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);
  socket.on(ACTIONS.JOIN, ({ roomid, username }) => {
    console.log(roomid);

    console.log(username);

    userSocketMap[socket.id] = username;
    socket.join(roomid);

    const clients = getAllConnectedClients(roomid);

    console.log(clients);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  //disconnection

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomid) => {
      socket.in(roomid).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });

  //code sync
  socket.on(ACTIONS.CODE_CHANGE, ({ roomid, code }) => {
    socket.in(roomid).emit(ACTIONS.CODE_CHANGE, { code });
  });

  //auto code change

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  //
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("listen on port 5000");
});
