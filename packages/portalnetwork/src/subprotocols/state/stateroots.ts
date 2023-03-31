export type TStateRoot = string /** 0x prefixed, hex encoded, 32 byte state root */
export type Sequence = TStateRoot[] /** array of state roots in a known valid order */
export type Edge = [TStateRoot, TStateRoot] /** directional edge between state roots */
export type DAG = Edge[] /** directed acyclic graph of state roots */
export type GraphInput = {
  stateroots: Set<TStateRoot>
  dag: DAG
} /** input to graph function */
