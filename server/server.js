const WebSocket = require('ws');
const http = require('http');

// Basic HTTP server just to host the WebSocket server
const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Drawing Collaboration Server is Active');
});

// WebSocket server setup
const wsServer = new WebSocket.Server({ server: httpServer });

// Keep track of who is connected
const connectedClients = new Set();

console.log('WebSocket server starting on port 8080...');

wsServer.on('connection', (socket) => {
    console.log('A user connected.');
    connectedClients.add(socket);

    // Handle messages coming
    socket.on('message', (messageAsString) => {
        try{
            const messageData = JSON.parse(messageAsString);
            if(messageData.type === 'draw_segment' || messageData.type === 'reset'){
                broadcastMessage(messageAsString, socket);
            } 
            else{
                 console.log("Ignoring unknown message type:", messageData.type);
            }

        } 
        catch(error){
            console.error("Couldn't parse message JSON:", error);
            console.error("Received problematic message:", messageAsString.toString());
        }
    });

    // Handle user disconnection
    socket.on('close', (code, reason) => {
        const reasonText = reason ? reason.toString() : 'N/A';
        console.log(`User disconnected. Code: ${code}, Reason: ${reasonText}`);
        connectedClients.delete(socket);
    });

    socket.on('error', (error) => {
        console.error('WebSocket error for one client:', error);
        connectedClients.delete(socket);
    });
});

// Function to send a message to all clients EXCEPT the one who sent it
function broadcastMessage(messageStr, senderSocket){
    connectedClients.forEach((client) => {
        if(client !== senderSocket && client.readyState === WebSocket.OPEN){
            client.send(messageStr);
        }
    });
}

// Start listening
const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});