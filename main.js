const AGORA_APP_ID = window.AGORA_APP_ID

function generateUUID() {
  let uuid = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < 32; i++) {
    if (i === 8 || i === 12 || i === 16 || i === 20) {
      uuid += '-';
    }
    uuid += chars[Math.floor(Math.random() * 16)];
  }
  return uuid;
}


let token = null
const uuid = generateUUID() // to identify user

let client
let channel // users join the channel to talk

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
const roomId = urlParams.get('roomId')

if(!roomId){
  window.location.href = '/lobby.html'
}

let localStream
let remoteStream
let peerConnection

const servers = {
  iceServers: [{
    urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
  }]
}

const constraints = {
  video: {
    width:{min:640, ideal:1920, max:1920},
    height:{min:480, ideal:1080, max:1080},
  },
  audio: true
}

const init = async () => {
  // create client and connect it to signaling server
  client = await AgoraRTM.createInstance(AGORA_APP_ID)
  await client.login({
    uid: uuid,
    token
  })

  // index.html?roomId=123-456-789
  channel = client.createChannel(roomId)
  await channel.join()

  channel.on('MemberJoined', handleUserJoined) // call it when other user join the channel
  channel.on('MemberLeft', handleUserLeft) // call it when other user left the channel

  client.on('MessageFromPeer', handleMessageFromPeer) // call it when other user send data to me

  // (1) video permission
  localStream = await navigator.mediaDevices.getUserMedia(constraints)

  // (2) stream video
  document.getElementById('user-1').srcObject = localStream

}

// memberId is from other user
const handleUserJoined = async (memberId) => {
  createOffer(memberId)
};

const handleUserLeft = async (memberId) => {
  document.getElementById('user-2').style.display = 'none'
  document.getElementById('user-1').classList.remove('smallFrame')
}

// call it when getting message from other user
const handleMessageFromPeer = async (message, memberId) => {
  message = JSON.parse(message.text)
  if (message.type === 'offer') {
    createAnswer(memberId, message.offer)
  }
  if (message.type === 'answer') {
    addAnswer(message.answer)
  }
  if (message.type === 'candidate') {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate)
    }
  }

};

const createPeerConnection = async (memberId) => {
  // create peer connection
  peerConnection = new RTCPeerConnection(servers)

  // create remote stream
  remoteStream = new MediaStream()
  document.getElementById('user-2').srcObject = remoteStream
  document.getElementById('user-2').style.display = 'block'

  document.getElementById('user-1').classList.add('smallFrame')

  // test localstream
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    })
    document.getElementById('user-1').srcObject = localStream
  }

  // "send" local stream(track) to STUN servers
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream)
  })

  // track event listening
  peerConnection.ontrack = event => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track)
    })
  }

  peerConnection.onicecandidate = async event => {
    if (event.candidate) {
      // console.log('New ice candidate', event.candidate)
      client.sendMessageToPeer({
        text: JSON.stringify({
          type: 'candidate',
          candidate: event.candidate
        })
      }, memberId);
    }
  }

};

const createOffer = async (memberId) => {
  await createPeerConnection(memberId)

  // create offer
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)

  // send data to other user
  client.sendMessageToPeer({ text: JSON.stringify({ type: 'offer', offer })}, memberId)
};

const createAnswer = async (memberId, offer) => {
  await createPeerConnection(memberId)

  // remote Description
  await peerConnection.setRemoteDescription(offer)

  const answer = await peerConnection.createAnswer()

  // local Description
  await peerConnection.setLocalDescription(answer)

  // send back answer to peer 1
  client.sendMessageToPeer({ text: JSON.stringify({ type: 'answer', answer })}, memberId)
};

const addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer)
  }
};

const leaveChannel = async () => {
  await channel.leave()
  await client.logout()
};

const toggleCamera = () => {
  const videoTrack = localStream.getTracks().find(track => track.kind === 'video')
  if (videoTrack.enabled){
    videoTrack.enabled = false
    document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  } else {
    videoTrack.enabled = true
    document.getElementById('camera-btn').style.backgroundColor = '#00B050'
  }
}

const toggleAudio = () => {
  const audioTrack = localStream.getTracks().find(track => track.kind === 'audio')
  if (audioTrack.enabled){
    audioTrack.enabled = false
    document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  } else {
    audioTrack.enabled = true
    document.getElementById('mic-btn').style.backgroundColor = '#00B050'
  }
}

// close window
window.addEventListener('beforeunload', leaveChannel)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleAudio)

init()