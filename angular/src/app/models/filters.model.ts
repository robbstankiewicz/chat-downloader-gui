export type Filters = {
    messageGroupIds?: number[];
    username?: string | null;
    message?: string | null;
    includeBannedUsers?: boolean | null;
    moderators?: boolean | null;
};
