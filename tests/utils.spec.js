import { removeElement, moveAtTheEnd } from '../src/utils';

describe('utils', () => {
  describe('removeElement', () => {
    function assertElementRemoved(array, object, expectedArray, expectedIndex) {
      const index = removeElement(array, object);
      expect(expectedIndex).toEqual(index);
      expect(array).toEqual(expectedArray);
    }
    // eslint-disable-next-line jest/expect-expect
    it('Should remove an element from an array', () => {
      const obj1 = { value: '1' };
      const obj2 = { value: '2' };
      const obj3 = { value: '3' };
      const array = [obj1, obj2, obj3];
      assertElementRemoved(array, {}, [obj1, obj2, obj3], -1);
      assertElementRemoved(array, obj2, [obj1, obj3], 1);
    });
  });

  describe('moveAtTheEnd', () => {
    function assertElementMovedAtTheEnd(array, object, expectedArray, expectedIndex) {
      const index = moveAtTheEnd(array, object);
      expect(expectedIndex).toEqual(index);
      expect(array).toEqual(expectedArray);
    }
    // eslint-disable-next-line jest/expect-expect
    it('Should move an object at the end of an array', () => {
      const obj1 = { value: '1' };
      const obj2 = { value: '2' };
      const obj3 = { value: '3' };
      const array = [obj1, obj2, obj3];
      assertElementMovedAtTheEnd(array, {}, [obj1, obj2, obj3], -1);
      assertElementMovedAtTheEnd(array, obj2, [obj1, obj3, obj2], 1);
      assertElementMovedAtTheEnd(array, obj1, [obj3, obj2, obj1], 0);
      assertElementMovedAtTheEnd(array, obj1, [obj3, obj2, obj1], 2);
    });
  });
});
