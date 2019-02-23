import { Injectable } from '@angular/core';
import { BehaviorSubject, from, of, throwError, Observable } from 'rxjs';
import { tap, shareReplay, switchMap, catchError, filter } from 'rxjs/operators';

import { App } from '@flogo-web/core';
import {
  AppsApiService,
  ResourceService,
  ErrorService,
  TriggersApiService,
  AppResourceService,
} from '@flogo-web/client-core';
import { NotificationsService } from '@flogo-web/client-core/notifications';
import { AppResourcesStateService } from './app-resources-state.service';

interface NewResource {
  name: string;
  type: string;
  description?: string;
}

@Injectable()
export class AppDetailService {
  private appSource = new BehaviorSubject<App>(undefined);

  public app$ = this.appSource.asObservable().pipe(
    filter(Boolean),
    shareReplay(1)
  );

  constructor(
    private resourcesState: AppResourcesStateService,
    private appsApiService: AppsApiService,
    private resourceService: ResourceService,
    private triggersService: TriggersApiService,
    private notificationsService: NotificationsService,
    private errorService: ErrorService,
    private appResourceApiService: AppResourceService
  ) {}

  public load(appId: string) {
    this.appsApiService.getApp(appId).subscribe(app => {
      this.setApp(app);
    });
  }

  public updateProperty(prop: 'name' | 'description', value: any): Observable<App> {
    const oldApp = this.appSource.getValue();
    const newApp = {
      ...oldApp,
      [prop]: value,
    };
    this.appSource.next(newApp);

    const update$ = this.appsApiService
      .updateApp(oldApp.id, { [prop]: value })
      .pipe(shareReplay(1));

    update$.subscribe(
      () => {
        /* nothing to do we handled the update optimistically */
      },
      () => {
        this.appSource.next(oldApp);
      }
    );

    return update$.pipe(
      catchError(err => throwError(this.errorService.transformRestErrors(err)))
    );
  }

  public deleteApp() {
    const currentApp = this.appSource.getValue();
    return this.appsApiService.deleteApp(currentApp.id);
  }

  public createResource(newResource: NewResource, triggerId?: string) {
    const createResource$ = from(
      this.appResourceApiService.createResource(
        this.appSource.getValue().id,
        newResource,
        triggerId
      )
    ).pipe(
      tap(() => {
        this.notificationsService.success({
          key: 'FLOWS:SUCCESS-MESSAGE-FLOW-CREATED',
        });
      }),
      shareReplay(1)
    );

    createResource$.subscribe(
      ({ resource }) => {
        this.resourcesState.resources = [...this.resourcesState.resources, resource];
      },
      err => {
        console.error(err);
        this.notificationsService.error({
          key: 'FLOWS:CREATE_FLOW_ERROR',
          params: err,
        });
      }
    );

    createResource$
      .pipe(
        switchMap(({ handler }: { handler?: { triggerId: string } }) => {
          return handler ? this.triggersService.getTrigger(handler.triggerId) : of(null);
        })
      )
      .subscribe(trigger => {
        if (trigger) {
          const triggers = this.resourcesState.triggers.filter(t => t.id !== trigger.id);
          this.resourcesState.triggers = [...triggers, trigger];
        }
      });
  }

  public removeResource(resourceId: string, triggerId: string) {
    const resources = [...this.resourcesState.resources];
    const resourceIndex = resources.findIndex(r => r.id === resourceId);
    const resource = resources[resourceIndex];
    resources.splice(resourceIndex, 1);
    this.resourcesState.resources = resources;

    this.appResourceApiService.deleteResourceWithTrigger(resourceId, triggerId).subscribe(
      (status: { resourceDeleted?: boolean; triggerDeleted?: boolean }) => {
        if (status && status.triggerDeleted) {
          this.resourcesState.triggers = this.resourcesState.triggers.filter(
            t => t.id !== triggerId
          );
        }
      },
      () => {
        this.resourcesState.resources = [...this.resourcesState.resources, resource];
      }
    );
  }

  public toEngineSpec() {
    return this.appsApiService.exportApp(this.appSource.getValue().id);
  }

  public exportResources(resourceIds: string[]) {
    return this.appsApiService.exportFlows(this.appSource.getValue().id, resourceIds);
  }

  public build(appId, opts: { os: string; arch: string }) {
    return this.appsApiService.buildAndDownload(appId, opts);
  }

  private setApp(app: App) {
    this.appSource.next(app);
    this.resourcesState.triggers = app.triggers;
    this.resourcesState.resources = app.resources;
  }
}
