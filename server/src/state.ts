import { ChannelMessages } from './shared/shared_state';

export class User {
    name: string = "";
    ping: Date = new Date();
}

export class ChatState {
    users: Array<User> = new Array<User>();
    channels: Array<ChannelMessages> = new Array<ChannelMessages>();
}
