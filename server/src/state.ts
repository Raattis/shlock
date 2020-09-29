import { Type } from './plain_to_class';

export class User {
    name : string = "";
    ping : Date = new Date();
}

export class Message {
    sender_name : string = "";
    msg : string = "";
    @Type(() => Date)
    date : Date = new Date();
}

export class Channel {
    name : string = "";
    user_names : Array<string> = new Array<string>();
    messages : Array<Message> = new Array<Message>();
}

export class ChatState {
    users : Array<User> = new Array<User>();
    channels : Array<Channel> = new Array<Channel>();
}
