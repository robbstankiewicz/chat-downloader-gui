import { Component } from '@angular/core';
import { Message } from '../../message';

@Component({
    selector: 'app-message-tw',
    imports: [],
    templateUrl: './message-tw.html',
    styleUrls: ['../../message.scss', './message-tw.scss'],
})
export class MessageTw extends Message {}
