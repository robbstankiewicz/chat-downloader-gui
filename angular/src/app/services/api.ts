import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { StreamData } from '../models/stream-data.model';
import { Filters } from '../models/filters.model';
import { MessagesResponse } from '../models/messages-response.model';
import { Timestamps } from '../stores/streams.store';
import { Format } from '../models/format.model';
import { FileService } from './file';

type Health = {
    status: string;
    log_file: string;
};
type Status = {
    status: string;
    message: string;
};
type FileParams = Partial<Filters & { format: Format }>;
type MessageParams = Partial<Filters & Timestamps>;

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    fileService = inject(FileService);
    private http = inject(HttpClient);

    health$() {
        return this.http.get<Health>('/health');
    }

    getStreams$(): Observable<StreamData[]> {
        return this.http.get<StreamData[]>('/streams/');
    }

    addStream$(url: string): Observable<StreamData> {
        return this.http.post<StreamData>('/streams/', { url });
    }

    resumeStream$(streamId: number): Observable<Status> {
        return this.http.patch<Status>(`/streams/${streamId}/resume`, {});
    }

    pauseStream$(streamId: number): Observable<Status> {
        return this.http.patch<Status>(`/streams/${streamId}/pause`, {});
    }

    stopStream$(streamId: number): Observable<StreamData> {
        return this.http.patch<StreamData>(`/streams/${streamId}/stop`, {});
    }

    deleteStream$(streamId: number): Observable<void> {
        return this.http.delete<void>(`/streams/${streamId}`);
    }

    getStatusUpdate$(stream_ids: number[]): Observable<StreamData[]> {
        return this.http.post<StreamData[]>('/streams/status', { stream_ids });
    }

    filtersToParams(params: MessageParams | FileParams): HttpParams {
        let httpParams = new HttpParams();
        for (const filter of Object.keys(params) as (keyof typeof params)[]) {
            const value = params[filter];
            if (
                value !== undefined &&
                value !== null &&
                value !== '' &&
                !(Array.isArray(value) && value.length === 0)
            ) {
                httpParams = httpParams.set(filter, value.toString());
            }
        }
        return httpParams;
    }

    getFile$(
        streamId: number,
        fileParams: FileParams
    ): Observable<HttpResponse<Blob>> {
        const params = this.filtersToParams(fileParams);
        return this.http
            .get(`/streams/${streamId}/export`, {
                params,
                responseType: 'blob',
                observe: 'response',
            })
            .pipe(
                tap(response => {
                    const blob = response.body;
                    if (!blob) return;
                    const filename =
                        response.headers.get('filename') ??
                        `stream_${streamId}`;
                    this.fileService.downloadFile(
                        filename,
                        fileParams.format!,
                        blob
                    );
                })
            );
    }
    getMessages$(
        streamId: number,
        messageParams: MessageParams
    ): Observable<MessagesResponse> {
        const params = this.filtersToParams(messageParams);
        return this.http.get<MessagesResponse>(
            `/streams/${streamId}/messages`,
            { params }
        );
    }
}
