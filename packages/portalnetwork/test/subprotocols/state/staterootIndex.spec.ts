import tape from 'tape'
import { StateRootIndex } from '../../../src/subprotocols/state/stateroots.js'
import { mergeArrays } from '../../../src/subprotocols/state/util.js'

const arrays = [
  ['A', 'B', 'C'],
  ['B', 'C', 'D'],
  ['C', 'D', 'E'],
  ['D', 'E', 'F'],
  ['E', 'F', 'G'],
  ['C', 'F', 'H'],
]
const array6 = ['C', 'F', 'I']
const array7 = ['B', 'H', 'I']

tape('StateRootIndex sort', async (t) => {
  // Build graph from list of ordered arrays
  const dag = StateRootIndex.from(arrays)

  const longestPath = await dag.path('A', 'E')
  t.deepEqual(
    longestPath,
    [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'H'],
    ],
    `Found longest path that passes through A and E`
  )

  let path5 = await dag.pathThru(arrays[5])
  t.deepEqual(
    path5,
    [['A', 'B', 'C', 'D', 'E', 'F', 'H']],
    `Found longest path that includes all of array 5`
  )

  let allPaths = await dag.allPaths()
  t.deepEqual(
    allPaths,
    [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'H'],
    ],
    `Found all the longest available paths through the graph`
  )

  dag.update([array6])
  let paths = await dag.path('A', 'E')
  t.deepEqual(
    paths,
    [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'H'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'I'],
    ],
    `Update the graph with a new sample array`
  )

  // Display the longest paths as a single nested array
  let mergedPaths = mergeArrays(paths)
  t.deepEqual(
    mergedPaths,
    ['A', 'B', 'C', 'D', 'E', 'F', ['G', 'H', 'I']],
    'Merged New Longest Paths'
  )
  path5 = await dag.pathThru(arrays[5])
  t.deepEqual(
    path5,
    [['A', 'B', 'C', 'D', 'E', 'F', 'H']],
    `Found longest path that includes all of array 5`
  )
  let path4 = await dag.pathThru(arrays[4])
  t.deepEqual(
    path4,
    [['A', 'B', 'C', 'D', 'E', 'F', 'G']],
    `Found longest path that includes all of array 4`
  )
  let path6 = await dag.pathThru(array6)
  t.deepEqual(
    path6,
    [['A', 'B', 'C', 'D', 'E', 'F', 'I']],
    `Found longest path that includes all of array 6`
  )

  dag.update([
    ['G', 'J'],
    ['H', 'J'],
    ['I', 'J'],
  ])
  paths = await dag.path('A', 'E')
  t.deepEqual(
    paths,
    [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'J'],
      ['A', 'B', 'C', 'D', 'E', 'F', 'I', 'J'],
    ],
    `Found longest path that passes through A and E`
  )
  mergedPaths = mergeArrays(paths)
  t.deepEqual(
    mergedPaths,
    ['A', 'B', 'C', 'D', 'E', 'F', ['G', 'H', 'I'], 'J'],
    'Merged New Longest Paths'
  )
  path5 = await dag.pathThru(arrays[5])
  t.deepEqual(
    path5,
    [['A', 'B', 'C', 'D', 'E', 'F', 'H', 'J']],
    `Found longest path that includes all of array 5`
  )
  path4 = await dag.pathThru(arrays[4])
  t.deepEqual(
    path4,
    [['A', 'B', 'C', 'D', 'E', 'F', 'G', 'J']],
    `Found longest path that includes all of array 4`
  )
  path6 = await dag.pathThru(array6)
  t.deepEqual(
    path6,
    [['A', 'B', 'C', 'D', 'E', 'F', 'I', 'J']],
    `Found longest path that includes all of array 6`
  )

  dag.update([array7])
  paths = await dag.path('A', 'E')
  t.deepEqual(
    paths,
    [['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I', 'J']],
    `Found longest path that passes through A and E`
  )
  path5 = await dag.pathThru(arrays[5])
  t.deepEqual(
    path5,
    [['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I', 'J']],
    `Found longest path that includes all of array 5`
  )

  dag.update([['A', 'B', 'H', 'I', 'J']])
  paths = await dag.path('A', 'E')
  t.deepEqual(
    paths,
    [['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I', 'J']],
    `Found longest path that passes through A and E`
  )
  path5 = await dag.pathThru(arrays[5])
  t.deepEqual(
    path5,
    [['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I', 'J']],
    `Found longest path that includes all of array 5`
  )

  dag.update([['G', 'H']])
  paths = await dag.path('A', 'E')
  t.deepEqual(
    paths,
    [['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']],
    `Found longest path that passes through A and E`
  )
  allPaths = await dag.allPaths()

  t.deepEqual(
    allPaths,
    [['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']],
    `Found longest available path through the graph`
  )
  t.end()
})
