const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${wsProtocol}://${location.host}`);

let pc;
let localStream;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

socket.onopen = async () => {
  socket.send(JSON.stringify({
    type: "join",
    room: ROOM,
    role: ROLE
  }));

  await setupMedia();
};

socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (!pc) await createPeerConnection();

  if (data.type === "offer") {
    await pc.setRemoteDescription(data.offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.send(JSON.stringify({
      type: "answer",
      answer
    }));
  }

  if (data.type === "answer") {
    await pc.setRemoteDescription(data.answer);
  }

  if (data.type === "ice") {
    try {
      await pc.addIceCandidate(data.candidate);
    } catch (err) {
      console.error("ICE error", err);
    }
  }
};

async function setupMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;
}

async function createPeerConnection() {
  pc = new RTCPeerConnection(iceServers);

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.send(JSON.stringify({
        type: "ice",
        candidate: event.candidate
      }));
    }
  };
}

async function startCall() {
  await createPeerConnection();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.send(JSON.stringify({
    type: "offer",
    offer
  }));
}
