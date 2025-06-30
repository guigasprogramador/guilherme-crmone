// Esta é uma versão simplificada que APENAS retorna não autenticado
// para resolver o problema do HTML sendo retornado
export function GET() {
  return new Response(
    JSON.stringify({ 
      authenticated: false 
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      }
    }
  );
}
