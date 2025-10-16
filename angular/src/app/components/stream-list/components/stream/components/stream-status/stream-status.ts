import { Component, computed, input } from '@angular/core';
import { $dt } from '@primeng/themes';
import { StreamData } from '../../../../../../models/stream-data.model';

@Component({
    selector: 'app-stream-status',
    imports: [],
    templateUrl: './stream-status.html',
    styleUrl: './stream-status.scss',
    host: {
        '[style.backgroundColor]': 'color()',
    },
})
export class StreamStatus {
    // value = input.required<'live' | 'past' | 'upcoming'>();
    readonly value = input.required<StreamData['status']>();
    titles = {
        live: 'Live',
        past: 'Video',
        upcoming: 'Pending',
    };
    colors = {
        live: $dt('red.500').variable,
        past: $dt('primary.400').variable,
        upcoming: $dt('neutral.500').variable,
    };
    readonly title = computed(() => this.titles[this.value()] ?? 'Unknown');
    readonly color = computed<string>(
        () => this.colors[this.value()] ?? $dt('grey.500').variable
    );
}
