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
