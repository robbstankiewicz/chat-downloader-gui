import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
    ComponentFixture,
    fakeAsync,
    TestBed,
    tick,
} from '@angular/core/testing';
import { App } from './app';
import {
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { ChatContainer } from './components/chat-container/chat-container';

describe('App', () => {
    let httpTesting: HttpTestingController;
    let fixture: ComponentFixture<App>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        httpTesting = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(App);
        spyOn(fixture.componentInstance.toast, 'showError').and.callThrough();
        fixture.detectChanges();
    });

    it('should retry health checks until getting server response', fakeAsync(() => {
        const req1 = httpTesting.expectOne('/health');
        expect(req1.request.method).toBe('GET');
        req1.flush(null, { status: 500, statusText: 'Server Error' });
        tick(1000);
        const req2 = httpTesting.expectOne('/health');
        expect(req2.request.method).toBe('GET');
        req2.flush({ status: 'ok' });
        httpTesting.verify();
        // fixture
        fixture.detectChanges();
        const chatContainer = fixture.debugElement.query(
            By.directive(ChatContainer)
        );
        expect(chatContainer).not.toBeNull();
    }));

    it('throw the toast after retries', fakeAsync(() => {
        for (let i = 0; i <= 100; i++) {
            tick(1000);
            const req = httpTesting.expectOne('/health');
            req.flush(null, { status: 500, statusText: 'Server Error' });
        }
        expect(fixture.componentInstance.toast.showError).toHaveBeenCalled();
        httpTesting.verify();
    }));
});
