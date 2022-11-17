import groupBy from 'lodash.groupby';
import mapValues from 'lodash.mapvalues';
import { removeElement, moveAtTheEnd, createIndexName, isDefined } from './utils';
import createSort from './createSort';

const EMPTY_ARRAY = [];

export default function createManyToOneIndex(definition) {
  const { attribute, comparator } = definition;
  let indexName;
  let computeKey;
  if (typeof attribute === 'string') {
    indexName = createIndexName(attribute);
    computeKey = (object) => (isDefined(object[attribute]) ? object[attribute] : null);
  } else {
    indexName = createIndexName(attribute.name);
    computeKey = attribute.computeKey;
  }
  const getIndex = (state) => state[indexName];
  const get = (state, key = null) => getIndex(state)[key] || EMPTY_ARRAY;
  const sort = createSort(comparator);
  return {
    attribute,
    name: indexName,
    initialize: (state) => {
      state[indexName] = {};
    },
    load: (state) => {
      const indexer = (id) => computeKey(state.byId[id]);
      state[indexName] = groupBy(state.allIds, indexer);
      if (sort.isPresent) {
        state[indexName] = mapValues(state[indexName], (ids) => sort(state, ids));
      }
    },
    add: (state, object) => {
      const key = computeKey(object);
      const ids = get(state, key).slice();
      ids.push(object.id);
      sort(state, ids);
      state[indexName] = {
        ...state[indexName],
        [key]: ids,
      };
    },
    remove: (state, object) => {
      const key = computeKey(object);
      const ids = get(state, key).slice();
      removeElement(ids, object.id);
      state[indexName] = {
        ...state[indexName],
        [key]: ids,
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
          [newKey]: newIds,
        };
      } else if (sort.isNeeded(oldObject, newObject)) {
        const newIds = get(state, newKey).slice();
        sort(state, newIds);
        state[indexName] = {
          ...state[indexName],
          [newKey]: newIds,
        };
      }
    },
    toFront: (state, objectToMove) => {
      const key = computeKey(objectToMove);
      const ids = get(state, key).slice();
      moveAtTheEnd(ids, objectToMove.id);
      state[indexName] = {
        ...state[indexName],
        [key]: ids,
      };
    },
    queries: { get },
  };
}
