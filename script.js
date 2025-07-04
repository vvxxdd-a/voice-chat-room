let socket = io();
let localStream;
let peers = {};

async function joinRoom() {
  const roomID = document.getElementById("room").value;
  if (!roomID) return alert("Enter a Room ID");

  socket.emit("join", roomID);
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  socket.on("user-joined", async (id) => {
    const pc = createPeerConnection(id);
    peers[id] = pc;

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { to: id, signal: { sdp: pc.localDescription } });
  });

  socket.on("signal", async ({ from, signal }) => {
    let pc = peers[from] || createPeerConnection(from);
    peers[from] = pc;

    if (signal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      if (signal.sdp.type === "offer") {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { to: from, signal: { sdp: pc.localDescription } });
      }
    }
    if (signal.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  });

  socket.on("user-left", id => {
    if (peers[id]) peers[id].close();
    delete peers[id];
  });
}

function createPeerConnection(id) {
  const pc = new RTCPeerConnection();

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", { to: id, signal: { candidate: event.candidate } });
    }
  };

  pc.ontrack = (event) => {
    const audio = document.createElement("audio");
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  return pc;
}