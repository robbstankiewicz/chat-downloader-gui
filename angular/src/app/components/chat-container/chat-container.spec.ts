import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatContainer } from './chat-container';
import { StreamsStore } from '../../stores/streams.store';
import { MessageGroup } from '../../models/message-group.model';
import { STREAMS_STORE_MOCK } from '../../stores/streams.store.spec';

describe('ChatContainer', () => {
    let component: ChatContainer;
    let fixture: ComponentFixture<ChatContainer>;
    let streamsStoreMock: typeof STREAMS_STORE_MOCK;
    beforeEach(async () => {
        streamsStoreMock = STREAMS_STORE_MOCK;
        await TestBed.configureTestingModule({
            imports: [ChatContainer],
            providers: [
                { provide: StreamsStore, useValue: STREAMS_STORE_MOCK },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ChatContainer);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.categoryForm.setValue({
            messagesType: true,
            bansType: false,
            subsType: true,
            includeBannedUsers: false,
            moderators: true,
        });
        component.searchForm.setValue({
            username: 'testuser',
            message: 'test message',
        });
        streamsStoreMock.patchFilters.calls.reset();
    });

    describe('getFormValues', () => {
        it('should return correct filters', () => {
            const formValues = component.getFormValues();
            expect(formValues).toEqual({
                messageGroupIds: [MessageGroup.Messages, MessageGroup.Subs],
                username: 'testuser',
                message: 'test message',
                includeBannedUsers: false,
                moderators: true,
            });
        });
    });

    describe('searchEvents', () => {
        it('categoryForm changed', () => {
            component.categoryForm.controls.moderators.setValue(true);
            expect(streamsStoreMock.patchFilters).toHaveBeenCalledWith(
                component.getFormValues()
            );
        });

        it('searchButton click', () => {
            const searchButton = component.searchButton();
            expect(searchButton).toBeDefined();
            searchButton!.el.nativeElement.click();
            expect(streamsStoreMock.patchFilters).toHaveBeenCalledWith(
                component.getFormValues()
            );
        });

        it('clearInputEvent', () => {
            component.clearButtonClick$.next(
                component.searchForm.controls.username
            );
            expect(streamsStoreMock.patchFilters).toHaveBeenCalledWith(
                component.getFormValues()
            );
        });

        it('authorClicked', () => {
            component.authorClicked$.next({
                name: 'test',
                id: 1,
                isMod: false,
                isSub: false,
                color: '',
            });
            expect(streamsStoreMock.patchFilters).toHaveBeenCalledWith(
                component.getFormValues()
            );
        });
    });
});
