import { createStore, combineReducers } from 'redux';
import createReduxNormalizedModule from '../src';

describe('(Redux Module) Normalized', () => {
  const comparator = (o1, o2) => o1.name.localeCompare(o2.name);
  let module;
  let store;
  let selectors;
  let getState;
  let dispatch;
  function load(objects) {
    dispatch({ type: 'LOAD_SUCCESS', payload: { objects } });
  }

  function create(object) {
    dispatch(module.actions.create(object));
  }

  function update({ id, ...values }) {
    dispatch(module.actions.update(id, values));
  }

  function replace(object) {
    dispatch(module.actions.replace(object));
  }

  function del(id) {
    dispatch(module.actions.delete(id));
  }

  function toFront(id) {
    dispatch(module.actions.toFront(id));
  }

  function initialize(moduleDefinition) {
    module = createReduxNormalizedModule(moduleDefinition);
    selectors = module.selectors;
    store = createStore(combineReducers({ objects: module.reducer }));
    getState = store.getState;
    dispatch = store.dispatch;
  }

  function getValue(obj, path) {
    return path.reduce((o, p) => o[p], obj);
  }

  function checkIsMutated(previousState, newState, ...propertiesPaths) {
    propertiesPaths.forEach((propertyPath) => {
      const path = propertyPath.split('.');
      do {
        expect(getValue(previousState, path)).not.toBe(getValue(newState, path));
      } while (path.pop());
    });
  }

  function checkIsNotMutated(previousState, newState, ...propertiesPaths) {
    propertiesPaths.forEach((propertyPath) => {
      const path = propertyPath.split('.');
      expect(getValue(previousState, path)).toBe(getValue(newState, path));
    });
  }

  describe('without indexes', () => {
    const moduleDefinition = {
      selector: (state) => state.objects,
      reducers: {
        CREATE: 'create',
        DELETE: 'delete',
        UPDATE: 'update',
        REPLACE: 'replace',
        TO_FRONT: 'toFront',
        LOAD_SUCCESS: {
          type: 'load',
          extractor: (action) => action.payload.objects,
        },
      },
    };
    beforeEach(() => {
      initialize(moduleDefinition);
    });

    it('should expose actionsTypes', () => {
      expect(module.actionsTypes).toEqual({
        create: 'CREATE',
        delete: 'DELETE',
        update: 'UPDATE',
        replace: 'REPLACE',
        toFront: 'TO_FRONT',
      });
    });

    it('should initialize properly the state', () => {
      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([]);
      expect(selectors.getById(state, 1)).toBeUndefined();
      expect(selectors.isEmpty(state)).toBeTruthy();
      expect(state.objects).toEqual({
        byId: {},
        allIds: [],
      });
    });

    it('should load properly', () => {
      const previousState = getState();
      load([{ id: 7, prop: 'value' }, { id: 11 }]);

      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([7, 11]);
      expect(selectors.getById(state, 7)).toEqual({ id: 7, prop: 'value' });
      expect(selectors.getAll(state)).toEqual([{ id: 7, prop: 'value' }, { id: 11 }]);
      expect(selectors.isEmpty(state)).toBeFalsy();
      checkIsMutated(previousState, state, 'objects.allIds', 'objects.byId');
    });

    it('should support empty load', () => {
      const previousState = getState();
      load();

      expect(getState()).toBe(previousState);
    });

    it('should create properly', () => {
      const previousState = getState();
      create({ prop: 'value' });

      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([1]);
      expect(selectors.getById(state, 1)).toEqual({ id: 1, prop: 'value' });
      expect(selectors.getLastCreated(state)).toEqual({ id: 1, prop: 'value' });
      expect(selectors.isEmpty(state)).toBeFalsy();
      checkIsMutated(previousState, state, 'objects.allIds', 'objects.byId');
    });

    it('should create with an existing id', () => {
      const previousState = getState();
      create({ id: 10, prop: 'value' });

      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([10]);
      expect(selectors.getById(state, 10)).toEqual({ id: 10, prop: 'value' });
      expect(selectors.getLastCreated(state)).toEqual({ id: 10, prop: 'value' });
      expect(selectors.isEmpty(state)).toBeFalsy();
      checkIsMutated(previousState, state, 'objects.allIds', 'objects.byId');
    });

    it('should prevent creation with an already used id', () => {
      const previousState = getState();
      create({ id: 10, prop: 'value' });

      expect(() => create({ id: 10, prop: 'value2' })).toThrow();

      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([10]);
      expect(selectors.getById(state, 10)).toEqual({ id: 10, prop: 'value' });
      expect(selectors.getLastCreated(state)).toEqual({ id: 10, prop: 'value' });
      expect(selectors.isEmpty(state)).toBeFalsy();
      checkIsMutated(previousState, state, 'objects.allIds', 'objects.byId');
    });

    it('should update properly', () => {
      create({ id: 1, prop: 'value' });
      create({ id: 2 });
      const previousState = getState();
      update({ id: 1, prop2: 'value2' });

      const state = getState();
      expect(selectors.getById(state, 1)).toEqual({
        id: 1,
        prop: 'value',
        prop2: 'value2',
      });
      checkIsMutated(previousState, state, 'objects.byId.1');
      checkIsNotMutated(previousState, state, 'objects.allIds', 'objects.byId.2');
    });

    it('should replace properly', () => {
      create({ id: 1, prop: 'value' });
      create({ id: 2 });
      const previousState = getState();
      replace({ id: 1, prop2: 'value2' });

      const state = getState();
      expect(selectors.getById(state, 1)).toEqual({
        id: 1,
        prop2: 'value2',
      });
      checkIsMutated(previousState, state, 'objects.byId.1');
      checkIsNotMutated(previousState, state, 'objects.allIds', 'objects.byId.2');
    });

    it('should delete properly', () => {
      create({ id: 1, prop: 'value' });
      create({ id: 2 });
      const previousState = getState();
      del(1);

      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([2]);
      expect(selectors.getById(state, 1)).toBeUndefined();
      expect(selectors.getById(state, 2)).toEqual({ id: 2 });
      checkIsMutated(previousState, state, 'objects.allIds', 'objects.byId.1');
      checkIsNotMutated(previousState, state, 'objects.byId.2');
    });

    it('should do toFront properly', () => {
      load([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);

      const previousState = getState();
      toFront(1);
      expect(selectors.getAllIds(getState())).toEqual([2, 3, 4, 1]);
      checkIsMutated(previousState, getState(), 'objects.allIds');
      checkIsNotMutated(previousState, getState(), 'objects.byId');

      toFront(3);
      expect(selectors.getAllIds(getState())).toEqual([2, 4, 1, 3]);
    });
  });

  describe('with a comparator', () => {
    const moduleDefinition = {
      comparator,
      selector: (state) => state.objects,
      reducers: {
        CREATE: 'create',
        DELETE: 'delete',
        UPDATE: 'update',
        REPLACE: 'replace',
        TO_FRONT: 'toFront',
        LOAD_SUCCESS: {
          type: 'load',
          extractor: (action) => action.payload.objects,
        },
      },
    };
    beforeEach(() => {
      initialize(moduleDefinition);
    });

    it('should initialize properly the state', () => {
      const state = getState();
      expect(state.objects).toEqual({
        byId: {},
        allIds: [],
      });
    });

    it('should load properly', () => {
      load([
        { id: 1, name: 'W' },
        { id: 2, name: 'A' },
        { id: 3, name: 'D' },
        { id: 4, name: 'H' },
      ]);

      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([2, 3, 4, 1]);
      expect(selectors.getById(state, 1)).toEqual({ id: 1, name: 'W' });
    });

    it('should create properly', () => {
      create({ id: 1, name: 'W' });
      create({ id: 2, name: 'A' });
      create({ id: 3, name: 'D' });

      expect(selectors.getAllIds(getState())).toEqual([2, 3, 1]);
    });

    it('should update properly', () => {
      create({ id: 1, name: 'W' });
      create({ id: 2, name: 'A' });
      create({ id: 3, name: 'D' });

      let previousState = getState();
      update({ id: 1, name: 'B' });
      let state = getState();

      expect(selectors.getAllIds(state)).toEqual([2, 1, 3]);
      checkIsMutated(previousState, state, 'objects.allIds', 'objects.byId.1');
      checkIsNotMutated(previousState, state, 'objects.byId.2', 'objects.byId.3');

      previousState = getState();
      update({ id: 1, name: 'B', stuff: 1 });
      state = getState();

      expect(selectors.getAllIds(state)).toEqual([2, 1, 3]);
      checkIsMutated(previousState, state, 'objects.byId.1');
      checkIsNotMutated(previousState, state, 'objects.allIds', 'objects.byId.2', 'objects.byId.3');
    });

    it('should replace properly', () => {
      create({ id: 1, name: 'W', value: true });
      create({ id: 2, name: 'A' });
      create({ id: 3, name: 'D' });

      const previousState = getState();
      replace({ id: 1, name: 'B' });
      const state = getState();

      expect(selectors.getAllIds(state)).toEqual([2, 1, 3]);
      expect(selectors.getById(state, 1)).toEqual({ id: 1, name: 'B' });
      checkIsMutated(previousState, state, 'objects.allIds', 'objects.byId.1');
      checkIsNotMutated(previousState, state, 'objects.byId.2', 'objects.byId.3');
    });

    it('should delete properly', () => {
      create({ id: 1, name: 'W' });
      create({ id: 2, name: 'A' });
      create({ id: 3, name: 'D' });
      del(1);

      expect(selectors.getAllIds(getState())).toEqual([2, 3]);
    });

    it('should return the same ids array between two calls', () => {
      const state = getState();
      expect(selectors.getAllIds(state)).toEqual(selectors.getAllIds(state));
      create({ id: 1, name: 'W' });
      expect(selectors.getAllIds(state)).toEqual(selectors.getAllIds(state));
    });
  });

  describe('with a many to one index', () => {
    const moduleDefinition = {
      indexes: [{ attribute: 'containerId' }],
      selector: (state) => state.objects,
      reducers: {
        CREATE: 'create',
        DELETE: 'delete',
        REPLACE: 'replace',
        UPDATE: 'update',
        LOAD_SUCCESS: {
          type: 'load',
          extractor: (action) => action.payload.objects,
        },
        TO_FRONT: 'toFront',
      },
    };

    beforeEach(() => {
      initialize(moduleDefinition);
    });

    it('should initialize properly the state', () => {
      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([]);
      expect(selectors.getById(state, 1)).toBeUndefined();
      expect(selectors.byContainerId.get(state, 1)).toEqual([]);
      expect(state.objects).toEqual({
        byId: {},
        allIds: [],
        byContainerId: {},
      });
    });

    it('should load properly', () => {
      const previousState = getState();
      load([
        { id: 1, containerId: 1 },
        { id: 2, containerId: 2 },
        { id: 3 },
        { id: 4, containerId: 1 },
        { id: 5, containerId: null },
      ]);

      const state = getState();

      expect(selectors.byContainerId.get(state, 1)).toEqual([1, 4]);
      expect(selectors.byContainerId.get(state, 2)).toEqual([2]);
      expect(selectors.byContainerId.get(state)).toEqual([3, 5]);
      expect(selectors.byContainerId.get(state, null)).toEqual([3, 5]);

      checkIsMutated(previousState, state, 'objects.byContainerId');
    });

    it('should create properly', () => {
      const previousState = getState();
      create({ id: 1, containerId: 1 });
      create({ id: 2, containerId: 2 });
      create({ id: 3 });
      create({ id: 4, containerId: 1 });

      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([1, 2, 3, 4]);
      expect(selectors.getById(state, 4)).toEqual({
        id: 4,
        containerId: 1,
      });
      expect(selectors.byContainerId.get(state, 1)).toEqual([1, 4]);
      expect(selectors.byContainerId.get(state, 2)).toEqual([2]);
      expect(selectors.byContainerId.get(state, null)).toEqual([3]);
      expect(selectors.byContainerId.get(state)).toEqual([3]);

      checkIsMutated(previousState, state, 'objects.byContainerId');
    });

    it('should return the same indexed array between two calls', () => {
      load([{ id: 1, containerId: 1 }]);

      const state = getState();

      // use .eq() to ensure ===
      expect(selectors.byContainerId.get(state, 1)).toBe(selectors.byContainerId.get(state, 1));
      expect(selectors.byContainerId.get(state, 2)).toBe(selectors.byContainerId.get(state, 2));
    });

    it('should update properly', () => {
      load([
        { id: 1, containerId: 1 },
        { id: 2, containerId: 2 },
        { id: 3 },
        { id: 4, containerId: 1 },
        { id: 5, containerId: null },
      ]);

      const previousState = getState();
      update({ id: 1, containerId: 2 });
      checkIsMutated(
        previousState,
        getState(),
        'objects.byContainerId.1',
        'objects.byContainerId.2'
      );
      checkIsNotMutated(previousState, getState(), 'objects.byContainerId.null');

      update({ id: 2, containerId: 4 });
      update({ id: 3, containerId: 1 });
      update({ id: 4, containerId: null });
      update({ id: 5, containerId: 2 });

      const state = getState();
      expect(selectors.byContainerId.get(state, 1)).toEqual([3]);
      expect(selectors.byContainerId.get(state, 2)).toEqual([1, 5]);
      expect(selectors.byContainerId.get(state, 3)).toEqual([]);
      expect(selectors.byContainerId.get(state, 4)).toEqual([2]);
      expect(selectors.byContainerId.get(state, null)).toEqual([4]);
      expect(selectors.byContainerId.get(state)).toEqual([4]);
    });

    it('should replace properly', () => {
      load([
        { id: 1, containerId: 1, value: false },
        { id: 2, containerId: 2 },
        { id: 3 },
        { id: 4, containerId: 1 },
        { id: 5, containerId: null },
      ]);

      const previousState = getState();
      replace({ id: 1, containerId: 2 });
      checkIsMutated(
        previousState,
        getState(),
        'objects.byContainerId.1',
        'objects.byContainerId.2'
      );
      expect(selectors.getById(getState(), 1)).toEqual({ id: 1, containerId: 2 });
      checkIsNotMutated(previousState, getState(), 'objects.byContainerId.null');
    });

    it('should delete properly', () => {
      load([
        { id: 1, containerId: 1 },
        { id: 2, containerId: 2 },
        { id: 3 },
        { id: 4, containerId: 1 },
        { id: 5, containerId: null },
      ]);
      const previousState = getState();
      del(1);
      expect(selectors.byContainerId.get(getState(), 1)).toEqual([4]);
      checkIsMutated(previousState, getState(), 'objects.byContainerId.1');
      checkIsNotMutated(
        previousState,
        getState(),
        'objects.byContainerId.2',
        'objects.byContainerId.null'
      );

      del(4);
      expect(selectors.byContainerId.get(getState(), 1)).toEqual([]);

      del(3);
      expect(selectors.byContainerId.get(getState())).toEqual([5]);
    });

    it('should do toFront properly', () => {
      load([
        { id: 1, containerId: 1 },
        { id: 2, containerId: 2 },
        { id: 3 },
        { id: 4, containerId: 1 },
        { id: 5, containerId: null },
        { id: 6, containerId: 2 },
      ]);
      const previousState = getState();

      toFront(1);
      expect(selectors.byContainerId.get(getState(), 1)).toEqual([4, 1]);

      checkIsMutated(previousState, getState(), 'objects.byContainerId.1');
      checkIsNotMutated(
        previousState,
        getState(),
        'objects.byContainerId.2',
        'objects.byContainerId.null'
      );

      toFront(2);
      expect(selectors.byContainerId.get(getState(), 2)).toEqual([6, 2]);

      toFront(3);
      expect(selectors.byContainerId.get(getState(), null)).toEqual([5, 3]);
    });
  });

  describe('with a many to one complex index', () => {
    const moduleDefinition = {
      indexes: [{ attribute: { name: 'isColored', computeKey: (object) => !!object.color } }],
      selector: (state) => state.objects,
      reducers: {
        CREATE: 'create',
        DELETE: 'delete',
        REPLACE: 'replace',
        UPDATE: 'update',
        LOAD_SUCCESS: {
          type: 'load',
          extractor: (action) => action.payload.objects,
        },
        TO_FRONT: 'toFront',
      },
    };

    beforeEach(() => {
      initialize(moduleDefinition);
    });

    it('should initialize properly the state', () => {
      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([]);
      expect(selectors.getById(state, 1)).toBeUndefined();
      expect(selectors.byIsColored.get(state, true)).toEqual([]);
      expect(state.objects).toEqual({
        byId: {},
        allIds: [],
        byIsColored: {},
      });
    });

    it('should load properly', () => {
      const previousState = getState();
      load([
        { id: 1, color: 'green' },
        { id: 2, color: 'blue' },
        { id: 3 },
        { id: 4, color: null },
        { id: 5, color: undefined },
      ]);

      const state = getState();

      expect(selectors.byIsColored.get(state, true)).toEqual([1, 2]);
      expect(selectors.byIsColored.get(state, false)).toEqual([3, 4, 5]);

      checkIsMutated(previousState, state, 'objects.byIsColored');
    });

    it('should create properly', () => {
      const previousState = getState();
      create({ id: 1, color: 'green' });
      create({ id: 2, color: 'blue' });
      create({ id: 3 });
      create({ id: 4, color: 'green' });

      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([1, 2, 3, 4]);
      expect(selectors.getById(state, 4)).toEqual({
        id: 4,
        color: 'green',
      });
      expect(selectors.byIsColored.get(state, true)).toEqual([1, 2, 4]);
      expect(selectors.byIsColored.get(state, false)).toEqual([3]);

      checkIsMutated(previousState, state, 'objects.byIsColored');
    });

    it('should return the same indexed array between two calls', () => {
      load([{ id: 1, color: 'green' }]);

      const state = getState();

      // use .eq() to ensure ===
      expect(selectors.byIsColored.get(state, true)).toBe(selectors.byIsColored.get(state, true));
      expect(selectors.byIsColored.get(state, true)).toBe(selectors.byIsColored.get(state, true));
    });

    it('should update properly', () => {
      load([
        { id: 1, color: 'green' },
        { id: 2, color: 'blue' },
        { id: 3 },
        { id: 4, color: 'green' },
        { id: 5, color: null },
      ]);

      const previousState = getState();
      update({ id: 1, color: null });
      checkIsMutated(
        previousState,
        getState(),
        'objects.byIsColored.true',
        'objects.byIsColored.false'
      );

      update({ id: 2, color: 'yellow' });
      update({ id: 3, color: 'blue' });
      update({ id: 4, color: null });
      update({ id: 5, color: 'yellow' });

      const state = getState();
      expect(selectors.byIsColored.get(state, true)).toEqual([2, 3, 5]);
      expect(selectors.byIsColored.get(state, false)).toEqual([1, 4]);
    });

    it('should replace properly', () => {
      load([
        { id: 1, color: 'green', value: false },
        { id: 2, color: 'blue' },
        { id: 3 },
        { id: 4, color: 'green' },
        { id: 5, color: null },
      ]);

      const previousState = getState();
      replace({ id: 1, color: null });
      checkIsMutated(
        previousState,
        getState(),
        'objects.byIsColored.true',
        'objects.byIsColored.false'
      );
      expect(selectors.getById(getState(), 1)).toEqual({ id: 1, color: null });
    });

    it('should delete properly', () => {
      load([
        { id: 1, color: 'green' },
        { id: 2, color: 'blue' },
        { id: 3 },
        { id: 4, color: 'green' },
        { id: 5, color: null },
      ]);
      const previousState = getState();
      del(1);
      expect(selectors.byIsColored.get(getState(), true)).toEqual([2, 4]);
      checkIsMutated(previousState, getState(), 'objects.byIsColored.true');
      checkIsNotMutated(previousState, getState(), 'objects.byIsColored.false');

      del(4);
      expect(selectors.byIsColored.get(getState(), true)).toEqual([2]);

      del(3);
      expect(selectors.byIsColored.get(getState(), false)).toEqual([5]);
    });

    it('should do toFront properly', () => {
      load([
        { id: 1, color: 'green' },
        { id: 2, color: 'yellow' },
        { id: 3 },
        { id: 4, color: 'green' },
        { id: 5, color: null },
        { id: 6, color: 'yellow' },
      ]);
      const previousState = getState();

      toFront(1);
      expect(selectors.byIsColored.get(getState(), true)).toEqual([2, 4, 6, 1]);

      checkIsMutated(previousState, getState(), 'objects.byIsColored.true');
      checkIsNotMutated(previousState, getState(), 'objects.byIsColored.false');

      toFront(2);
      expect(selectors.byIsColored.get(getState(), true)).toEqual([4, 6, 1, 2]);

      toFront(3);
      expect(selectors.byIsColored.get(getState(), false)).toEqual([5, 3]);
    });
  });

  describe('with a sorted many to one index', () => {
    const moduleDefinition = {
      indexes: [{ attribute: 'containerId', comparator }],
      selector: (state) => state.objects,
      reducers: {
        CREATE: 'create',
        DELETE: 'delete',
        UPDATE: 'update',
        REPLACE: 'replace',
        LOAD_SUCCESS: {
          type: 'load',
          extractor: (action) => action.payload.objects,
        },
      },
    };

    beforeEach(() => {
      initialize(moduleDefinition);
    });

    it('should initialize properly the state', () => {
      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([]);
      expect(selectors.getById(state, 1)).toBeUndefined();
      expect(selectors.byContainerId.get(state, 1)).toEqual([]);
    });

    it('should load properly', () => {
      load([
        { id: 1, containerId: 1, name: 'Z' },
        { id: 2, containerId: 2, name: 'B' },
        { id: 3, name: 'C' },
        { id: 4, containerId: 1, name: 'E' },
        { id: 5, containerId: null, name: 'F' },
      ]);

      const state = getState();
      expect(selectors.byContainerId.get(state, 1)).toEqual([4, 1]);
      expect(selectors.byContainerId.get(state, 2)).toEqual([2]);
      expect(selectors.byContainerId.get(state)).toEqual([3, 5]);
      expect(selectors.byContainerId.get(state, null)).toEqual([3, 5]);
    });

    it('should create properly', () => {
      create({ id: 1, containerId: 1, name: 'Z' });
      create({ id: 2, containerId: 1, name: 'B' });
      create({ id: 3, name: 'U' });
      create({ id: 4, containerId: 1, name: 'C' });

      const state = getState();
      expect(selectors.byContainerId.get(state, 1)).toEqual([2, 4, 1]);
      expect(selectors.byContainerId.get(state, null)).toEqual([3]);
    });

    it('should update properly', () => {
      load([
        { id: 1, containerId: 1, name: 'Z' },
        { id: 2, containerId: 2, name: 'B' },
        { id: 3, name: 'C' },
        { id: 4, containerId: 1, name: 'E' },
        { id: 5, containerId: null, name: 'F' },
        { id: 6, containerId: 2, name: 'G', stuff: 0 },
      ]);

      let previousState = getState();
      update({ id: 1, name: 'A' });
      expect(selectors.byContainerId.get(getState(), 1)).toEqual([1, 4]);
      checkIsMutated(previousState, getState(), 'objects.byContainerId.1');

      update({ id: 2, containerId: 1 });
      expect(selectors.byContainerId.get(getState(), 1)).toEqual([1, 2, 4]);

      update({ id: 3, containerId: 1, name: 'G' });
      expect(selectors.byContainerId.get(getState(), 1)).toEqual([1, 2, 4, 3]);

      update({ id: 4, containerId: null, name: 'Y' });
      expect(selectors.byContainerId.get(getState(), null)).toEqual([5, 4]);

      update({ id: 5, containerId: 2 });
      expect(selectors.byContainerId.get(getState(), 2)).toEqual([5, 6]);

      previousState = getState();
      update({ id: 6, stuff: 1 });
      expect(selectors.byContainerId.get(getState(), 2)).toEqual([5, 6]);

      const state = getState();
      checkIsNotMutated(previousState, state, 'objects.byContainerId.2');
      expect(selectors.byContainerId.get(state, 1)).toEqual([1, 2, 3]);
      expect(selectors.byContainerId.get(state, 2)).toEqual([5, 6]);
      expect(selectors.byContainerId.get(state)).toEqual([4]);
    });

    it('should replace properly', () => {
      load([
        { id: 1, containerId: 1, name: 'Z', value: 4 },
        { id: 2, containerId: 2, name: 'B' },
        { id: 3, name: 'C' },
        { id: 4, containerId: 1, name: 'E' },
        { id: 5, containerId: null, name: 'F' },
        { id: 6, containerId: 2, name: 'G', stuff: 0 },
      ]);

      const previousState = getState();
      replace({ id: 1, containerId: 1, name: 'A' });
      expect(selectors.byContainerId.get(getState(), 1)).toEqual([1, 4]);
      expect(selectors.getById(getState(), 1)).toEqual({ id: 1, containerId: 1, name: 'A' });
      checkIsMutated(previousState, getState(), 'objects.byContainerId.1');
    });

    it('should delete properly', () => {
      load([
        { id: 1, containerId: 1, name: 'Z' },
        { id: 2, containerId: 2, name: 'B' },
        { id: 3, name: 'C' },
        { id: 4, containerId: 1, name: 'E' },
        { id: 5, containerId: null, name: 'F' },
      ]);
      del(1);
      expect(selectors.byContainerId.get(getState(), 1)).toEqual([4]);
    });
  });

  describe('with a one to one index', () => {
    const moduleDefinition = {
      indexes: [{ attribute: 'containerId', oneToOne: true }],
      selector: (state) => state.objects,
      reducers: {
        CREATE: 'create',
        DELETE: 'delete',
        UPDATE: 'update',
        REPLACE: 'replace',
        LOAD_SUCCESS: {
          type: 'load',
          extractor: (action) => action.payload.objects,
        },
      },
    };

    beforeEach(() => {
      initialize(moduleDefinition);
    });

    it('should initialize properly the state', () => {
      const state = getState();
      expect(selectors.getAllIds(state)).toEqual([]);
      expect(selectors.getById(state, 1)).toBeUndefined();
      expect(selectors.byContainerId.get(state, 1)).toBeUndefined();
    });

    it('should load properly', () => {
      load([
        { id: 0, containerId: 10 },
        { id: 2, containerId: 20 },
        { id: 3, containerId: 30 },
      ]);

      const state = getState();
      expect(selectors.byContainerId.get(state, 10)).toEqual({
        id: 0,
        containerId: 10,
      });
      expect(selectors.byContainerId.get(state, 20)).toEqual({
        id: 2,
        containerId: 20,
      });
      expect(selectors.byContainerId.get(state, 30)).toEqual({
        id: 3,
        containerId: 30,
      });
      expect(selectors.byContainerId.get(state, 40)).toBeUndefined();
      expect(selectors.byContainerId.exists(state, 10)).toBeTruthy();
      expect(selectors.byContainerId.exists(state, 40)).toBeFalsy();
    });

    it('should create properly', () => {
      create({ id: 1, containerId: 10 });
      create({ id: 2, containerId: 20 });
      create({ id: 3 });

      const state = getState();
      expect(selectors.byContainerId.get(state, 10)).toEqual({
        id: 1,
        containerId: 10,
      });
      expect(selectors.byContainerId.get(state, 20)).toEqual({
        id: 2,
        containerId: 20,
      });
      expect(selectors.byContainerId.get(state, null)).toEqual({
        id: 3,
      });
    });

    it('should update properly', () => {
      load([
        { id: 1, containerId: 10 },
        { id: 2, containerId: 20 },
        { id: 3, containerId: 30 },
      ]);

      update({ id: 1, containerId: 40 });

      const state = getState();
      expect(selectors.byContainerId.get(state, 10)).toBeUndefined();
      expect(selectors.byContainerId.exists(state, 10)).toBeFalsy();
      expect(selectors.byContainerId.get(state, 40)).toEqual({
        id: 1,
        containerId: 40,
      });
      expect(selectors.byContainerId.exists(state, 40)).toBeTruthy();
    });

    // eslint-disable-next-line jest/expect-expect
    it('should not update the index if not needed', () => {
      load([
        { id: 1, containerId: 10 },
        { id: 2, containerId: 20 },
        { id: 3, containerId: 30 },
      ]);
      const previousState = getState();
      update({ id: 1, containerId: 10, value: true });
      checkIsMutated(previousState, getState(), 'objects.byId.1');
      checkIsNotMutated(previousState, getState(), 'objects.byContainerId');
    });

    it('should replace properly', () => {
      load([
        { id: 1, containerId: 10, value: true },
        { id: 2, containerId: 20 },
        { id: 3, containerId: 30 },
      ]);

      replace({ id: 1, containerId: 40 });

      const state = getState();
      expect(selectors.byContainerId.get(state, 10)).toBeUndefined();
      expect(selectors.byContainerId.exists(state, 10)).toBeFalsy();
      expect(selectors.byContainerId.get(state, 40)).toEqual({
        id: 1,
        containerId: 40,
      });
      expect(selectors.byContainerId.exists(state, 40)).toBeTruthy();
    });

    it('should delete properly', () => {
      load([
        { id: 1, containerId: 10 },
        { id: 2, containerId: 20 },
        { id: 3, containerId: 30 },
      ]);

      del(1);

      const state = getState();
      expect(selectors.byContainerId.get(state, 10)).toBeUndefined();
      expect(selectors.byContainerId.exists(state, 10)).toBeFalsy();
    });
  });
});
