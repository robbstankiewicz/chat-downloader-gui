import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StreamsStore } from '../../../../stores/streams.store';
import { Chat } from './chat';
import { of } from 'rxjs';
import { STREAMS_STORE_MOCK } from '../../../../stores/streams.store.spec';

const ELEMENT_HEIGHT = 600;
const SCROLL_HEIGHT = 10000;

describe('Chat', () => {
    let fixture: ComponentFixture<Chat>;
    let component: Chat;
    let element: HTMLElement;
    let streamsStoreMock: typeof STREAMS_STORE_MOCK;
    const scrollTop = (scrollTopValue: number): void => {
        Object.defineProperty(element, 'scrollTop', {
            value: scrollTopValue,
            writable: true,
        });
        element.dispatchEvent(new Event('scroll'));
    };

    const createElement = (): HTMLElement => {
        element = document.createElement('div');
        element.scrollTop = SCROLL_HEIGHT - ELEMENT_HEIGHT;
        Object.defineProperty(element, 'offsetHeight', {
            value: ELEMENT_HEIGHT,
            writable: true,
        });
        Object.defineProperty(element, 'scrollHeight', {
            value: SCROLL_HEIGHT,
            writable: true,
        });
        Object.defineProperty(element, 'clientHeight', {
            value: ELEMENT_HEIGHT,
            writable: true,
        });
        return element;
    };

    beforeEach(() => {
        streamsStoreMock = STREAMS_STORE_MOCK;
        element = createElement();

        TestBed.configureTestingModule({
            imports: [Chat],
            providers: [
                {
                    provide: StreamsStore,
                    useValue: streamsStoreMock,
                },
            ],
        });

        Chat.prototype.scrollElement$ = () => of(element);
        fixture = TestBed.createComponent(Chat);
        component = fixture.componentInstance;
        spyOn(component, 'scrollElement$').and.callThrough();
    });

    describe('scrollEvent$', () => {
        let result: {
            isTop: boolean;
            isBottom: boolean;
            element: HTMLElement;
        }[] = [];
        beforeEach(() => {
            result = [];
            component.scrollEvent$.subscribe(event => {
                result.push(event);
            });
        });
        it('should start with scroll positioned to bottom without emitting event', () => {
            expect(result[0]).toEqual({
                isTop: false,
                isBottom: true,
                element,
            });
            expect(result.length).toBe(1);
        });
        it('should detect if user scrolled to the top', () => {
            scrollTop(50);
            scrollTop(0);
            expect(result[result.length - 1]).toEqual({
                isTop: true,
                isBottom: false,
                element,
            });
            expect(result.length).toBe(3);
        });
        it('should detect if user scrolled to the bottom', () => {
            scrollTop(SCROLL_HEIGHT - ELEMENT_HEIGHT);
            expect(result[result.length - 1]).toEqual({
                isTop: false,
                isBottom: true,
                element,
            });
            expect(result.length).toBe(2);
        });
    });

    describe('scrolledTop$', () => {
        beforeEach(() => {
            spyOn(component.scrollPanel(), 'scrollTop').and.callThrough();
            fixture.detectChanges();
            scrollTop(50);
            scrollTop(0);
        });
        it('should call for previous messages', () => {
            expect(component.streamsStore.getMessages$).toHaveBeenCalled();
        });
        it('should scroll from the top after getting messages', () => {
            expect(component.scrollPanel().scrollTop).toHaveBeenCalled();
        });
    });
});
