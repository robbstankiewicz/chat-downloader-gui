import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../services/api';
import { StreamData } from '../models/stream-data.model';
import { StreamsStore } from './streams.store';
import { Platform } from '../models/platform.model';
import { signal, Type } from '@angular/core';

const mockStreams: StreamData[] = [
    {
        id: 1,
        title: 'Test Stream 1',
        url: 'test',
        stream_id: '123',
        platform: Platform.Twitch,
        status: 'live',
        download_status: 'downloading',
        updated_at: new Date('2025-07-28T10:00:00Z'),
        message_count: 10,
    },
    {
        id: 2,
        title: 'Test Stream 2',
        url: 'test2',
        stream_id: '456',
        platform: Platform.Youtube,
        status: 'past',
        download_status: 'completed',
        updated_at: new Date('2025-07-28T10:00:00Z'),
        message_count: 20,
    },
    {
        id: 3,
        title: 'Test Stream 3',
        url: 'test3',
        stream_id: '789',
        platform: Platform.Twitch,
        status: 'live',
        download_status: 'downloading',
        updated_at: new Date('2025-07-28T10:00:00Z'),
        message_count: 10,
    },
];
const secondBatch = {
    messages: [
        {
            id: 4,
            message: 'fourth message',
            messageGroupId: 1,
            timestamp: '2025-07-28T10:03:01Z',
            uuid: 'uuid2',
            author: {
                id: 2,
                name: 'user2',
                isMod: false,
                isSub: false,
                color: '#fff',
            },
            banType: null,
        },
        {
            id: 3,
            message: 'third message',
            messageGroupId: 1,
            timestamp: '2025-07-28T10:02:00Z',
            uuid: 'uuid1',
            author: {
                id: 1,
                name: 'user1',
                isMod: false,
                isSub: false,
                color: '#fff',
            },
            banType: null,
        },
    ],
    stream_id: 1,
    platform: 1,
};

const firstBatch = {
    messages: [
        {
            id: 2,
            message: 'seconds message',
            messageGroupId: 1,
            timestamp: '2025-07-28T10:01:01Z',
            uuid: 'uuid2',
            author: {
                id: 2,
                name: 'user2',
                isMod: false,
                isSub: false,
                color: '#fff',
            },
            banType: null,
        },
        {
            id: 1,
            message: 'first message',
            messageGroupId: 1,
            timestamp: '2025-07-28T10:00:00Z',
            uuid: 'uuid1',
            author: {
                id: 1,
                name: 'user1',
                isMod: false,
                isSub: false,
                color: '#fff',
            },
            banType: null,
        },
    ],
    stream_id: 1,
    platform: 1,
};

describe('StreamsStore', () => {
    let apiMock: jasmine.SpyObj<ApiService>;

    beforeEach(() => {
        apiMock = jasmine.createSpyObj('ApiService', [
            'getStreams$',
            'addStream$',
            'resumeStream$',
            'pauseStream$',
            'stopStream$',
            'deleteStream$',
            'getMessages$',
            'getStatusUpdate$',
        ]);

        apiMock.getStreams$.and.returnValue(of(mockStreams));
        apiMock.getStatusUpdate$.and.returnValue(of([]));
        apiMock.getMessages$.and.returnValue(of(firstBatch));

        TestBed.configureTestingModule({
            providers: [
                StreamsStore,
                { provide: ApiService, useValue: apiMock },
            ],
        });
    });

    it("should update all 'downloading' streams every 5 seconds after 2 second start", fakeAsync(() => {
        const store = TestBed.inject(StreamsStore);
        tick();

        const updatedStreams: StreamData[] = [
            { ...mockStreams[0], message_count: 15 },
            { ...mockStreams[2], message_count: 35 },
        ];
        apiMock.getStatusUpdate$.and.returnValue(of(updatedStreams));
        tick(2000);
        tick(5000);
        expect(apiMock.getStatusUpdate$).toHaveBeenCalledWith([1, 3]);
        expect(store.streamsEntityMap()[1].message_count).toBe(15);
        expect(store.streamsEntityMap()[3].message_count).toBe(35);

        // pause click on id 3
        store.updateStreams([
            {
                ...updatedStreams[1],
                download_status: 'paused',
            },
        ]);
        tick(5000);
        expect(apiMock.getStatusUpdate$).toHaveBeenCalledWith([1]);
    }));

    it('should get messages for active stream when it changes message count', fakeAsync(() => {
        const store = TestBed.inject(StreamsStore);
        tick();
        store.setActiveStream(1);
        tick();

        expect(apiMock.getMessages$).toHaveBeenCalledTimes(1);
        // updated message count by status endpoint
        const updatedStream: StreamData = {
            ...store.streamsEntityMap()[1],
            message_count: 15,
        };
        store.updateStreams([updatedStream]);
        apiMock.getMessages$.and.returnValue(of(secondBatch));
        tick();
        expect(apiMock.getMessages$).toHaveBeenCalledTimes(2);
        expect(store.messagesEntities().length).toBe(4);
    }));

    it('should get messages when switching between streams with the same message count', fakeAsync(() => {
        const store = TestBed.inject(StreamsStore);
        tick();
        store.setActiveStream(1);
        tick();
        store.setActiveStream(3);
        tick();
        expect(apiMock.getMessages$).toHaveBeenCalledTimes(2);
    }));

    it('should get messages through call with no timestamps when filters change', fakeAsync(() => {
        const store = TestBed.inject(StreamsStore);
        tick();
        store.setActiveStream(1);
        tick();
        apiMock.getMessages$.calls.reset();
        store.patchFilters({
            username: 'user1',
        });
        tick();
        expect(apiMock.getMessages$).toHaveBeenCalledWith(1, {
            dateFrom: null,
            messageGroupIds: [],
            username: 'user1',
            message: null,
        });
    }));

    it('should get messages through call with no timestamps when active stream id changes', fakeAsync(() => {
        const store = TestBed.inject(StreamsStore);
        tick();
        store.setActiveStream(1);
        tick();
        store.setActiveStream(2);
        apiMock.getMessages$.and.returnValue(of(secondBatch));
        tick();
        expect(apiMock.getMessages$).toHaveBeenCalledWith(2, {
            dateFrom: null,
            messageGroupIds: [],
            username: null,
            message: null,
        });
        expect(store.messagesEntities().length).toBe(2);
        expect(apiMock.getMessages$).toHaveBeenCalledTimes(2);
    }));

    it('should reset and not download when active stream id becomse null', fakeAsync(() => {
        const store = TestBed.inject(StreamsStore);
        tick();
        store.setActiveStream(1);
        tick();
        store.setActiveStream(null);
        expect(apiMock.getMessages$).toHaveBeenCalledTimes(1);
        expect(store.messagesEntities().length).toBe(0);
    }));
});

export const MOCK_STREAM = mockStreams[0];

export type InferType<T> = T extends Type<infer R> ? R : never;
export const STREAMS_STORE_MOCK: jasmine.SpyObj<
    InferType<typeof StreamsStore>
> = jasmine.createSpyObj('StreamsStore', ['patchFilters'], {
    getMessages$: jasmine.createSpy('getMessages$').and.returnValue(
        of({
            messages: [],
            stream_id: MOCK_STREAM.id,
            platform: MOCK_STREAM.platform,
        })
    ),
    count$: of(MOCK_STREAM.message_count),
    messagesEntities: signal([]),
    activeStream: signal(MOCK_STREAM),
    activeStreamId: signal(MOCK_STREAM.id),
    firstTimestamp: signal(null),
});
