import React, { Component } from 'react';
import { View, Alert } from 'react-native';
import { navigation } from "react-navigation";
import AsyncStorage from '@react-native-community/async-storage';
import { Container, Button, Text, List, ListItem, Body, Header, Title, Content, Left, Thumbnail, Right, Icon, Switch } from 'native-base'

import { authenticateUser, getAllUser, changeTab, getOffer, getOnlineUsers } from '../actions'

class Setting extends Component {
  constructor(props) {
    super(props);
    this.state = { socketConnected: false
    };
  }

  componentWillReceiveProps(props) {
    if (this.state.socketConnected) {
      return
    }
    if (props.socket != undefined) {
      this.setState({ socketConnected: true })
      this.socket = props.socket
    }
  }

  async handleLogout() {
    await AsyncStorage.removeItem('login_session');
    this.props.dispatch(authenticateUser({}))
    this.props.dispatch(changeTab("call"))
    this.props.navigation.navigate("Login")
    this.socket.disconnect()
  }

  editUserInfo(){
    Alert.alert("Not implemented yet")
  }

  render() {
    return (
      <Container>
           <Header>
          <Body style={{ alignItems: 'center' }}>
            <Title>Setting</Title>
          </Body>
        </Header>

        <Content>
          <List>

            <ListItem style={{height: 75}} icon>
            <Left>
              <Button style={{ backgroundColor: "gray" }}>
                <Icon active name="account" type="MaterialCommunityIcons"/>
              </Button>
            </Left>
            <Body>
              <Text>{this.props.authenticatedUser.username}</Text>
              <Text note> Edit</Text>
            </Body>

          </ListItem>

            <ListItem style={{height: 75}} icon onPress={() => this.handleLogout()} >
            <Left>
              <Button style={{ backgroundColor: "gray" }}>
                <Icon active name="sign-out" type="FontAwesome"/>
              </Button>
            </Left>
            <Body>
              <Text>Sign out</Text>
            </Body>
          </ListItem>

          </List>
        </Content>
        
          {/* <Button primary onPress={() => this.handleLogout()}>
          <Text>Log out</Text>
        </Button> */}
      </Container>
    );
  }
}

export default Setting;
