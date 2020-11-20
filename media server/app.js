"use-strict";

//server configuration
let express = require("express");
let app = express();
let uuid = require('uuid/v4');

let server = require("http").createServer(app);
let io = require("socket.io")(server);
let port = process.env.PORT || 9000;


//array to keep track of online users
let onlineUsers = [];

//function to get list of current online users
let getOnlineUsers = () => {
    let returnedOnlineUsers = [];
    onlineUsers.forEach(user => {
        returnedOnlineUsers.push(user.username);
    })
    return returnedOnlineUsers;
}

//function to find one particular user
let findOnlineUser = (username) => onlineUsers.find(user => user.username === username);

io.sockets.on("connection", (socket) => {
    //emit to all clients about list of online users
    io.emit("online_users", getOnlineUsers());

    //add new user connected to the socket
    socket.on("add_online_user", (username) => {
        let onlineUser = findOnlineUser(username);
        if (onlineUser !== null && onlineUser !== undefined) {
            onlineUser.sockets.push(socket);
            console.log(username, " user already exists, add to the sockets......... Length: ", onlineUser.sockets.length);
        } else {
            let user = {};
            user["username"] = username;
            user["sockets"] = [].concat(socket);
            console.log("new user added", username);
            onlineUsers.push(user);
        }
        io.emit("online_users", getOnlineUsers());
    });

    //handle video call info
    socket.on("video_call_signal", (data) => {

        let onlineUser = findOnlineUser(data.receiver);
        if (onlineUser !== null && onlineUser !== undefined) {
            switch (data.type) {
                case "video-offer":
                    onlineUser.sockets.forEach(s => {
                        data["socketOrigin"] = socket.id;
                        io.to(s.id).emit("video_call", data);
                    });
                    break;

                case "video-hangup":
                case "new-ice-candidate":
                    console.log("....sending ", data.type, "....")
                    onlineUser.sockets.forEach(s => {
                        io.to(s.id).emit("video_call", data);
                    });
                    break;

                case "video-picked-up":
                    onlineUser.sockets.forEach(s => {
                        if (s.id !== socket.id) {
                            io.to(s.id).emit("video_call", data);
                        }
                    });

                case "video-answer":
                case "video-decline":
                    io.to(data.socketOrigin).emit("video_call", data);
                    break;

                default:
                    console.log("Unknown event...");
                    break;
            }

        }
    });

    socket.on("disconnect", () => {
        onlineUsers.some(user => {
            let socketIndex = user.sockets.indexOf(socket);
            if (socketIndex !== -1) {
                user.sockets.splice(socketIndex, 1); //remove one socket when user closes a tab
                if (user.sockets.length === 0) { //check if user doesn't have any socket connected to the server
                    onlineUsers.splice(onlineUsers.indexOf(user), 1);
                }
                console.log("user disconnected ", user.username, " ", socket.id, "....Length: ", user.sockets.length);
                return true;
            }
            return false;
        });
        io.emit("online_users", getOnlineUsers());
    });
});



server.listen(port, () => console.log(`Server is listening on port ${port}`));