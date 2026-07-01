const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      ws.room = data.room;
      ws.role = data.role;

      rooms[ws.room] = rooms[ws.room] || {};
      rooms[ws.room][ws.role] = ws;

      console.log(`${data.role} joined room ${data.room}`);
      return;
    }

    const room = rooms[ws.room];
    if (!room) return;

    const targetRole = ws.role === "caller" ? "receiver" : "caller";
    const target = room[targetRole];

    if (target && target.readyState === WebSocket.OPEN) {
      target.send(JSON.stringify(data));
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms[ws.room]) {
      delete rooms[ws.room][ws.role];
    }
  });
});

server.listen(3010, () => {
  console.log("WebRTC signaling server running on port 3010");
});
