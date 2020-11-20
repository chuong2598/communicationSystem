import React, { Component } from 'react';
import { Container, Header, Content, Footer, FooterTab, Button, Text, Icon } from 'native-base';
import {changeTab} from '../actions'
import { connect } from 'react-redux'

class FooterBar extends Component {


  changeTab(chosenTab){
    this.props.dispatch(changeTab(chosenTab))
  }

  // getColor(tab){
  //   if(this.props.chosenTab == tab){
  //     return "white" 
  //   }
  //   return "darkgrey"
  // }

  render() {
    return (
        <Footer>
          <FooterTab>
            <Button active = {this.props.chosenTab === "call"} onPress = {() => this.changeTab("call")} >
            <Icon name="phone" type="Entypo" />
            </Button>
            <Button active = {this.props.chosenTab === "liveStream"}  onPress = {() => this.changeTab("liveStream")}>
            <Icon name="live-tv" type="MaterialIcons" />
            </Button>
            <Button active = {this.props.chosenTab === "conference"}  onPress = {() => this.changeTab("conference")}>
            <Icon name="ios-people" type="Ionicons" />
            </Button>
            <Button active = {this.props.chosenTab === "setting"}  onPress = {() => this.changeTab("setting")}>
            <Icon name="ios-settings" type="Ionicons" />
            </Button>
          </FooterTab>
        </Footer>
    );
  }
}


function mapStateToProps(centralState) {
  return {
    chosenTab: centralState.chosenTab
  }
}

export default connect(mapStateToProps)(FooterBar);