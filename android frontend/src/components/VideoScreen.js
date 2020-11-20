import React, { Component } from 'react';
import { View, Dimensions } from 'react-native';
import { Container, Button, Text, Content, Header, Left, Right, Icon, Body, Title } from 'native-base'
import WebView from 'react-native-android-fullscreen-webview-video';
import { changeUsingMediaState, changeTab, getOffer } from '../actions'
import { START_USING_MEDIA, STOP_USING_MEDIA } from '../actions/types'


var width = Dimensions.get('window').width; //full width
var height = Dimensions.get('window').height; //full height
class ViewScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  goBack() {
    this.props.dispatch(changeUsingMediaState(STOP_USING_MEDIA, ""))
  }
  

  render() {
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

        {this.props.liveStream &&
          <View style={{ height: height / 1.5 }}>
            <WebView
              source={{ uri: this.props.liveStream.url }} />
          </View>
        }
        <Text></Text>
        <View style={{ marginLeft: 20 }}>
          <Text style={{ fontWeight: 'bold', alignSelf: 'flex-start' }}>Author: {this.props.liveStream.publisher.username} </Text>
          <Text style={{ alignSelf: 'flex-start' }}>Title: {this.props.liveStream.title}</Text>
          <Text style={{ alignSelf: 'flex-start' }}>Description: {this.props.liveStream.description}</Text>
        </View>

      </Container>
    );
  }
}

export default ViewScreen;
