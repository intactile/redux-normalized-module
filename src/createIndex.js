import groupBy from 'lodash.groupby';
import mapValues from 'lodash.mapvalues';
import noop from 'lodash.noop';
import { removeElement, moveAtTheEnd } from './arrayUtils';
import createSort from './createSort';

const EMPTY_ARRAY = [];

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
const createIndexName = definition => `by${capitalize(definition.attribute)}`;
const getFirst = arr => arr[0];
const isDefined = o => o !== undefined;

function createOneToOneIndex(definition) {
  const { attribute } = definition;
  const indexName = createIndexName(definition);
  const getIndex = state => state[indexName];
  const computeKey = object => (isDefined(object[attribute]) ? object[attribute] : null);
  return {
    attribute,
    name: indexName,
    initialize: state => {
      state[indexName] = {};
    },
    load: state => {
      const indexer = id => computeKey(state.byId[id]);
      state[indexName] = mapValues(groupBy(state.allIds, indexer), getFirst);
    },
    add: (state, object) => {
      const key = computeKey(object);
      state[indexName] = {
        ...state[indexName],
        [key]: object.id
      };
    },
    remove: (state, object) => {
      const key = computeKey(object);
      state[indexName] = {
        ...state[indexName]
      };
      delete state[indexName][key];
    },
    update: (state, oldObject, newObject) => {
      const oldKey = computeKey(oldObject);
      const newKey = computeKey(newObject);
      if (oldKey !== newKey) {
        state[indexName] = {
          ...state[indexName],
          [newKey]: newObject.id
        };
        delete state[indexName][oldKey];
      }
    },
    toFront: noop,
    queries: {
      get: (state, key) => {
        const id = getIndex(state)[key];
        return state.byId[id];
      },
      exists: (state, key) => isDefined(getIndex(state)[key])
    }
  };
}

function createManyToOneIndex(definition) {
  const { attribute, comparator } = definition;
  const indexName = createIndexName(definition);
  const getIndex = state => state[indexName];
  const get = (state, key = null) => getIndex(state)[key] || EMPTY_ARRAY;
  const computeKey = object => (isDefined(object[attribute]) ? object[attribute] : null);
  const sort = createSort(comparator);
  return {
    attribute,
    name: indexName,
    initialize: state => {
      state[indexName] = {};
    },
    load: state => {
      const indexer = id => computeKey(state.byId[id]);
      state[indexName] = groupBy(state.allIds, indexer);
      if (sort.isPresent) {
        state[indexName] = mapValues(state[indexName], ids => sort(state, ids));
      }
    },
    add: (state, object) => {
      const key = computeKey(object);
      const ids = get(state, key).slice();
      ids.push(object.id);
      sort(state, ids);
      state[indexName] = {
        ...state[indexName],
        [key]: ids
      };
    },
    remove: (state, object) => {
      const key = computeKey(object);
      const ids = get(state, key).slice();
      removeElement(ids, object.id);
      state[indexName] = {
        ...state[indexName],
        [key]: ids
      };
    },
    update: (state, oldObject, newObject) => {
      const oldKey = computeKey(oldObject);
      const newKey = computeKey(newObject);
      const isReindexationNeeded = oldKey !== newKey;
      if (isReindexationNeeded) {
        const oldIds = get(state, oldKey).slice();
        removeElement(oldIds, oldObject.id);
        const newIds = get(state, newKey).slice();
        newIds.push(newObject.id);
        sort(state, newIds);
        state[indexName] = {
          ...state[indexName],
          [oldKey]: oldIds,
          [newKey]: newIds
        };
      } else if (sort.isNeeded(oldObject, newObject)) {
        const newIds = get(state, newKey).slice();
        sort(state, newIds);
        state[indexName] = {
          ...state[indexName],
          [newKey]: newIds
        };
      }
    },
    toFront: (state, objectToMove) => {
      const containerKey = computeKey(objectToMove);
      const ids = get(state, containerKey).slice();
      moveAtTheEnd(ids, objectToMove.id);
      state[indexName] = {
        ...state[indexName],
        [containerKey]: ids
      };
    },
    queries: { get }
  };
}

export default function createIndex(definition) {
  return definition.oneToOne ? createOneToOneIndex(definition) : createManyToOneIndex(definition);
}
