import { createModuleReducer, createActionCreator } from '@intactile/redux-utils';
import mapValues from 'lodash.mapvalues';
import invariant from 'invariant';
import createNormalized from './createNormalized';

// ------------------------------------
// Index
// ------------------------------------

// ------------------------------------
// Selectors
// ------------------------------------
function queriesToSelectors(normalized, queryToSelector) {
  return mapValues(normalized.queries, queryToSelector);
}

function createNormalizedSelectors(normalized, getStateSlice) {
  const queryToSelector =
    (query) =>
    (state, ...others) =>
      query(getStateSlice(state), ...others);
  const selectors = queriesToSelectors(normalized, queryToSelector);
  normalized.indexes.forEach((index) => {
    selectors[index.name] = queriesToSelectors(index, queryToSelector);
  });
  return selectors;
}

// ------------------------------------
// Reducer
// ------------------------------------
function createReducerForCreate(normalized) {
  return function reducerForCreate(state, { payload: object }) {
    return normalized.commands.add(state, object);
  };
}

function createReducerForDelete(normalized) {
  return function reducerForDelete(state, { payload: id }) {
    return normalized.commands.remove(state, id);
  };
}

function createReducerForLoad(normalized, { extractor }) {
  return function reducerForLoad(state, action) {
    return normalized.commands.load(state, extractor(action));
  };
}

function createReducerForUpdate(normalized) {
  return function reducerForUpdate(state, action) {
    const { id, ...values } = action.payload;
    return normalized.commands.update(state, id, values);
  };
}

function createReducerForReplace(normalized) {
  return function reducerForUpdate(state, { payload: object }) {
    return normalized.commands.replace(state, object);
  };
}

function createReducerForToFront(normalized) {
  return function reducerToFront(state, { payload: id }) {
    return normalized.commands.toFront(state, id);
  };
}

const reducersFactories = {
  create: createReducerForCreate,
  update: createReducerForUpdate,
  delete: createReducerForDelete,
  replace: createReducerForReplace,
  toFront: createReducerForToFront,
  load: createReducerForLoad,
};

function createCaseReducer(type, normalized, reducerSpec) {
  const reducerFactory = reducersFactories[type];
  invariant(reducerFactory, `can not create a reducer for the type: ${type}`);
  return reducersFactories[type](normalized, reducerSpec);
}

function createReducer(normalized, reducersSpec) {
  const initialState = normalized.commands.initialize();
  const reducers = mapValues(reducersSpec, (reducerSpec) => {
    let reducer = reducerSpec;
    if (typeof reducerSpec === 'string') {
      reducer = createCaseReducer(reducerSpec, normalized);
    } else if (typeof reducerSpec === 'object') {
      reducer = createCaseReducer(reducerSpec.type, normalized, reducerSpec);
    }
    return reducer;
  });
  return createModuleReducer(reducers, initialState);
}

function createActionForUpdate(type) {
  return function update(id, values) {
    return { type, payload: { id, ...values } };
  };
}

const actionsFactories = {
  create: createActionCreator,
  update: createActionForUpdate,
  replace: createActionCreator,
  delete: createActionCreator,
  toFront: createActionCreator,
};

function createAction(actionType, reducerSpec) {
  const actionsFactory = actionsFactories[reducerSpec];
  invariant(actionsFactory, `can not create an action for the type: ${reducerSpec}  ${actionType}`);
  return actionsFactory(actionType);
}

function createActions(reducerSpecs) {
  const actions = {};
  Object.entries(reducerSpecs).forEach(([actionType, reducerSpec]) => {
    if (typeof reducerSpec === 'string') {
      actions[reducerSpec] = createAction(actionType, reducerSpec);
    }
  });
  return actions;
}

function createActionsTypes(reducerSpecs) {
  const actionsTypes = {};
  Object.entries(reducerSpecs).forEach(([actionType, reducerSpec]) => {
    if (typeof reducerSpec === 'string') {
      actionsTypes[reducerSpec] = actionType;
    }
  });
  return actionsTypes;
}

// ------------------------------------
// Module
// ------------------------------------
export default function createReduxNormalized(moduleDefinition) {
  invariant(moduleDefinition, 'a module definition is required');
  const normalized = createNormalized(moduleDefinition);
  const getStateSlice = moduleDefinition.selector;
  const reducer = createReducer(normalized, moduleDefinition.reducers);
  return {
    reducer,
    selectors: createNormalizedSelectors(normalized, getStateSlice),
    actions: createActions(moduleDefinition.reducers),
    actionsTypes: createActionsTypes(moduleDefinition.reducers),
  };
}
