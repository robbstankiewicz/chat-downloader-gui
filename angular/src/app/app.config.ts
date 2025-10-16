import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners,
    provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { CustomPreset } from './styles/custom-preset';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './interceptors/api.interceptor';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZonelessChangeDetection(),
        provideAnimationsAsync(),
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideStoreDevtools(),
        providePrimeNG({
            ripple: true,
            theme: {
                preset: CustomPreset,
                options: {
                    darkModeSelector: '',
                },
            },
        }),
    ],
};
