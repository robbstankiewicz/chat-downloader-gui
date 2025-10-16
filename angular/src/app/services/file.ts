import { Injectable } from '@angular/core';
import { Format } from '../models/format.model';

@Injectable({
    providedIn: 'root',
})
export class FileService {
    downloadFile(name: string, format: Format, blob: Blob): void {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}
