import { moveAtTheEnd, removeElement } from './utils';
import createSort from './createSort';
import createOneToOneIndex from './createOneToOneIndex';
import createManyToOneIndex from './createManyToOneIndex';

function createIndex(definition) {
  return definition.oneToOne ? createOneToOneIndex(definition) : createManyToOneIndex(definition);
}

function createIndexes(indexesDefinitions = []) {
  return indexesDefinitions.map(createIndex);
}

const getByIdMap = state => state.byId;
const getById = (state, id) => getByIdMap(state)[id];
const getAllIds = state => state.allIds;
const getLastCreatedId = state => Math.max(...getAllIds(state), 0);
const getNextId = state => getLastCreatedId(state) + 1;
const getAll = state => getAllIds(state).map(id => getById(state, id));
const getLastCreated = state => getById(state, getLastCreatedId(state));
const isEmpty = state => getAllIds(state).length === 0;

function createCommands(indexes, sort) {
  function replace(state, object) {
    const { id } = object;
    const oldObject = state.byId[id];
    const newState = {
      ...state,
      byId: {
        ...state.byId,
        [id]: object
      }
    };
    if (sort.isNeeded(oldObject, object)) {
      newState.allIds = sort(newState, newState.allIds.slice());
    }
    indexes.forEach(index => index.update(newState, oldObject, object));
    return newState;
  }

  return {
    initialize: () => {
      const state = {
        byId: {},
        allIds: []
      };
      indexes.forEach(index => {
        index.initialize(state);
      });
      return state;
    },
    load: (state, objects) => {
      if (!objects) {
        return state;
      }
      const allIds = objects.map(object => object.id);
      const byId = objects.reduce((map, object) => {
        map[object.id] = object;
        return map;
      }, {});
      const loadedState = { ...state, byId, allIds };
      sort(loadedState, allIds);
      indexes.forEach(index => index.load(loadedState));
      return loadedState;
    },
    add: (state, object) => {
      const id = getNextId(state);
      object.id = id;
      const allIds = [...state.allIds];
      allIds.push(id);
      const newState = {
        ...state,
        byId: {
          ...state.byId,
          [id]: object
        },
        allIds
      };
      sort(newState, allIds);
      indexes.forEach(index => index.add(newState, object));
      return newState;
    },
    remove: (state, id) => {
      const allIds = [...state.allIds];
      const byId = { ...state.byId };
      const object = byId[id];
      delete byId[id];
      removeElement(allIds, id);
      const newState = {
        ...state,
        allIds,
        byId
      };
      indexes.forEach(index => index.remove(newState, object));
      return newState;
    },
    update: (state, id, values) => {
      const oldObject = state.byId[id];
      const newObject = { ...oldObject, ...values };
      return replace(state, newObject);
    },
    replace,
    toFront: (state, id) => {
      const allIds = [...state.allIds];
      const objectToMove = state.byId[id];
      moveAtTheEnd(allIds, id);
      const newState = {
        ...state,
        allIds
      };
      indexes.forEach(index => index.toFront(newState, objectToMove));
      return newState;
    }
  };
}

export default function createNormalized(definition) {
  const indexes = createIndexes(definition.indexes);
  return {
    indexes,
    commands: createCommands(indexes, createSort(definition.comparator)),
    queries: {
      getByIdMap,
      getById,
      getAllIds,
      getLastCreatedId,
      getNextId,
      getLastCreated,
      getAll,
      isEmpty
    }
  };
}
