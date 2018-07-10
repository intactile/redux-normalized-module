import groupBy from 'lodash.groupby';
import mapValues from 'lodash.mapvalues';
import noop from 'lodash.noop';
import { createIndexName, isDefined } from './utils';

const getFirst = arr => arr[0];

export default function createOneToOneIndex(definition) {
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
