import { SingleEmissionSubject } from '@flogo/core/models';
import { createSaveChangesAction } from '@flogo/flow/debug-panel/save-changes-action.creator';
import { isEmpty, fromPairs } from 'lodash';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AnimationEvent } from '@angular/animations';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { select, Store } from '@ngrx/store';
import { combineLatest, Observable, pipe } from 'rxjs';
import { debounceTime, filter, map, shareReplay, switchMap, takeUntil, withLatestFrom } from 'rxjs/operators';

import { FlowActions, FlowSelectors, FlowState } from '@flogo/flow/core/state';
import { ActivitySchema, Dictionary, ItemActivityTask, StepAttribute } from '@flogo/core';
import { FormBuilderService } from '@flogo/flow/shared/dynamic-form';
import { debugPanelAnimations } from './debug-panel.animations';
import { mergeFormWithOutputs } from './utils';
import { FieldsInfo } from './fields-info';

const SELECTOR_FOR_CURRENT_ELEMENT = 'flogo-diagram-tile-task.is-selected';
const OPEN_STATE = 'open';

const mapFormInputChangesToSaveAction = (store, activity$) => pipe(
  filter((formInfo: FieldsInfo) => Boolean(formInfo && formInfo.form && formInfo.form.get('input'))),
  switchMap((formInfo: FieldsInfo) => formInfo.form.get('input').valueChanges.pipe(debounceTime(250))),
  map(value => fromPairs(value.formFields.map(field => [field.name, field.value]))),
  withLatestFrom(activity$),
  switchMap(([newValues, task]) => createSaveChangesAction(store, task.id, newValues)),
  filter(action => !!action),
);

@Component({
  selector: 'flogo-flow-debug-panel',
  templateUrl: './debug-panel.component.html',
  styleUrls: ['./debug-panel.component.less'],
  animations: [debugPanelAnimations.transformPanel],
})
export class DebugPanelComponent implements OnInit, OnDestroy {

  @ViewChild('content') content: ElementRef;
  isOpen: string;
  activity$: Observable<ItemActivityTask>;
  fields$: Observable<FieldsInfo>;
  isRunDisabled$: Observable<boolean>;

  private destroy$ = SingleEmissionSubject.create();

  constructor(private store: Store<FlowState>, private formBuilder: FormBuilder, private attributeFormBuilder: FormBuilderService) {
  }

  ngOnInit() {
    const selectAndShare = (selector) => this.store.pipe(select(selector), shareReplay());
    this.activity$ = selectAndShare(FlowSelectors.getSelectedActivity);
    this.isRunDisabled$ = selectAndShare(FlowSelectors.getIsRunDisabledForSelectedActivity);

    const form$: Observable<null | FieldsInfo> = this.store.pipe(this.mapStateToForm(), shareReplay());
    const executionResult$ = this.store.pipe(select(FlowSelectors.getSelectedActivityExecutionResult));
    this.fields$ = combineLatest(form$, this.activity$, this.isRunDisabled$, executionResult$)
      .pipe(this.mergeToFormFields(), shareReplay());

    form$.pipe(
        mapFormInputChangesToSaveAction(this.store, this.activity$),
        takeUntil(this.destroy$),
      )
      .subscribe(action => this.store.dispatch(action));

    this.store
      .pipe(
        select(FlowSelectors.selectDebugPanelOpen),
        takeUntil(this.destroy$),
      )
      .subscribe(isOpen => this.isOpen = isOpen ? OPEN_STATE : null);
  }

  ngOnDestroy() {
    this.destroy$.emitAndComplete();
  }

  togglePanel() {
    this.store.dispatch(new FlowActions.DebugPanelStatusChange({ isOpen: !this.isOpen }));
  }

  onAnimationEnd(event: AnimationEvent) {
    if (event.toState === OPEN_STATE) {
      this.scrollContextElementIntoView();
    }
  }

  private mapStateToForm() {
    return pipe(
      select(FlowSelectors.getSelectedActivitySchema),
      map((schema: ActivitySchema) => this.createFormFromSchema(schema)),
    );
  }

  private mergeToFormFields()  {
    return (source: Observable<[FieldsInfo, ItemActivityTask, boolean, Dictionary<StepAttribute>]>) => source.pipe(
      filter(([schemaForm]) => !!schemaForm),
      map(([schemaForm, activity, isRunDisabled, lastExecutionResult]) => {
        const inputForm = schemaForm && schemaForm.form.get('input');
        if (inputForm && inputForm.disabled !== isRunDisabled) {
          this.updateFormDisabledState(inputForm, isRunDisabled);
        }
        if (inputForm && activity) {
          this.mergeFormWithInputs(inputForm, activity);
        }
        return {
          form: mergeFormWithOutputs(schemaForm.form, lastExecutionResult),
          metadata: schemaForm && schemaForm.metadata,
        };
      }),
    );
  }

  private mergeFormWithInputs(inputForm: AbstractControl, activity: ItemActivityTask) {
    const mockInputs = activity.input || {};
    const formFieldValues = inputForm.value.formFields
      .map((fieldVal) => {
        const mockValue = mockInputs[fieldVal.name];
        if (mockValue === undefined) {
          return fieldVal;
        }
        return {
          ...fieldVal,
          value: mockValue,
        };
      });
    inputForm.patchValue({formFields: formFieldValues}, {emitEvent: false});
    return inputForm;
  }

  private createFormFromSchema(schema: ActivitySchema) {
    if (!schema) {
      return null;
    }
    const inputs = !isEmpty(schema.inputs) ? this.attributeFormBuilder.toFormGroup(schema.inputs) : null;
    const outputs = !isEmpty(schema.outputs) ? this.attributeFormBuilder.toFormGroup(schema.outputs) : null;
    const form = this.formBuilder.group({});
    if (inputs) {
      form.addControl('input', inputs.formGroup);
    }
    if (outputs) {
      outputs.formGroup.disable();
      form.addControl('output', outputs.formGroup);
    }
    return { form, metadata: { input: inputs && inputs.fieldsWithControlType, output: outputs && outputs.fieldsWithControlType } };
  }

  private updateFormDisabledState(inputForm: AbstractControl, isRunDisabled: boolean) {
    const options = { onlySelf: true, emitEvent: false };
    if (isRunDisabled) {
      inputForm.disable(options);
    } else {
      inputForm.enable(options);
    }
  }

  private scrollContextElementIntoView() {
    const contentElement: Element = this.content.nativeElement;
    const selection = contentElement.querySelector(SELECTOR_FOR_CURRENT_ELEMENT);
    if (selection) {
      selection.scrollIntoView({ behavior: 'smooth' });
    }
  }

}
