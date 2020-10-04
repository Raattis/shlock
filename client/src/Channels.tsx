import React, { Fragment } from 'react';
import { ChannelMessages } from './shared/shared_state';

interface ChannelButtonInterface {
    name: string;
    selected: boolean;
    onChangeChannel: (name: string) => void;
}

const ChannelButton = ({ name, selected, onChangeChannel }: ChannelButtonInterface) => {
    if (!selected)
        return (<button className="channel-button" onClick={e => onChangeChannel(name)}>{name}</button>);
    else
        return (<button className="selected-channel">{name}</button>);
}

interface IProps {
    channelMessages: Array<ChannelMessages>;
    selectedChannel: string;
    onChangeChannel: (name: string) => void;
}

const Channels = (props: IProps) => {
    return (
        <div id="Channels">
            {
                props.channelMessages.map(c => { return (<Fragment key={c.name}><ChannelButton name={c.name} selected={c.name === props.selectedChannel} onChangeChannel={props.onChangeChannel} ></ChannelButton></Fragment>) })
            }
        </div>
    );
}

export default Channels;
