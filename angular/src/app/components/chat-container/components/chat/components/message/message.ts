import { Component, computed, input, output } from '@angular/core';
import { Author } from '../../../../../../models/author.model';
import { BasicMessage } from '../../../../../../models/message.model';
import { MessageGroup } from '../../../../../../models/message-group.model';

// templateUrl: './message.html',
@Component({
    selector: 'app-message',
    imports: [],
    template: ``,
    host: {
        '[class.system]': 'isSystem()',
        '[class.ban]': 'isBan()',
        '[class.sub]': 'isSub()',
    },
})
export class Message {
    authorClicked = output<Author>();
    readonly message = input.required<BasicMessage>();
    readonly isBan = computed(
        () => this.message().messageGroupId === MessageGroup.Bans
    );
    readonly isSystem = computed(() => this.isSub() || this.isBan());
    readonly name = computed(() =>
        this.isSystem() ? 'System' : this.authorName()
    );
    readonly authorName = computed(() => this.message().author.name);
    readonly messageValue = computed(() =>
        this.isSystem() ? this.message().systemMessage : this.message().message
    );
    readonly timestamp = computed(() => {
        const date = new Date(this.message().timestamp);
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${hour}:${minute}`;
    });
    readonly isSub = computed(
        () => this.message().messageGroupId === MessageGroup.Subs
    );
}
