// In App.js in a new project
import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { connect } from 'react-redux'
import { navigation } from "react-navigation";
import { authenticateUser, getAllUser } from '../actions'
import AsyncStorage from '@react-native-community/async-storage';
import io from "socket.io-client";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices
} from 'react-native-webrtc';
import configuration from '../conf'


class VideoCall extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pc: undefined,
      localDescription: undefined,
      localStream: undefined,
      remoteStream: undefined,
      receiver: undefined,
      offerReceived: false
    };
  }

  static navigationOptions = {
    title: "VideoCall"
  }

  componentDidMount() {
    this._onFocusListener = this.props.navigation.addListener('didFocus', async () => {
      var login_session = await AsyncStorage.getItem('login_session')
      // user did not sign in
      if (login_session == null) {
        console.log("user not log in")
        this.props.navigation.navigate('Login')
      }
      // user already signed in
      else {
        this.getAllUsers()
        login_session = JSON.parse(login_session)
        // ****implement check expired token -> user refresh token
        console.log(login_session.user.username)
        this.props.dispatch(authenticateUser(login_session.user))
        this.connectToSignallingServer(login_session.user.username)
      }
    });
  }

  // function to connect to signaling server
  connectToSignallingServer(username) {
    this.socket = io("192.168.2.44:9000")
    this.socket.on("connect", () => {
      console.log("success connect to signaling server")

      this.socket.on("connect_failed", () => {
        console.log("Cannot connect to signaling server")
      })

      this.socket.emit("add_online_user", (username))

      this.socket.on("video_call", (data) => {
        // switch(data.type){
        if (data.type == "video-offer") {
          console.log(`Receive video call offer from user ${data.sender}`)
          this.setState({ offerReceived: true })
          this.setState({ offer: data })
          console.log(data)
        }
        else if (data.type == "video-answer") {
          console.log(`Receive video call answer from user ${data.sender}`)
          console.log(data)
          this.pc.setLocalDescription(this.state.localDescription)
          this.pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
          console.log(this.pc)
        }
        else if (data.type == "new-ice-candidate") {
          console.log(`Receive ice candidate from user ${data.sender}`)
          if (this.pc != undefined) {
            console.log(data.candidate)
            console.log("Addig ice candidate")
            console.log(this.pc)
            this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
        else {
          console.log("Invsalid data type")
        }
      })
    })
  }

  // function to get all users
  getAllUsers() {
    fetch("http://ec2-54-173-185-125.compute-1.amazonaws.com:8080/api/get-users")
      .then(res => res.json())
      .then(data => {
        var users = data.filter(user => user.id != this.props.authenticatedUser.id)
        this.props.dispatch(getAllUser(users))
      })
  }

  // function when user logout
  async handleLogout() {
    await AsyncStorage.removeItem('login_session');
    this.props.dispatch(authenticateUser({}))
    this.props.navigation.navigate("Login")
    this.socket.disconnect()
  }

  // function to start a call
  doCall(targetUser) {
    console.log(`Start calling user ${targetUser}`)
    this.setState({ receiver: targetUser })
    this.getLocalStream()
      .then(stream => this.createPeerConnection(stream))
      .then(() => {
        this.pc.createOffer()
          .then(offer => this.handleSetAndSendLocalDescription(offer))
          .catch(error => this.handleCreateSdpError(error));
      })
      .catch(error => console.log(error))
    // this.createPeerConnection()

  }

  doAnswer(answer) {
    if (answer == "accept") {
      this.setState({ receiver: this.state.offer.sender })
      this.getLocalStream()
        .then(stream => this.createPeerConnection(stream))
        .then(() => {
          this.pc.setRemoteDescription(new RTCSessionDescription(this.state.offer.sdp))
          this.pc.createAnswer()
            .then(answer => this.handleSetAndSendAnswer(answer))
            .catch(error => this.handleCreateSdpError(error))
        })
        .catch(error => console.log(error))
    }
    else {
      // ******** implement decline a video call ...........
      console.log("******** implement decline a video call ...........")
    }
  }

  // function to create peer connection

  createPeerConnection(stream) {
    console.log("Create peer connection >>>>>>>>")
    return new Promise(resolve => {
      try {
        this.pc = new RTCPeerConnection(configuration);
        this.pc.onicecandidate = (event) => this.handleIceCandidate(event)
        this.pc.onaddstream = (event) => this.handleRemoteStreamAdded(event)
        this.pc.onremovestream = (event) => this.handleRemoteStreamRemoved(this)
        this.pc.addStream(stream)
        resolve(this.pc)
      }
      catch (e) {
        console.log('Failed sto create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
      }
    })

  }

  // function to get local stream of the calller
  getLocalStream() {
    return (new Promise(resolve => {
      // ************ implement: edit later ************
      let isFront = true;
      mediaDevices.enumerateDevices().then(sourceInfos => {
        console.log(sourceInfos);
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
          const sourceInfo = sourceInfos[i];
          if (sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "back")) {
            videoSourceId = sourceInfo.deviceId;
          }
        }
        mediaDevices.getUserMedia({
          audio: true,
          video: {
            mandatory: {
              minWidth: 500,
              minHeight: 300,
              minFrameRate: 30
            },
            facingMode: (isFront ? "user" : "environment"),
            optional: (videoSourceId ? [{ sourceId: videoSourceId }] : [])
          }
        })
          .then(stream => {
            this.setState({ localStream: stream })
            resolve(stream)
          })
          .catch(error => {
            alert(`Error: ${error}`)
            console.log(error)
          });
      });
    })
    )
  }

  // function to send ice canddidate to remote peer
  handleIceCandidate(event) {
    console.log(`Send ice candidate to user ${this.state.receiver}`)
    console.log("event", event)
    if (event.candidate != null) {
      const localIceMessage = {
        type: "new-ice-candidate",
        sender: this.props.authenticatedUser.username,
        receiver: this.state.receiver,
        candidate: event.candidate
      }
      this.sendMessage(localIceMessage)
    }
    else {
      console.log("End of ice candidates")
    }
  }

  // function to display remote stream
  handleRemoteStreamAdded(event) {
    console.log("Remote stream added")
    this.setState({ remoteStream: event.stream })
  }

  handleRemoteStreamRemoved(event) {
    console.log("Remote stream removed")
  }

  // function to set local SDP and send SDP to remote peer
  handleSetAndSendLocalDescription(sessionDescription) {
    console.log(`Sending offer to user: ${this.state.receiver}`)
    this.setState({ localDescription: sessionDescription })
    // this.pc.setLocalDescription(sessionDescription)
    var localSDPMessage = {
      type: "video-offer",
      sender: this.props.authenticatedUser.username,
      receiver: this.state.receiver,
      sdp: sessionDescription
    }
    this.sendMessage(localSDPMessage)
  }

  handleSetAndSendAnswer(sessionDescription) {
    console.log(`Sending answer to user: ${this.state.offer.sender}`)
    console.log(this.pc)
    this.pc.setLocalDescription(sessionDescription)
    const localSDPMessage = {
      type: "video-answer",
      sender: this.props.authenticatedUser.username,
      receiver: this.state.offer.sender,
      sdp: sessionDescription
    }
    this.sendMessage(localSDPMessage)
  }

  // Error handle when create offer
  handleCreateSdpError(error) {
    console.log("Cannot create sdp")
    console.log(error)
  }

  sendMessage(data) {
    console.log("Sending message to signaling server........")
    console.log(data)
    this.socket.emit("video_call_signal", data)
  }

  render() {
    return (
      <View >
        {!this.props.authenticatedUser.username && <Text>Loading...</Text>}

        <Text>Home Screen</Text>

        {this.state.localStream && <RTCView style={styles.rtc} streamURL={this.state.localStream.toURL()} />}
        {this.state.remoteStream && <RTCView style={styles.rtc} streamURL={this.state.remoteStream.toURL()} />}


        {this.props.users[0] != undefined
          && this.props.users.map(user =>
            <Button key={user.id} onPress={() => this.doCall(user.username)} title={user.username}></Button>
          )}

        {this.state.offerReceived &&
          <View>
            <Button title="accept" onPress={() => this.doAnswer("accept")}> </Button>
            <Button title="decline" onPress={() => this.doAnswer("decline")}> </Button>
          </View>
        }
        
        {/* <Button onPress = { () => this.props.navigation.navigate('Login') } title = 'Go to Log in' ></Button> */}
      </View>
    )
  }
}

function mapStateToProps(centralState) {
  return {
    authenticatedUser: centralState.authenticatedUser,
    users: centralState.users
  }
}

export default connect(mapStateToProps)(VideoCall);

const styles = StyleSheet.create({
  rtc: {
    height: 300,
    width: 300,
    backgroundColor: '#000',
  }
})