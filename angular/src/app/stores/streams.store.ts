import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withHooks,
    withMethods,
    withProps,
    withState,
} from '@ngrx/signals';
import {
    addEntities,
    prependEntities,
    prependEntity,
    removeAllEntities,
    removeEntity,
    updateEntity,
    upsertEntities,
    withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
    catchError,
    distinctUntilChanged,
    EMPTY,
    map,
    pairwise,
    pipe,
    skip,
    switchMap,
    tap,
    timer,
} from 'rxjs';
import { Filters } from '../models/filters.model';
import { BasicMessage } from '../models/message.model';
import { StreamData } from '../models/stream-data.model';
import { ApiService } from '../services/api';
import { Format } from '../models/format.model';

type StreamsState = {
    activeStreamId: number | null;
    filters: Filters;
};

export type Timestamps = {
    dateTo?: string | null;
    dateFrom?: string | null;
};

const initialState: StreamsState = {
    activeStreamId: null,
    filters: {
        messageGroupIds: [],
        username: null,
        message: null,
    },
};

export const StreamsStore = signalStore(
    { providedIn: 'root' },
    withState(initialState),
    withEntities({ entity: type<StreamData>(), collection: 'streams' }),
    withEntities({ entity: type<BasicMessage>(), collection: 'messages' }),
    withComputed(store => ({
        lastTimestamp: computed(() => {
            const messages = store.messagesEntities();
            if (messages.length === 0) return null;
            return messages[messages.length - 1].timestamp;
        }),
        firstTimestamp: computed(() => {
            const messages = store.messagesEntities();
            if (messages.length === 0) return null;
            return messages[0].timestamp;
        }),
        activeStream: computed(() => {
            if (store.activeStreamId() === null) return;
            return store.streamsEntityMap()[store.activeStreamId() as number];
        }),
    })),
    withProps((store, api = inject(ApiService)) => ({
        count$: toObservable(store.messagesIds).pipe(map(ids => ids.length)),
        downloadedStreamsIds$: toObservable(
            computed(() =>
                store
                    .streamsEntities()
                    .filter(s => s.download_status === 'downloading')
                    .map(s => s.id)
            )
        ),
        activeStream$: toObservable(store.activeStream),
        // getFile$: (format: Format) => {
        //     return api.getMessages$(store.activeStreamId()!, store.filters());
        // },
        getMessages$: (
            timestamps: Partial<Timestamps> = {
                dateFrom: store.lastTimestamp(),
            }
        ) => {
            return api
                .getMessages$(store.activeStreamId()!, {
                    ...store.filters(),
                    ...timestamps,
                })
                .pipe(
                    tap(response => {
                        if (timestamps.dateTo) {
                            patchState(
                                store,
                                prependEntities(response.messages.reverse(), {
                                    collection: 'messages',
                                })
                            );
                        } else {
                            patchState(
                                store,
                                addEntities(response.messages.reverse(), {
                                    collection: 'messages',
                                })
                            );
                        }
                    })
                );
        },
    })),
    withMethods((store, api = inject(ApiService)) => ({
        updateStreams(streams: StreamData[]): void {
            patchState(
                store,
                upsertEntities(streams, { collection: 'streams' })
            );
        },
        patchFilters(filters: Partial<Filters>): void {
            patchState(
                store,
                state => ({
                    filters: {
                        ...state.filters,
                        ...filters,
                    },
                }) /* , removeAllEntities({ collection: 'messages' }) */
            );
        },
        reset(): void {
            patchState(store, removeAllEntities({ collection: 'messages' }));
        },
        addMessages(messages: BasicMessage[]): void {
            patchState(
                store,
                addEntities(messages, { collection: 'messages' })
            );
        },
        setActiveStream(streamId: number | null): void {
            patchState(store, {
                activeStreamId: streamId,
            });
            if (streamId === null) {
                patchState(
                    store,
                    removeAllEntities({ collection: 'messages' })
                );
                return;
            }
        },
        loadStreams: rxMethod<void>(
            pipe(
                switchMap(() =>
                    api.getStreams$().pipe(
                        tap(streams => {
                            patchState(
                                store,
                                upsertEntities(streams, {
                                    collection: 'streams',
                                })
                            );
                        }),
                        catchError(() => {
                            return EMPTY;
                        })
                    )
                )
            )
        ),

        addStream: rxMethod<string>(
            pipe(
                switchMap(url =>
                    api.addStream$(url).pipe(
                        tap(newStream => {
                            patchState(
                                store,
                                prependEntity(newStream, {
                                    collection: 'streams',
                                })
                            );
                        }),
                        catchError(() => {
                            return EMPTY;
                        })
                    )
                )
            )
        ),
        resumeStream: rxMethod<number>(
            pipe(
                tap(streamId => {
                    patchState(
                        store,
                        updateEntity(
                            {
                                id: streamId,
                                changes: {
                                    download_status: 'downloading',
                                },
                            },
                            { collection: 'streams' }
                        )
                    );
                }),
                switchMap(streamId =>
                    api.resumeStream$(streamId).pipe(
                        catchError(() => {
                            return EMPTY;
                        })
                    )
                )
            )
        ),
        pauseStream: rxMethod<number>(
            pipe(
                tap(streamId => {
                    patchState(
                        store,
                        updateEntity(
                            {
                                id: streamId,
                                changes: {
                                    download_status: 'paused',
                                },
                            },
                            { collection: 'streams' }
                        )
                    );
                }),
                switchMap(streamId =>
                    api.pauseStream$(streamId).pipe(
                        catchError(() => {
                            return EMPTY;
                        })
                    )
                )
            )
        ),

        stopStream: rxMethod<number>(
            pipe(
                tap(streamId => {
                    patchState(
                        store,
                        updateEntity(
                            {
                                id: streamId,
                                changes: {
                                    download_status: 'completed',
                                },
                            },
                            { collection: 'streams' }
                        )
                    );
                }),
                switchMap(streamId =>
                    api.stopStream$(streamId).pipe(
                        catchError(() => {
                            return EMPTY;
                        })
                    )
                )
            )
        ),
        getFile: rxMethod<Format>(
            pipe(
                switchMap(format => {
                    return api.getFile$(store.activeStreamId()!, {
                        format,
                        ...store.filters(),
                    });
                })
            )
        ),
        deleteStream: rxMethod<number>(
            pipe(
                tap(streamId => {
                    if (store.activeStreamId() === streamId) {
                        patchState(store, { activeStreamId: null });
                    }
                    patchState(
                        store,
                        removeEntity(streamId, { collection: 'streams' })
                    );
                }),
                switchMap(streamId =>
                    api.deleteStream$(streamId).pipe(
                        catchError(() => {
                            return EMPTY;
                        })
                    )
                )
            )
        ),
        clearError: (): void => patchState(store),
    })),
    withHooks(store => ({
        onInit: (): void => {
            store.loadStreams();
            const api = inject(ApiService);

            const onStatusChange$ = store.downloadedStreamsIds$.pipe(
                distinctUntilChanged(
                    (prev, curr) => prev.length === curr.length
                ),
                switchMap(downloadedStreamsIds => {
                    if (downloadedStreamsIds.length === 0) {
                        return EMPTY;
                    }
                    return timer(2000, 5000).pipe(
                        switchMap(() =>
                            api.getStatusUpdate$(downloadedStreamsIds).pipe(
                                tap(streams => {
                                    store.updateStreams(streams);
                                })
                            )
                        )
                    );
                })
            );

            const onFiltersChange$ = toObservable(store.filters).pipe(
                skip(1),
                switchMap(() => {
                    store.reset();
                    return store.getMessages$();
                })
            );

            const onStreamChange$ = store.activeStream$.pipe(
                pairwise(),
                switchMap(([prevStream, currStream]) => {
                    if (currStream === undefined) {
                        return EMPTY;
                    }
                    if (prevStream?.id !== currStream.id) {
                        store.reset();
                        return store.getMessages$();
                    }
                    if (
                        prevStream?.message_count !== currStream?.message_count
                    ) {
                        return store.getMessages$();
                    }
                    return EMPTY;
                })
            );

            // stream data update
            onStatusChange$.subscribe();

            // messages update
            onFiltersChange$.subscribe();
            onStreamChange$.subscribe();
        },
    }))
);
