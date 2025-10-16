import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { inject } from '@angular/core';
import { PORT } from '../providers/port';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
    const port = inject(PORT);
    return next(
        req.clone({
            url: `${environment.apiUrl}:${port}${req.url}`,
        })
    );
};
