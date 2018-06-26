import {isEmpty, isObject, mapValues} from 'lodash';
import {Injectable} from '@angular/core';
import {Dictionary} from '@flogo/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {SettingControlInfo, SettingControlGroup, TriggerInformation} from '../interfaces';
import { SettingValue } from './settings-value';

@Injectable()
export class SettingsFormBuilder {
  constructor(private ngFormBuilder: FormBuilder) {}

  build(settingsFields, settingControls: TriggerInformation['settingsControls'], disableCommonSettings: boolean) {
    const settingsFormGroup: Dictionary<FormControl | FormGroup> = {};

    settingsFormGroup.name = this.ngFormBuilder.control({
      value: settingsFields.name.value || '',
      disabled: disableCommonSettings
    }, Validators.required);

    settingsFormGroup.description = this.ngFormBuilder.control({
      value: settingsFields.description.value || '',
      disabled: disableCommonSettings
    }, Validators.required);

    if (!isEmpty(settingsFields.triggerSettings)) {
      settingsFormGroup.triggerSettings = this.formGroupBySettings(
        settingsFields.triggerSettings,
        settingControls[SettingControlGroup.TRIGGER],
        disableCommonSettings,
      );
    }

    if (!isEmpty(settingsFields.handlerSettings)) {
      settingsFormGroup.handlerSettings = this.formGroupBySettings(
        settingsFields.handlerSettings,
        settingControls[SettingControlGroup.HANDLER],
      );
    }

    return this.ngFormBuilder.group(settingsFormGroup);
  }

  private formGroupBySettings(settings,
                              settingsInformation: Dictionary<SettingControlInfo>,
                              disableControls: boolean = false): FormGroup {
    return this.ngFormBuilder.group(
      mapValues(settings, (setting, settingName) => this.makeFormControl(setting, settingsInformation[settingName], disableControls))
    );
  }

  private makeFormControl(setting, settingInfo: SettingControlInfo, disableControls?: boolean) {
    const value = setting.value || '';
    const viewValue = isObject(value) ? JSON.stringify(value, null, 2) : value;
    return this.ngFormBuilder.control({
      value: <SettingValue> {
        viewValue,
        parsedValue: value,
      },
      disabled: disableControls
    }, settingInfo.validations);
  }
}
