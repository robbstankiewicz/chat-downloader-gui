import { Component, inject } from '@angular/core';
import { StreamList } from './components/stream-list/stream-list';
import { ChatContainer } from './components/chat-container/chat-container';
import { ApiService } from './services/api';
import { ToastService } from './services/toast';
import { CommonModule } from '@angular/common';
import { catchError, EMPTY, retry } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-root',
    imports: [
        StreamList,
        ChatContainer,
        CommonModule,
        ButtonModule,
        ToastModule,
    ],
    providers: [ToastService, MessageService],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    api = inject(ApiService);
    toast = inject(ToastService);
    serverReady$ = this.api.health$().pipe(
        retry({
            count: 100,
            delay: 1000,
        }),
        catchError(() => {
            this.toast.showError();
            return EMPTY;
        })
    );
}
