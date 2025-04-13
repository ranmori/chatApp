import React, {useState, useEffect} from "react";
import socketClient from "./Socket";

export default function Chats() {
    const [text, setText] = useState("");
    const [error, setError] = useState(false);

    const [chat, setChat] = useState([
        {id: 1, text: "Hello"},
       
      
    ]);
    
    const [user, setUser] = useState([
        {id: 1, name: "User1"},
        
       
    ]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(''); // state to store the current user

    const handlesendMesages = (e) => {
        e.preventDefault(); // prevent the default action
        if (text.trim() === "") { // if the text is empty
            setError(true); // set error to true
            return;  // return
        }
        
        setIsLoading(true); // set loading to true
        
        // Emit the message to the server
        socketClient.emit("sendMessage", {
            message: text,
            roomId: "default-room"
        });
        
        setText(""); // clear the input
        setError(false); // set error to false
        
        setTimeout(() => {
            setIsLoading(false); // set loading to false
        }, 1000);
    } // function to handle the messages

    const handleUserSelect = (userName) => {
        setCurrentUser(userName);
    }
        
   // Initialize socket connection and event listeners
   useEffect(() => {
    // Set up socket event listeners
    socketClient.on("connect", () => { // listen for the connect event
        console.log("Connected to server"); // log the connection
        // Join the chat with a default room when connected
        socketClient.emit("join", {  // emit the join event
            username: currentUser || "Anonymous", // set the username to anonymous if not set
            roomId: "default-room"  // set the room id to default-room
        });
    });

    socketClient.on("message", (data) => { // listen for the message event
        setChat(prevChat => [...prevChat, { // set the chat to the new message
            id: Date.now(),  // set the id to the current time
            text: data.text, // set the text to the message
            sender: data.user  // set the sender to the user
        }]);
    });

    socketClient.on("userList", (userList) => {
        setUser(userList.map((username, index) => ({
            id: index + 1,
            name: username
        })));
    });

    socketClient.on("typing", (data) => { //    listen for the typing event
        console.log(`${data.user} is typing...`); // log the typing event
    });

    socketClient.on("disconnect", () => { // listen for the disconnect event
        console.log("Disconnected from server"); // log the disconnection
    });

    socketClient.on("error", (error) => { // listen for the error event
        console.error("Socket error:", error); // log the error
    });

    // Emit join event whenever currentUser changes
    if (socketClient.connected && currentUser) {
        socketClient.emit("join", {
            username: currentUser,
            roomId: "default-room"
        });
    }

    // Clean up on unmount
    return () => {
        socketClient.off("connect");
        socketClient.off("message");
        socketClient.off("userList");
        socketClient.off("typing");
        socketClient.off("disconnect");
        socketClient.off("error");
    };
   }, [currentUser]);

    return (
    <>
    {isLoading ? 
    <div className="loading">
        <h2> Loading...</h2>
    </div> :
    <div className="chat-container ">
        <div className=" bg-blue-500 text-white   p-5 m-2 rounded-sm shadow-md top--8  "> 
          
            <p> Welcome<span className="text-black text-bold" > {currentUser}</span> {/* show the current user */} </p>
        </div>
        <div className="flex flex-cols align-center justify-between p-2">
            <h3>User:</h3>
            <ul>
                {user.map((user) => ( // map through the users
                    <li key={user.id} 
                    onClick={() => handleUserSelect(user.name)} // Fixed: set the current user when clicked
                    style={{ cursor: "pointer", color: currentUser === user.name ? 'blue' : 'yellow' }} // change the color of the current user
                    >{`"${user.name} " `}</li>  // print the user name
                ))}
            </ul>
        </div>
        <div className="chat-error">
            {error && 
            <p className="error">Please enter a message</p>} {/* if error is true, show the error message */}
            </div>
            <div className="bg-white rounded-lg p-4 shadow-md w-full max-w-md">
  {chat.map((message) => (
    <div 
      key={message.id}
      className={`flex my-2 ${message.sender === currentUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg flex flex-cols align-center   ${
          message.sender === currentUser 
            ? 'bg-blue-500 text-white rounded-br-none border-r-10 border-black'  
            : 'bg-gray-200 text-black rounded-bl-none'
        }`}
      >
        {message.sender && (
          <div className="font-semibold text-xs bottom-10 text-gray-600 mb-1 ">
            {message.sender} :
          </div>
        )}
        <div className="text-sm uppercase">
          {message.text}
        </div>
        
      </div>
    </div>
  ))}
</div>
                <form action="" onSubmit={handlesendMesages} className="my-4 ">
                <input className="bg-white text-black rounded-lg px-4 relative py-2  w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="text"
            value={text}  
            placeholder="Type a message..." 
            onChange= {(e) => {
                setText(e.target.value);
                setError(false);
                
                // Emit typing event
                socketClient.emit("typing", {
                    roomId: "default-room"
                });
            }}
            
            disabled={isLoading}
            />
            <button
            className=" text-blue-500 relative bottom-10 left-28  mx-1 rounded-lg px-4 py-2 hover:bg-blue-500 hover:text-white"
            type="submit"
            disabled={isLoading}
            > 
            Send
            </button>
            </form>
        </div>
    }
    </>
    );
}