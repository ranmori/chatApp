import { io } from "socket.io-client";

const socket = io("http://localhost:3018", { // Replace with your backend URL
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"] // Use WebSocket and polling transports
});
 
export const socketClient = socket; // export the socket client instance
export default socketClient; // export the socket client