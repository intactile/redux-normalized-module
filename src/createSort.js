import constant from 'lodash.constant';

const noopSort = () => {};
noopSort.isPresent = false;
noopSort.isNeeded = constant(false);

export default function createSort(comparator) {
  if (!comparator) {
    return noopSort;
  }
  function sort(state, ids) {
    ids.sort((id1, id2) => comparator(state.byId[id1], state.byId[id2]));
    return ids;
  }
  sort.isPresent = true;
  sort.isNeeded = (oldObject, newObject) => comparator(oldObject, newObject) !== 0;
  return sort;
}
