import React, { Component } from 'react';
import { View, TextInput, Dimensions, Alert } from 'react-native';
import { changeLoginState } from '../actions'
import { Container, Header, Left, Right, Title, Button, Text, Icon, Body, Form, FormItem, Input, Label, Item, Spinner } from 'native-base';


let width = Dimensions.get('window').width; //full width
let height = Dimensions.get('window').height; //full height

class Register extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      loading: false
    };
  }

  signup() {
    this.setState({ loading: true })
    var status = ""
    fetch("https://www.e-lab.live:8080/api/create-student-account",
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        method: "POST",
        body: JSON.stringify({
          username: this.state.username,
          password: this.state.password,
          firstName: this.state.firstName,
          lastName: this.state.lastName,
          email: this.state.email,
        })
      })
      .then(res => {
        if (res.status === 200) {
          status = 200;
          return null;
        } else if (res.status === 400) {
          status = 400;
          return res.text();
        } else if (res.status === 409) {
          status = 409;
          return res.text();
        }
        this.setState({ loading: false })
      })
      .then((data) => {
        if (status === 200) {
          // implement register ok  ===> Login
          Alert.alert('Signup succesfully', 'You can now use your account to sign in to the system')
          this.props.dispatch(changeLoginState(false))
        } else if (status === 400) {
          console.log(data)
          alert(data)
        } else if (status === 409) {
          alert(data)
        } else {
          alert('Unexpected errors have occured')
        }
      })
  }

  handleChange(text, param) {
    this.setState({ [param]: text })
  }

  goBack() {
    this.props.dispatch(changeLoginState(false))
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
            <Title >Register</Title>
          </Body>
          <Right style={{ flex: 1 }} />
        </Header>


        <Form style={{ flex: 1, backgroundColor: 'white', top: 20 }}>

          <Item floatingLabel  >
            <Label style={{ color: 'lightgrey' }}>Email</Label>
            <Input onChangeText={(text) => this.handleChange(text, "email")} />
          </Item>

          <Item floatingLabel  >
            <Label style={{ color: 'lightgrey' }}>First name</Label>
            <Input onChangeText={(text) => this.handleChange(text, "firstName")} />
          </Item>

          <Item floatingLabel  >
            <Label style={{ color: 'lightgrey' }}>Last name</Label>
            <Input onChangeText={(text) => this.handleChange(text, "lastName")} />
          </Item>

          <Item floatingLabel  >
            <Label style={{ color: 'lightgrey' }}>Username</Label>
            <Input onChangeText={(text) => this.handleChange(text, "username")} />
          </Item>

          <Item floatingLabel last >
            <Label style={{ color: 'lightgrey' }}>Password</Label>
            <Input secureTextEntry={true} onChangeText={(text) => this.handleChange(text, "password")} />
          </Item>

          <Item floatingLabel last >
            <Label style={{ color: 'lightgrey' }}>Confirm password</Label>
            <Input secureTextEntry={true} onChangeText={(text) => this.handleChange(text, "password")} />
          </Item>

          <Text></Text>

          <Button full primary rounded style={{ addingBottom: 4, width: 5 * width / 6, alignSelf: 'center' }} onPress={() => this.signup()}>
            {this.state.loading ?
              <Spinner color='green' />
              : <Text> Sign up </Text>
            }
          </Button>
        </Form>

      </Container>
    );
  }
}

export default Register;
