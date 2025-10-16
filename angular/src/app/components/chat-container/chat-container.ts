import { Component, computed, inject, OnInit, viewChild } from '@angular/core';
import { Chat } from './components/chat/chat';
import { CommonModule } from '@angular/common';
import {
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
} from '@angular/forms';
import { Button, ButtonModule } from 'primeng/button';
import { InputGroup } from 'primeng/inputgroup';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { Checkbox } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { filter, fromEvent, merge, Subject, switchMap, tap } from 'rxjs';
import { StreamsStore } from '../../stores/streams.store';
import { Author } from '../../models/author.model';
import { Filters } from '../../models/filters.model';
import { MessageGroup } from '../../models/message-group.model';
import { Platform } from '../../models/platform.model';
import { SelectButtonModule } from 'primeng/selectbutton';
import { toObservable } from '@angular/core/rxjs-interop';
import { MenuModule } from 'primeng/menu';
import { Format } from '../../models/format.model';
import { MenuItem } from 'primeng/api';

const formDict = {
    [Platform.Twitch]: {
        bans: 'Bans',
        subs: 'Subscriptions',
        include: 'Include messages by banned viewers',
    },
    [Platform.Youtube]: {
        bans: 'Bans/Retractions',
        subs: 'Superchats',
        include:
            'Include messages by viewers whose messages were removed or retracted',
    },
};

@Component({
    selector: 'app-chat-container',
    imports: [
        Chat,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        InputGroup,
        InputTextModule,
        InputGroupAddonModule,
        Checkbox,
        IconFieldModule,
        InputIconModule,
        SelectButtonModule,
        MenuModule,
    ],
    templateUrl: './chat-container.html',
    styleUrl: './chat-container.scss',
})
export class ChatContainer implements OnInit {
    streamsStore = inject(StreamsStore);
    readonly searchButton = viewChild<Button>('searchButton');
    searchButton$ = toObservable(this.searchButton);
    clearButtonClick$ = new Subject<FormControl>();
    authorClicked$ = new Subject<Author>();

    authorClickedEvent$ = this.authorClicked$.pipe(
        tap(author => {
            this.searchForm.controls.username.setValue(author.name);
        })
    );
    clearInputEvent$ = this.clearButtonClick$.pipe(
        tap((control: FormControl) => {
            control.setValue('');
        })
    );
    readonly currentPlatform = computed(() => {
        return this.streamsStore.activeStream()!.platform;
    });
    readonly formDict = computed(() => {
        return formDict[this.currentPlatform()];
    });
    formatMenuItems: MenuItem[] = [
        {
            label: 'JSON',
            icon: 'pi pi-file-export',
            command: (): void => {
                this.streamsStore.getFile(Format.JSON);
            },
        },
        {
            label: 'CSV',
            icon: 'pi pi-file-export',
            command: (): void => {
                this.streamsStore.getFile(Format.CSV);
            },
        },
    ];

    categoryForm = new FormGroup({
        messagesType: new FormControl(true),
        bansType: new FormControl(true),
        subsType: new FormControl(true),
        includeBannedUsers: new FormControl(true),
        moderators: new FormControl(false),
    });

    searchForm = new FormGroup({
        username: new FormControl(''),
        message: new FormControl(''),
    });

    searchButtonClick$ = this.searchButton$.pipe(
        filter(Boolean),
        switchMap(buttonComponent =>
            fromEvent(buttonComponent!.el.nativeElement, 'click')
        )
    );

    getFormValues(): Partial<Filters> {
        const {
            messagesType,
            bansType,
            subsType,
            includeBannedUsers,
            moderators,
        } = this.categoryForm.value;
        const { message, username } = this.searchForm.value;

        const messageGroupIds = [];
        if (messagesType) messageGroupIds.push(MessageGroup.Messages);
        if (bansType) messageGroupIds.push(MessageGroup.Bans);
        if (subsType) messageGroupIds.push(MessageGroup.Subs);

        return {
            messageGroupIds,
            username,
            message,
            includeBannedUsers,
            moderators,
        };
    }

    clearInput(control: FormControl): void {
        control.setValue('');
    }

    close(): void {
        this.streamsStore.setActiveStream(null);
    }

    ngOnInit(): void {
        const searchEvents = [
            this.categoryForm.valueChanges,
            this.searchButtonClick$,
            this.clearInputEvent$,
            this.authorClickedEvent$,
        ];
        merge(...searchEvents)
            .pipe(
                tap(() => {
                    this.streamsStore.patchFilters(this.getFormValues());
                })
            )
            .subscribe();
    }
}
