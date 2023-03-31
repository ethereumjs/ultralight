import { removeDuplicateSequences } from './util.js'

export type TStateRoot = string /** 0x prefixed, hex encoded, 32 byte state root */
export type Sequence = TStateRoot[] /** array of state roots in a known valid order */
export type Edge = [TStateRoot, TStateRoot] /** directional edge between state roots */
export type DAG = Edge[] /** directed acyclic graph of state roots */
export type GraphInput = {
  stateroots: Set<TStateRoot>
  dag: DAG
} /** input to graph function */

/**
 *
 * @param sequences arrays of state roots in known valid order
 * @returns GraphInput { stateroots: TStateRoot[], dag: DAG }
 */
export function graph(sequences: Sequence[]): GraphInput {
  const stateroots: Set<TStateRoot> = new Set()
  const dag: DAG = []
  for (const sequence of sequences) {
    for (let i = 0; i < sequence.length; i++) {
      const u = sequence[i]
      stateroots.add(u)
      if (i + 1 < sequence.length) {
        const v = sequence[i + 1]
        !dag.map((edge) => JSON.stringify(edge)).includes(JSON.stringify([u, v])) &&
          dag.push([u, v])
      }
    }
  }
  return { stateroots, dag }
}

/**
 * @class PathFinder
 */
export class PathFinder {
  stateroots: Set<TStateRoot> /** set of state roots */
  graph: DAG /** directed acyclic graph of state roots */
  visited: Map<TStateRoot, number[]> /** map of visited state roots */
  maxLenth: number /** length of longest valid sequence */
  maxPaths: Sequence[] /** array of valid sequences */
  /**
   *
   * @param stateroots set of state roots
   * @param graph directed acyclic graph of state roots
   */
  constructor(stateroots: Set<TStateRoot>, graph: DAG) {
    this.stateroots = stateroots
    this.graph = graph
    this.visited = new Map<string, number[]>()
    this.maxLenth = -1
    this.maxPaths = []
  }
  newPath(newPath: Sequence) {
    if (newPath.length > this.maxLenth) {
      this.maxLenth = newPath.length
      this.maxPaths = [newPath]
    } else if (newPath.length === this.maxLenth) {
      this.maxPaths.push(newPath)
    }
    return newPath
  }
  async graphSort(
    current: TStateRoot,
    visited: Set<TStateRoot>,
    path: TStateRoot[],
    pathLength: number,
    v: TStateRoot
  ): Promise<void> {
    const visitedRoot = current + Array.from(visited.values()).sort().join(',')
    const currentIndex = [...this.stateroots].indexOf(current)
    if (
      this.visited.has(visitedRoot) &&
      this.visited.get(visitedRoot)![currentIndex] >= pathLength
    ) {
      return
    }
    if (!this.visited.has(visitedRoot)) {
      this.visited.set(visitedRoot, new Array(this.stateroots.size).fill(-1))
    }
    this.visited.get(visitedRoot)![currentIndex] = pathLength

    for (const [u, _v] of this.graph) {
      if (u === current && !visited.has(_v)) {
        const newPath = this.newPath([...path, _v])
        if (visited.size === this.stateroots.size) {
          return
        } else {
          this.graphSort(_v, new Set([...visited, _v]), newPath, newPath.length, v)
        }
      }
    }
  }

  /**
   *
   * @param u source root
   * @param v sink root
   * @returns valid sequences from u to v
   */
  async findPaths(u: TStateRoot, v: TStateRoot): Promise<Sequence[]> {
    for (const start of [u, v]) {
      await this.graphSort(start, new Set([start]), [start], 1, v)
    }
    return this.maxPaths
  }
}

/** @class StateRootIndex */
export class StateRootIndex {
  stateroots: Set<TStateRoot>
  graph: DAG
  public static from(sequences: Sequence[]): StateRootIndex {
    const { stateroots, dag } = graph(sequences)
    return new StateRootIndex(stateroots, dag)
  }
  constructor(stateroots: Set<TStateRoot>, graph: DAG) {
    this.stateroots = stateroots
    this.graph = graph
  }

  /**
   *
   * @param sequences arrays of state roots in known valid order
   */
  update(sequences: Sequence[]): void {
    const { stateroots, dag } = graph(sequences)
    for (const stateroot of stateroots.values()) {
      this.stateroots.add(stateroot)
    }
    this.graph.push(...dag)
  }

  /**
   *
   * @param u source root
   * @param v sink root
   * @returns valid paths from u to v
   */
  async path(u: TStateRoot, v: TStateRoot): Promise<TStateRoot[][]> {
    const pf = new PathFinder(this.stateroots, this.graph)
    const paths = await pf.findPaths(u, v)
    return removeDuplicateSequences(paths)
  }

  /**
   *
   * @returns source roots
   */
  sourceroots(): TStateRoot[] {
    const sources = []
    for (const u of this.stateroots) {
      if (this.graph.every((e) => e[1] !== u)) {
        sources.push(u)
      }
    }
    return sources
  }

  /**
   *
   * @returns sink roots
   */
  sinkroots(): TStateRoot[] {
    const sinks = []
    for (const u of this.stateroots) {
      if (this.graph.every((e) => e[0] !== u)) {
        sinks.push(u)
      }
    }
    return sinks
  }

  /**
   *
   * @returns one or more valid sequences of state roots
   */
  async allPaths(): Promise<TStateRoot[][]> {
    const paths = []
    for (const u of this.sourceroots()) {
      for (const v of this.sinkroots()) {
        if (u !== v) {
          const path = await this.path(u, v)
          paths.push(...path)
        }
      }
    }
    return removeDuplicateSequences(paths)
  }

  /**
   *
   * @param sequence array of state roots in known valid order
   * @returns valid paths that run through each state root in sequence
   */
  async pathThru(sequence: Sequence): Promise<Sequence[]> {
    const paths: Sequence[] = await this.allPaths()
    return paths.filter((n) => sequence.every((e) => n.includes(e)))
  }
}
