export const PRIVATE_KEY_DB_KEY = 'portal_client_private_key'

export interface MethodConfig {
  name: string
  paramPlaceholder: string
  handler: (
    input: string,
    sendRequest: (method: string, params?: any[]) => Promise<any>,
  ) => void | Promise<any>
}
