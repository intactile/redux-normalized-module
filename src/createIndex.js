import createOneToOneIndex from './createOneToOneIndex';
import createManyToOneIndex from './createManyToOneIndex';

export default function createIndex(definition) {
  return definition.oneToOne ? createOneToOneIndex(definition) : createManyToOneIndex(definition);
}
