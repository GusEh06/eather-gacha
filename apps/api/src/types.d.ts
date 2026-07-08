import "hono"

// Variables inyectadas en el contexto por los middlewares
declare module "hono" {
  interface ContextVariableMap {
    userId: string
    userRole: string
    requestId: string
  }
}
