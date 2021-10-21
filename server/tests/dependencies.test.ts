import { DependencyMap, DependencyNode, difference } from '../src/dependencies'

describe('difference function', () => {
  it('should return new Set containing all the elements of the first Set missing in the second Set', () => {
    const result = difference(new Set([1, 2, 3]), new Set([3, 4, 5]))
    expect(result).toEqual(new Set([1, 2]))
  })
})

describe('DependencyMap.get method', () => {
  it('should create empty DependencyNodes for non-existing entries', () => {
    const dmap = new DependencyMap()
    const result = dmap.get('some_uri')
    expect(result).toEqual(new DependencyNode())
  })
})

describe('DependencyMap.update method', () => {
  it('should set new dependencies', () => {
    const dmap = new DependencyMap()
    dmap.update('root', new Set(['a', 'b', 'c']))
    expect(dmap.get('root').childrenUris).toEqual(new Set(['a', 'b', 'c']))
  })

  it('should set parent for newly added dependencies', () => {
    const dmap = new DependencyMap()
    dmap.update('root', new Set(['a', 'b', 'c']))
    expect(dmap.get('a').parentUris).toContain('root')
  })

  it('should remove parent for dependency which was removed', () => {
    const dmap = new DependencyMap()
    dmap.update('root', new Set(['a', 'b', 'c']))
    dmap.update('root', new Set(['b', 'c']))
    expect(dmap.get('a').parentUris).not.toContain('root')
  })
})

describe('DependencyMap.hasParent method', () => {
  it('should return true if parentUri can be found somewhere on parent chain', () => {
    const dmap = new DependencyMap()
    dmap.update('root', new Set(['a']))
    dmap.update('a', new Set(['b']))
    expect(dmap.hasParent('b', 'root')).toBeTruthy()
  })
})

describe('DependencyMap.getAllBreadthFirst method', () => {
  it('should return set of all dependencies in breadth first iteration order', () => {
    const dmap = new DependencyMap()

    dmap.update('root', new Set(['a', 'b']))
    dmap.update('a', new Set(['a1', 'a2']))
    dmap.update('b', new Set(['b1', 'b2']))

    expect([...dmap.getAllBreadthFirst('root')]).toEqual([
      'root',
      'a',
      'b',
      'a1',
      'a2',
      'b1',
      'b2',
    ])
  })
})

describe('DependencyMap.getAllDepthFirst method', () => {
  it('should return set of all dependencies in depth first iteration order', () => {
    const dmap = new DependencyMap()

    dmap.update('root', new Set(['a', 'b']))
    dmap.update('a', new Set(['a1', 'a2']))
    dmap.update('b', new Set(['b1', 'b2']))
    dmap.update('a1', new Set(['a1.1']))

    expect([...dmap.getAllDepthFirst('root')]).toEqual([
      'root',
      'a',
      'a1',
      'a1.1',
      'a2',
      'b',
      'b1',
      'b2',
    ])
  })
})
