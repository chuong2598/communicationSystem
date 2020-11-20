import React, { Component } from 'react';
import { View, KeyboardAvoidingView } from 'react-native';
import { Input, Button, Text, Item, Content, Container, Icon, Left, Right, Body, Row, Col } from 'native-base'

class LiveChatRoom extends Component {
    constructor(props) {
        super(props);
        this.state = {
            textMessage: "",
            messageList: []
        };
    }

    componentWillUnmount() {
        clearTimeout(this.timeout)
    }

    componentDidMount() {
        console.log(this.props.socket)
        console.log(this.props.liveStreamId)
        this.socket = this.props.socket
        this.liveChatRoom = `livechat-room${this.props.liveStreamId}`;
        this.sendMessage("room", this.liveChatRoom)
        this.socket.on("message", (message) => {
            if (message.sender != this.props.authenticatedUser.username) {
                console.log(message);
                var messageList = this.state.messageList
                messageList.push(message)
                this.setState({ messageList: messageList })
                this.scroolDown()
            }
        });
    }

    scroolDown(){
        if (!this.props.isFullScreen) {
            this.timeout = setTimeout(() => {
                if (this.component != undefined) {
                    this.component._root.scrollToEnd()
                }
            }, 1000)
        }
    }

    componentDidUpdate(prevProps, prevState, ) {
        console.log(prevProps.isFullScreen)
        console.log(this.props.isFullScreen)
        if (!this.props.isFullScreen ) {
            console.log(this.component)
            this.scroolDown()
        }
        // try {
        //     this.component._root.scrollToEnd()
        // }
        // catch (error) {
        //     console.log(error)
        // }
    }

    sendMessage(channel, data) {
        console.log("Sending message to signaling server........")
        console.log(data)
        this.socket.emit(channel, data)
    }

    sendTextMessage() {
        if (this.state.textMessage != "") {
            console.log(this.liveChatRoom)
            let textMessage = {
                sender: this.props.authenticatedUser.username,
                message: this.state.textMessage,
                room: this.liveChatRoom
            }
            this.sendMessage("live_chat_signal", textMessage)
            textMessage.sender = "Me"
            var messageList = this.state.messageList
            messageList.push(textMessage)
            this.setState({ messageList: messageList })
            this.setState({ textMessage: "" })
            this.scroolDown()
        }
    }

    handleTetxChange(text, param) {
        console.log(text)
        this.setState({ [param]: text })
        console.log(this.state.messageList)
    }

    componentWillUnmount() {
        console.log("Chat unmount")
    }

    render() {
        if (!this.props.isFullScreen) {
            return (
                <Container style={{ flex: 1 }}>
                    <Content ref={c => (this.component = c)} style={{ marginBottom: 10}} >
                        {this.state.messageList.map((message, index) => {
                            return (
                                <View key={index} style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 20 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{message.sender}: </Text>
                                    <Text style={{ marginRight: 30 }}>{message.message}</Text>
                                </View>
                            )
                        })}
                    </Content>
                    <Item rounded style={{ bottom: 10, height: 40}}>
                        <Col  >
                            <Input multiline={true} value={this.state.textMessage} placeholder={'Aa'} onChangeText={(text) => this.handleTetxChange(text, "textMessage")} />
                        </Col>
                        <Col style={{ width: 65 }} >
                            <Icon name="md-send" type="Ionicons" style={{ color: "cornflowerblue", marginRight: 20, fontSize: 30 }} onPress={() => this.sendTextMessage()} />
                        </Col>
                    </Item>
                </Container>

            );
        }
        else {
            return null
        }
    }
}

export default LiveChatRoom;
