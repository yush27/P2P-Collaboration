# P2P-Collaboration 🖥️
- A real-time collaborative whiteboard built using React, Node.js, and WebSockets.

## Demo
https://github.com/user-attachments/assets/a4f110de-b6fa-4278-ad0d-a1d4ae38fbb4

## Features ✨
- **Real-time Collaboration** — Seamless canvas sync  
- **Drawing Tools** — Pencil and eraser with customizable brush & colour  
- **Canvas Reset** — One-click reset for all users  
- **WebSocket Communication** — Low-latency bidirectional communication  

## Tech Stack
### Frontend
- ReactJS
- HTML5 Canvas API
- JavaScript (ES6+)
### Backend
- Node.js
- Websocket

## Getting Started ⚙️
### 1. Clone the Repository
```bash
git clone https://github.com/yush27/P2P-Collaboration.git
cd P2P-Collaboration
```
### 2. Setup & Start the Backend Server

* Navigate to the server directory:

    ```bash
    cd server
    ```

* Install dependencies:

    ```bash
    npm install
    ```

* Start the server:

    ```bash
    npm start
    ```
### 3. Setup & Start the Frontend Client
*   Open a **new, separate terminal window** or tab.
    *   Navigate to the client directory from the project root:
        ```bash
        cd client
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```
    *   Start the React development server:
        ```bash
        npm start
        ```
### 4. Test the Collaboration
- **Open** `http://localhost:3000` in two or more separate browser tabs or windows
- **Check** the developer console in each tab for "WebSocket Connected"
- **Now draw** in one tab – it should appear in the others!

## License 📄
This project is licensed under the [MIT License](LICENSE).
