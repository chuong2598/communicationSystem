import React, { Component } from 'react';
import { Content, Text, ListItem, ActionSheet, CheckBox, Button, Body, Col, Row, Header, Title, Container, Icon } from 'native-base';
import { FlatList, TouchableOpacity, StyleSheet, Dimensions, View, Image, TouchableHighlight, Alert } from "react-native";
import { changeUsingMediaState, changeTab, getOffer } from '../actions'
import { START_USING_MEDIA, STOP_USING_MEDIA } from '../actions/types'

import Call from './Call';
import InCallManager from 'react-native-incall-manager';
import mediaServer from '../janusConf'
import iceServers from '../conf'
import { RTCView } from 'react-native-webrtc';
import AwesomeButtonRick from 'react-native-really-awesome-button/src/themes/rick';
import AwesomeButton from "react-native-really-awesome-button";

import Janus from './Janus/janus.mobile';
let started = false
let janus;
var bitrateTimer = [];

var width = Dimensions.get('window').width; //full width
var height = Dimensions.get('window').height; //full height

// TODO*******:
// Add people to conference
// UI for many participants
// Cert file, HTTPS

class Conference extends Component {
  constructor(props) {
    super(props);
    this.state = {
      socketConnected: false,
      participants: [],
      inConference: false,
      offerReceived: false,
      disableInCallButtons: true,
      temporaryHideButton: false,
      audioIsOn: true,
      cameraIsOn: true,
      remoteHeight: 0,
      remoteWidth: 0,
      finalRemoteWidth: 0,

      // janus variable
      isFront: true,
      localStream: null,
      // selfViewSrcKey: null,
      remoteList: {},
      remoteListPluginHandle: {},
      publish: false,
    };
  }


  resetAllState() {
    this.setState({
      // My variable
      participants: [],
      inConference: false,
      offerReceived: false,
      disableInCallButtons: true,
      temporaryHideButton: false,
      audioIsOn: true,
      cameraIsOn: true,
      remoteHeight: 0,
      remoteWidth: 0,
      finalRemoteWidth: 0,

      // janus variable
      isFront: true,
      localStream: null,
      // selfViewSrcKey: null,
      remoteList: {},
      remoteListPluginHandle: {},
      publish: false,
    })
    this.offer = null
    this.sfu = null
    this.roomId = null
    this.nb_participant_accept = 0
    this.numberOfResponse = 0
    if (this.timeout) {
      clearTimeout(this.timeout)
    }
    this.props.dispatch(changeUsingMediaState(STOP_USING_MEDIA, ""))
    // InCallManager.stop()
    this.props.dispatch(getOffer({}))
  }

  componentDidMount() {
    Janus.init({
      debug: "all", callback: function () {
        if (started)
          return;
        started = true;
      }
    });
    if (this.props.offer.sender != undefined) {
      this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "conferencing"))
      this.roomId = this.props.offer.room
      console.log("receive conference offer", this.props.offer)
      // InCallManager.startRingtone('_DEFAULT_');
      this.offer = this.props.offer
      this.setState({ offerReceived: true })
    }
  }

  // componentWillUnmount() {
  //   if (this.socket != undefined) {
  //     this.socket.off("conference")
  //   }
  // }

  componentWillReceiveProps(props) {
    if (this.state.socketConnected) {
      return
    }
    if (props.socket != undefined) {
      this.setState({ socketConnected: true })
      this.socket = props.socket
      // this.socket.on("video_call", (data) => {
      //   if (data.type == "video-offer") {
      //     this.props.dispatch(getOffer(data))
      //     this.props.dispatch(changeTab("call"))
      //     console.log("recevie offer in Conference")
      //   }
      // })
      this.socket.on("conference", (data) => {
        if (data.type == "conference-offer") {

          // var participants = data.receiver.filter(username => username != this.props.authenticatedUser.username)
          // participants.push(data.sender)
          // this.setState({ participants: participants })

          this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "conferencing"))
          this.roomId = data.room
          console.log("receive conference offer", data)
          // InCallManager.startRingtone('_DEFAULT_');
          this.offer = data
          this.setState({ offerReceived: true })
        }
        else if (data.type == "conference-answer") {
          console.log("receive conference answer", data)
          this.numberOfResponse += 1
          // InCallManager.stopRingback();
        }
        else if (data.type == "conference-decline" || data.type == "busy-user") {
          console.log("receive conference decline", data)
          this.nb_participant_accept -= 1
          this.numberOfResponse += 1
          if (this.nb_participant_accept == 0) {
            console.log("All participants decline........")
            this.destroyRoom()
            // janus.destroy()
            this.resetAllState()
            Alert.alert("No one join the conference")
          }
          // InCallManager.stopRingback();
        }
        else if (data.type == "conference-hangup") {
          console.log("receive conference hangup", data)
          this.resetAllState()
          // InCallManager.stopRingback();
        }
        else if (data.type == "conference-picked-up") {
          console.log("receive conference pickup", data)
          this.resetAllState()
          // InCallManager.stopRingback();
        }
      })
    }
  }

  // ************************************************ Janus stuff **********************************************************
  janusStart = () => {
    console.log("connecting...")
    janus = new Janus(
      {
        server: mediaServer.JanusWssHost,
        iceServers: iceServers['iceServers'],
        success: () => {
          janus.attach(
            {
              plugin: "janus.plugin.videoroom",
              success: (pluginHandle) => {
                console.log("connect success")
                this.sfu = pluginHandle;
                if (this.offer == undefined) {
                  this.createRoom()
                }
                else {
                  this.joinRoom(this.offer.room)
                }
                this.janusOnMesseage()
                this.janusOnLocalStream()
                this.janusOnError()
              },
              consentDialog: (on) => {
              },
              mediaState: (medium, on) => {
              },
              webrtcState: (on) => {
              },
              onremotestream: (stream) => {
                console.log("Remote stream")
                console.log(stream)
              },
              oncleanup: () => {
                mystream = null;
              }
            });
        },
        error: (error) => {
          Alert.alert("  Janus Error", error);
          console.log(error)
        },
        destroyed: () => {
          this.setState({ publish: false });
        }
      })
  }

  janusOnMesseage() {
    this.sfu.onmessage = (msg, jsep) => {
      console.log(msg)
      var event = msg["videoroom"];
      if (event != undefined && event != null) {
        if (event === "joined") {
          myid = msg["id"];
          this.publishOwnFeed(true);
          if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
            var list = msg["publishers"];
            for (var f in list) {
              var id = list[f]["id"];
              var display = list[f]["display"];
              this.newRemoteFeed(id, display)
            }
          }
        } else if (event === "destroyed") {
        } else if (event === "event") {
          if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
            var list = msg["publishers"];
            for (var f in list) {
              let id = list[f]["id"]
              let display = list[f]["display"]
              this.newRemoteFeed(id, display)
            }
          } else if (msg["leaving"] !== undefined && msg["leaving"] !== null) {
            var leaving = msg["leaving"];
            var remoteFeed = null;
            let numLeaving = parseInt(msg["leaving"])
            var remoteList = this.state.remoteList
            if (this.state.remoteList.hasOwnProperty(numLeaving)) {
              delete this.state.remoteList[numLeaving]
              // this.setState({ remoteList: this.state.remoteList })
              this.state.remoteListPluginHandle[numLeaving].detach();
              delete this.state.remoteListPluginHandle[numLeaving]
              console.log(this.state.remoteList)
              console.log(this.numberOfResponse)
              console.log(this.state.participants)
              if (Object.keys(this.state.remoteList).length == 0 && this.numberOfResponse == this.state.participants.length) {
                this.destroyRoom()
                // janus.destroy()
                this.resetAllState()
                this.changeBusyState()
              }
            }
            // All participants leave the rooms

          } else if (msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
            var unpublished = msg["unpublished"];
            if (unpublished === 'ok') {
              this.sfu.hangup();
              return;
            }
            let numLeaving = parseInt(msg["unpublished"])
            if (this.state.remoteList.hasOwnProperty(numLeaving)) {
              delete this.state.remoteList.numLeaving
              this.setState({ remoteList: this.state.remoteList })
              this.state.remoteListPluginHandle[numLeaving].detach();
              delete this.state.remoteListPluginHandle.numLeaving
            }
          } else if (msg["error"] !== undefined && msg["error"] !== null) {
            if (msg.error_code === 426) {
              // This is a "no such room" error: give a more meaningful description
              Janus.warn('[VideoRoom] This is a no such room error');
              // this.createRoom(this.sfu);
              return;
            }
          }
        }
      }
      if (jsep !== undefined && jsep !== null) {
        this.sfu.handleRemoteJsep({ jsep: jsep });
      }
    }
  }

  janusOnLocalStream() {
    this.sfu.onlocalstream = (stream) => {
      this.setState({ localStream: stream });
      // this.setState({ selfViewSrcKey: Math.floor(Math.random() * 1000) });
    }
  }

  janusOnError() {
    this.sfu.error = (error) => {
      console.log("connect error")
      Alert.alert("  -- Error attaching plugin...", error);
    }
  }

  createRoom = () => {
    // console.log("creating roomm")
    // console.log(roomId)
    this.roomId = Math.floor(Math.random() * 100000);
    this.sfu.send({
      message: {
        request: 'create',
        room: this.roomId,
        notify_joining: true,
        // bitrate: 128000,
        ptype: "publisher",
        max_publishers: 6,
        display: this.props.authenticatedUser.username
      },
      success: () => {
        this.joinRoom()
        this.sendConferenceOffer()
      },
      error: error => Janus.error('[VideoRoom] er', error),
    });
    // this.janusStart()
  }

  joinRoom() {
    let register = {
      request: "join",
      room: this.roomId,
      ptype: "publisher",
      id: this.props.authenticatedUser.id,
      display: this.props.authenticatedUser.username
    };
    this.sfu.send({ "message": register });
    this.setState({ inConference: true })
  }

  destroyRoom() {
    this.sfu.send({
      message: {
        "request": "destroy",
        "room": this.roomId,
      },
      error: error => Janus.error('[VideoRoom] er', error),
    });
  }

  leaveRoom() {
    if (Object.keys(this.state.remoteList).length == 0) {
      this.destroyRoom()
      let hangUpMessage = {
        type: "conference-hangup",
        sender: this.props.authenticatedUser.username,
        receiver: this.state.participants
      }
      this.sendMessage("conference_signal", hangUpMessage)
    }
    this.sfu.send({
      message: {
        "request": "leave",
      },
      error: error => Janus.error('[VideoRoom] er', error),
    });
    // janus.destroy()
    this.resetAllState()
    this.changeBusyState()
  }

  publishOwnFeed(useAudio) {
    console.log("Function public new feed")
    if (!this.state.publish) {
      this.setState({ publish: true });
      this.sfu.createOffer(
        {
          media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true },
          success: (jsep) => {
            publish = { "request": "configure", "audio": useAudio, "video": true };
            this.sfu.send({ "message": publish, "jsep": jsep });
          },
          error: (error) => {
            console.log("error")
            Alert.alert("WebRTC error:", error);
            if (useAudio) {
              publishOwnFeed(false);
            } else {
            }
          }
        });
    } else {
      this.setState({ publish: false });
      let unpublish = { "request": "unpublish" };
      this.sfu.send({ "message": unpublish });
    }
  }

  newRemoteFeed(id, display) {
    console.log("Function new remote feed")
    let remoteFeed = null;
    janus.attach(
      {
        plugin: "janus.plugin.videoroom",
        success: (pluginHandle) => {
          console.log("success", pluginHandle)
          remoteFeed = pluginHandle;
          let listen = { "request": "join", "room": this.roomId, "ptype": "listener", "feed": id };
          remoteFeed.send({ "message": listen });
        },
        error: (error) => {
          console.log("error")
          Alert.alert("  -- Error attaching plugin...", error);
        },
        onmessage: (msg, jsep) => {
          let event = msg["videoroom"];
          console.log(msg)
          if (event != undefined && event != null) {
            if (event === "attached") {
              // Subscriber created and attached
            }
          }
          if (jsep !== undefined && jsep !== null) {
            remoteFeed.createAnswer(
              {
                jsep: jsep,
                media: { audioSend: false, videoSend: false },
                success: (jsep) => {
                  var body = { "request": "start", "room": this.roomId };
                  remoteFeed.send({ "message": body, "jsep": jsep });
                },
                error: (error) => {
                  console.log("error")
                  console.log(error)
                  Alert.alert("WebRTC error:", error)
                }
              });
          }
        },
        webrtcState: (on) => {
        },
        onlocalstream: (stream) => {
        },
        onremotestream: (stream) => {
          console.log("Receive peer stream")
          console.log(stream)
          this.setState({ remoteStream: stream })
          var remoteList = this.state.remoteList;
          var remoteListPluginHandle = this.state.remoteListPluginHandle;
          remoteList[id] = stream.toURL();
          remoteListPluginHandle[id] = remoteFeed
          this.setState({ remoteList: remoteList, remoteListPluginHandle: remoteListPluginHandle });
          
          console.log("number of remote stream")
          console.log(Object.keys(remoteList))
          // Duplicate stream
          // console.log("Receive peer stream")
          // console.log(stream)
          // this.setState({ remoteStream: stream })
          // remoteList = this.state.remoteList;
          // remoteListPluginHandle = this.state.remoteListPluginHandle;
          // remoteList[id + 1] = stream.toURL();
          // remoteListPluginHandle[id + 1] = remoteFeed
          // this.setState({ remoteList: remoteList, remoteListPluginHandle: remoteListPluginHandle });

          // My stuff
          this.setState({ disableInCallButtons: false })
          if (!this.isAudioCall) {
            setTimeout(() => { this.setState({ temporaryHideButton: true }) }, 5000)
          }

        },
        oncleanup: () => {
          if (remoteFeed.spinner !== undefined && remoteFeed.spinner !== null)
            remoteFeed.spinner.stop();
          remoteFeed.spinner = null;
          if (bitrateTimer[remoteFeed.rfindex] !== null && bitrateTimer[remoteFeed.rfindex] !== null)
            clearInterval(bitrateTimer[remoteFeed.rfindex]);
          bitrateTimer[remoteFeed.rfindex] = null;
        }
      });
  }

  // ************************************************ End of Janus stuff **********************************************************


  changeBusyState() {
    let changeBusyStateRequest = {
      type: "conference-leave",
      sender: this.props.authenticatedUser.username,
    }
    this.sendMessage("conference_signal", changeBusyStateRequest)
  }

  getListOfParticipants() {
    return new Promise(resolve => {
      this.sfu.send({
        message: {
          "request": "listparticipants",
          "room": this.roomId
        },
        success: (message) => {
          console.log(message.participants)
          resolve(message.participants)
        },
        error: (error) => {
          console.log(error)
        }
      })
    })

  }


  endCall = () => {
    // janus.destroy()
  }

  sendMessage(channel, data) {
    console.log("Sending message to signaling server........")
    console.log(data)
    this.socket.emit(channel, data)
  }

  sendConferenceOffer() {
    // InCallManager.start({ media: 'video', ringback: '_DTMF_' });
    this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "conferencing"))
    this.nb_participant_accept = this.state.participants.length
    this.numberOfResponse = 0
    var conferenceOffer = {
      type: "conference-offer",
      sender: this.props.authenticatedUser.username,
      receiver: this.state.participants,
      room: this.roomId,
    }
    this.sendMessage("conference_signal", conferenceOffer)
    // To doooooooooo
    // create, join janus room
  }

  answerConferenceOffer(answer) {
    const pickUpMessage = {
      type: "conference-picked-up",
      sender: this.props.authenticatedUser.username,
      receiver: this.props.authenticatedUser.username
    }
    this.sendMessage("conference_signal", pickUpMessage)
    if (answer == "accept") {
      this.janusStart()
      const acceptMessege = {
        type: "conference-answer",
        sender: this.props.authenticatedUser.username,
        receiver: this.offer.sender,
        socketOrigin: this.offer.socketOrigin
      }
      this.sendMessage("conference_signal", acceptMessege)
      this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "conferencing"))
    }
    else {
      // InCallManager.stopRingtone();
      // InCallManager.stop();
      const declineMessage = {
        type: "conference-decline",
        sender: this.props.authenticatedUser.username,
        receiver: this.offer.sender,
        socketOrigin: this.offer.socketOrigin
      }
      this.sendMessage("conference_signal", declineMessage)
      this.resetAllState()
      // InCallManager.stop();
    }
  }


  clickOnUser(item) {
    var chosen_users = this.state.participants
    if (this.state.participants.includes(item.username)) {
      chosen_users.splice(chosen_users.indexOf(item.username), 1)
    }
    else {
      chosen_users.push(item.username)
    }
    this.setState({ participants: chosen_users })
    console.log(chosen_users)
  }

  renderItem = ({ item }) => {
    if(item.firstName == null || item.lastName == null){
      return null
    }
    return (
      <TouchableOpacity >
        <ListItem onPress={() => this.clickOnUser(item)}>
          <CheckBox onPress={() => this.clickOnUser(item)} checked={this.state.participants.includes(item.username)} />
          <Body>
            <Text>{item.firstName} {item.lastName}</Text>
          </Body>
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

  getAllRooms() {
    this.sfu.send({
      message: {
        request: "list",

      },
      success: (message) => {
        console.log("ROOM", message);
        var rooms = message.list.filter(room => room != 1234 && room != 5678)
        console.log(rooms)
        this.setState({ listOfRooms: rooms })
      }
    });
  }

  controlCamera() {
    this.showVideoCallButton()
    let muted = this.sfu.isVideoMuted();
    if (muted) {
      this.setState({ cameraIsOn: true });
      this.sfu.unmuteVideo();
    } else {
      this.setState({ cameraIsOn: false });
      this.sfu.muteVideo();
    }
  }

  switchCamera() {
    this.showVideoCallButton()
    this.sfu.changeLocalCamera();
  }

  controlAudio() {
    this.showVideoCallButton()
    let muted = this.sfu.isAudioMuted();
    if (muted) {
      this.sfu.unmuteAudio();
      this.setState({ audioIsOn: true });
    } else {
      this.sfu.muteAudio();
      this.setState({ audioIsOn: false });
    }
  }

  test() {
    console.log(this.roomId)
    console.log(this.state.remoteList)
    this.getListOfParticipants().then(listOfParticipants => {
      console.log(listOfParticipants)
    })
    // this.getAllRooms()
  }

  onPageLayout(event) {
    const remoteWidth = event.nativeEvent.layout.width;
    const remoteHeight = event.nativeEvent.layout.height;
    console.log( event.nativeEvent.layout)
    console.log(remoteWidth)
    console.log(remoteHeight)
    this.setState({ remoteWidth: remoteWidth})
    this.setState({ remoteHeight: remoteHeight })
    // this.setState({width, height})
  }

  renderTwoRemoteView() {
    return (
      <View style={{ height: height, width: width }}>
        {Object.keys(this.state.remoteList).map((key, index) => {
          return (
            <Col onLayout={(event) => this.onPageLayout(event)}>
              <RTCView mirror={true} key={key} streamURL={this.state.remoteList[key]} style={{ height: this.state.remoteHeight, width: this.state.remoteWidth, backgroundColor: 'black' }} />
            </Col>
          )
        })
        }
      </View>
    )
  }

  renderMoreThanTwoView() {
    return (
      <View style={{ height: height, width: width, flexWrap: 'wrap', backgroundColor:'black' }}>
        { this.state.remoteList && this.state.localStream && 
          Object.keys(this.state.remoteList).map((key, index) => {
            if (index == Object.keys(this.state.remoteList).length - 1 && index % 2 == 0) {
              return (
                <Row key={key} >
                  <Col >
                    <RTCView mirror={true} streamURL={this.state.remoteList[key] } style={{height: this.state.remoteHeight, width: width}} />
                  </Col>
                </Row>
              )
            }
            else if (index % 2 == 0) {
              return (
                <Row key={key}>
                  <Col onLayout={(event) => this.onPageLayout(event)} >
                    <RTCView mirror={true}  streamURL={this.state.remoteList[key]}  style={{height: this.state.remoteHeight, width: width/2}}/>
                  </Col>
                  <Col >
                    <RTCView mirror={true} streamURL={this.state.remoteList[Object.keys(this.state.remoteList)[index + 1]] } style={{height: this.state.remoteHeight, width: width/2}}/>                    
                  </Col>
                </Row>
              )
            }
          })
        }

      </View>
    )
  }

  renderInConference() {
    return (
      <View style={styles.container}>
        {/* <TouchableOpacity activeOpacity={1} onPress={() => this.showVideoCallButton()}>
        {this.state.localStream &&
          <RTCView streamURL={this.state.localStream.toURL()} style={styles.selfView} />}

        {this.state.remoteList && Object.keys(this.state.remoteList).map((key, index) => {
          return <RTCView key={key} streamURL={this.state.remoteList[key]} style={styles.remoteView} />
        })
        }
        </TouchableOpacity> */}

        <TouchableOpacity activeOpacity={1} onPress={() => this.showVideoCallButton()}>
          {this.state.remoteList
            ? 
            Object.keys(this.state.remoteList).length <= 2
              ? this.renderMoreThanTwoView()
              : this.renderMoreThanTwoView()
            : null}
        </TouchableOpacity>


        {/* <View style={styles.container}> */}
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
            <TouchableOpacity style={styles.imageContainer}
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
                onPress={() => this.leaveRoom()} >
                <Image style={styles.image} source={require('../assets/hangupEnable3.png')} />
              </TouchableOpacity>
            }
          </Col>
        </View>
        {/* </View> */}
        {/* <Button onPress={() => this.test()}><Text>Test</Text></Button> */}
      </View>
    )
  }

  getOtherReceiver() {
    let receiver = this.offer.receiver.filter(username => username != this.props.authenticatedUser.username)
    var otherReceiever = ""
    for (let index = 0; index < receiver.length; index++) {
      otherReceiever += receiver[index]
      if (index != receiver.length - 1) {
        otherReceiever += ", "
      }
    }
    return otherReceiever
  }

  showVideoCallButton() {
    console.log("Pressssss")
    this.setState({ temporaryHideButton: false })
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => { this.setState({ temporaryHideButton: true }) }, 5000)
  }

  renderIncomingConference() {
    return (
      <View style={{ flex: 1, flexDirection: 'column', height: height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ alignSelf: 'center', textAlign: 'center' }}>{this.offer.sender} invite you to join a conference with {this.getOtherReceiver()}</Text>
        <View style={styles.answerBtnView}>
          <Col style={{ alignItems: 'center' }}>
            <TouchableOpacity style={styles.imageContainer}
              onPress={() => this.answerConferenceOffer("decline")} >
              <Image style={styles.image} source={require('../assets/decline3.png')} />
            </TouchableOpacity>
          </Col>
          <Col style={{ alignItems: 'center' }}>
            <TouchableOpacity style={styles.imageContainer}
              onPress={() => this.answerConferenceOffer("accept")} >
              <Image style={styles.image} source={require('../assets/accept3.png')} />
            </TouchableOpacity>
          </Col>
        </View>

      </View>
    )
  }

  renderMainView() {
    return (
      <Container>
        <Header>
          <Body style={{ alignItems: 'center' }}>
            <Title>Conference</Title>
          </Body>
        </Header>
        {/* <Button onPress={() => this.janusStart()} disabled={this.state.participants[1] == undefined}>
          <Text>
            Create conference
            </Text>
        </Button> */}
        <AwesomeButtonRick style={{ position: 'absolute', bottom: 50, right: 50 }} onPress={() => this.janusStart()} disabled={this.state.participants[1] == undefined} type={this.state.participants[1] == undefined ? 'disabled' : 'anchor'}>
          <Image style={{ height: 48, width: 48, borderRadius: 24, alignSelf: 'center' }} source={require(`../assets/phone2.png`)} />
        </AwesomeButtonRick>
        {/* <Button onPress={() => this.test()}><Text>Test</Text></Button> */}
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

  render() {
    if (this.state.inConference) {
      return this.renderInConference()
    }
    else if (this.state.offerReceived) {
      return this.renderIncomingConference()
    }
    else {
      return this.renderMainView()
    }
  }
}

const styles = StyleSheet.create({
  selfView: {
    width: 200,
    height: 150,
  },
  remoteView: {
    width: 100,
    height: 100
  },
  container: {
    flex: 1,
    flexDirection: 'column'
  },
  answerBtnView: {
    bottom: 30,
    justifyContent: 'space-around',
    position: 'absolute',
    flexDirection: 'row',
  },
  localBtnView: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    position: 'absolute',
  },
  remoteBtnView: {
    bottom: 30,
    justifyContent: 'space-around',
    position: 'absolute',
    flexDirection: 'row',
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
});



export default Conference;
