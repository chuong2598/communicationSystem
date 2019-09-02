import React, { Component } from 'react';
import { View, Text } from 'react-native';

class CountDownClock extends Component {
  constructor(props) {
    super(props);
    this.state = {minutes: 0, seconds: 0
    };
  }

  componentDidMount(){
    this.interval = setInterval(() => this.calculateCallTime(), 1000);
  }

  calculateCallTime(){
      console.log("Funcitonasdashdkjas")
    this.setState({seconds: this.state.seconds+1})
    if(this.state.seconds == 60){
        this.setState({seconds: 0, minutes: this.state.minutes + 1})
    }
  }

  getCallTime(){
    var secondString = this.state.seconds < 10 ? `0${this.state.seconds}` : this.state.seconds
    var minuteString = this.state.minutes < 10 ? `0${this.state.minutes}` : this.state.minutes
    return(`${minuteString}:${secondString}`)
  }

  componentWillUnmount(){
    clearInterval(this.interval);
  }


  render() {
    return (
      <View>
        <Text> {this.getCallTime()} </Text>
      </View>
    );
  }
}

export default CountDownClock;
