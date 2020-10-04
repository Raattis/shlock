import { Type } from './plain_to_class';

export class Message {
    sender_name: string = "";
    msg: string = "";
    @Type(() => Date)
    date: Date = new Date();
}

export class ChannelMessages {
    name: string = "";
    user_names: Array<string> = new Array<string>();
    messages: Array<Message> = new Array<Message>();
}

export class UserState {
    name: string = "";
    channelMessages: Array<ChannelMessages> = new Array<ChannelMessages>();
}

export class JoinChannel {
    user_name: string = "";
    channel_name: string = "";
}

export class SendMessage {
    channel_name: string = "";
    sender_name: string = "";
    message: string = "";
}

export class PingMessage {
    user_name: string = "";
}

export class ClearMessage {
    channel_name: string = "";
}
