import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
    providedIn: 'root',
})
export class ToastService {
    messageService = inject(MessageService);
    showError(summary = 'Error', detail = 'Something went wrong') {
        this.messageService.add({
            severity: 'error',
            summary,
            detail,
            sticky: true,
        });
    }
}
