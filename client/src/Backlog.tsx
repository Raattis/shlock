import React from 'react';
import { ChannelMessages } from './shared/shared_state';

interface IProps {
    channelMessages: Array<ChannelMessages>;
    selectedChannel: string;
}

const Backlog = (props: IProps) => {
    const channel: ChannelMessages | undefined = props.channelMessages.find(c => c.name === props.selectedChannel);
    if (!channel)
        return (<p>No messages in {props.selectedChannel}</p>);

    return (
        <div>
            {channel.messages.map(m => (<p key={m.date.toString()}>{"[" + m.date.toString() + "] " + m.sender_name + ">"} {m.msg}<br /></p>))}
        </div>
    );
}

export default Backlog;
