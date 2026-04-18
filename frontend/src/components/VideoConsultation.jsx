import { useState, useRef, useEffect, useCallback } from "react";
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Monitor, Settings, Users, Maximize2, Minimize2 } from "lucide-react";
import { api } from "../lib/api";
import { useSocket } from "../context/SocketContext";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function VideoConsultation({ appointmentId, doctorId, patientName, onEnd }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const { socket, joinRoom, leaveRoom, sendOffer, sendAnswer, sendIceCandidate } = useSocket();

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setError("Không thể truy cập camera/microphone. Vui lòng kiểm tra quyền.");
      return null;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStreamObj] = event.streams;
      setRemoteStream(remoteStreamObj);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamObj;
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        // Get the other participant's socket ID from the room
        // For simplicity, we'll broadcast to all in room
        socket?.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setIsConnected(false);
        setRemoteStream(null);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, roomId]);

  // Start call
  const startCall = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      // Get media stream
      const stream = await initializeMedia();
      if (!stream) return;

      // Create peer connection
      const pc = createPeerConnection(stream);

      // Create room on server
      const response = await api.post("/video/create-room", {
        appointmentId,
        duration: 30,
      });

      const newRoomId = response.data.room.roomId;
      setRoomId(newRoomId);

      // Join socket room
      joinRoom(newRoomId);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // For demo: we'll wait for incoming connection
      // In production, you'd send to specific user
      console.log("Offer created, waiting for peer...");
    } catch (err) {
      console.error("Error starting call:", err);
      setError("Lỗi khi bắt đầu cuộc gọi");
      setIsConnecting(false);
    }
  }, [appointmentId, initializeMedia, createPeerConnection, joinRoom]);

  // Handle incoming WebRTC events from socket
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = async ({ userId, socketId }) => {
      console.log("User joined:", userId);
      if (peerConnectionRef.current) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        sendOffer(roomId, offer, socketId);
      }
    };

    const handleOffer = async ({ offer, senderId, senderSocketId }) => {
      console.log("Received offer from:", senderId);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        sendAnswer(roomId, answer, senderSocketId);
      }
    };

    const handleAnswer = async ({ answer }) => {
      console.log("Received answer");
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      console.log("Received ICE candidate");
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleUserLeft = () => {
      console.log("User left");
      setIsConnected(false);
      setRemoteStream(null);
    };

    socket.on("user-joined-room", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);

    return () => {
      socket.off("user-joined-room", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
    };
  }, [socket, roomId, sendOffer, sendAnswer]);

  // End call
  const endCall = useCallback(() => {
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Leave room
    if (roomId) {
      leaveRoom(roomId);
    }

    setRemoteStream(null);
    setIsConnected(false);
    setRoomId(null);

    if (onEnd) {
      onEnd();
    }
  }, [localStream, roomId, leaveRoom, onEnd]);

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden ${isFullscreen ? "fixed inset-0 z-50" : "w-full"}`}>
      {/* Video Container */}
      <div className="relative aspect-video bg-black">
        {/* Remote Video (Full size) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center text-white">
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Đang kết nối...</p>
                </>
              ) : isConnected ? (
                <p>Đang chờ người tham gia...</p>
              ) : (
                <p>Chưa có kết nối</p>
              )}
            </div>
          )}
        </div>

        {/* Local Video (Picture in Picture) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700">
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <VideoOff size={24} />
            </div>
          )}
        </div>

        {/* Connection Status */}
        {isConnected && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Đã kết nối
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-center gap-4">
        {/* Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full ${isAudioEnabled ? "bg-gray-700 text-white" : "bg-red-500 text-white"}`}
        >
          {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${isVideoEnabled ? "bg-gray-700 text-white" : "bg-red-500 text-white"}`}
        >
          {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Start/End Call */}
        {!isConnected ? (
          <button
            onClick={startCall}
            disabled={isConnecting}
            className="px-6 py-3 bg-green-500 text-white rounded-full flex items-center gap-2 disabled:opacity-50"
          >
            <Video size={20} />
            {isConnecting ? "Đang kết nối..." : "Bắt đầu gọi"}
          </button>
        ) : (
          <button
            onClick={endCall}
            className="px-6 py-3 bg-red-500 text-white rounded-full flex items-center gap-2"
          >
            <PhoneOff size={20} />
            Kết thúc
          </button>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-full bg-gray-700 text-white"
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="bg-red-500 text-white p-4 rounded-lg max-w-md text-center">
            {error}
            <button onClick={endCall} className="mt-4 px-4 py-2 bg-white text-red-500 rounded">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
