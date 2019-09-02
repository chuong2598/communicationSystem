import React, { Component } from 'react';
import { Content, Text, Button, Grid, Col, Row, Header, Body, Title, Left, Right, Container } from 'native-base';
import { FlatList, TouchableOpacity, StyleSheet, Dimensions, View, Image, TouchableHighlight } from "react-native";
import { ListItem, ActionSheet } from 'native-base'
import io from "socket.io-client";
import InCallManager from 'react-native-incall-manager';
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
import { changeUsingMediaState, getOffer } from '../actions'
import { START_USING_MEDIA, STOP_USING_MEDIA } from '../actions/types'
import CountDownClock from './CountDownClock';
import MovableView from 'react-native-movable-view'


const CallButtons = [{ text: "Video call" , icon:"md-videocam" }, { text: "Audio call", icon: "microphone", type: "FontAwesome" }, { text: "Cancel", icon: "close", iconColor: "lightsalmon" }];

var width = Dimensions.get('window').width; //full width
var height = Dimensions.get('window').height; //full height
// in call manger when decline, when upgrade from audio to video

class Call extends Component {
  constructor(props) {
    super(props);
    this.state = {
      socketConnected: false,
      localStream: undefined,
      remoteStream: undefined,
      receiver: undefined,
      offer: undefined,
      isInCall: false,
      isAudioCall: false,
      disableInCallButtons: true,
      offerAccepted: false,
      upgradeOfferReceived: false,
      audioIsOn: true,
      cameraIsOn: true,
      enableSpeaker: true,
      temporaryHideButton: false
    };
  }

  resetAllState() {
    console.log("Reset all state...........")
    this.setState({
      localStream: undefined,
      remoteStream: undefined,
      receiver: undefined,
      offer: undefined,
      isInCall: false,
      isAudioCall: false,
      disableInCallButtons: true,
      offerAccepted: false,
      upgradeOfferReceived: false,
      audioIsOn: true,
      cameraIsOn: false,
      enableSpeaker: false,
      temporaryHideButton: false
    })
    this.isAudioCall = false
    this.localDescription = undefined
    this.peerSocketOrigin = undefined
    // Clear interval
    if (this.interval != undefined) {
      clearInterval(this.interval);
    }
    InCallManager.stop()
    this.props.dispatch(changeUsingMediaState(STOP_USING_MEDIA, ""))
    this.props.dispatch(getOffer({}))
  }

  componentWillUnmount() {
    if (this.interval != undefined) {
      clearInterval(this.interval);
    }
    if (this.socket != undefined) {
      this.socket.off("video_call")
    }
  }

  componentWillMount() {
    console.log("Call mountttt")
    console.log(this.props.socket)
    this.connectToSignalingServer()
  }

  componentDidMount() {
    console.log(this.props.offer)
    if (this.props.offer.sender != undefined) {
      var data = this.props.offer
      InCallManager.startRingtone('_DEFAULT_');
      console.log(`Receive video call offer from user ${data.sender}`)
      this.peerSocketOrigin = data.socketOrigin
      this.isAudioCall = data.isAudioCall
      this.setState({ isAudioCall: data.isAudioCall })
      this.setState({ isInCall: true })
      this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "calling"))
      this.setState({ offer: data })
      console.log(data)
    }
  }

  componentWillReceiveProps(props) {
    if (this.state.socketConnected) {
      return
    }
    this.connectToSignalingServer()
  }

  connectToSignalingServer() {
    if (this.props.socket != undefined) {
      this.setState({ socketConnected: true })
      this.socket = this.props.socket
      this.socket.on("video_call", (data) => {
        // switch(data.type){
        if (data.type == "video-offer") {
          InCallManager.startRingtone('_DEFAULT_');
          console.log(`Receive video call offer from user ${data.sender}`)
          this.peerSocketOrigin = data.socketOrigin
          this.isAudioCall = data.isAudioCall
          this.setState({ isAudioCall: data.isAudioCall })
          this.setState({ isInCall: true })
          this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "calling"))
          this.setState({ offer: data })
          console.log(data)
        }
        else if (data.type == "video-answer") {
          // set interval to update remote peer stream
          this.interval = setInterval(() => this.setState({ time: Date.now() }), 2000);
          InCallManager.stopRingback();
          console.log(`Receive video call answer from user ${data.sender}`)
          console.log(data)
          this.peerSocketOrigin = data.socketOrigin
          this.pc.setLocalDescription(this.localDescription)
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
        else if (data.type == "video-upgrade") {
          console.log(`Receive video-upgrade from user ${data.sender}`)
          this.isAudioCall = false
          console.log(`Receive upgrade request from user ${data.sender}`)
          this.setState({ upgradeOfferReceived: true })
          this.setState({ offer: data })
        }
        else if (data.type == "upgrade-video-decline") {
          console.log(`Receive video-upgrade decline from user ${data.sender}`)
          this.isAudioCall = true
          this.setState({ isAudioCall: true })
          InCallManager.stop()
          InCallManager.start({ media: "audio" })
          InCallManager.setSpeakerphoneOn(false)
          this.setState({ cameraIsOn: false, enableSpeaker: false })
          this.state.localStream.getVideoTracks()[0].enabled = false
          // let audioStream = this.state.localStream.getAudioTracks()
        }
        else if (data.type == "video-decline") {
          console.log(`Receive decline from user ${data.sender}`)
          this.pc.close()
          if (this.state.localStream != undefined) {
            this.state.localStream.getTracks().forEach((track) => {
              track.enabled = false
            })
          }
          this.resetAllState()
          InCallManager.stop();
        }
        else if (data.type == "video-hangup") {
          console.log("hang up")
          if (this.pc) {
            this.pc.close()
            if (this.state.localStream != undefined) {
              this.state.localStream.getTracks().forEach((track) => {
                track.enabled = false
              })
            }
          }
          this.resetAllState()
          console.log("stop ring ton")
          console.log(InCallManager)
          InCallManager.stopRingtone()
          InCallManager.stop();
          console.log(InCallManager)
        }
        else if (data.type == "video-picked-up") {
          InCallManager.stop()
          this.setState({ isInCall: false })
          if(this.state.offerAccepted){
            this.props.dispatch(changeUsingMediaState(STOP_USING_MEDIA, ""))
          }
          this.setState({ offer: undefined })

        }
        else if (data.type == "busy-user") {
          alert(data.message)
          this.resetAllState()
        }
        else {
          console.log("Invalid data type")
        }
      })
    }
  }

  // function to start a call
  doCall(targetUser) {
    InCallManager.start({ media: this.isAudioCall ? 'audio' : 'video', ringback: '_DTMF_' });
    this.setState({ cameraIsOn: !this.isAudioCall, enableSpeaker: !this.isAudioCall })
    console.log(`Start calling user ${targetUser}`)
    this.setState({ receiver: targetUser })
    this.setState({ isInCall: true })
    this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "calling"))
    this.getLocalStream()
      .then(stream => {
        this.setState({ localStream: stream })
        this.createPeerConnection(stream)
          .then(() => {
            this.pc.createOffer()
              .then(offer => this.handleSetAndSendLocalDescription(offer))
              .catch(error => this.handleCreateSdpError(error));
          })
      })
      .catch(error => console.log(error))
    // this.createPeerConsdnection()

  }

  // function to answer phone
  doAnswer(answer) {
    // accept a call
    if (answer == "accept") {
      InCallManager.start({ media: this.isAudioCall ? 'audio' : 'video', ringback: '_DEFAULT_' });
      InCallManager.stopRingback();
      console.log("Accept call")
      this.setState({ offerAccepted: true })
      console.log("reset offer accepted")
      this.setState({ receiver: this.state.offer.sender })
      this.setState({ isInCall: true })
      this.setState({ cameraIsOn: !this.isAudioCall, enableSpeaker: !this.isAudioCall })
      this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "calling"))
      this.getLocalStream()
        .then(stream => {
          this.setState({ localStream: stream })
          this.createPeerConnection(stream)
            .then(() => {
              this.pc.setRemoteDescription(new RTCSessionDescription(this.state.offer.sdp))
              this.pc.createAnswer()
                .then(answer => this.handleSetAndSendAnswer(answer))
                .catch(error => this.handleCreateSdpError(error))
            })
        })
        .catch(error => console.log(error))
      // set interval to update remote peer stream      
      this.interval = setInterval(() => this.setState({ time: Date.now() }), 2000);

    }
    // decline a call
    else {
      console.log("******** implement decline a video call ...........")
      InCallManager.stopRingtone();
      InCallManager.stop();
      const declineMessage = {
        type: "video-decline",
        sender: this.props.authenticatedUser.username,
        receiver: this.state.offer.sender,
        socketOrigin: this.state.offer.socketOrigin
      }
      this.sendMessage("video_call_signal", declineMessage)
      this.resetAllState()
      InCallManager.stop();
    }
    const pickUpMessage = {
      type: "video-picked-up",
      sender: this.props.authenticatedUser.username,
      receiver: this.props.authenticatedUser.username
    }
    this.sendMessage("video_call_signal", pickUpMessage)
  }

  doAnswerUpgradeOffer(answer) {
    this.setState({ upgradeOfferReceived: false })
    if (answer == "accept") {
      console.log("Accept upgrade offer")
      this.setState({ offerAccepted: true })
      this.setState({ cameraIsOn: !this.isAudioCall, enableSpeaker: !this.isAudioCall })
      InCallManager.stop()
      InCallManager.start({ media: "video" })
      InCallManager.setSpeakerphoneOn(true)
      this.getLocalStream()
        .then(stream => {
          this.pc.removeStream(this.state.localStream)
          this.setState({ isAudioCall: false })
          this.pc.addStream(stream)
          console.log(stream)
          this.setState({ localStream: stream })
          this.pc.setRemoteDescription(new RTCSessionDescription(this.state.offer.sdp), (error) => console.log(error))
          this.pc.createAnswer()
            .then(answer => this.handleSetAndSendAnswer(answer))
            .catch(error => this.handleCreateSdpError(error))
        })
        .catch(error => console.log(error))
      this.interval = setInterval(() => this.setState({ time: Date.now() }), 2000)
    }
    else {
      this.isAudioCall = true
      const declineUpgradeMessage = {
        type: "upgrade-video-decline",
        sender: this.props.authenticatedUser.username,
        receiver: this.state.receiver,
        socketOrigin: this.peerSocketOrigin
      }
      this.sendMessage("video_call_signal", declineUpgradeMessage)
      console.log("Decline upgrade offer")
    }
  }

  // function when hangUp a call
  doHangUp() {
    console.log("Function do hangup")
    this.state.localStream.getTracks().forEach((track) => {
      track.enabled = false
    })
    this.pc.close()
    const handUpMessage = {
      type: "video-hangup",
      sender: this.props.authenticatedUser.username,
      receiver: this.state.receiver
    }
    this.sendMessage("video_call_signal", handUpMessage)
    InCallManager.stop();
    this.resetAllState()
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
      let isAudioCall = this.isAudioCall
      console.log(this.isAudioCall)
      mediaDevices.enumerateDevices().then(sourceInfos => {
        console.log(sourceInfos);
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
          const sourceInfo = sourceInfos[i];
          if (sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "back")) {
            videoSourceId = sourceInfo.deviceId;
          }
        }

        let videoContraint = !isAudioCall ? {
          mandatory: {
            minWidth: width,
            minHeight: height / 2,
            minFrameRate: 30
          },
          facingMode: (isFront ? "user" : "environment"),
          optional: (videoSourceId ? [{ sourceId: videoSourceId }] : [])
        } : false
        console.log(isAudioCall)
        mediaDevices.getUserMedia({
          audio: true,
          // video: true,
          video: videoContraint
        })
          .then(stream => {
            // this.setState({ localStream: stream })
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

  // function to send ice candidate to remote peer
  handleIceCandidate(event) {
    console.log(`Send ice candidate to user ${this.state.receiver}`)
    console.log("event", event)
    if (event.candidate != null) {
      const localIceMessage = {
        type: "new-ice-candidate",
        sender: this.props.authenticatedUser.username,
        receiver: this.state.receiver,
        candidate: event.candidate,
        socketOrigin: this.peerSocketOrigin
      }
      this.sendMessage("video_call_signal", localIceMessage)
    }
    else {
      console.log("End of ice candidates")
    }
  }

  // function to display remote stream
  handleRemoteStreamAdded(event) {
    console.log("Remote stream added", event.stream)
    this.setState({ remoteStream: event.stream })
    this.setState({ disableInCallButtons: false })
    if (!this.isAudioCall) {
      setTimeout(() => { this.setState({ temporaryHideButton: true }) }, 10000)
    }
  }

  handleRemoteStreamRemoved(event) {
    console.log("Remote stream removed")
  }

  // function to set local SDP and send SDP to remote peer
  handleSetAndSendLocalDescription(sessionDescription) {
    console.log(`Sending offer to user: ${this.state.receiver}`)
    this.localDescription = sessionDescription
    // this.setState({ localDescription: sessionDescription })
    // this.pc.setLocalDescription(sessionDescription)
    var localSDPMessage = {
      type: "video-offer",
      sender: this.props.authenticatedUser.username,
      receiver: this.state.receiver,
      sdp: sessionDescription,
      isAudioCall: this.isAudioCall
    }
    this.sendMessage("video_call_signal", localSDPMessage)
  }

  handleSetAndSendAnswer(sessionDescription) {
    console.log(`Sending answer to user: ${this.state.offer.sender}`)
    console.log(this.pc)
    this.pc.setLocalDescription(sessionDescription)
    const localSDPMessage = {
      type: "video-answer",
      sender: this.props.authenticatedUser.username,
      receiver: this.state.offer.sender,
      sdp: sessionDescription,
      socketOrigin: this.peerSocketOrigin
    }
    this.sendMessage("video_call_signal", localSDPMessage)
  }

  // Error handle when create offer
  handleCreateSdpError(error) {
    console.log("Cannot create sdp")
    console.log(error)
  }

  sendMessage(channel, data) {
    console.log("Sending message to signaling server........")
    console.log(data)
    this.socket.emit(channel, data)
  }

  handleSendUpgradeOffer(sessionDescription) {
    console.log(`Sending upgrade offer to user: ${this.state.receiver}`)
    this.localDescription = sessionDescription
    var localSDPMessage = {
      type: "video-upgrade",
      sender: this.props.authenticatedUser.username,
      receiver: this.state.receiver,
      sdp: sessionDescription,
      socketOrigin: this.peerSocketOrigin
    }
    this.sendMessage("video_call_signal", localSDPMessage)
  }

  controlCamera() {
    if (this.isAudioCall) {
      this.isAudioCall = false
      InCallManager.stop()
      InCallManager.start({ media: "video" })
      InCallManager.setSpeakerphoneOn(true)
      this.setState({ cameraIsOn: true, enableSpeaker: true })
      this.getLocalStream()
        .then(stream => {
          console.log(this.state.localStream)
          this.pc.removeStream(this.state.localStream)
          console.log(this.pc)
          this.pc.addStream(stream)
          console.log(this.pc)
          this.setState({ localStream: stream })
          this.pc.createOffer()
            .then(offer => this.handleSendUpgradeOffer(offer))
            .catch(error => this.handleCreateSdpError(error));
        })
        .catch(error => console.log(error))
      this.setState({ isAudioCall: false })
      // make upgrade request
    }
    else {
      this.showVideoCallButton()
      this.state.localStream.getVideoTracks()[0].enabled = !this.state.cameraIsOn
      this.setState({ cameraIsOn: !this.state.cameraIsOn })
    }
  }

  controlAudio() {
    if (!this.isAudioCall) {
      this.showVideoCallButton()
    }
    this.state.localStream.getAudioTracks()[0].enabled = !this.state.audioIsOn
    this.setState({ audioIsOn: !this.state.audioIsOn })
  }

  switchCamera() {
    this.showVideoCallButton()
    this.state.localStream.getVideoTracks().forEach((track) => {
      track._switchCamera()
    })
  }

  switchSpeaker() {
    InCallManager.setSpeakerphoneOn(!this.state.enableSpeaker)
    this.setState({ enableSpeaker: !this.state.enableSpeaker })
  }

  triggerCallAction(buttonIndex, user) {
    switch (buttonIndex) {
      case 0:
        this.isAudioCall = false
        this.setState({ isAudioCall: false })
        console.log(this.isAudioCall)
        this.doCall(user.username)
        break
      case 1:
        this.isAudioCall = true
        this.setState({ isAudioCall: true })
        this.doCall(user.username)
        break
      // **** Implement audio call
    }
  }

  clickOnUser(item) {
    {
      ActionSheet.show(
        {
          options: CallButtons,
          cancelButtonIndex: 2,
          title: `Make a call to ${item.username}`
        },
        buttonIndex => {
          this.triggerCallAction(buttonIndex, item)
        }
      )
    }
  }

  renderItem = ({ item }) => {
    if(item.firstName == null || item.lastName == null){
      return null
    }
    return (
      <TouchableOpacity >
        <ListItem onPress={() => this.clickOnUser(item)}>
          {item.firstName != null &&
            <Text>{item.firstName} {item.lastName}</Text>          
          }
          {(this.props.onlineUsers.map(user => user.username)).includes(item.username)
            && <Image style={{ height: 16, width: 16 }} source={require('../assets/onlineStatus.png')} />
          }
        </ListItem>
      </TouchableOpacity>

    )
  }

  getOfflineUser() {
    var onlineUsers = this.props.onlineUsers.map(user => user.username)
    return (this.props.users.filter(user => !onlineUsers.includes(user.username)))
  }

  test() {
    // console.log(this.state.localStream)
    // console.log(this.pc)
    // console.log(this.state.offerAccepted)
    // console.log(RNCamera.Constants.CameraStatus)
  }

  showVideoCallButton() {
    console.log("Pressssss")
    this.setState({ temporaryHideButton: false })
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => { this.setState({ temporaryHideButton: true }) }, 10000)
  }


  render() {
    if (this.state.isInCall) {
      if (this.state.upgradeOfferReceived && this.state.offer != undefined) {
        return (
          <Content style={styles.container}>
            <View style={{ flex: 1, height: height, justifyContent: 'center', alignItems: 'center' }}>
              <Text>{this.state.receiver} invite you a video call</Text>
              <View style={styles.answerBtnView}>
                <Col style={{ alignItems: 'center' }}>
                  <TouchableOpacity style={styles.imageContainer}
                    onPress={() => this.doAnswerUpgradeOffer("decline")} >
                    <Image style={styles.image} source={require('../assets/decline3.png')} />
                  </TouchableOpacity>
                </Col>
                <Col style={{ alignItems: 'center' }}>
                  <TouchableOpacity style={styles.imageContainer}
                    onPress={() => this.doAnswerUpgradeOffer("accept")} >
                    <Image style={styles.image} source={require('../assets/videoOn3.png')} />
                  </TouchableOpacity>
                </Col>
              </View>
            </View>
          </Content>
        )
      }
      else if (this.state.offerAccepted == false && this.state.offer != undefined && !this.state.upgradeOfferReceived) {
        return (
          <Content style={styles.container}>
            <View style={{ flex: 1, height: height, justifyContent: 'center', alignItems: 'center' }}>
              {this.state.isAudioCall
                ? <Text>Audio call from {this.state.offer.sender}</Text>
                : <Text>Video call from {this.state.offer.sender}</Text>
              }

              <View style={styles.answerBtnView}>
                <Col style={{ alignItems: 'center' }}>
                  <TouchableOpacity style={styles.imageContainer}
                    onPress={() => this.doAnswer("decline")} >
                    <Image style={styles.image} source={require('../assets/decline3.png')} />
                  </TouchableOpacity>
                </Col>
                <Col style={{ alignItems: 'center' }}>
                  <TouchableOpacity style={styles.imageContainer}
                    onPress={() => this.doAnswer("accept")} >
                    <Image style={styles.image} source={require('../assets/accept3.png')} />
                  </TouchableOpacity>
                </Col>
              </View>
            </View>
          </Content>
        )
      }
      else {
        if (this.state.isAudioCall) {
          // Audio call UI
          return (
            <View style={styles.container}>

              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', height: height, width: width }}>
                {this.state.disableInCallButtons
                  ? <Text >
                    {this.state.disableInCallButtons ? `Calling user ${this.state.receiver}` : `Talking to user ${this.state.receiver}`}
                  </Text>
                  : <CountDownClock />}
              </View>
              <View style={{ height: height, bottom: 30, justifyContent: 'flex-end' }}>
                <View style={{ flexDirection: 'row' }}>
                  <Col style={{ alignItems: 'center' }}>
                    <TouchableOpacity disabled={this.state.disableInCallButtons} style={styles.imageContainer}
                      onPress={() => this.switchSpeaker()}>
                      {!this.state.enableSpeaker || this.state.disableInCallButtons
                        ? <Image style={styles.image} source={require('../assets/speakerOff3.png')} />
                        : <Image style={styles.image} source={require('../assets/speakerOn3.png')} />
                      }
                    </TouchableOpacity>
                    {/* <Button disabled={this.state.disableInCallButtons} onPress={() => this.switchSpeaker()}><Text>Switch Speaker</Text></Button> */}
                  </Col>
                  <Col style={{ alignItems: 'center' }}>
                    <TouchableOpacity disabled={this.state.disableInCallButtons} style={styles.imageContainer}
                      onPress={() => this.controlAudio()}>
                      {!this.state.audioIsOn || this.state.disableInCallButtons
                        ? <Image style={styles.image} source={require('../assets/audioOff3.png')} />
                        : <Image style={styles.image} source={require('../assets/audioOn3.png')} />
                      }
                    </TouchableOpacity>
                  </Col>
                  <Col style={{ alignItems: 'center' }}>
                    <TouchableOpacity style={styles.imageContainer}
                      onPress={() => this.doHangUp()} >
                      <Image style={styles.image} source={require('../assets/hangupEnable3.png')} />
                    </TouchableOpacity>
                  </Col>
                </View>
              </View>

              <View style={{ position: 'absolute', flexDirection: 'row-reverse', alignSelf: 'flex-end' }}>
                <TouchableOpacity disabled={this.state.disableInCallButtons} style={styles.imageContainer}
                  onPress={() => this.controlCamera()}>
                  <Image style={styles.image} source={require('../assets/videoOff3.png')} />
                </TouchableOpacity>
              </View>
            </View>
          )
        }
        else {
          // Video call UI
          return (
            <View style={styles.container}>
              {this.state.remoteStream &&
                <View >
                  <TouchableOpacity activeOpacity={1} onPress={() => this.showVideoCallButton()}>
                    <View style={{ height: height, width: width }} >
                      <RTCView style={{ height: height, width: width }} mirror={true} objectFit="cover" streamURL={this.state.remoteStream.toURL()} />
                    </View>
                  </TouchableOpacity>
                  <MovableView style={{ position: 'absolute', width: width / 2.5, height: height / 3.5 }} >
                    <RTCView mirror={true} style={{ position: 'absolute', width: width / 2.5, height: height / 3.5 }} streamURL={this.state.localStream.toURL()} />
                  </MovableView>
                </View>
              }

              {this.state.localStream && !this.state.remoteStream &&
                <MovableView style={{ width: width / 2.5, height: height / 3.5 }} >
                  <RTCView mirror={true} style={{ width: width / 2.5, height: height / 3.5 }} streamURL={this.state.localStream.toURL()} />
                </MovableView>
              }

              <View style={styles.localBtnView}>
              <Text>     </Text>
                {!this.state.temporaryHideButton
                  &&
                  <TouchableOpacity disabled={this.state.disableInCallButtons} style={styles.imageContainer}
                    onPress={() => this.controlCamera()}>
                    {!this.state.cameraIsOn || this.state.disableInCallButtons
                      ? <Image style={styles.image} source={require('../assets/videoOff3.png')} />
                      : <Image style={styles.image} source={require('../assets/videoOn3.png')} />
                    }
                  </TouchableOpacity>
                }
                <Text>       </Text>
                {!this.state.temporaryHideButton &&
                <TouchableOpacity disabled={this.state.isAudioCall}  style={styles.imageContainer}
                onPress={() => this.switchCamera()}>
                <Image style={styles.image} source={require('../assets/switchCamera.png')} />
              </TouchableOpacity>
                }
              </View>

              <View style={styles.remoteBtnView}>
                <Col style={{ alignItems: 'center' }}>
                  {!this.state.temporaryHideButton &&
                    <TouchableOpacity disabled={this.state.disableInCallButtons} style={styles.imageContainer}
                      onPress={() => this.controlAudio()}>
                      {!this.state.audioIsOn || this.state.disableInCallButtons
                        ? <Image style={styles.image} source={require('../assets/audioOff3.png')} />
                        : <Image style={styles.image} source={require('../assets/audioOn3.png')} />
                      }
                    </TouchableOpacity>
                  }
                </Col>
                <Col style={{ alignItems: 'center' }}>
                  {!this.state.temporaryHideButton &&
                    <TouchableOpacity style={styles.imageContainer}
                      onPress={() => this.doHangUp()} >
                      <Image style={styles.image} source={require('../assets/hangupEnable3.png')} />
                    </TouchableOpacity>
                  }
                </Col>
              </View>
            </View>
          )
        }
      }
    }
    else {
      return (
        <Container>
          <Header>
            <Body style={{ alignItems: 'center' }}>
              <Title >Audio/Video Call</Title>
            </Body>

          </Header>
          {this.props.users[0] != undefined &&
            <FlatList
              data={[...this.props.onlineUsers, ...this.getOfflineUser()]}
              // {this.props.onlineUsers}
              renderItem={this.renderItem}
              keyExtractor={item => item.username}
            />
          }
        </Container>
      )
    }
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'white'
  },
  localVideoView: {
    height: height / 2,
    backgroundColor: 'red'
  },
  localBtnView: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    position: 'absolute',
  },
  remoteVideoView: {
    height: height / 2,
    backgroundColor: 'green',
  },
  remoteBtnView: {
    bottom: 30,
    justifyContent: 'space-around',
    position: 'absolute',
    flexDirection: 'row',
  },
  answerBtnView: {
    bottom: 30,
    justifyContent: 'space-around',
    position: 'absolute',
    flexDirection: 'row',
  },
  rtc: {
    height: height / 2,
    width: width,
  },
  imageContainer: {
    height: 64,
    width: 64,
    borderRadius: 32
  },
  image: {
    height: 64,
    width: 64,
    borderRadius: 32,
    alignSelf: 'center'
  }
})

export default Call;
