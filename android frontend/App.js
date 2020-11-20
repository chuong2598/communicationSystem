import React from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import Home from './src/components/Home'
import Login from './src/components/Login'
import Register from './src/components/Register';
import store from './src/store'
import {Provider} from 'react-redux'
import { Root } from "native-base";
import { createStackNavigator, createAppContainer } from "react-navigation";

export default class App extends React.Component {
  render(){
    return (
      <Root>
        <Provider store = {store}>
        <AppContainer/>
      </Provider>
      </Root>
    );
  }
}

const AppNavigator = createStackNavigator({
  Home: {
    screen: Home
  },
  Login: {
    screen: Login
  },
  Register: {
    screen: Register
  }
});

const AppContainer = createAppContainer(AppNavigator);
