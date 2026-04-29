import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

//below are the modules for my custom metric code
import { log } from "./server/utils/logger.js";
import { recordRequest,getMetrics } from "./server/utils/metrics.js";

const server = new Server(
  { name: "employee-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "createEmployee",
        description: "Create a new employee",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" }
          },
          required: ["name", "role"]
        }
      },
      {
        name :"getMetrics",
        description : "Get server metrics",
        inputSchema: {
            type: "object",
            properties: {}
        }
      }
    ]
  };
});


// Tool handler
server.setRequestHandler(CallToolRequestSchema, async (req) => {

  const start = Date.now();

  const { name, arguments: args } = req.params;

  //Tracing a code below
  log("info","Tool execution started", {
    tool: name,
    input: args
  })

try{

  if (name === "createEmployee") {
    const res = await fetch("http://localhost:4000/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
        //"x-api-key": "admin-key",
        //"x-token": "68ba26af25677fa1280566e5555f0c07ca6b1b17789c0fbe1c0b9c88c2329158"
      },
      body: JSON.stringify(args)
    });

    const data = await res.json();

    // latency code below 
    const latency = Date.now() - start

    // metrics
    recordRequest(latency,true)

    //tracing code below
    log("info", "Tool execution success", {
        tool: name,
        latency,
        output: data
    });

    return {
      content: [{ type: "text", text: JSON.stringify(data) }]
    };
  }

  // if 
  if(name === "getMetrics")
  {
    const data = getMetrics();
    log("info", "Metrics fetched", data);

    return{
        content :[
            {
                type:"text",
                text: JSON.stringify(data)
            }
        ]
    };
  }

  throw new Error("Unknown tool")

}
catch(err){
   const latency = Date.now() - start;
 
    // metrics
    recordRequest(latency,false)
    
    log("error", "Tool execution failed", {
        tool: name,
        error: err.message
    });

    return{
        content:[
            {
                type:"text",
                text: "Error is :" + err.message
            }
        ]
    };

}

 /* return {
    content: [{ type: "text", text: "Unknown tool" }]
  };*/
});

await server.connect(new StdioServerTransport());

console.log("MCP Server running");
