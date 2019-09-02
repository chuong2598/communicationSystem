// In App.js in a new project
import React from "react";
import { connect } from 'react-redux'
import { navigation } from "react-navigation";
import AsyncStorage from '@react-native-community/async-storage';
import io from "socket.io-client";
import { Container, Button, Text, List, ListItem, Body,  } from 'native-base'

import { authenticateUser, getAllUser, changeTab, getOffer, getOnlineUsers } from '../actions'

import LiveStream from "./LiveStream";
import Conference from "./Conference";
import FooterBar from './FooterBar'
import Call from "./Call";
import Setting from "./Setting";

console.disableYellowBox = true;

class Home extends React.Component {

  constructor() {
    super()
    this.state = { socket: undefined }
  }

  static navigationOptions = {
    header: null,
    headerLeft: null,
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
        login_session = JSON.parse(login_session)
        // ****implement check expired token -> user refresh token
        this.props.dispatch(authenticateUser(login_session.user))
        this.getAllUsers().then(users => {
          this.connectToSignallingServer(login_session.user.username)
        })        
      }
    });
  }

  connectToSignallingServer(username) {
    this.socket = io("https://www.e-lab.live:9000/")
    this.setState({ socket: this.socket });
    this.socket.on("connect", () => {
      console.log("success connect to signaling server")
      this.socket.on("connect_failed", () => {
        console.log("Cannot connect to signaling server")
      })
      this.socket.on("online_users", (online_users) => {
        var onlineUsers = this.props.users.filter(user => online_users.includes(user.username))
        this.props.dispatch(getOnlineUsers(onlineUsers))
      })
      this.socket.on("video_call", (data) => {
        if (data.type == "video-offer") {
          this.props.dispatch(getOffer(data))
          this.props.dispatch(changeTab("call"))
        }
      })
      this.socket.on("conference", (data) => {
        if (data.type == "conference-offer") {
          console.log(data)
          this.props.dispatch(getOffer(data))
          this.props.dispatch(changeTab("conference"))
        }
      })
      this.socket.emit("add_online_user", (username))
    })
  }


  getAllUsers() {
    return new Promise(resolve => {
      fetch("https://www.e-lab.live:8080/api/get-users")
      .then(res => res.json())
      .then(data => {
        var users = data.filter(user => user.id != this.props.authenticatedUser.id)
        this.props.dispatch(getAllUser(users))
        resolve(users)
      })
    })
  }

  // async handleLogout() {
  //   await AsyncStorage.removeItem('login_session');
  //   this.props.dispatch(authenticateUser({}))
  //   this.props.dispatch(changeTab("call"))
  //   this.props.navigation.navigate("Login")
  //   this.socket.disconnect()
  // }

  renderCalling() {
    return (
      <Container>
        <Call offer={this.props.offer} chosenTab = {this.props.chosenTab}  onlineUsers={this.props.onlineUsers} dispatch={this.props.dispatch} authenticatedUser={this.props.authenticatedUser} users={this.props.users} socket={this.state.socket} />
      </Container>
    )
  }

  renderLiveStreaming() {
    return (
      <Container>
        <LiveStream usingMedia={this.props.usingMedia} authenticatedUser={this.props.authenticatedUser} socket = {this.state.socket} chosenTab = {this.props.chosenTab} dispatch={this.props.dispatch} />
      </Container>
    )
  }

  renderConference() {
    return (
      <Container>
             <Conference offer={this.props.offer} authenticatedUser={this.props.authenticatedUser} users={this.props.users} onlineUsers={this.props.onlineUsers} socket = {this.state.socket} chosenTab = {this.props.chosenTab} dispatch={this.props.dispatch}/>
      </Container>
    )
  }

  renderSetting(){
    return(
      <Container>
        <Setting authenticatedUser ={this.props.authenticatedUser} socket={this.socket} dispatch={this.props.dispatch} navigation={this.props.navigation}/>
      </Container>
    )
  }

  render() {
    return (

      <Container>
        {
          this.props.chosenTab === "call"
            ? this.renderCalling()
            : this.props.chosenTab === "liveStream"
              ? this.renderLiveStreaming()
              : this.props.chosenTab === "conference"
                ? this.renderConference()
                  : this.renderSetting()
        }

        {this.props.usingMedia == null && <FooterBar />}

      </Container>
    )
  }
}

function mapStateToProps(centralState) {
  return {
    authenticatedUser: centralState.authenticatedUser,
    users: centralState.users,
    chosenTab: centralState.chosenTab,
    usingMedia: centralState.usingMedia,
    onlineUsers: centralState.onlineUsers,
    offer: centralState.offer
  }
}

export default connect(mapStateToProps)(Home);
