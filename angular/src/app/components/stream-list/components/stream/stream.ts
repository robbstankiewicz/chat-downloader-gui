import { Component, computed, inject, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ConfirmationService, PrimeIcons } from 'primeng/api';
import { StreamStatus } from './components/stream-status/stream-status';
import { ButtonModule } from 'primeng/button';
import { StreamsStore } from '../../../../stores/streams.store';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { StreamData } from '../../../../models/stream-data.model';
import { Platform } from '../../../../models/platform.model';

@Component({
    selector: 'app-stream',
    providers: [ConfirmationService],
    imports: [CardModule, StreamStatus, ButtonModule, ConfirmPopupModule],
    templateUrl: './stream.html',
    styleUrl: './stream.scss',
    host: {
        '(click)': 'hostClick()',
        '[class.active]': 'isActive()',
        '[class.not-selectable]': 'isError()',
    },
})
export class Stream {
    store = inject(StreamsStore);
    readonly logFilePath = input.required<string>();
    confirmationService = inject(ConfirmationService);
    readonly isError = computed(() => this.data().download_status === 'error');
    readonly data = input.required<StreamData>();
    readonly isActive = computed(
        () => this.store.activeStreamId() === this.data().id
    );
    readonly isDownloading = computed(
        () => this.data().download_status === 'downloading'
    );
    readonly sourceIcon = computed(() =>
        this.data().platform === Platform.Twitch
            ? PrimeIcons.TWITCH
            : PrimeIcons.YOUTUBE
    );
    readonly playIcon = computed(() =>
        this.data().download_status === 'paused'
            ? PrimeIcons.PLAY
            : PrimeIcons.PAUSE
    );

    stopPress(event: Event): void {
        event.stopPropagation();
        this.store.stopStream(this.data().id);
    }
    playPress(event: Event): void {
        event.stopPropagation();
        if (this.data().download_status === 'paused') {
            this.store.resumeStream(this.data().id);
        } else {
            this.store.pauseStream(this.data().id);
        }
    }
    deletePress(event: Event): void {
        event.stopPropagation();
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: 'You sure?',
            accept: () => {
                this.store.deleteStream(this.data().id);
            },
        });
    }
    hostClick(): void {
        if (this.isError()) return;
        this.store.setActiveStream(this.data().id);
    }
}
