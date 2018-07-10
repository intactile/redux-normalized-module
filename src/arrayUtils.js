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
