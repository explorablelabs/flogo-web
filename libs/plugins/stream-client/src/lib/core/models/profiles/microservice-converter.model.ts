import { Injectable } from '@angular/core';
import { TriggerSchema } from '@flogo-web/core';
import { ErrorService, ContributionsService } from '@flogo-web/lib-client/core';

@Injectable()
export class MicroServiceModelConverter {
  constructor(
    private contribService: ContributionsService,
    private errorService: ErrorService
  ) {}

  getTriggerSchema(trigger) {
    if (!trigger.ref) {
      throw this.errorService.makeOperationalError(
        'Trigger: Wrong input json file',
        'Cannot get ref for trigger',
        {
          type: 'ValidationError',
          title: 'Wrong input json file',
          detail: 'Cannot get ref for trigger:',
          property: 'trigger',
          value: trigger,
        }
      );
    } else {
      return this.contribService
        .getContributionDetails(trigger.ref)
        .then((schema: TriggerSchema) => this.normalizeTriggerSchema(schema));
    }
  }

  private normalizeTriggerSchema(schema: TriggerSchema): TriggerSchema {
    if (!schema.handler) {
      schema.handler = {
        settings: [],
      };
    }
    return schema;
  }
}
