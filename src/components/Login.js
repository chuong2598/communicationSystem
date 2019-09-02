import React, { Component } from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import { authenticateUser, changeLoginState } from '../actions'
import { navigation } from "react-navigation";
import { connect } from 'react-redux'
import { Image, View, Dimensions, TouchableOpacity, Alert } from 'react-native'
import FontAwesome5 from 'react-native-vector-icons/Feather'
import { Container, Header, Button, Text, Body, Form, Item as FormItem, Input, Label, Title, Thumbnail, Spinner } from 'native-base';
import Register from './Register';
let width = Dimensions.get('window').width; //full width
let height = Dimensions.get('window').height; //full height

class Login extends Component {
    constructor(props) {
        super(props);
        this.state = { username: "", password: "", loading: false };
    }

    static navigationOptions = {
        header: null,
        headerLeft: null
    }

    async login(user) {
        this.setState({ loading: true })
        fetch(`https://www.e-lab.live:8080/api/oauth/token?grant_type=password&username=${user.username}&password=${user.password}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    'Authorization': 'Basic Y2xpZW50LWlkOnNlY3JldA=='
                },
                method: "POST"
            })
            .then(res => {
                if (res.status === 200) {
                    return res.json();
                } else if (res.status === 400) {
                    alert("Username or password is not correct")
                    this.setState({ loading: false })
                    return;
                } else {
                    alert("Unexpected errors have occured")
                    this.setState({ loading: false })
                    return;
                }

            })
            .then(data => {
                if (data !== undefined) {
                    this.setAsyncStorage(data)
                    this.props.navigation.navigate("Home")
                    this.setState({ loading: false })
                }
            })
            .catch(error => {
                this.setState({ loading: false })
            })
    }

    async setAsyncStorage(data) {
        // await AsyncStorage.setItem('access_token', data.access_token);
        // await AsyncStorage.setItem("expires_in", data.expires_in);
        // await AsyncStorage.setItem("refresh_token", data.refresh_token);
        // await AsyncStorage.setItem("scope", data.scope);
        // await AsyncStorage.setItem("user", JSON.stringify(data.user))
        await AsyncStorage.setItem("login_session", JSON.stringify(data))
        this.props.dispatch(authenticateUser(data.user))
    }

    handleChange(text, param) {
        this.setState({ [param]: text })
    }

    navigateToRegister(){
        this.props.dispatch(changeLoginState(true))
    }

    forgotPassword(){
        Alert.alert("Not implemeted yet")
    }

    renderLogin(){
        return (
            <View style={{ flex: 1 }}>
                <Image style={{ position: 'absolute', height: height / 3.25, width: width }} source={require('../assets/loginImage1.jpg')} />
                <View style={{ position: 'absolute', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', top: height / 3.25 - 100 / 2, height: 100, width: 100, borderRadius: 100, backgroundColor: 'lightcoral' }}>
                    <Text style={{ color: 'aliceblue', fontSize: 30, fontFamily: 'serif' }}>Elab</Text>
                </View>
                <View style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Form style={{ width: width, backgroundColor: 'white', top: 50 }}>
                        <FormItem floatingLabel  >
                            <Label style={{ color: 'lightgrey' }}>Username</Label>
                            <Input onChangeText={(text) => this.handleChange(text, "username")} />
                        </FormItem>
                        <FormItem floatingLabel last >
                            <Label style={{ color: 'lightgrey' }}>Password</Label>
                            <Input secureTextEntry={true} onChangeText={(text) => this.handleChange(text, "password")} />
                        </FormItem>
                        <Text></Text>
                        <View>

                        </View>
                        <Button full primary rounded style={{ addingBottom: 4, width: 5 * width / 6, alignSelf: 'center' }} onPress={() => this.login(this.state)}>
                            {this.state.loading ?
                                <Spinner color='green' />
                                : <Text> Sign in </Text>
                            }
                        </Button>
                    </Form>
                </View>
                <View style={{ position: 'absolute', bottom: 50, top: height - 150, width: width }}>
                    <TouchableOpacity style={{ alignSelf: 'center' }} onPress={() => this.navigateToRegister()}><Text style={{ color: 'cornflowerblue' }}> Sign Up </Text></TouchableOpacity>
                    <Text></Text>
                    <TouchableOpacity style={{ alignSelf: 'center' }} ><Text style={{ color: 'cornflowerblue' }} onPress={() => this.forgotPassword()}> Forgot password? </Text ></TouchableOpacity>
                </View >
            </View>
        );
    }

    renderRegister(){

    }

    render() {
        if(!this.props.isRegistering){
            return(
                this.renderLogin()
            )
        }
        else{
            return(
                <Register dispatch={this.props.dispatch}/>
            )
        }
    }
}


function mapStateToProps(centralState) {
    return {
        isRegistering: centralState.isRegistering
    }
  }
  
export default connect(mapStateToProps)(Login);

