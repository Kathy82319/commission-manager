export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // 暴力測試路徑
    if (url.pathname === "/api/payment/create") {
      return new Response(JSON.stringify({ 
        message: "Hello World! 我是剛上傳的新版本 001", 
        timestamp: Date.now() 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};