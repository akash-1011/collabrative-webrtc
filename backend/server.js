const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const { generateFile } = require("./generateFile.js");
const { executeCpp } = require("./executeCpp.js");

const rooms = {};

app.use(cors());
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.get("/",(req,res)=>{
    return res.send("world");
});

app.post("/run", async (req,res)=>{

    const {language="cpp",code} = req.body;

    if(code === undefined){
        return res.status(400).json({success:false,error:"Empty code!"})
    }

    try {
        const filepath = await generateFile(language,code);
        const output = await executeCpp(filepath);
        return res.json({filepath,output});
    } catch (error) {
        res.status(500).json({error})
    }
        
});

io.on("connection", socket => {
    socket.on("join room", roomID => {
        if (rooms[roomID]) {
            rooms[roomID].push(socket.id);
        } else {
            rooms[roomID] = [socket.id];
        }
        const otherUser = rooms[roomID].find(id => id !== socket.id);
        if (otherUser) {
            socket.emit("other user", otherUser);
            socket.to(otherUser).emit("user joined", socket.id);
        }
    });

    socket.on("offer", payload => {
        io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", payload => {
        io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", incoming => {
        io.to(incoming.target).emit("ice-candidate", incoming.candidate);
    });
});

server.listen(8000, () => console.log('server is running on port 8000'));