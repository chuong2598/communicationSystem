import React, { Component } from 'react';
import { View, Dimensions, Alert, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Container, Header, Button, Text, Body, Form, Item as FormItem, Input, Label, Title, Thumbnail, Spinner, Textarea, Item, Left, Icon, Right, Content } from 'native-base';
import { changeUsingMediaState, changeTab, getOffer } from '../actions'
import { START_USING_MEDIA, STOP_USING_MEDIA } from '../actions/types'
import AsyncStorage from '@react-native-community/async-storage';

import Janus from './Janus/janus.mobile';
import mediaServer from '../janusConf'
import iceServers from '../conf'

import { RTCView } from 'react-native-webrtc';
import LiveChatRoom from './LiveChatRoom';


let started = false
let janus;
var bitrateTimer = [];

var width = Dimensions.get('window').width; //full width
var height = Dimensions.get('window').height; //full height

// To do:
// When live stream, block incoming offer.....
// Watch ended stream
// Refresh token

class LiveStreaming extends Component {
  constructor(props) {
    super(props);
    this.state = {
      streamTitle: "",
      streamDescription: "",
      finishSetUp: false,
      videoHeight: height / 2.25,
      isFullScreen: false,

      // janus variable
      isFront: true,
      localStream: null,
      remoteStream: null,
      // selfViewSrcKey: null,
      remoteList: {},
      remoteListPluginHandle: {},
      publish: false,
      // currentLiveStream: undefined
    };
  }

  resetAllState() {
    this.setState({
      streamTitle: "",
      streamDescription: "",
      finishSetUp: false,

      // janus variable
      isFront: true,
      localStream: null,
      // selfViewSrcKey: null,
      remoteList: {},
      remoteListPluginHandle: {},
      publish: false,
      // currentLiveStream: undefined
    })
    this.sfu = null
    this.roomId = null
    this.currentLiveStream = null
    this.props.dispatch(changeUsingMediaState(STOP_USING_MEDIA, null))
  }

  // deleteAllStream(){
  //   for (let index = 300; index < 500; index++) {
  //     // ******* Implement delete from database *******
  //   fetch(`https://www.e-lab.live:8080/api/delete-livestream/${index}?access_token=${this.props.access_token}`, {
  //     headers: {
  //       'Accept': 'application/json',
  //       'Content-Type': 'application/json'
  //     },
  //     method: 'delete',
  //   })
  //     .then(res => res.json())
  //     .catch(e => console.log(e));
  //   }
  // }

  componentDidMount() {
    // this.deleteAllStream()

    this.isFullScreen = false
    console.log(this.props.liveStream)
    if (this.props.isPublisher == undefined) {
      Alert.alert("An error has occured")
      this.goBack()
    }
    Janus.init({
      debug: "all", callback: function () {
        if (started)
          return;
        started = true;
      }
    });
    if (this.props.isPublisher) {
      console.log("This is a publisher")
    }
    else {
      console.log("cac")
      this.roomId = this.props.liveStream.roomID
      console.log("this is a subscriber", this.props.liveStream.publisher.id, this.props.liveStream.roomID)
      this.janusStart()
    }
  }

  // componentWillUnmount() {
  //   this.resetAllState()
  // }

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
                if (this.props.isPublisher) {
                  this.createRoom()
                }
                else {
                  this.joinRoom()
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
                console.log(this.props.isPublisher)
                console.log("Steam has ended")
                if (!this.props.isPublisher && !this.leavingRoom && Object.keys(this.state.remoteList)[0] != undefined) {
                  Alert.alert("Steam ended", "The playback video will be available soon.")
                  this.resetAllState()
                  this.goBack()
                }
              }
            });
        },
        error: (error) => {
          Alert.alert("Janus Error", error);
          console.log(error)
        },
        destroyed: () => {
          // this.setState({ publish: false });
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
            if (this.state.remoteList.hasOwnProperty(numLeaving)) {
              delete this.state.remoteList.numLeaving
              this.setState({ remoteList: this.state.remoteList })
              this.state.remoteListPluginHandle[numLeaving].detach();
              delete this.state.remoteListPluginHandle.numLeaving
            }
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
            Alert.alert("Video stream is not available")
            janus.destroy()
            this.goBack()
            if (msg.error_code === 426) {
              // This is a "no such room" error: give a more meaningful description
              Janus.warn('[VideoRoom] This is a no such room error');
              // this.createRoom(this.sfu);
              return;
            }
            if (msg.error_code === 428) {
              return;
            }
          }
        }
      }
      if (jsep !== undefined && jsep !== null) {
        console.log("handle jsep")
        if (this.props.isPublisher) {
          this.sfu.handleRemoteJsep({ jsep: jsep });
        }
        else {
          this.newRemoteFeed()
        }
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
        this.addStreamToDb().then(liveStream => {
          this.joinRoom()
        })
      },
      error: error => Janus.error('[VideoRoom] er', error),
    });
    // this.janusStart()
  }

  joinRoom() {
    var register;
    if (this.props.isPublisher) {
      register = {
        request: "join",
        room: this.roomId,
        ptype: "publisher",
        id: this.props.authenticatedUser.id,
        display: this.props.authenticatedUser.username
      }
    }
    else {
      // body of subscriber
      register = {
        request: "join",
        room: this.roomId,
        ptype: "subscriber",
        feed: this.props.liveStream.publisher.id,
        display: this.props.authenticatedUser.username
      };
    }
    this.sfu.send({ "message": register });
  }

  destroyRoom() {
    console.log("Function destroy room")
    this.sfu.send({
      message: {
        "request": "destroy",
        "room": this.roomId,
      },
      error: error => Janus.error('[VideoRoom] er', error),
    });
    this.deleteStreamFromDb()
  }

  leaveRoom() {
    this.sfu.send({
      message: {
        "request": "leave",
      },
      error: error => Janus.error('[VideoRoom] er', error),
    });
    if (!this.props.isPublisher) {
      this.leavingRoom = true
      janus.destroy()
      this.goBack()
    }
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
          let listen = { "request": "join", "room": this.roomId, "ptype": "subscriber", "feed": this.props.liveStream.publisher.id };
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
          this.setState({ remoteStream: stream })
          var remoteList = this.state.remoteList;
          var remoteListPluginHandle = this.state.remoteListPluginHandle;
          remoteList[id] = stream.toURL();
          remoteListPluginHandle[id] = remoteFeed
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

  addStreamToDb() {
    // ******* Implement add to database *******
    return new Promise((resolve) => {
      let body = {
        title: this.state.streamTitle,
        description: this.state.streamDescription,
        roomID: this.roomId,
        status: "live",
        url: null,
        publisher: {
          id: this.props.authenticatedUser.id
        }
      }
      console.log(body)
      console.log(this.props.access_token)
      fetch(`https://www.e-lab.live:8080/api/create-livestream?access_token=${this.props.access_token}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(body)
      })
        .then(res => res.json())
        .then(liveStream => {
          console.log("livestream created", liveStream);
          this.currentLiveStream = liveStream
          resolve(liveStream)
          // this.setState({ currentLiveStream: liveStream })
        })
        .catch(e => console.log(e));
    })
  }



  deleteStreamFromDb() {
    // ******* Implement delete from database *******
    fetch(`https://www.e-lab.live:8080/api/delete-livestream/${this.currentLiveStream.id}?access_token=${this.props.access_token}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'delete',
    })
      .then(res => res.json())
      .catch(e => console.log(e));
  }

  goBack() {
    this.props.dispatch(changeUsingMediaState(STOP_USING_MEDIA, null))
  }

  handleTetxChange(text, param) {
    this.setState({ [param]: text })
  }

  startStreaming() {
    this.setState({ finishSetUp: true })
    this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "liveStreaming"))
    this.janusStart()
  }

  stopStreaming() {
    this.leaveRoom()
    this.destroyRoom()
    janus.destroy()
    this.resetAllState()
  }

  confirmStopStreaming() {
    Alert.alert(
      'End live stream',
      'Are you sure to stop streaming?',
      [
        { text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
        {
          text: 'OK', onPress: () => {
            this.stopStreaming()
            console.log('OK Pressed')
          }
        }
      ],
      { cancelable: false }
    )
  }

  getAllRooms() {
    let body = { request: "list" };
    this.sfu.send({
      message: body, success: (message) => {
        console.log("ROOM", message);
        var rooms = message.list.filter(room => room != 1234 && room != 5678)
        console.log(rooms)
      }
    });
  }

  test() {
    console.log(this.state.localStream)
    console.log(this.roomId)
    this.getAllRooms()
  }
  
  zoom() {
    console.log(this.state.isFullScreen)
    if (this.state.isFullScreen) {
      this.setState({ videoHeight: this.videoHeight / 2.25 })
    }
    else {
      this.setState({ videoHeight: this.videoHeight })
    }
    this.setState({ isFullScreen: !this.state.isFullScreen })
    // this.state.isFullScreen = !this.isFullScreen
  }

  getVideoFullHeight(event) {
    const { width, height } = event.nativeEvent.layout;
    this.videoHeight = height
  }

  renderPublihser() {
    return (
      <View style={{ flex: 1 }}>
        {this.state.localStream &&
          <View onLayout={(event) => this.getVideoFullHeight(event)} style={{ flex: 1, height: this.state.videoHeight, width: width }}>
            {!this.state.isFullScreen &&
              <View >
                <Header >
                  <Left style={{ flex: 1 }}>
                    <Button transparent onPress={() => this.confirmStopStreaming()} >
                      <Icon name='arrow-back' />
                    </Button>
                  </Left>
                  <Body style={{ flex: 1, alignItems: 'center' }}>
                    <Title >{this.state.streamTitle}</Title>
                  </Body>
                  <Right style={{ flex: 1 }} />
                </Header>
              </View>
            }
            <View>
              <RTCView streamURL={this.state.localStream.toURL()} style={{ height: this.state.videoHeight, width: width, backgroundColor: 'black' }} />
              <TouchableOpacity onPress={() => this.zoom()} style={{ position: 'absolute', bottom: 20, right: 20, height: 48, width: 48, borderRadius: 32 }} >
              {this.state.isFullScreen 
               ? <Icon name="fullscreen-exit" type="MaterialIcons" style={{fontSize: 48, color: 'white'}} />
                :  <Icon name="fullscreen" type="MaterialIcons" style={{fontSize: 48, color: 'white'}} />
              }
                {/* <Image style={{ height: 48, width: 48, borderRadius: 24, alignSelf: 'center' }} source={require('../assets/videoOff3.png')} /> */}
              </TouchableOpacity>
            </View>
              <LiveChatRoom isFullScreen ={this.state.isFullScreen} liveStreamId={this.currentLiveStream.id} roomId={this.roomId} socket={this.props.socket} authenticatedUser={this.props.authenticatedUser} />
          </View>
        }
      </View>
    )
  }

  renderSubscriber() {
    return (
      <View style={{ flex: 1 }}>
          {this.state.remoteStream &&
          <View onLayout={(event) => this.getVideoFullHeight(event)} style={{ flex: 1, height: this.state.videoHeight, width: width }}>
            {!this.state.isFullScreen &&
              <View >
                <Header >
                  <Left style={{ flex: 1 }}>
                    <Button transparent onPress={() => this.leaveRoom()} >
                      <Icon name='arrow-back' />
                    </Button>
                  </Left>
                  <Body style={{ flex: 1, alignItems: 'center' }}>
                    <Title >{this.props.liveStream.title}</Title>
                  </Body>
                  <Right style={{ flex: 1 }} />
                </Header>
              </View>
            }
            <View>
              <RTCView streamURL={this.state.remoteStream.toURL()} style={{ height: this.state.videoHeight, width: width, backgroundColor: 'black' }} />
              <TouchableOpacity onPress={() => this.zoom()} style={{ position: 'absolute', bottom: 20, right: 20, height: 48, width: 48, borderRadius: 32 }} >
              {this.state.isFullScreen 
               ? <Icon name="fullscreen-exit" type="MaterialIcons" style={{fontSize: 48, color: 'white'}} />
                :  <Icon name="fullscreen" type="MaterialIcons" style={{fontSize: 48, color: 'white'}} />
              }
                {/* <Image style={{ height: 48, width: 48, borderRadius: 24, alignSelf: 'center' }} source={require('../assets/videoOff3.png')} /> */}
              </TouchableOpacity>
            </View>
              <LiveChatRoom liveStreamId={this.props.liveStream.id} roomId={this.roomId} socket={this.props.socket} authenticatedUser={this.props.authenticatedUser} />
          </View>
        }
      </View>
    )
  }

  renderInitializingStream() {
    return (
      <Container>
        <Header >
          <Left style={{ flex: 1 }}>
            <Button transparent onPress={() => this.goBack()} >
              <Icon name='arrow-back' />
            </Button>
          </Left>
          <Body style={{ flex: 1, alignItems: 'center' }}>
            <Title >Live Stream</Title>
          </Body>
          <Right style={{ flex: 1 }} />
        </Header>
        <Form style={{ marginTop: 30, backgroundColor: 'white', height: height }}>
          <FormItem floatingLabel style={{ flexDirection: 'row' }} >
            <Label >Title</Label>
            <Input onChangeText={(text) => this.handleTetxChange(text, "streamTitle")} />
          </FormItem>
          <Text></Text>
          <FormItem floatingLabel style={{ flexDirection: 'row' }} >
            <Label >Description</Label>
            <Input multiline={true} numberOfLines={1} onChangeText={(text) => this.handleTetxChange(text, "streamDescription")} />
          </FormItem>
          <Text></Text>
          <Button style={{ marginHorizontal: 20 }} rounded block success onPress={() => this.startStreaming()}>
            <Text> Start streaming </Text>
          </Button>
        </Form>
      </Container>
    )
  }

  renderLoadingScreen() {
    return (
      <View style={{ flex: 1, alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
        <Spinner color='blue' />
        <Text>Please wait a moment...</Text>
      </View>
    )
  }

  render() {
    if (this.state.localStream) {
      return (
        this.renderPublihser()
      )
    }
    else if (this.state.remoteStream && this.props.liveStream) {
      return (
        this.renderSubscriber()
      )
    }
    else {
      if (this.props.isPublisher && !this.state.finishSetUp) {
        return (
          this.renderInitializingStream()
        )
      }
      else {
        return (
          this.renderLoadingScreen()
        )
      }
    }
  }
}

const styles = StyleSheet.create({


});



export default LiveStreaming;
