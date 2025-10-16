import { Author } from './author.model';
import { BanType } from './ban-type.model';

export type BasicMessage = {
    id: number;
    systemMessage?: string | null;
    message: string;
    messageGroupId: number;
    timestamp: string;
    uuid: string;
    author: Author;
    targetId?: number | null;
    deleted?: boolean;
    banType: BanType | null;
};
