import { Platform } from './platform.model';

export type StreamData = {
    id: number;
    title: string;
    url: string;
    stream_id: string;
    platform: Platform;
    status: 'live' | 'past' | 'upcoming';
    download_status: 'completed' | 'downloading' | 'error' | 'paused';
    updated_at: Date;
    duration?: number; // in seconds
    message_count?: number; // optional, for past streams
    last_message_timestamp?: Date;
    error?: string;
};
