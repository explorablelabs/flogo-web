import { Component, Inject } from '@angular/core';
import { TriggerStatus } from '../interfaces';
import { ConfirmationControl, ConfirmationContent } from '@flogo/core';
import { TRIGGER_STATUS_TOKEN } from './status.token';

@Component({
  selector: 'flogo-triggers-configuration-settings-confirmation',
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.less']
})
export class ConfirmationComponent implements ConfirmationContent {
  constructor(@Inject(TRIGGER_STATUS_TOKEN) public status: TriggerStatus, public control: ConfirmationControl) {}
}