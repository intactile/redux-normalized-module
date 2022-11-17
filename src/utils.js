export function removeElement(arr, object) {
  const index = arr.indexOf(object);
  if (index !== -1) {
    arr.splice(index, 1);
  }
  return index;
}

export function moveAtTheEnd(arr, object) {
  const index = removeElement(arr, object);
  if (index !== -1) {
    arr.push(object);
  }
  return index;
}

export const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
export const createIndexName = (attributeName) => `by${capitalize(attributeName)}`;
export const isDefined = (o) => o !== undefined;
