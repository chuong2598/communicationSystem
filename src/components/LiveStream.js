import React, { Component } from 'react';
import { Content, Container, Text, Header, Body, Title, Form, Item, Picker, Icon, Button, List, ListItem } from 'native-base';

import { View, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { changeUsingMediaState, changeTab, getOffer } from '../actions'
import { START_USING_MEDIA, STOP_USING_MEDIA } from '../actions/types'
import LiveStreaming from './LiveStreaming';
import AsyncStorage from '@react-native-community/async-storage';
import ViewScreen from './VideoScreen';

const groupBy = key => array =>
  array.reduce((objectsByKeyValue, obj) => {
    var value;
    if (key == "publisher") {
      value = obj[key]["username"];
    }
    else {
      value = obj[key];
    }
    objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
    return objectsByKeyValue;
  }, {});

class LiveStream extends Component {
  constructor(props) {
    super(props);
    this.state = {
      socketConnected: false,
      selectedVideoMode: 'ended',
      endedSteams: undefined,
      onGoingStreams: undefined,
      refreshing: false,
    };
  }


   getAllLiveStream() {
    return new Promise(async (resolve) =>  {
    var login_session = await AsyncStorage.getItem('login_session')
    login_session = JSON.parse(login_session)
    console.log(login_session)
    this.access_token = login_session.access_token
    fetch(`https://www.e-lab.live:8080/api/get-livestreams?access_token=${this.access_token}`)
      .then(res => res.json())
      .then(liveStreams => {
        // this.props.dispatch(getAllUser(liveStreams))
        console.log(liveStreams)
        const groupByStatus = groupBy('status')
        const liveStreamByStatus = groupByStatus(liveStreams)
        this.setState({ onGoingStreams: liveStreamByStatus.live })
        console.log(liveStreamByStatus.live)
        console.log(this.state.onGoingStreams)
        const groupByPublihser = groupBy('publisher');
        var endedSteamByUser = groupByPublihser(liveStreamByStatus.ended)
        this.setState({ endedSteams: endedSteamByUser })
        console.log(endedSteamByUser)
        resolve(endedSteamByUser)
      })
    })
  }



  componentDidMount() {
    console.log("liveStream unmount")
    this.isPublisher = false
    this.getAllLiveStream()
  }

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
      //     console.log("recevie offer in livestream")
      //     // this.sendMessage("video_call_signal", data)
      //   }
      // }
      // )
    }
  }

  sendMessage(channel, data) {
    console.log("Sending message to signaling server........")
    console.log(data)
    this.socket.emit(channel, data)
  }

  changeMode(value) {
    console.log(value)
    this.setState({ selectedVideoMode: value })
  }

  createLiveStream() {
    this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "liveStreaming"))
    this.isPublisher = true
  }

  watchEndedStream(liveStream) {
    if (liveStream.url == null) {
      Alert.alert("Video is not available")
      return(null)
    }
    this.chosenLiveStream = liveStream
    this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "watchEndedStream"))
    console.log(liveStream)
  }

  _onRefresh = () => {
    this.setState({refreshing: true});
    this.getAllLiveStream().then(() => this.setState({refreshing: false}))
  }
  
  watchLiveStream(liveStream){
    // Implement watch live stream
    this.isPublisher = false
    this.liveStream = liveStream
    this.props.dispatch(changeUsingMediaState(START_USING_MEDIA, "liveStreaming"))
  } 

  getListItemColor(index){
    if (index%2==0){
      return "white"
    }
    return "#eaedee"
  }

  renderOnGoingeStream() {
    return (
      <Container>
        <Content  
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={() => this._onRefresh()}
            />
          }>
        {this.state.onGoingStreams &&
          this.state.onGoingStreams.length != 0
          ?
          
            <List 
            >
              {
                this.state.onGoingStreams.map((liveStream, index) => {
                  return (
                    <ListItem onPress={() => this.watchLiveStream(liveStream)} key={liveStream.id} style={{ flexDirection: 'column', backgroundColor: this.getListItemColor(index) }}>
                      <Text style={{ fontWeight: 'bold', alignSelf: 'flex-start' }}>Publisher: {liveStream.publisher.username} </Text>
                      <Text style={{alignSelf: 'flex-start'}}>Title: {liveStream.title}</Text>
                      <Text style={{alignSelf: 'flex-start'}}>Description: {liveStream.description}</Text>
                    </ListItem>
                  )
                })
              }
            </List>

          : <Container style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text>There is no live stream available</Text>
          </Container>
        }
          </Content>

      </Container>
    )
  }

  renderEndedStream() {
    return (
      <Container>
       <Content  
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={() => this._onRefresh()}
            />
          }>
          {this.state.endedSteams &&
            Object.keys(this.state.endedSteams).map((key, index) => {
              return (
                <List key={key}>
                  <ListItem itemDivider style={{backgroundColor: 'lightgrey'}}>
                    <Text>{key}</Text>
                  </ListItem>
                  {this.state.endedSteams[key].map((liveStream, index) =>
                    <ListItem key={liveStream.id} onPress={() => this.watchEndedStream(liveStream)} style={{ flexDirection: 'column' }} >
                      <Text style={{alignSelf: 'flex-start'}}> Title: {liveStream.title}</Text>
                      <Text style={{alignSelf: 'flex-start'}}> Description: {liveStream.description}</Text>
                    </ListItem>
                  )}
                </List>
              )
            })
          }
        </Content>
      </Container>
    )
  }

  renderMainView() {
    return (
      <Container>
        <Header>
          <Body style={{ alignItems: 'center' }}>
            <Title>Live Stream</Title>
          </Body>
        </Header>

        <Form>
          <Item picker>
            <Picker
              mode="dropdown"
              iosIcon={<Icon name="arrow-down" />}
              placeholder="Ended stream or on going stream"
              placeholderStyle={{ color: "blue" }}
              // placeholderIconColor="yellow"
              selectedValue={this.state.selectedVideoMode}
              onValueChange={(value) => this.changeMode(value)} >
              <Picker.Item  label="On going stream" value="live" />
              <Picker.Item  label="Ended stream" value="ended" />
            </Picker>
          </Item>
        </Form>

        {this.state.selectedVideoMode == 'live'
          ? this.renderOnGoingeStream()
          : this.renderEndedStream()
        }
        <Button style={{marginVertical: 10, marginHorizontal: 20}} rounded block success onPress={() => this.createLiveStream()}><Text>Create new livestream</Text></Button>
      </Container>
    )
  }

  render() {
    // if(this.props.chosenTab == "call"){
    //   return <Call/>
    // }
    if (this.props.usingMedia == "liveStreaming") {
      return (
        <LiveStreaming access_token={this.access_token} socket={this.socket} liveStream={this.liveStream} authenticatedUser={this.props.authenticatedUser} isPublisher={this.isPublisher} dispatch={this.props.dispatch} />
      )
    }
    else if (this.props.usingMedia == "watchEndedStream"){
      return(
        <ViewScreen liveStream = {this.chosenLiveStream} authenticatedUser={this.props.authenticatedUser} dispatch = {this.props.dispatch} />
      )
    }
    else {
      return (
        this.renderMainView()
      )
    }

  }
}

export default LiveStream;
