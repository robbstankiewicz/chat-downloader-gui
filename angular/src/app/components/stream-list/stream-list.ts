import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    effect,
    inject,
    input,
    viewChild,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputGroup } from 'primeng/inputgroup';
import { InputTextModule } from 'primeng/inputtext';
import { Stream } from './components/stream/stream';
import { ApiService } from '../../services/api';
import { StreamsStore } from '../../stores/streams.store';
import { ScrollPanel, ScrollPanelModule } from 'primeng/scrollpanel';

@Component({
    selector: 'app-stream-list',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        InputGroup,
        InputTextModule,
        Stream,
        ScrollPanelModule,
    ],
    templateUrl: './stream-list.html',
    styleUrl: './stream-list.scss',
    host: {
        '[class.full-width]': 'isFullWidth()',
    },
})
export class StreamList {
    api = inject(ApiService);
    readonly logFilePath = input.required<string>();
    streamsStore = inject(StreamsStore);
    readonly scrollPanel = viewChild(ScrollPanel);
    linkControl = new FormControl('');
    readonly isFullWidth = computed(
        () => this.streamsStore.activeStreamId() === null
    );
    // scroll visual bug fix
    activeStreamChange = effect(() => {
        this.streamsStore.activeStreamId();
        setTimeout(() => {
            this.scrollPanel()?.refresh();
        }, 300);
    });
    addStream(): void {
        const url = this.linkControl.value?.trim();
        if (url) {
            this.streamsStore.addStream(url);
            this.linkControl.setValue('');
        }
    }
}
