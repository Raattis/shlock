import React, { Component } from 'react';
import './App.css';
import Channels from './Channels';
import Backlog from './Backlog';
import TextInput from './TextInput';
import { UserState, JoinChannel, SendMessage, PingMessage } from './shared/shared_state';

interface IProps { }
interface IState {
  userState: UserState;
  selectedChannel: string;
}

class App extends Component<IProps, IState>
{
  constructor(props: IProps) {
    super(props);

    let temp: UserState = new UserState();
    temp.name = "Riku";
    this.state = { userState: temp, selectedChannel: "kanava1" };
    this.refresh();
  }

  setName = (name: string) => {
    let temp: UserState = this.state.userState;
    temp.name = name;
    this.setState({ userState: temp });
  }

  changeChannel = (channel_name: string) => {
    this.setState({ selectedChannel: channel_name });
    this.refresh();
  }

  joinChannel = (channel_name: string) => {
    this.setState({ selectedChannel: channel_name });

    const body: JoinChannel = new JoinChannel();
    body.channel_name = channel_name;
    body.user_name = this.state.userState.name;

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer my-token',
        'My-Custom-Header': 'join'
      },
      body: JSON.stringify(body)
    };

    fetch('/join', requestOptions)
      .then(() => this.refresh());
  }

  sendMessage = (message: string) => {
    const body: SendMessage = new SendMessage();
    body.channel_name = this.state.selectedChannel;
    body.sender_name = this.state.userState.name;
    body.message = message;

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer my-token',
        'My-Custom-Header': 'msg'
      },
      body: JSON.stringify(body)
    };

    fetch('/msg', requestOptions)
      .then(() => this.refresh());
  }

  refresh = () => {
    const body: PingMessage = { user_name: this.state.userState.name };

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer my-token',
        'My-Custom-Header': 'ping'
      },
      body: JSON.stringify(body)
    };

    fetch("/ping", requestOptions)
      .then(res => res.json())
      .then(userState => {
        if (userState as UserState) {
          this.setState({ userState: userState })
        } else {
          console.log("ERROR: Invalid UserState received from server.")
        }
      });
  }

  render() {
    return (
      <div className="App" >
        <header className="App-header">
          <p>
            {this.state.selectedChannel}
          </p>
        </header>
        <div className="App-body">
          <Channels channelMessages={this.state.userState.channelMessages} selectedChannel={this.state.selectedChannel} onChangeChannel={this.changeChannel} />
          <Backlog channelMessages={this.state.userState.channelMessages} selectedChannel={this.state.selectedChannel} />
          <TextInput name={this.state.userState.name} onSend={this.sendMessage} onSetName={this.setName} onJoinChannel={this.joinChannel} onRefresh={this.refresh} />
        </div>
      </div>
    );
  }
}

export default App;
