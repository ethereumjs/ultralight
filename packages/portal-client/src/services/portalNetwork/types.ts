export interface MethodConfig {
  name: string
  paramPlaceholder: string
  handler: (
    input: string, 
    sendRequest: (method: string, params?: any[])
    => Promise<any>) => void | Promise<any>
}