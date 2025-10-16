import {
    ChangeDetectorRef,
    Component,
    DestroyRef,
    inject,
    Injector,
    OnInit,
    output,
    viewChild,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { ScrollerModule } from 'primeng/scroller';
import { ScrollPanel, ScrollPanelModule } from 'primeng/scrollpanel';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
    filter,
    fromEvent,
    map,
    merge,
    share,
    startWith,
    switchMap,
    tap,
    withLatestFrom,
} from 'rxjs';
import { SharedModule } from 'primeng/api';
import { MessageTw } from './components/message/components/message-tw/message-tw';
import { MessageYt } from './components/message/components/message-yt/message-yt';
import { Platform } from '../../../../models/platform.model';
import { Author } from '../../../../models/author.model';
import { StreamsStore } from '../../../../stores/streams.store';

@Component({
    selector: 'app-chat',
    imports: [
        CardModule,
        ScrollerModule,
        ScrollPanelModule,
        SharedModule,
        MessageTw,
        MessageYt,
    ],
    templateUrl: './chat.html',
    styleUrl: './chat.scss',
    host: {
        '[class.p-card]': 'true',
    },
})
export class Chat implements OnInit {
    Platform = Platform;
    authorClicked = output<Author>();

    injector = inject(Injector);
    cd = inject(ChangeDetectorRef);
    destroyRef = inject(DestroyRef);
    streamsStore = inject(StreamsStore);

    readonly scrollPanel = viewChild.required(ScrollPanel);
    scrollPanel$ = toObservable(this.scrollPanel);

    activeStreamId$ = toObservable(this.streamsStore.activeStreamId);

    // fix width transition visual bug
    // activeStreamChange = effect(() => {
    //     this.streamsStore.activeStreamId();
    //     setTimeout(() => {
    //         this.scrollPanel()?.refresh();
    //     }, 300);
    // });

    scrollElement$() {
        return this.scrollPanel$.pipe(
            map(panel => {
                // additional cd cycle to get nativeElement
                panel.cd.detectChanges();
                return panel.contentViewChild!.nativeElement as HTMLElement;
            })
        );
    }

    scrollEvent$ = this.scrollElement$().pipe(
        switchMap(element => {
            return fromEvent(element, 'scroll').pipe(
                map(() => ({
                    isTop:
                        element.scrollTop === 0 &&
                        !(element.scrollHeight === element.clientHeight),
                    isBottom:
                        element.scrollTop >=
                        element.scrollHeight - element.clientHeight,
                    element,
                })),
                startWith({
                    isTop: false,
                    isBottom: true,
                    element,
                })
            );
        }),
        share()
    );

    // when scrolled to the top, load previous messages
    scrolledTop$ = this.scrollEvent$.pipe(
        filter(({ isTop }) => isTop),
        switchMap(({ element }) =>
            this.streamsStore
                .getMessages$({
                    dateTo: this.streamsStore.firstTimestamp(),
                })
                .pipe(
                    tap(() => {
                        const previousScrollHeight = element.scrollHeight;
                        this.cd.detectChanges();
                        this.scrollPanel().scrollTop(
                            element.scrollHeight - previousScrollHeight
                        );
                    })
                )
        )
    );

    // keep scroll position at the bottom when new messages arrive
    holdScrollBottom$ = this.streamsStore.count$.pipe(
        withLatestFrom(this.scrollEvent$),
        filter(([count, { isBottom }]) => isBottom && count > 0),
        tap(([, { element }]) => {
            this.cd.detectChanges();
            const scrollableHeight =
                element.scrollHeight - element.clientHeight;
            this.scrollPanel().scrollTop(scrollableHeight);
        })
    );

    scrollManager$ = this.activeStreamId$.pipe(
        filter(Boolean),
        switchMap(() => merge(this.holdScrollBottom$, this.scrolledTop$)),
        takeUntilDestroyed()
    );

    ngOnInit(): void {
        this.scrollManager$.subscribe();
    }
}
