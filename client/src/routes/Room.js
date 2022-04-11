import React, { useRef, useEffect, useState } from "react"
import io from "socket.io-client"
import { useParams } from "react-router-dom";
import axios from "axios";
import "./Room.css"

const Room = () => {
    const userVideo = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const socketRef = useRef();
    const otherUser = useRef();
    const userStream = useRef();
    const sendChannel = useRef();
    const {roomID} = useParams();
    const [code, setCode] = useState('');
    const [output,setOutput] = useState('');
    const [text, setText] = useState("");
    const [otherVideo,setOtherVideo] = useState(false);
    const [messages,setMessages] = useState([]);

    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
            userVideo.current.srcObject = stream;
            userStream.current = stream;

            socketRef.current.emit("join room", roomID);

            socketRef.current.on('other user', userID => {
                callUser(userID);
                otherUser.current = userID;
            });

            socketRef.current.on("user joined", userID => {
                otherUser.current = userID;
            });

            socketRef.current.on("offer", handleRecieveCall);

            socketRef.current.on("answer", handleAnswer);

            socketRef.current.on("ice-candidate", handleNewICECandidateMsg);
        });
        
        socketRef.current.on("user left", id => {
            if(id == roomID) {
                setOtherVideo(false)
            }
        })

    }, [callUser,handleRecieveCall,roomID]);

    function callUser(userID) {
        peerRef.current = createPeer(userID);
        userStream.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStream.current));
        sendChannel.current = peerRef.current.createDataChannel('sendChannel');
        sendChannel.current.onmessage = handleRecieveMessage;
    }

    function handleRecieveMessage(e) {
        setMessages(messages => [...messages,{yours: false, value: e.data}]);
    }

    function createPeer(userID) {
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                },
            ]
        });

        peer.onicecandidate = handleICECandidateEvent;
        peer.ontrack = handleTrackEvent;
        peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

        return peer;
    }

    function handleNegotiationNeededEvent(userID) {
        peerRef.current.createOffer().then(offer => {
            return peerRef.current.setLocalDescription(offer);
        }).then(() => {
            const payload = {
                target: userID,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            };
            socketRef.current.emit("offer", payload);
        }).catch(e => console.log(e));
    }

    function handleRecieveCall(incoming) {
        peerRef.current = createPeer();
        peerRef.current.ondatachannel = (event) => {
            sendChannel.current = event.channel;
            sendChannel.current.onmessage = handleRecieveMessage;
        }
        const desc = new RTCSessionDescription(incoming.sdp);
        peerRef.current.setRemoteDescription(desc).then(() => {
            userStream.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStream.current));
        }).then(() => {
            return peerRef.current.createAnswer();
        }).then(answer => {
            return peerRef.current.setLocalDescription(answer);
        }).then(() => {
            const payload = {
                target: incoming.caller,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            }
            socketRef.current.emit("answer", payload);
        })
    }

    function handleAnswer(message) {
        const desc = new RTCSessionDescription(message.sdp);
        peerRef.current.setRemoteDescription(desc).catch(e => console.log(e));
    }

    function handleICECandidateEvent(e) {
        if (e.candidate) {
            const payload = {
                target: otherUser.current,
                candidate: e.candidate,
            }
            socketRef.current.emit("ice-candidate", payload);
        }
    }

    function handleNewICECandidateMsg(incoming) {
        const candidate = new RTCIceCandidate(incoming);

        peerRef.current.addIceCandidate(candidate)
            .catch(e => console.log(e));
    }

    function handleTrackEvent(e) {
        if(e.streams){
            setOtherVideo(true)
        }
        partnerVideo.current.srcObject = e.streams[0];
    };

    function sendMessage() {
        sendChannel.current.send(text);
        setMessages(messages => [...messages,{yours: true, value: text}]);
        setText("");
    }

    const handleSubmit = async () => {
        const payload = {
            language: "cpp",
            code
        };
        const result = await axios.post("http://localhost:8000/run",payload)
        console.log(result.data.output);
        setOutput(result.data.output);
    }

    return (
        <div className="room">
            <div className="left">
                <div className="editor">
                    <div className="type">
                        <textarea rows="20" cols="50" value={code} onChange={(e) => {setCode(e.target.value)}} />
                    </div>
                    <button onClick={handleSubmit}>Submit</button>
                    <div className="output">
                        <p>{output}</p>
                    </div>
                </div>
            </div>
            <div className="right">
                <div className="video">
                    <div className="myVideo">
                        <video autoPlay style={{height: "400px", width: "400px", margin: "5px"}} ref={userVideo} />
                    </div>
                    {
                        otherVideo ? 
                            <div className="otherVideo">
                                <video autoPlay style={{height: "400px", width: "400px", margin: "5px"}} ref={partnerVideo} />
                            </div> 
                            : <p>no user</p>
                    }
                </div>
                {/* {messages.forEach(msg => {
                    <p>{msg.value}</p>                    
                })}
                <input type="text" value={text} onChange={e => setText(e.target.value)}></input>
                <button onClick={sendMessage}>send</button> */}
            </div>
        </div>
    );
};

export default Room