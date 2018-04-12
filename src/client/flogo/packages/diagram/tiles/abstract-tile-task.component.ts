import { Component, EventEmitter, HostBinding, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DiagramSelection, TaskTile, DiagramActionSelf, DiagramActionChild, DiagramSelectionType } from '../interfaces';
import { actionEventFactory } from '../action-event-factory';
@Component({
  selector: 'flogo-diagram-abstract-tile-task',
  template: '',
})
export abstract class AbstractTileTaskComponent implements OnChanges {
  @Input() tile: TaskTile;
  @Input() currentSelection: DiagramSelection;
  @Input() isReadOnly = false;
  @Output() select = new EventEmitter<TaskTile>();
  @Output() branch = new EventEmitter<DiagramActionChild>();
  @Output() remove = new EventEmitter<DiagramActionSelf>();
  @Output() configure = new EventEmitter<DiagramActionSelf>();
  @HostBinding('class.is-selected') isSelected = false;

  ngOnChanges({ currentSelection: currentSelectionChange }: SimpleChanges) {
    if (currentSelectionChange) {
      this.checkIsSelected();
    }
  }

  @HostBinding('class.has-run')
  get hasRun() {
    const status = this.tile.task.status;
    if (status) {
      return status.executed;
    }
    return false;
  }

  @HostBinding('class.is-invalid')
  get isInvalid() {
    const status = this.tile.task.status;
    if (status) {
      return status.invalid;
    }
    return false;
  }

  onSelect() {
    if (!this.isReadOnly) {
      this.select.emit(this.tile);
    }
  }

  onRemove() {
    this.remove.emit(actionEventFactory.remove(this.tile.task.id));
  }

  onBranch() {
    this.branch.emit(actionEventFactory.branch(this.tile.task.id));
  }

  onConfigure() {
    this.remove.emit(actionEventFactory.configure(this.tile.task.id));
  }

  private checkIsSelected() {
    if (!this.currentSelection) {
      return false;
    }
    const {type, taskId} = this.currentSelection;
    this.isSelected = type === DiagramSelectionType.Node && taskId === this.tile.task.id;
  }

}
