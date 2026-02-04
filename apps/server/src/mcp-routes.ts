/**
 * MCP Routes Integration
 * 
 * Adds MCP server endpoints to the existing Express application
 */

import type { Express } from "express";
import { mcpClientService } from "./mcp-client-service";

/**
 * Register MCP-related routes with the Express application
 */
export function registerMCPRoutes(app: Express) {
  
  // MCP Server status endpoint
  app.get("/api/mcp/status", (req, res) => {
    try {
      const baseStatus = mcpClientService.getStatus();
      const mcpStatus = {
        ...baseStatus,
        mcpVersion: "1.0.0",
        mcpEnabled: true,
        transport: "stdio",
        serverRunning: false, // Will be true when MCP server is actively running
        capabilities: {
          exerciseGeneration: true,
          feedbackAnalysis: true,
          adaptiveLearning: true,
          homeworkCreation: true,
          capsAlignment: true,
          resourceProviding: true,
        },
        mcpTools: [
          "generate_exercise",
          "generate_feedback", 
          "generate_adaptive_exercise",
          "generate_homework",
          "get_service_status",
          "test_connection",
        ],
        mcpResources: [
          "educational-ai://service/status",
          "educational-ai://service/info",
          "educational-ai://curriculum/caps-grade-8-mathematics",
        ],
        timestamp: new Date().toISOString(),
      };
      
      res.json(mcpStatus);
    } catch (error) {
      console.error("Error getting MCP status:", error);
      res.status(500).json({ 
        message: "Failed to get MCP status",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP Server information endpoint
  app.get("/api/mcp/info", (req, res) => {
    try {
      const info = {
        name: "Educational AI MCP Server",
        version: "1.0.0",
        description: "Model Context Protocol server for XtraClass.ai Educational AI Service",
        protocol: "MCP v1.0",
        transport: "stdio",
        documentation: {
          setup: "/docs/mcp-server-documentation.md",
          api: "Available via MCP protocol tools and resources",
        },
        integration: {
          claudeDesktop: "Supported via stdio transport",
          customClients: "Use @modelcontextprotocol/sdk client libraries",
        },
        requirements: {
          nodejs: "16+",
          environment: ["OPENAI_API_KEY (optional for full functionality)"],
          dependencies: ["@modelcontextprotocol/sdk"],
        },
        examples: {
          testConnection: {
            tool: "test_connection",
            arguments: { message: "Hello MCP" },
          },
          generateExercise: {
            tool: "generate_exercise",
            arguments: {
              context: {
                grade: "8",
                subject: "mathematics",
                topic: "Algebra",
                difficulty: "medium",
                syllabus: "CAPS"
              },
              numQuestions: 5
            },
          },
        },
      };
      
      res.json(info);
    } catch (error) {
      console.error("Error getting MCP info:", error);
      res.status(500).json({ 
        message: "Failed to get MCP info",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP Server launch endpoint (for testing/development)
  app.post("/api/mcp/test-launch", async (req, res) => {
    try {
      // This would typically launch the MCP server in a separate process
      // For now, we'll just return information about how to launch it
      
      const launchInfo = {
        message: "MCP server can be launched manually",
        commands: [
          "node server/mcp-runner.js",
          "node package-scripts/mcp-server.js",
        ],
        testCommands: [
          'echo \'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\' | node server/mcp-runner.js',
          'echo \'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test_connection","arguments":{"message":"test"}}}\' | node server/mcp-runner.js',
        ],
        integrationExamples: {
          claudeDesktopConfig: {
            path: "~/Library/Application Support/Claude/claude_desktop_config.json",
            config: {
              mcpServers: {
                "educational-ai": {
                  command: "node",
                  args: ["/absolute/path/to/server/mcp-runner.js"],
                  env: {
                    OPENAI_API_KEY: "your-api-key-here"
                  }
                }
              }
            }
          }
        },
        timestamp: new Date().toISOString(),
      };
      
      res.json(launchInfo);
    } catch (error) {
      console.error("Error in MCP test launch:", error);
      res.status(500).json({ 
        message: "Failed to get MCP launch info",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP Basic Exercise Test endpoint
  app.post("/api/mcp/test-basic-exercise", async (req, res) => {
    try {
      const { context, numQuestions } = req.body;
      
      // Shell out to MCP server to generate exercise
      const { spawn } = await import('child_process');
      const { promisify } = await import('util');
      
      const mcpRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "generate_basic_exercise",
          arguments: {
            context: context || {
              grade: "8",
              subject: "mathematics", 
              topic: "Algebra",
              difficulty: "easy",
              syllabus: "CAPS"
            },
            numQuestions: numQuestions || 3
          }
        }
      };
      
      return new Promise((resolve, reject) => {
        const child = spawn('node', ['server/mcp-runner.js'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        child.on('close', (code) => {
          if (code !== 0) {
            console.error('MCP server error:', errorOutput);
            return reject(new Error(`MCP server failed with code ${code}`));
          }
          
          try {
            // Parse the JSON response (skip initialization logs)
            const lines = output.split('\n').filter(line => line.trim());
            const jsonLine = lines.find(line => line.includes('"jsonrpc"'));
            
            if (!jsonLine) {
              throw new Error('No valid JSON response from MCP server');
            }
            
            const mcpResponse = JSON.parse(jsonLine);
            
            if (mcpResponse.error) {
              return reject(new Error(mcpResponse.error.message || 'MCP server error'));
            }
            
            if (mcpResponse.result?.content?.[0]?.text) {
              const exerciseData = JSON.parse(mcpResponse.result.content[0].text);
              res.json(exerciseData);
              resolve(exerciseData);
            } else {
              const error = new Error('Invalid response format from MCP server');
              reject(error);
            }
          } catch (error) {
            console.error('Error parsing MCP response:', error);
            reject(new Error(`Failed to parse MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        });
        
        child.stdin.write(JSON.stringify(mcpRequest) + '\n');
        child.stdin.end();
      });
      
    } catch (error) {
      console.error("Error in MCP basic exercise test:", error);
      res.status(500).json({ 
        message: "Failed to test MCP basic exercise generation",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP Adaptive Exercise Test endpoint  
  app.post("/api/mcp/test-adaptive-exercise", async (req, res) => {
    try {
      const { context, improvements, numQuestions } = req.body;
      
      // Shell out to MCP server to generate adaptive exercise
      const { spawn } = await import('child_process');
      
      const mcpRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "generate_adaptive_exercise",
          arguments: {
            context: context || {
              grade: "8",
              subject: "mathematics", 
              topic: "Algebra",
              difficulty: "medium",
              syllabus: "CAPS"
            },
            improvements: improvements || [
              "Better understanding of solving equations",
              "Practice with algebraic expressions"
            ],
            numQuestions: numQuestions || 5
          }
        }
      };
      
      return new Promise((resolve, reject) => {
        const child = spawn('node', ['server/mcp-runner.js'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        child.on('close', (code) => {
          if (code !== 0) {
            console.error('MCP server error:', errorOutput);
            return reject(new Error(`MCP server failed with code ${code}`));
          }
          
          try {
            // Parse the JSON response (skip initialization logs)
            const lines = output.split('\n').filter(line => line.trim());
            const jsonLine = lines.find(line => line.includes('"jsonrpc"'));
            
            if (!jsonLine) {
              throw new Error('No valid JSON response from MCP server');
            }
            
            const mcpResponse = JSON.parse(jsonLine);
            
            if (mcpResponse.error) {
              return reject(new Error(mcpResponse.error.message || 'MCP server error'));
            }
            
            if (mcpResponse.result?.content?.[0]?.text) {
              const exerciseData = JSON.parse(mcpResponse.result.content[0].text);
              res.json(exerciseData);
              resolve(exerciseData);
            } else {
              const error = new Error('Invalid response format from MCP server');
              reject(error);
            }
          } catch (error) {
            console.error('Error parsing MCP response:', error);
            reject(new Error(`Failed to parse MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        });
        
        child.stdin.write(JSON.stringify(mcpRequest) + '\n');
        child.stdin.end();
      });
      
    } catch (error) {
      console.error("Error in MCP adaptive exercise test:", error);
      res.status(500).json({ 
        message: "Failed to test MCP adaptive exercise generation",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MCP Tutorial Generation endpoint  
  app.post("/api/mcp/generate-tutorial", async (req, res) => {
    try {
      const { homeworkFeedback, context, specificWeakness } = req.body;
      
      // Shell out to MCP server to generate tutorial
      const { spawn } = await import('child_process');
      
      const mcpRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "generate_tutorial",
          arguments: {
            homeworkFeedback: homeworkFeedback || {
              strengths: ["Good basic understanding"],
              improvements: ["Needs more practice with algebra"]
            },
            context: context || {
              grade: "8",
              subject: "mathematics", 
              topic: "Algebra",
              difficulty: "medium",
              syllabus: "CAPS"
            },
            specificWeakness: specificWeakness || "General improvement needed"
          }
        }
      };
      
      return new Promise((resolve, reject) => {
        const child = spawn('node', ['server/mcp-runner.js'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: process.env
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        child.on('close', (code) => {
          if (code !== 0) {
            console.error('MCP server error:', errorOutput);
            return reject(new Error(`MCP server failed with code ${code}: ${errorOutput}`));
          }
          
          try {
            console.log('🔍 MCP server raw output:', output);
            console.log('🔍 MCP server error output:', errorOutput);
            
            // Parse the JSON response (skip initialization logs)
            const lines = output.split('\n').filter(line => line.trim());
            const jsonLine = lines.find(line => line.includes('"jsonrpc"'));
            
            if (!jsonLine) {
              console.error('❌ No valid JSON response found in output:', lines);
              throw new Error('No valid JSON response from MCP server');
            }
            
            console.log('🔍 Found JSON line:', jsonLine);
            const mcpResponse = JSON.parse(jsonLine);
            
            if (mcpResponse.error) {
              console.error('❌ MCP server returned error:', mcpResponse.error);
              return reject(new Error(mcpResponse.error.message || 'MCP server error'));
            }
            
            if (mcpResponse.result?.content?.[0]?.text) {
              const tutorialData = JSON.parse(mcpResponse.result.content[0].text);
              console.log('✅ Tutorial data parsed successfully:', tutorialData);
              res.json(tutorialData);
              resolve(tutorialData);
            } else {
              console.error('❌ Invalid response format:', mcpResponse);
              const error = new Error('Invalid response format from MCP server');
              reject(error);
            }
          } catch (error) {
            console.error('❌ Error parsing MCP response:', error);
            console.error('❌ Raw output that failed to parse:', output);
            reject(new Error(`Failed to parse MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        });
        
        child.stdin.write(JSON.stringify(mcpRequest) + '\n');
        child.stdin.end();
      });
      
    } catch (error) {
      console.error("Error in MCP tutorial generation:", error);
      res.status(500).json({ 
        message: "Failed to generate tutorial via MCP",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log("✅ MCP routes registered");
}