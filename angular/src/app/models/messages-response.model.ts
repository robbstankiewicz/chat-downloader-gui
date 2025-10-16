import { BasicMessage } from './message.model';

export type MessagesResponse = {
    messages: BasicMessage[];
    stream_id: number;
    platform: number;
};
