# redux-normalized-module

A library for generating a redux normalized module

[![Build Status](https://travis-ci.org/intactile/redux-normalized-module.svg?branch=master)](https://travis-ci.org/intactile/redux-normalized-module)
[![Maintainability](https://api.codeclimate.com/v1/badges/720449d047afa55671a9/maintainability)](https://codeclimate.com/github/intactile/redux-normalized-module/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/720449d047afa55671a9/test_coverage)](https://codeclimate.com/github/intactile/redux-normalized-module/test_coverage)

The genereated module provides a reducer, the action creators and the selectors to manage a
[normalized state](https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape).

## Installation

```bash
npm install @intactile/redux-normalized-module
```

or

```bash
yarn add @intactile/redux-normalized-module
```

## Normalized state

A normalized state is structured like this:

```javascript
{
    byId: {
        1: { id: 1, name: 'France', continentId: 1 },
        2: { id: 2, name: 'Croatia', continentId: 1 },
        3: { id: 3, name: 'Belgium', continentId: 1 },
        4: { id: 4, name: 'England', continentId: 1 },
        5: { id: 5, name: 'Brasil', continentId: 2 },
    },
    allIds: [1, 2, 3, 4]
}
```

Indexes can also be added.

```javascript
{
    ...,
    byContinentId: {
        1: [1, 2, 3, 4],
        2: [5]
    }
}
```

## Configuration

A normalized module is created from a definition.

```javascript
const moduleDefinition = {
  selector: state => state.countries,
  reducers: {
    // map an action type with a generic reducer
    CREATE_COUNTRY: "create",
    UPDATE_COUNTRY: "update",
    REPLACE_COUNTRY: "replace",
    DELETE_COUNTRY: "delete",
    LOAD_COUNTRIES: {
      type: "load",
      extractor: action => action.payload.countries
    }
  }
};

const module = createReduxNormalizedModule(moduleDefinition);
```

The generated module will expose a reducer:

```javascript
import { createStore, combineReducers } from "redux";

store = createStore(combineReducers({ countries: module.reducer }));
```

some action creators:

```javascript
store.dispatch(module.actions.create({ name: "Argentina", continentId: 2 }));
store.dispatch(module.actions.update(6, { name: "Chile" }));
store.dispatch(
  module.actions.replace({ id: 6, name: "Chile", continentId: 2 })
);
store.dispatch(module.actions.delete(6));
store.dispatch(module.actions.toFront(2));
```

and some selectors:

```javascript
const state = store.getState();
module.selectors.getAllIds(state);
module.selectors.getAll(state);
module.selectors.getById(state, 6);
module.selectors.isEmpty(state);
module.selectors.getLastCreated(state);
module.selectors.getLastCreatedId(state);
module.selectors.getNextId(state);
```

### Add a comparator

The state could be sorted with a comparator:

```javascript
const sortByName = (o1, o2) => o1.name.localeCompare(o2.name);
const moduleDefinition = {
  comparator: sortByName
};
```

By doing this, the `allIds` array with automatically sorted when an object is created or updated.

```javascript
module.selectors.getAllIds(state); // => the ids sorted by `name`
```

Note: the `toFront` action can't be used when a comparator is configured

### Add a many to one index

For performance purpose, one or more indexes might be added to the state. They are updated when an
object is created, updated or deleted.

```javascript
const moduleDefinition = {
  indexes: [{ attribute: "continentId" }]
};
```

The generated module provides an index selector:

```javascript
const state = store.getState();
selectors.byContinentId.get(store.getState(), 1); // => [1, 2, 3, 4]
selectors.byContinentId.get(store.getState(), 3); // => []
```

The index can also be sorted with a comparator:

```javascript
const sortByName = (o1, o2) => o1.name.localeCompare(o2.name);
const moduleDefinition = {
  indexes: [{ attribute: "continentId", comparator: sortByName }]
};
```

The attribute property can also be an object to handle more complex use case
it should provide a name property, this will be use to generate the name of the index
and it should also provide a custom function to compute the keys of the index, this function will be called with the object as parameter:

```javascript
const moduleDefinition = {
  indexes: [{
    attribute: {
      name: "isColored",
      computeKey: (object) => !!object.color
    }
  }]
};
```

### Add a one to one index

```javascript
const moduleDefinition = {
  indexes: [{ attribute: "name", oneToOne: true }]
};
```

The index selectors are:

```javascript
const state = store.getState();
selectors.byName.get(store.getState(), "France"); // => { id: 1, name: 'France', continentId: 1 }
selectors.byName.exists(store.getState(), "Germany"); // => false
```

### Complete module definition

```javascript
const moduleDefinition = {
  indexes: [
    { attribute: "continentId", comparator: sortByName },
    { attribute: "name", oneToOne: true }
  ],
  selector: state => state.countries,
  reducers: {
    CREATE_COUNTRY: "create",
    UPDATE_COUNTRY: "update",
    REPLACE_COUNTRY: "replace",
    DELETE_COUNTRY: "delete",
    LOAD_COUNTRIES: {
      type: "load",
      extractor: action => action.payload.countries
    }
  }
};
```
