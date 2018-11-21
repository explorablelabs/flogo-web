import { Item } from '@flogo/core';
import { HandlerType } from '@flogo/flow/core/models';
import { FlowState } from './flow/flow.state';
import {NodeDictionary} from '@flogo/core/interfaces/graph/graph';

export const getItemsDictionaryName = (handlerType: HandlerType) => `${handlerType}Items`;

export const getGraphName = (handlerType: HandlerType) => `${handlerType}Graph`;

export const getItem = (state: FlowState, handlerType: HandlerType, itemId: string): Item => {
  return state[getItemsDictionaryName(handlerType)][itemId];
};
export const nodesContainErrors = (nodes: NodeDictionary) => {
  const nodeKeys = Object.keys(nodes);
  return !!nodeKeys.find(nodeKey => !!nodes[nodeKey].status.executionErrored);
};
export type PayloadOf<T extends { payload: any }> = T['payload'];