import createSort from '../src/createSort';

describe('(Redux Module) Normalized - createSort', () => {
  let sort;
  describe('without comparator', () => {
    beforeEach(() => {
      sort = createSort();
    });

    it('should not be present', () => {
      expect(sort.isPresent).toBeFalsy();
    });

    it('should not be neeeded', () => {
      expect(sort.isNeeded('a', 'b')).toBeFalsy();
    });

    it('should return undefine when invoked', () => {
      expect(sort()).toBeUndefined();
    });
  });

  describe('with comparator', () => {
    beforeEach(() => {
      sort = createSort((a, b) => a - b);
    });

    it('should be present', () => {
      expect(sort.isPresent).toBeTruthy();
    });

    it('should be neeeded on different object', () => {
      expect(sort.isNeeded(1, 2)).toBeTruthy();
    });

    it('should sort allIds', () => {
      const state = {
        byId: {
          1: 10,
          2: 5,
          3: 15,
          4: 20
        }
      };

      expect(sort(state, [1, 2, 3, 4])).toEqual([2, 1, 3, 4]);
    });
  });
});
