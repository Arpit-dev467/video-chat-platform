const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const participantCount = document.getElementById("participantCount");
const myVideo = document.createElement("video");
const showChat = document.querySelector("#showChat");
const backBtn = document.querySelector(".header__back");
const peers = {};
myVideo.muted = true;
myVideo.playsInline = true;

backBtn.addEventListener("click", () => {
  document.querySelector(".main__left").style.display = "flex";
  document.querySelector(".main__left").style.flex = "1";
  document.querySelector(".main__right").style.display = "none";
  document.querySelector(".header__back").style.display = "none";
});

showChat.addEventListener("click", () => {
  document.querySelector(".main__right").style.display = "flex";
  document.querySelector(".main__right").style.flex = "1";
  document.querySelector(".main__left").style.display = "none";
  document.querySelector(".header__back").style.display = "block";
});

const user = prompt("Enter your name");

var peer = new Peer({
  host: window.location.hostname,
  port: window.location.port || (window.location.protocol === "https:" ? 443 : 80),
  path: "/peerjs",
  secure: window.location.protocol === "https:",
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
      {
        urls: "turn:192.158.29.39:3478?transport=udp",
        credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        username: "28224511:1379330808",
      },
      {
        urls: "turn:192.158.29.39:3478?transport=tcp",
        credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
        username: "28224511:1379330808",
      },
    ],
  },

  debug: 2,
});

let myVideoStream;

const updateParticipantCount = () => {
  const total = videoGrid.querySelectorAll(".video-card").length;
  participantCount.textContent = `${total} participant${total === 1 ? "" : "s"}`;
};

navigator.mediaDevices
  .getUserMedia({
    audio: true,
    video: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, "You");

    peer.on("call", (call) => {
      console.log("someone called me");
      call.answer(stream);
      const video = document.createElement("video");
      video.playsInline = true;
      peers[call.peer] = call;

      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, "Guest");
      });

      call.on("close", () => {
        removeVideoCard(video);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });

    socket.on("user-disconnected", (userId) => {
      if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
      }
    });
  })
  .catch((error) => {
    console.error("Unable to access camera/microphone", error);
    alert("Camera or microphone access is required to join the room.");
  });

const connectToNewUser = (userId, stream) => {
  console.log("Calling user " + userId);
  const call = peer.call(userId, stream);
  const video = document.createElement("video");
  video.playsInline = true;
  peers[userId] = call;

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, "Guest");
  });

  call.on("close", () => {
    removeVideoCard(video);
  });
};

peer.on("open", (id) => {
  console.log("My peer id is " + id);
  socket.emit("join-room", ROOM_ID, id, user);
});

const removeVideoCard = (video) => {
  const card = video.closest(".video-card");
  if (card) {
    card.remove();
    updateParticipantCount();
  }
};

const addVideoStream = (video, stream, label = "You") => {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    const card = document.createElement("article");
    const chip = document.createElement("div");

    card.className = "video-card";
    chip.className = "video-card__label";
    chip.textContent = label;

    card.append(video, chip);
    videoGrid.append(card);
    updateParticipantCount();
  });
};

let text = document.querySelector("#chat_message");
let send = document.getElementById("send");
let messages = document.querySelector(".messages");

send.addEventListener("click", (e) => {
  if (text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

text.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && text.value.length !== 0) {
    socket.emit("message", text.value);
    text.value = "";
  }
});

const inviteButton = document.querySelector("#inviteButton");
const muteButton = document.querySelector("#muteButton");
const stopVideo = document.querySelector("#stopVideo");
muteButton.addEventListener("click", () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    const html = `<i class="fas fa-microphone-slash"></i><span>Muted</span>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    const html = `<i class="fas fa-microphone"></i><span>Mute</span>`;
    muteButton.classList.toggle("background__red");
    muteButton.innerHTML = html;
  }
});

stopVideo.addEventListener("click", () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    const html = `<i class="fas fa-video-slash"></i><span>Camera off</span>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    const html = `<i class="fas fa-video"></i><span>Camera</span>`;
    stopVideo.classList.toggle("background__red");
    stopVideo.innerHTML = html;
  }
});

inviteButton.addEventListener("click", (e) => {
  prompt(
    "Copy this link and send it to people you want to meet with",
    window.location.href
  );
});

socket.on("createMessage", (message, userName) => {
  const messageWrapper = document.createElement("div");
  messageWrapper.className = "message";

  const author = document.createElement("b");
  const icon = document.createElement("i");
  const authorText = document.createElement("span");
  const body = document.createElement("span");

  icon.className = "far fa-user-circle";
  authorText.textContent = userName === user ? "me" : userName;
  body.textContent = message;

  author.append(icon, authorText);
  messageWrapper.append(author, body);
  messages.append(messageWrapper);
  messages.scrollTop = messages.scrollHeight;
});
