const express = require("express");
const bodyParser = require('body-parser');
const moment = require('moment');
const cors = require('cors')
const app = express();
const path = require('path')
const fs = require('fs');
var router = express.Router();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function (req, res, next) {

    res.setHeader("Access-Control-Allow-Origin", "*");

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});
// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/build')))

let broadcaster;
const port = process.env.PORT || 4000;

const http = require("http");
const { watch } = require("fs");
const server = http.createServer(app);
var watchersCount = 0;
var broadcastersCount = 0;

const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
app.use(express.static(__dirname + "/public"));

io.sockets.on("error", e => console.log(e));
io.sockets.on("connection", socket => {
    socket.on("broadcaster", () => {
        broadcaster = socket.id;
        socket.broadcast.emit("broadcaster");
        broadcastersCount++;
    });
    socket.on("watcher", () => {
        socket.to(broadcaster).emit("watcher", socket.id);
    });
    socket.on("offer", (id, message) => {
        socket.to(id).emit("offer", socket.id, message);
    });
    socket.on("answer", (id, message) => {
        socket.to(id).emit("answer", socket.id, message);
    });
    socket.on("candidate", (id, message) => {
        socket.to(id).emit("candidate", socket.id, message);
    });
    socket.on("disconnect", () => {
        socket.to(broadcaster).emit("disconnectPeer", socket.id);
    });
});

app.get('/getio', (req, res) => {
    res.send(io);
});

app.get('/getwatchers', (req, res) => {
    res.send({ count: watchersCount, status: "ok", message: "retrieved number of watchers" });
});

app.get('/setwatcher', (req, res) => {
    watchersCount++;
    res.send({ count: watchersCount, status: "ok", message: "added watcher" });
});

app.get('/removewatcher', (req, res) => {
    watchersCount--;
    res.send({ count: watchersCount, status: "ok", message: "removed watcher" });
});

app.post('/savecomment', (req, res) => {
    const content = req.body.post;
    let date = moment();
    let dateStr = date.format("YY-MM-DD HH:mm:ss");
    content.time = dateStr;

    fs.readFile('comments.json', 'utf8', function readFileCallback(err, data) {
        if (err) {
            console.log(err);
            res.send({ status: "error", message: "failed to save comment" });
        } else {
            obj = JSON.parse(data); //now it an object
            obj.push(content); //add some data
            json = JSON.stringify(obj); //convert it back to json
            fs.writeFile('comments.json', json, 'utf8', function readFileCallback(error, data2) {
                if (error) {
                    console.log(error);
                } else {
                    res.send({ status: "ok", message: "comment saved" });
                }
            }); // write it back 
        }
    });
});

app.get('/getcomments', (req, res) => {
    fs.readFile('comments.json', 'utf8', function readFileCallback(err, data) {
        if (err) {
            console.log(err);
            res.send({ status: "error", message: "failed to read comments file" });
        } else {
            obj = JSON.parse(data); //now it an object
            json = JSON.stringify(obj); //convert it back to json
            res.send({ comments: json, status: "ok", message: "retrieved comments" });
        }
    });
});
// AFTER defining routes: Anything that doesn't match what's above, send back index.html; (the beginning slash ('/') in the string is important!)
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname + '/../frontend/build/index.html'))
// })

server.listen(port, () => console.log(`Server is running on port ${port}`));
